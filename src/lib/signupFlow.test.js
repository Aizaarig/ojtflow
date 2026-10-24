import assert from 'node:assert/strict'
import test from 'node:test'
import {
  resendSignUpOtp,
  sendPasswordReset,
  signInUser,
  signUpUser,
  verifyRecoveryOtp,
  verifySignUpOtp,
} from './authApi.js'
import { ensureProfileRecord } from './profile.js'
import {
  canResend,
  isExistingAccount,
  mapSignupOtpError,
  startResendCooldown,
  verificationDestination,
} from './signupOtp.js'
import { mapAuthError } from './authErrors.js'

/*
  Behavioural fake of the Supabase Auth + profiles APIs used by the
  registration OTP flow. It mirrors the parts of GoTrue that matter here:

  - signup emails carry a 6-digit token (Confirm-signup template with
    {{ .Token }}), never a confirmation link
  - existing addresses come back with `identities: []` and no new email
  - verifyOtp validates per token type: a signup code is not a recovery code
  - expired codes, rate limits and network failures return AuthError-like
    objects with `message` and `code`
*/
function createSupabaseFake(options = {}) {
  const state = {
    users: [],
    signupCodes: new Map(),
    recoveryCodes: new Map(),
    profileRows: new Map(),
    emailsSent: 0,
    recoveryEmailsSent: 0,
    profileInserts: 0,
    verifyCalls: [],
    lastSignupEmail: null,
    recoveryRedirect: null,
    networkDown: false,
    rateLimited: false,
    confirmEmail: true,
    otp: '123456',
    recoveryOtp: '999999',
    otpTtlMs: 60_000,
    ...options,
  }

  // GoTrue errors are AuthError instances (Error subclasses) with a `code`.
  const authError = (message, code) =>
    Object.assign(new Error(message), code ? { code } : {})

  const fetchError = () => ({
    data: null,
    error: authError('TypeError: Failed to fetch', 'retryable_fetch_error'),
  })

  const issueCode = (map, email) => {
    map.set(email, { token: state.otp, expiresAt: Date.now() + state.otpTtlMs })
    state.emailsSent += 1
    state.lastSignupEmail = {
      to: email,
      token: state.otp,
      hasToken: true, // rendered from {{ .Token }}
      hasLink: false, // NOT a {{ .ConfirmationURL }} link
    }
    return state.otp
  }

  const publicUser = (user, { obfuscate = false } = {}) => ({
    id: user.id,
    email: user.email,
    user_metadata: { ...user.user_metadata },
    identities: obfuscate ? [] : [{ id: `${user.email}:email`, provider: 'email' }],
  })

  const client = {
    state,
    auth: {
      async signUp({ email, password, options: signUpOptions }) {
        const trimmed = String(email ?? '').trim()
        if (state.networkDown) return fetchError()

        const existing = state.users.find((u) => u.email === trimmed)
        if (existing) {
          // Supabase obfuscates the existing account and does not resend.
          return {
            data: { user: publicUser(existing, { obfuscate: true }), session: null },
            error: null,
          }
        }

        const user = {
          id: `user-${state.users.length + 1}`,
          email: trimmed,
          password,
          user_metadata: { ...(signUpOptions?.data ?? {}) },
          confirmed: !state.confirmEmail,
        }
        state.users.push(user)

        if (state.confirmEmail) issueCode(state.signupCodes, trimmed)

        return {
          data: {
            user: publicUser(user),
            session: state.confirmEmail
              ? null
              : { access_token: 'sb-auto', user: publicUser(user) },
          },
          error: null,
        }
      },

      async verifyOtp({ email, token, type }) {
        const trimmed = String(email ?? '').trim()
        state.verifyCalls.push({ email: trimmed, token, type })
        if (state.networkDown) return fetchError()
        if (type !== 'signup' && type !== 'recovery') {
          return {
            data: null,
            error: authError(`Unsupported token type: ${type}`),
          }
        }

        const user = state.users.find((u) => u.email === trimmed)
        const codes = type === 'signup' ? state.signupCodes : state.recoveryCodes
        const issued = codes.get(trimmed)

        if (!user || !issued) {
          return {
            data: null,
            error: authError('Invalid token: token is invalid or has expired'),
          }
        }
        if (Date.now() > issued.expiresAt) {
          return {
            data: null,
            error: authError('Token has expired or is invalid', 'otp_expired'),
          }
        }
        if (String(token) !== issued.token) {
          return {
            data: null,
            error: authError('Invalid token: token is invalid or has expired'),
          }
        }
        if (type === 'signup' && user.confirmed) {
          return {
            data: null,
            error: authError('User already registered', 'already_confirmed'),
          }
        }

        if (type === 'signup') user.confirmed = true
        return {
          data: { user: publicUser(user), session: { access_token: 'sb-otp', user: publicUser(user) } },
          error: null,
        }
      },

      async resend({ type, email }) {
        const trimmed = String(email ?? '').trim()
        if (state.networkDown) return fetchError()
        if (type !== 'signup') {
          return { data: null, error: authError(`Unsupported token type: ${type}`) }
        }
        if (state.rateLimited) {
          return {
            data: null,
            error: authError('Email rate limit exceeded', 'over_email_send_rate_limit'),
          }
        }
        const user = state.users.find((u) => u.email === trimmed)
        if (user && !user.confirmed) issueCode(state.signupCodes, trimmed)
        return { data: {}, error: null }
      },

      async resetPasswordForEmail(email, { redirectTo } = {}) {
        const trimmed = String(email ?? '').trim()
        if (state.networkDown) return fetchError()
        state.recoveryRedirect = redirectTo
        state.recoveryCodes.set(trimmed, {
          token: state.recoveryOtp,
          expiresAt: Date.now() + state.otpTtlMs,
        })
        state.recoveryEmailsSent += 1
        return { data: {}, error: null }
      },

      async signInWithPassword({ email, password }) {
        const trimmed = String(email ?? '').trim()
        if (state.networkDown) return fetchError()
        const user = state.users.find((u) => u.email === trimmed)
        if (!user || user.password !== password) {
          return { data: null, error: authError('Invalid login credentials') }
        }
        if (state.confirmEmail && !user.confirmed) {
          return { data: null, error: authError('Email not confirmed') }
        }
        return {
          data: { session: { access_token: 'sb-pw', user: publicUser(user) }, user: publicUser(user) },
          error: null,
        }
      },

      async signOut() {
        return { data: {}, error: null }
      },
    },

    from() {
      return {
        select() {
          let rowId = null
          const builder = {
            eq(_column, value) {
              rowId = value
              return builder
            },
            async maybeSingle() {
              const row = state.profileRows.get(rowId)
              return { data: row ? { ...row } : null, error: null }
            },
          }
          return builder
        },
        upsert(payload) {
          state.profileInserts += 1
          if (state.profilesBlocked) {
            return {
              select: () => ({
                maybeSingle: async () => ({
                  data: null,
                  error: { message: 'permission denied for table profiles' },
                }),
              }),
            }
          }
          state.profileRows.set(payload.id, payload)
          return {
            select: () => ({
              maybeSingle: async () => ({ data: { ...payload }, error: null }),
            }),
          }
        },
      }
    },
  }

  return { state, client }
}

test('successful signup OTP verification initializes the profile exactly once', async () => {
  const { state, client } = createSupabaseFake()

  const signup = await signUpUser(client, {
    email: ' juan@school.edu ',
    password: 'secret123',
    fullName: 'Juan Dela Cruz',
    schoolName: 'State U',
    course: 'BSIT',
    yearLevel: '4th Year',
  })

  assert.equal(signup.session, null)
  assert.equal(isExistingAccount(signup), false)
  assert.equal(state.emailsSent, 1)
  // The email itself must carry the 6-digit code, not a confirmation link.
  assert.equal(state.lastSignupEmail.hasToken, true)
  assert.equal(state.lastSignupEmail.hasLink, false)
  assert.equal(state.lastSignupEmail.token.length, 6)

  const data = await verifySignUpOtp(client, {
    email: 'juan@school.edu',
    token: state.lastSignupEmail.token,
  })

  assert.ok(data.session, 'verification must sign the student in')
  assert.equal(verificationDestination(data), '/dashboard')
  assert.equal(state.verifyCalls.at(-1).type, 'signup')

  const profile = await ensureProfileRecord(client, data.user)
  assert.equal(profile.full_name, 'Juan Dela Cruz')
  assert.equal(profile.school_name, 'State U')

  await ensureProfileRecord(client, data.user)
  assert.equal(state.profileInserts, 1, 'must not create duplicate profiles')

  const login = await signInUser(client, {
    email: 'juan@school.edu',
    password: 'secret123',
  })
  assert.ok(login.session, 'verified students can sign in')
})

test('re-submitting the same email never creates a duplicate account', async () => {
  const { state, client } = createSupabaseFake()

  const first = await signUpUser(client, { email: 'juan@school.edu', password: 'secret123' })
  const second = await signUpUser(client, { email: 'juan@school.edu', password: 'secret123' })

  assert.equal(state.users.length, 1)
  assert.equal(isExistingAccount(second), true)
  assert.equal(state.emailsSent, 1, 'signUp does not resend to an existing address')
  assert.equal(first.user.identities.length, 1)

  await resendSignUpOtp(client, { email: 'juan@school.edu' })
  assert.equal(state.emailsSent, 2, 'the resend button sends a fresh code')

  const data = await verifySignUpOtp(client, {
    email: 'juan@school.edu',
    token: '123456',
  })
  assert.ok(data.session)
})

test('an invalid OTP is rejected with a friendly message and no session', async () => {
  const { state, client } = createSupabaseFake()

  await signUpUser(client, { email: 'juan@school.edu', password: 'secret123' })

  await assert.rejects(
    verifySignUpOtp(client, { email: 'juan@school.edu', token: '999999' }),
    (err) => {
      assert.match(mapSignupOtpError(err), /invalid or has expired/i)
      return true
    }
  )

  const user = state.users[0]
  assert.equal(user.confirmed, false, 'a wrong code must not verify the account')

  await assert.rejects(
    signInUser(client, { email: 'juan@school.edu', password: 'secret123' }),
    (err) => {
      assert.match(mapAuthError(err), /verify your email/i)
      return true
    }
  )
})

test('an expired OTP is explained and a resend issues a fresh code', async () => {
  const { state, client } = createSupabaseFake({ otpTtlMs: -1_000 })

  await signUpUser(client, { email: 'juan@school.edu', password: 'secret123' })

  await assert.rejects(
    verifySignUpOtp(client, { email: 'juan@school.edu', token: '123456' }),
    (err) => {
      assert.equal(err.code, 'otp_expired')
      assert.match(mapSignupOtpError(err), /invalid or has expired/i)
      return true
    }
  )

  // Request a new code: TTL is still negative, so make it valid again.
  state.otpTtlMs = 60_000
  await resendSignUpOtp(client, { email: 'juan@school.edu' })
  const data = await verifySignUpOtp(client, { email: 'juan@school.edu', token: '123456' })
  assert.ok(data.session)
})

test('resend is gated by the 60-second cooldown and explains rate limits', async () => {
  const { state, client } = createSupabaseFake()
  await signUpUser(client, { email: 'juan@school.edu', password: 'secret123' })

  const now = Date.now()
  const cooldownUntil = startResendCooldown(60, now)
  assert.equal(canResend(cooldownUntil, now), false)
  assert.equal(canResend(cooldownUntil, now + 30_000), false)
  assert.equal(canResend(cooldownUntil, now + 60_000), true)

  state.rateLimited = true
  await assert.rejects(
    resendSignUpOtp(client, { email: 'juan@school.edu' }),
    (err) => {
      assert.match(mapSignupOtpError(err), /too many attempts/i)
      return true
    }
  )

  state.rateLimited = false
  await resendSignUpOtp(client, { email: 'juan@school.edu' })
  assert.equal(state.emailsSent, 2)
})

test('network failures are reported without crashing the flow', async () => {
  const { state, client } = createSupabaseFake()
  state.networkDown = true

  await assert.rejects(
    signUpUser(client, { email: 'juan@school.edu', password: 'secret123' }),
    (err) => {
      assert.match(mapAuthError(err), /reach the server|something went wrong/i)
      return true
    }
  )

  state.networkDown = false
  await signUpUser(client, { email: 'juan@school.edu', password: 'secret123' })
  state.networkDown = true

  await assert.rejects(
    verifySignUpOtp(client, { email: 'juan@school.edu', token: '123456' }),
    (err) => {
      assert.match(mapSignupOtpError(err), /reach the server/i)
      return true
    }
  )
  await assert.rejects(
    resendSignUpOtp(client, { email: 'juan@school.edu' }),
    (err) => {
      assert.match(mapSignupOtpError(err), /reach the server/i)
      return true
    }
  )

  state.networkDown = false
  const data = await verifySignUpOtp(client, { email: 'juan@school.edu', token: '123456' })
  assert.ok(data.session, 'the flow recovers once the network is back')
})

test('signup verification and password recovery use separate token types', async () => {
  const { state, client } = createSupabaseFake()

  await signUpUser(client, { email: 'juan@school.edu', password: 'secret123' })
  await sendPasswordReset(client, {
    email: 'juan@school.edu',
    redirectTo: 'https://ojtflow.app/reset-password',
  })

  assert.equal(state.recoveryRedirect, 'https://ojtflow.app/reset-password')

  // A recovery code must not verify the signup...
  await assert.rejects(
    verifyRecoveryOtp(client, { email: 'juan@school.edu', token: '123456' }),
    /invalid or has expired/i
  )
  // ...and a signup code must not open a recovery session.
  await assert.rejects(
    verifySignUpOtp(client, { email: 'juan@school.edu', token: '999999' }),
    (err) => {
      assert.match(mapSignupOtpError(err), /invalid or has expired/i)
      return true
    }
  )

  const recovery = await verifyRecoveryOtp(client, {
    email: 'juan@school.edu',
    token: '999999',
  })
  assert.ok(recovery.session, 'recovery still works with its own code')

  const signup = await verifySignUpOtp(client, {
    email: 'juan@school.edu',
    token: '123456',
  })
  assert.ok(signup.session, 'signup still works with its own code')

  const types = state.verifyCalls.map((call) => call.type)
  assert.deepEqual(types, ['recovery', 'signup', 'recovery', 'signup'])
})

test('existing login and forgot-password behaviour is preserved', async () => {
  const { state, client } = createSupabaseFake()

  await signUpUser(client, { email: 'juan@school.edu', password: 'secret123' })

  // Login before verification keeps asking the student to verify first.
  await assert.rejects(
    signInUser(client, { email: 'juan@school.edu', password: 'secret123' }),
    (err) => {
      assert.match(mapAuthError(err), /verify your email/i)
      return true
    }
  )

  await verifySignUpOtp(client, { email: 'juan@school.edu', token: '123456' })

  // Wrong password keeps the classic login error.
  await assert.rejects(
    signInUser(client, { email: 'juan@school.edu', password: 'wrongpass1' }),
    (err) => {
      assert.match(mapAuthError(err), /incorrect email or password/i)
      return true
    }
  )

  const login = await signInUser(client, {
    email: 'juan@school.edu',
    password: 'secret123',
  })
  assert.ok(login.session)

  // Forgot-password still sends a code and verifies it as recovery.
  await sendPasswordReset(client, {
    email: 'juan@school.edu',
    redirectTo: 'https://ojtflow.app/reset-password',
  })
  const recovery = await verifyRecoveryOtp(client, {
    email: 'juan@school.edu',
    token: '999999',
  })
  assert.ok(recovery.session)
  assert.equal(state.recoveryEmailsSent, 1)
  assert.equal(state.recoveryRedirect, 'https://ojtflow.app/reset-password')
})
