import {
  RESEND_COOLDOWN_SECONDS,
  isSixDigitCode,
  mapOtpError,
  maskEmail,
} from './recovery.js'

/*
  Helpers for the registration (signup) email-OTP step.

  Signup verification must stay separate from password recovery:
  this module only ever deals with `type: 'signup'` verification and its
  resend/cooldown behaviour. Recovery keeps using `src/lib/recovery.js`.
*/

export { isSixDigitCode, maskEmail }

export const SIGNUP_RESEND_COOLDOWN_SECONDS = RESEND_COOLDOWN_SECONDS

export function startResendCooldown(
  seconds = SIGNUP_RESEND_COOLDOWN_SECONDS,
  now = Date.now()
) {
  return now + seconds * 1000
}

export function resendCountdown(cooldownUntil, now = Date.now()) {
  if (!cooldownUntil) return 0
  return Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
}

export function canResend(cooldownUntil, now = Date.now()) {
  return resendCountdown(cooldownUntil, now) === 0
}

/*
  Supabase returns a signup payload without identities when the address is
  already taken (the SDK obfuscates whether that account is confirmed), so the
  registration step treats it as "account exists" instead of creating a
  duplicate user.
*/
export function isExistingAccount(signupData) {
  const identities = signupData?.user?.identities
  return Array.isArray(identities) && identities.length === 0
}

/*
  Where the student goes after a successful verification:
  a session means Supabase signed them in (existing flow -> dashboard),
  otherwise they still need to sign in with their password.
*/
export function verificationDestination(verifyData) {
  return verifyData?.session ? '/dashboard' : '/login'
}

export function mapSignupOtpError(error) {
  if (!error) return 'Something went wrong. Please try again.'
  const code = error.code || ''
  const raw = error.message || String(error)

  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    /rate limit|too many requests|for security purposes/i.test(raw)
  ) {
    return 'Too many attempts. Please wait a moment before requesting another code.'
  }

  if (
    code === 'already_confirmed' ||
    code === 'user_already_exists' ||
    /already confirmed|already been registered|user already registered/i.test(
      raw
    )
  ) {
    return 'This email is already verified. Try signing in instead.'
  }

  if (code === 'otp_expired' || /token has expired|invalid|expired/i.test(raw)) {
    return 'That code is invalid or has expired. Request a new code and try again.'
  }

  if (/network|fetch|timed? ?out|connection/i.test(raw)) {
    return 'We could not reach the server. Check your connection and try again.'
  }

  return mapOtpError(error)
}
