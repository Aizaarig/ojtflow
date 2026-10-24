import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildTrendSeries,
  dateKey,
  hoursForRecord,
  niceMax,
  parseDateValue,
  startOfWeek,
  sumSeriesHours,
} from './trend.js'

const rec = (over = {}) => ({
  work_date: '2026-10-15',
  time_in: '2026-10-15T01:00:00.000Z',
  time_out: '2026-10-15T09:00:00.000Z',
  break_minutes: 0,
  ...over,
})

test('hoursForRecord counts finished shifts and subtracts breaks', () => {
  assert.equal(hoursForRecord(rec()), 8)
  assert.equal(hoursForRecord(rec({ break_minutes: 60 })), 7)
})

test('hoursForRecord ignores incomplete, reversed, and invalid shifts', () => {
  assert.equal(hoursForRecord(rec({ time_out: null })), 0)
  assert.equal(hoursForRecord(rec({ time_in: null })), 0)
  assert.equal(hoursForRecord(rec({ time_in: '2026-10-15T09:00:00.000Z', time_out: '2026-10-15T01:00:00.000Z' })), 0)
  assert.equal(hoursForRecord(rec({ break_minutes: 9999 })), 0)
  assert.equal(hoursForRecord(null), 0)
})

test('startOfWeek returns the Monday of the week', () => {
  // 2026-10-15 is a Thursday.
  assert.equal(dateKey(startOfWeek(new Date(2026, 9, 15))), '2026-10-12')
  // Sunday belongs to the week that started the previous Monday.
  assert.equal(dateKey(startOfWeek(new Date(2026, 9, 18))), '2026-10-12')
  assert.equal(dateKey(startOfWeek(new Date(2026, 9, 12))), '2026-10-12')
})

test('buildTrendSeries week returns Mon–Sun with weekday labels', () => {
  const today = new Date(2026, 9, 15) // Thu
  const points = buildTrendSeries([rec()], 'week', today)
  assert.equal(points.length, 7)
  assert.deepEqual(points.map((p) => p.label), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  assert.equal(points[0].date, '2026-10-12')
  assert.equal(points[6].date, '2026-10-18')
  assert.equal(points[3].hours, 8) // Thu 2026-10-15
  assert.equal(points[3].isCurrent, true)
  assert.equal(points.filter((p) => p.isCurrent).length, 1)
})

test('buildTrendSeries groups multiple records on the same day without double counting', () => {
  const today = new Date(2026, 9, 15)
  const records = [
    rec({ time_in: '2026-10-15T01:00:00.000Z', time_out: '2026-10-15T04:00:00.000Z' }), // 3h
    rec({ time_in: '2026-10-15T05:00:00.000Z', time_out: '2026-10-15T07:00:00.000Z' }), // 2h
  ]
  const points = buildTrendSeries(records, 'week', today)
  assert.equal(points[3].hours, 5)
  assert.equal(sumSeriesHours(points), 5)
})

test('buildTrendSeries excludes incomplete and out-of-range records', () => {
  const today = new Date(2026, 9, 15)
  const records = [
    rec({ time_out: null }), // active/incomplete
    rec({ work_date: '2026-09-01', time_in: '2026-09-01T01:00:00.000Z', time_out: '2026-09-01T09:00:00.000Z' }), // other week
    { work_date: null, time_in: null, time_out: null }, // junk
  ]
  const points = buildTrendSeries(records, 'week', today)
  assert.equal(sumSeriesHours(points), 0)
})

test('buildTrendSeries 4w returns four weekly buckets, current week last', () => {
  const today = new Date(2026, 9, 15) // week of Oct 12
  const points = buildTrendSeries([rec()], '4w', today)
  assert.equal(points.length, 4)
  assert.deepEqual(points.map((p) => p.date), [
    '2026-09-21',
    '2026-09-28',
    '2026-10-05',
    '2026-10-12',
  ])
  assert.equal(points.at(-1).isCurrent, true)
  assert.equal(points.at(-1).hours, 8)
  assert.equal(points.at(-1).endDate, '2026-10-18')
  assert.equal(points.at(-1).label, 'Oct 12')
})

test('buildTrendSeries 12w returns twelve buckets', () => {
  const points = buildTrendSeries([], '12w', new Date(2026, 9, 15))
  assert.equal(points.length, 12)
})

test('buildTrendSeries tolerates non-array records', () => {
  assert.equal(buildTrendSeries(undefined, 'week', new Date(2026, 9, 15)).length, 7)
})

test('niceMax rounds up to friendly ceilings', () => {
  assert.equal(niceMax(0), 4)
  assert.equal(niceMax(3), 4)
  assert.equal(niceMax(4), 4)
  assert.equal(niceMax(7.5), 8)
  assert.equal(niceMax(9), 10)
  assert.equal(niceMax(13), 16)
  assert.equal(niceMax(37), 40)
  assert.equal(niceMax(120), 150)
})

test('parseDateValue handles date-only and invalid input', () => {
  assert.equal(dateKey(parseDateValue('2026-10-15')), '2026-10-15')
  assert.equal(parseDateValue('nonsense'), null)
  assert.equal(parseDateValue(null), null)
})
