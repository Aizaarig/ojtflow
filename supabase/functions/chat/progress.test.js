import test from 'node:test'
import assert from 'node:assert/strict'
import { computeCompletedHours, computeProgress, round1 } from './progress.js'

const rec = (over = {}) => ({
  time_in: '2026-10-15T01:00:00.000Z',
  time_out: '2026-10-15T09:00:00.000Z',
  break_minutes: 0,
  ...over,
})

test('computeCompletedHours sums finished shifts only', () => {
  const records = [
    rec(), // 8h
    rec({ time_in: '2026-10-16T01:00:00.000Z', time_out: '2026-10-16T05:00:00.000Z' }), // 4h
    rec({ time_out: null }), // unfinished, ignored
    rec({ time_in: null }), // unfinished, ignored
  ]
  assert.equal(computeCompletedHours(records), 12)
})

test('computeCompletedHours subtracts break minutes', () => {
  assert.equal(computeCompletedHours([rec({ break_minutes: 60 })]), 7)
  assert.equal(computeCompletedHours([rec({ break_minutes: 30 })]), 7.5)
})

test('computeCompletedHours ignores zero/negative shifts and breaks over the shift', () => {
  assert.equal(
    computeCompletedHours([rec({ time_in: '2026-10-15T09:00:00.000Z', time_out: '2026-10-15T01:00:00.000Z' })]),
    0
  )
  assert.equal(computeCompletedHours([rec({ break_minutes: 9999 })]), 0)
})

test('computeCompletedHours tolerates bad input', () => {
  assert.equal(computeCompletedHours(), 0)
  assert.equal(computeCompletedHours([null, undefined, {}]), 0)
})

test('computeProgress computes completed/remaining/progress for a target', () => {
  const records = [rec(), rec({ time_in: '2026-10-16T01:00:00.000Z', time_out: '2026-10-16T05:00:00.000Z' })]
  const p = computeProgress(100, records)
  assert.equal(p.required, 100)
  assert.equal(p.completed, 12)
  assert.equal(p.remaining, 88)
  assert.equal(p.progress, 12)
})

test('computeProgress clamps progress at 100 and remaining at 0', () => {
  const records = Array.from({ length: 20 }, () => rec())
  const p = computeProgress(100, records)
  assert.equal(p.completed, 160)
  assert.equal(p.remaining, 0)
  assert.equal(p.progress, 100)
})

test('computeProgress returns nulls when no valid target is set', () => {
  for (const target of [null, undefined, '', 'abc', 0, -5]) {
    const p = computeProgress(target, [rec()])
    assert.equal(p.required, null, `target=${String(target)}`)
    assert.equal(p.remaining, null)
    assert.equal(p.progress, null)
  }
})

test('round1 rounds to one decimal and passes through null', () => {
  assert.equal(round1(7.25), 7.3)
  assert.equal(round1(7.24), 7.2)
  assert.equal(round1(null), null)
  assert.equal(round1(undefined), null)
})
