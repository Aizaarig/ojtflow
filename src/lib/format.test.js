import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeCompletedHours,
  computeProgress,
  diffHours,
  formatDate,
  formatHours,
  formatPercent,
  toDateInput,
} from './format.js'

test('computeCompletedHours sums finished shifts and subtracts breaks', () => {
  const records = [
    { time_in: '2026-10-15T09:00:00.000Z', time_out: '2026-10-15T17:00:00.000Z', break_minutes: 60 },
    { time_in: '2026-10-16T09:00:00.000Z', time_out: '2026-10-16T10:00:00.000Z', break_minutes: 0 },
  ]
  assert.equal(computeCompletedHours(records), 8)
})

test('computeCompletedHours excludes unfinished shifts', () => {
  const records = [
    { time_in: '2026-10-15T09:00:00.000Z', time_out: null, break_minutes: 0 },
    { time_in: null, time_out: '2026-10-15T17:00:00.000Z' },
  ]
  assert.equal(computeCompletedHours(records), 0)
})

test('computeCompletedHours ignores breaks that exceed the shift', () => {
  const records = [
    { time_in: '2026-10-15T09:00:00.000Z', time_out: '2026-10-15T10:00:00.000Z', break_minutes: 120 },
  ]
  assert.equal(computeCompletedHours(records), 0)
})

test('computeCompletedHours ignores reversed/invalid ranges', () => {
  const records = [
    { time_in: '2026-10-15T17:00:00.000Z', time_out: '2026-10-15T09:00:00.000Z', break_minutes: 0 },
    { time_in: 'nope', time_out: '2026-10-15T09:00:00.000Z' },
  ]
  assert.equal(computeCompletedHours(records), 0)
})

test('computeCompletedHours tolerates missing records and negative breaks', () => {
  assert.equal(computeCompletedHours(), 0)
  const records = [
    null,
    { time_in: '2026-10-15T09:00:00.000Z', time_out: '2026-10-15T10:00:00.000Z', break_minutes: -30 },
  ]
  assert.equal(computeCompletedHours(records), 1)
})

test('computeProgress derives remaining and percent from saved records', () => {
  const records = [
    { time_in: '2026-10-15T09:00:00.000Z', time_out: '2026-10-15T17:00:00.000Z', break_minutes: 60 },
  ]
  assert.deepEqual(computeProgress(10, records), {
    required: 10,
    completed: 7,
    remaining: 3,
    progress: 70,
  })
})

test('computeProgress caps progress at 100 and floors remaining at 0', () => {
  const records = [
    { time_in: '2026-10-15T09:00:00.000Z', time_out: '2026-10-15T20:00:00.000Z', break_minutes: 0 },
  ]
  const result = computeProgress(5, records)
  assert.equal(result.progress, 100)
  assert.equal(result.remaining, 0)
})

test('computeProgress treats non-numeric or non-positive targets as unset', () => {
  for (const required of [null, undefined, '', 0, -5, 'abc']) {
    const result = computeProgress(required, [])
    assert.equal(result.required, null, `required=${String(required)}`)
    assert.equal(result.remaining, null, `required=${String(required)}`)
    assert.equal(result.progress, null, `required=${String(required)}`)
  }
})

test('computeProgress accepts numeric strings', () => {
  assert.equal(computeProgress('20', []).required, 20)
})

test('diffHours subtracts breaks and never returns a negative value', () => {
  assert.equal(diffHours('2026-10-15T09:00:00.000Z', '2026-10-15T17:00:00.000Z', 60), 7)
  assert.equal(diffHours('2026-10-15T09:00:00.000Z', '2026-10-15T10:00:00.000Z', 120), 0)
  assert.equal(diffHours('2026-10-15T10:00:00.000Z', '2026-10-15T09:00:00.000Z', 0), 0)
  assert.equal(diffHours(null, '2026-10-15T09:00:00.000Z'), 0)
})

test('formatHours handles null, negatives, and numbers', () => {
  assert.equal(formatHours(null), '—')
  assert.equal(formatHours(undefined), '—')
  assert.equal(formatHours(0), '0.0')
  assert.equal(formatHours(-4), '0.0')
  assert.equal(formatHours(7.2), '7.2')
})

test('formatPercent clamps and rounds', () => {
  assert.equal(formatPercent(null), '—%')
  assert.equal(formatPercent(80), '80%')
  assert.equal(formatPercent(150), '100%')
  assert.equal(formatPercent(-10), '0%')
})

test('formatDate renders date-only strings without a UTC off-by-one', () => {
  const expected = new Date(2026, 9, 15).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  assert.equal(formatDate('2026-10-15'), expected)
  assert.equal(formatDate(''), '')
  assert.equal(formatDate('not-a-date'), '')
})

test('toDateInput returns the same calendar day for date-only strings', () => {
  assert.equal(toDateInput('2026-10-15'), '2026-10-15')
  assert.equal(toDateInput(''), '')
})
