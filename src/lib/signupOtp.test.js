import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SIGNUP_RESEND_COOLDOWN_SECONDS,
  canResend,
  isExistingAccount,
  isSixDigitCode,
  mapSignupOtpError,
  maskEmail,
  resendCountdown,
  startResendCooldown,
  verificationDestination,
} from './signupOtp.js'

test('signup resend cooldown is 60 seconds', () => {
  assert.equal(SIGNUP_RESEND_COOLDOWN_SECONDS, 60)
})

test('startResendCooldown computes the exact resend time', () => {
  const now = 1_700_000_000_000
  assert.equal(
    startResendCooldown(SIGNUP_RESEND_COOLDOWN_SECONDS, now),
    now + 60_000
  )
})

test('resendCountdown counts down to zero and never goes negative', () => {
  const now = 1_700_000_000_000
  const until = startResendCooldown(60, now)

  assert.equal(resendCountdown(until, now), 60)
  assert.equal(resendCountdown(until, now + 1_000), 59)
  assert.equal(resendCountdown(until, now + 30_000), 30)
  assert.equal(resendCountdown(until, now + 59_999), 1)
  assert.equal(resendCountdown(until, now + 60_000), 0)
  assert.equal(resendCountdown(until, now + 120_000), 0)
  assert.equal(resendCountdown(0, now), 0)
})

test('canResend blocks during the cooldown and opens after it', () => {
  const now = 1_700_000_000_000
  const until = startResendCooldown(60, now)

  assert.equal(canResend(until, now), false)
  assert.equal(canResend(until, now + 59_000), false)
  assert.equal(canResend(until, now + 60_000), true)
})

test('isExistingAccount detects an already-registered address', () => {
  assert.equal(isExistingAccount({ user: { identities: [] } }), true)
  assert.equal(
    isExistingAccount({ user: { identities: [{ id: 'i1' }] } }),
    false
  )
  assert.equal(isExistingAccount({ user: {} }), false)
  assert.equal(isExistingAccount(null), false)
})

test('verificationDestination sends a signed-in student to the dashboard', () => {
  assert.equal(
    verificationDestination({ session: { access_token: 't' }, user: {} }),
    '/dashboard'
  )
  assert.equal(verificationDestination({ session: null, user: {} }), '/login')
  assert.equal(verificationDestination(null), '/login')
})

test('mapSignupOtpError explains invalid or expired codes', () => {
  assert.match(
    mapSignupOtpError({ message: 'Token has expired or is invalid' }),
    /invalid or has expired/i
  )
  assert.match(
    mapSignupOtpError({ message: 'Invalid token', code: 'otp_expired' }),
    /invalid or has expired/i
  )
  assert.match(
    mapSignupOtpError({ message: 'OTP expired', code: 'otp_expired' }),
    /invalid or has expired/i
  )
})

test('mapSignupOtpError explains Supabase rate limits', () => {
  assert.match(
    mapSignupOtpError({
      message: 'For security purposes, you can only request this after 43 seconds',
    }),
    /too many attempts/i
  )
  assert.match(
    mapSignupOtpError({
      message: 'Email rate limit exceeded',
      code: 'over_email_send_rate_limit',
    }),
    /too many attempts/i
  )
})

test('mapSignupOtpError explains network failures', () => {
  assert.match(
    mapSignupOtpError({ message: 'TypeError: Failed to fetch' }),
    /reach the server/i
  )
  assert.match(mapSignupOtpError(new Error('request timed out')), /reach the server/i)
})

test('mapSignupOtpError flags an address that is already verified', () => {
  assert.match(
    mapSignupOtpError({ message: 'User already registered', code: 'already_confirmed' }),
    /already verified/i
  )
})

test('mapSignupOtpError has a safe default', () => {
  assert.equal(
    mapSignupOtpError(null),
    'Something went wrong. Please try again.'
  )
  assert.equal(mapSignupOtpError({ message: 'Weird thing' }), 'Weird thing')
})

test('the OTP helpers reused by the signup screen behave as documented', () => {
  assert.equal(isSixDigitCode('123456'), true)
  assert.equal(isSixDigitCode('12345'), false)
  assert.equal(maskEmail('juan@school.edu'), 'j***@school.edu')
})
