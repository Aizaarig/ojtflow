export const OTP_LENGTH = 6
export const MIN_PASSWORD_LENGTH = 8

// Client-side courtesy cooldown before offering "Resend code" again. The hard
// limit on how often emails can be sent is enforced by Supabase, so a rejected
// resend is still handled gracefully via mapOtpError.
export const RESEND_COOLDOWN_SECONDS = 60

export function maskEmail(email) {
  const value = String(email ?? '').trim()
  if (!value) return ''
  const at = value.lastIndexOf('@')
  if (at <= 0) return `${value[0]}***`
  const local = value.slice(0, at)
  const domain = value.slice(at + 1)
  return `${local[0] || ''}***@${domain}`
}

export function isSixDigitCode(value) {
  return /^\d{6}$/.test(String(value ?? '').trim())
}

export function validateNewPassword(password, confirm) {
  const errors = {}
  const pw = String(password ?? '')
  if (!pw) {
    errors.password = 'Please choose a new password.'
  } else if (pw.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (String(confirm ?? '') !== pw) {
    errors.confirm = 'Passwords do not match.'
  }
  return errors
}

export function mapOtpError(error) {
  if (!error) return 'Something went wrong. Please try again.'
  const raw = error.message || String(error)

  if (/rate limit|too many requests|for security purposes/i.test(raw)) {
    return 'Too many attempts. Please wait a moment before requesting another code.'
  }
  if (/token has expired|invalid|expired/i.test(raw)) {
    return 'That code is invalid or has expired. Request a new code and try again.'
  }
  if (/network|fetch|timed? ?out|connection/i.test(raw)) {
    return 'We could not reach the server. Check your connection and try again.'
  }
  return raw
}
