import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isSixDigitCode,
  mapOtpError,
  maskEmail,
  validateNewPassword,
} from './recovery.js'

test('maskEmail hides the local part but keeps the domain', () => {
  assert.equal(maskEmail('a@gmail.com'), 'a***@gmail.com')
  assert.equal(maskEmail('john.doe@company.org'), 'j***@company.org')
  assert.equal(maskEmail('  maria@school.edu  '), 'm***@school.edu')
})

test('maskEmail tolerates malformed input', () => {
  assert.equal(maskEmail(''), '')
  assert.equal(maskEmail(null), '')
  assert.equal(maskEmail('notanemail'), 'n***')
})

test('isSixDigitCode only accepts exactly six digits', () => {
  assert.equal(isSixDigitCode('123456'), true)
  assert.equal(isSixDigitCode(' 654321 '), true)
  assert.equal(isSixDigitCode('12345'), false)
  assert.equal(isSixDigitCode('1234567'), false)
  assert.equal(isSixDigitCode('12a456'), false)
  assert.equal(isSixDigitCode(''), false)
})

test('validateNewPassword requires a minimum length', () => {
  const short = validateNewPassword('short', 'short')
  assert.equal(short.password, 'Use at least 8 characters.')
  assert.equal(short.confirm, undefined)
})

test('validateNewPassword requires a match', () => {
  const mismatch = validateNewPassword('longenough1', 'longenough2')
  assert.equal(mismatch.password, undefined)
  assert.equal(mismatch.confirm, 'Passwords do not match.')
})

test('validateNewPassword rejects an empty password', () => {
  const empty = validateNewPassword('', '')
  assert.equal(empty.password, 'Please choose a new password.')
})

test('validateNewPassword returns no errors for a valid pair', () => {
  assert.deepEqual(validateNewPassword('longenough1', 'longenough1'), {})
})

test('mapOtpError flags expired or invalid codes', () => {
  assert.match(
    mapOtpError(new Error('Token has expired or is invalid')),
    /invalid or has expired/i
  )
})

test('mapOtpError flags rate limiting', () => {
  assert.match(
    mapOtpError(new Error('Email rate limit exceeded')),
    /too many attempts/i
  )
  assert.match(
    mapOtpError(new Error('For security purposes, you can only request this after 43 seconds')),
    /too many attempts/i
  )
})

test('mapOtpError flags network failures', () => {
  assert.match(
    mapOtpError(new Error('Failed to fetch')),
    /reach the server/i
  )
})

test('mapOtpError passes through unknown messages', () => {
  assert.equal(mapOtpError(new Error('Weird thing')), 'Weird thing')
  assert.equal(
    mapOtpError(null),
    'Something went wrong. Please try again.'
  )
})
