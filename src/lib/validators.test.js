import test from 'node:test'
import assert from 'node:assert/strict'
import { isValidEmail, validatePlacementForm } from './validators.js'

const base = {
  companyName: 'Acme Corp',
  startDate: '2026-06-01',
  endDate: '2026-08-31',
  requiredHours: '486',
}

test('isValidEmail accepts normal addresses and rejects malformed ones', () => {
  assert.equal(isValidEmail('supervisor@example.com'), true)
  assert.equal(isValidEmail('  a.b+tag@sub.example.co  '), true)
  assert.equal(isValidEmail('not-an-email'), false)
  assert.equal(isValidEmail('missing@domain'), false)
  assert.equal(isValidEmail(''), false)
})

test('supervisor fields may all be blank', () => {
  const errors = validatePlacementForm({ ...base })
  assert.equal(errors.supervisorName, undefined)
  assert.equal(errors.supervisorEmail, undefined)
  assert.equal(errors.supervisorPhone, undefined)
  assert.deepEqual(errors, {})
})

test('optional company fields are not required', () => {
  const errors = validatePlacementForm({
    ...base,
    companyAddress: '',
    department: '',
    positionTitle: '',
  })
  assert.deepEqual(errors, {})
})

test('supervisor email is only validated when provided', () => {
  assert.deepEqual(
    validatePlacementForm({ ...base, supervisorEmail: '' }),
    {}
  )
  const invalid = validatePlacementForm({ ...base, supervisorEmail: 'nope' })
  assert.equal(
    invalid.supervisorEmail,
    'Enter a valid email address or leave it blank.'
  )
  const valid = validatePlacementForm({
    ...base,
    supervisorEmail: 'supervisor@example.com',
  })
  assert.deepEqual(valid, {})
})

test('supervisor phone accepts any non-blocking value', () => {
  const errors = validatePlacementForm({
    ...base,
    supervisorPhone: '+63 (917) 123-4567',
  })
  assert.equal(errors.supervisorPhone, undefined)
})

test('required OJT fields are still enforced', () => {
  const errors = validatePlacementForm({})
  assert.ok(errors.companyName)
  assert.ok(errors.startDate)
  assert.ok(errors.endDate)
  assert.ok(errors.requiredHours)
})
