import assert from 'node:assert/strict'
import test from 'node:test'
import {
  resendSignUpOtp,
  sendPasswordReset,
  signInUser,
  signInWithGoogle,
  signOutUser,
  signUpUser,
  updateUserPassword,
  verifyRecoveryOtp,
  verifySignUpOtp,
} from './authApi.js'

function createAuthClient(result = {}) {
  const calls = []
  const record = (name, ...allArgs) => {
    calls.push({ name, args: allArgs.length === 1 ? allArgs[0] : allArgs })
    const override = result[name]
    if (override) return override(...allArgs)
    return { data: {}, error: null }
  }

  return {
    calls,
    client: {
      auth: {
        signUp: (...args) => record('signUp', ...args),
        verifyOtp: (...args) => record('verifyOtp', ...args),
        resend: (...args) => record('resend', ...args),
        signInWithPassword: (...args) => record('signInWithPassword', ...args),
        signInWithOAuth: (...args) => record('signInWithOAuth', ...args),
        resetPasswordForEmail: (...args) => record('resetPasswordForEmail', ...args),
        updateUser: (...args) => record('updateUser', ...args),
        signOut: (...args) => record('signOut', ...args),
      },
    },
  }
}

test('verifySignUpOtp uses type: "signup" with trimmed values', async () => {
  const { client, calls } = createAuthClient({
    verifyOtp: () => ({
      data: { user: { id: 'u1' }, session: { access_token: 't' } },
      error: null,
    }),
  })

  const data = await verifySignUpOtp(client, {
    email: '  juan@school.edu  ',
    token: ' 123456 ',
  })

  assert.equal(calls[0].name, 'verifyOtp')
  assert.deepEqual(calls[0].args, {
    email: 'juan@school.edu',
    token: '123456',
    type: 'signup',
  })
  assert.ok(data.session)
})

test('verifyRecoveryOtp uses type: "recovery", never "signup"', async () => {
  const { client, calls } = createAuthClient({
    verifyOtp: () => ({
      data: { user: { id: 'u1' }, session: { access_token: 't' } },
      error: null,
    }),
  })

  await verifyRecoveryOtp(client, { email: 'a@b.com', token: '654321' })

  assert.equal(calls[0].args.type, 'recovery')
  assert.notEqual(calls[0].args.type, 'signup')
})

test('signup and recovery verification stay separated on the same client', async () => {
  const { client, calls } = createAuthClient({
    verifyOtp: () => ({
      data: { user: { id: 'u1' }, session: { access_token: 't' } },
      error: null,
    }),
  })

  await verifySignUpOtp(client, { email: 'a@b.com', token: '111111' })
  await verifyRecoveryOtp(client, { email: 'a@b.com', token: '222222' })

  const types = calls.map((call) => call.args.type)
  assert.deepEqual(types, ['signup', 'recovery'])
})

test('verifyRecoveryOtp refuses to continue without a recovery session', async () => {
  const { client } = createAuthClient({
    verifyOtp: () => ({ data: { user: { id: 'u1' }, session: null }, error: null }),
  })

  await assert.rejects(
    verifyRecoveryOtp(client, { email: 'a@b.com', token: '123456' }),
    /recovery session/i
  )
})

test('verifyOtp errors are rethrown so callers can map them', async () => {
  const authError = { message: 'Token has expired or is invalid', code: 'otp_expired' }
  const { client } = createAuthClient({
    verifyOtp: () => ({ data: null, error: authError }),
  })

  await assert.rejects(
    verifySignUpOtp(client, { email: 'a@b.com', token: '000000' }),
    (err) => err === authError
  )
})

test('resendSignUpOtp asks Supabase for another signup email', async () => {
  const { client, calls } = createAuthClient()

  await resendSignUpOtp(client, { email: '  juan@school.edu ' })

  assert.deepEqual(calls[0].args, {
    type: 'signup',
    email: 'juan@school.edu',
  })
})

test('signUpUser trims the email and forwards registration metadata', async () => {
  const { client, calls } = createAuthClient({
    signUp: () => ({
      data: { user: { identities: [{ id: 'i1' }] }, session: null },
      error: null,
    }),
  })

  const data = await signUpUser(client, {
    email: ' juan@school.edu ',
    password: 'secret123',
    fullName: ' Juan Dela Cruz ',
    schoolName: ' UP ',
    course: ' BSIT ',
    yearLevel: ' 4th Year ',
  })

  assert.equal(calls[0].args.email, 'juan@school.edu')
  assert.deepEqual(calls[0].args.options.data, {
    full_name: 'Juan Dela Cruz',
    school_name: 'UP',
    course: 'BSIT',
    year_level: '4th Year',
  })
  assert.ok(Array.isArray(data.user.identities))
  assert.equal(data.user.identities.length, 1)
})

test('signInUser keeps the existing login call shape', async () => {
  const { client, calls } = createAuthClient({
    signInWithPassword: () => ({
      data: { session: { access_token: 't' }, user: { id: 'u1' } },
      error: null,
    }),
  })

  await signInUser(client, { email: '  juan@school.edu ', password: 'secret123' })

  assert.deepEqual(calls[0].args, {
    email: 'juan@school.edu',
    password: 'secret123',
  })
})

test('sendPasswordReset keeps the recovery redirect target', async () => {
  const { client, calls } = createAuthClient()

  await sendPasswordReset(client, {
    email: ' juan@school.edu ',
    redirectTo: 'https://ojtflow.app/reset-password',
  })

  assert.deepEqual(calls[0].args, [
    'juan@school.edu',
    { redirectTo: 'https://ojtflow.app/reset-password' },
  ])
})

test('updateUserPassword and signOut keep their existing behaviour', async () => {
  const { client, calls } = createAuthClient()

  await updateUserPassword(client, 'brandnewpass1')
  assert.deepEqual(calls[0].args, { password: 'brandnewpass1' })

  await signOutUser(client)
  assert.equal(calls[1].name, 'signOut')
})

test('signOutUser rethrows Supabase sign-out errors', async () => {
  const { client } = createAuthClient({
    signOut: () => ({ error: new Error('session expired') }),
  })

  await assert.rejects(signOutUser(client), /session expired/)
})

test('signInWithGoogle requests provider "google" with the given redirect', async () => {
  const { client, calls } = createAuthClient()

  const data = await signInWithGoogle(client, {
    redirectTo: 'https://ojtflow.app/auth/callback',
  })

  assert.equal(calls[0].name, 'signInWithOAuth')
  assert.equal(calls[0].args.provider, 'google')
  assert.deepEqual(calls[0].args.options, {
    redirectTo: 'https://ojtflow.app/auth/callback',
  })
  assert.deepEqual(data, {})
})

test('signInWithGoogle falls back to ${origin}/auth/callback', async () => {
  const { client, calls } = createAuthClient()
  globalThis.window = { location: { origin: 'https://ojtflow.app' } }

  try {
    await signInWithGoogle(client)
  } finally {
    delete globalThis.window
  }

  assert.equal(calls[0].args.provider, 'google')
  assert.equal(
    calls[0].args.options.redirectTo,
    'https://ojtflow.app/auth/callback'
  )
})

test('signInWithGoogle omits options when no redirect target is available', async () => {
  const { client, calls } = createAuthClient()

  await signInWithGoogle(client)

  assert.equal(calls[0].args.provider, 'google')
  assert.equal(calls[0].args.options, undefined)
})

test('signInWithGoogle rethrows provider errors', async () => {
  const authError = {
    message: 'provider not enabled',
    code: 'oauth_provider_not_enabled',
  }
  const { client } = createAuthClient({
    signInWithOAuth: () => ({ data: null, error: authError }),
  })

  await assert.rejects(
    signInWithGoogle(client, { redirectTo: 'https://ojtflow.app/auth/callback' }),
    (err) => err === authError
  )
})
