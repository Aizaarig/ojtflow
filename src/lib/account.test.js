import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DELETE_CONFIRM_PHRASE,
  RESET_CONFIRM_PHRASE,
  RESET_RECORDS,
  friendlyAccountError,
  matchesConfirmation,
  normalizeConfirmation,
  summarizeReset,
} from './account.js'

test('confirmation phrases are the expected exact strings', () => {
  assert.equal(RESET_CONFIRM_PHRASE, 'RESET MY OJT PROGRESS')
  assert.equal(DELETE_CONFIRM_PHRASE, 'DELETE MY ACCOUNT')
})

test('RESET_RECORDS matches the reset scope', () => {
  assert.deepEqual(
    RESET_RECORDS.map((r) => r.key),
    ['attendance', 'daily_logs', 'tasks', 'requirements']
  )
})

test('normalizeConfirmation trims, collapses spaces, and upper-cases', () => {
  assert.equal(normalizeConfirmation('  delete   my  account '), 'DELETE MY ACCOUNT')
  assert.equal(normalizeConfirmation('reset my ojt progress'), 'RESET MY OJT PROGRESS')
  assert.equal(normalizeConfirmation(''), '')
  assert.equal(normalizeConfirmation(null), '')
  assert.equal(normalizeConfirmation(123), '')
})

test('matchesConfirmation is case- and whitespace-insensitive', () => {
  assert.equal(matchesConfirmation('delete my account', DELETE_CONFIRM_PHRASE), true)
  assert.equal(matchesConfirmation('  Delete  My\tAccount  ', DELETE_CONFIRM_PHRASE), true)
  assert.equal(matchesConfirmation('reset my ojt progress', RESET_CONFIRM_PHRASE), true)
})

test('matchesConfirmation rejects partial or wrong phrases', () => {
  assert.equal(matchesConfirmation('delete my accounts', DELETE_CONFIRM_PHRASE), false)
  assert.equal(matchesConfirmation('delete', DELETE_CONFIRM_PHRASE), false)
  assert.equal(matchesConfirmation('', DELETE_CONFIRM_PHRASE), false)
  assert.equal(matchesConfirmation(null, DELETE_CONFIRM_PHRASE), false)
})

test('summarizeReset reports the removed counts and what was kept', () => {
  const message = summarizeReset({
    attendance: 3,
    daily_logs: 2,
    tasks: 1,
    requirements: 0,
  })
  assert.match(message, /3 attendance records/)
  assert.match(message, /2 daily activity logs/)
  assert.match(message, /1 tasks/)
  assert.match(message, /kept/i)
})

test('summarizeReset handles nothing-to-remove and bad input', () => {
  assert.match(
    summarizeReset({ attendance: 0, daily_logs: 0, tasks: 0, requirements: 0 }),
    /already clear/i
  )
  assert.match(summarizeReset(null), /reset/i)
})

test('friendlyAccountError flags an incorrect password', () => {
  assert.match(
    friendlyAccountError({ message: 'That password is incorrect. Please try again.' }),
    /password is incorrect/i
  )
})

test('friendlyAccountError maps known statuses', () => {
  assert.match(friendlyAccountError({ status: 401 }), /session has expired/i)
  assert.match(friendlyAccountError({ status: 403 }), /session has expired/i)
  assert.match(friendlyAccountError({ status: 404 }), /not available yet/i)
  assert.match(friendlyAccountError({ status: 500 }), /not set up yet/i)
})

test('friendlyAccountError maps network failures and has a default', () => {
  assert.match(friendlyAccountError({ message: 'TypeError: Failed to fetch' }), /could not reach/i)
  assert.match(friendlyAccountError({ message: 'request timed out' }), /could not reach/i)
  assert.match(friendlyAccountError(null), /something went wrong/i)
  assert.match(friendlyAccountError({}), /something went wrong/i)
})
