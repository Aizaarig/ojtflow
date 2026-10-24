import { diffHours } from './format.js'

/*
  Pure data logic for the dashboard "OJT Hours Trend" chart.

  Hours are derived from attendance records using the same rules as
  computeCompletedHours/computeProgress in src/lib/format.js:
    - only records with BOTH time_in and time_out count,
    - break_minutes is subtracted,
    - a net of zero or less is ignored (incomplete/active shifts excluded),
    - each record is counted exactly once.

  Staying dependency-free makes this easy to unit-test under Node.
*/

export const TREND_RANGES = [
  { key: 'week', label: 'This week' },
  { key: '4w', label: '4 weeks' },
  { key: '12w', label: '12 weeks' },
]

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// Parse a "YYYY-MM-DD" (or ISO) value in local time. Date-only strings are
// handled explicitly to avoid the UTC-midnight off-by-one.
export function parseDateValue(value) {
  if (!value) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value))
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function dateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Net hours for a single record, ignoring incomplete or invalid shifts.
export function hoursForRecord(record) {
  if (!record || !record.time_in || !record.time_out) return 0
  const hours = diffHours(record.time_in, record.time_out, record.break_minutes)
  return hours > 0 ? hours : 0
}

// Monday 00:00 of the week containing `date`.
export function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const sinceMonday = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - sinceMonday)
  return d
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// Total counted hours in a set of series points.
export function sumSeriesHours(points = []) {
  return points.reduce((sum, p) => sum + (Number(p.hours) || 0), 0)
}

// Round a maximum up to a friendly axis ceiling (never below 4 hours).
export function niceMax(max) {
  const value = Number(max)
  if (!Number.isFinite(value) || value <= 0) return 4
  const steps = [1, 2, 4, 5, 8, 10, 12, 16, 20, 24, 30, 36, 40, 48, 60, 80, 100]
  for (const s of steps) if (value <= s) return s
  return Math.ceil(value / 50) * 50
}

/*
  Build the chart series for the selected range.

  Returns an array of points:
    { key, date, endDate, label, hours, isCurrent }
  - 'week'  -> 7 daily points for the current Mon–Sun week.
  - '4w'    -> 4 weekly points (labels are each week's start date).
  - '12w'   -> 12 weekly points.
  `isCurrent` marks today's day (week range) or the current week (weekly ranges).
*/
export function buildTrendSeries(records = [], range = 'week', today = new Date()) {
  const buckets = new Map()
  for (const record of Array.isArray(records) ? records : []) {
    const day = parseDateValue(record?.work_date) || parseDateValue(record?.time_in)
    if (!day) continue
    const hours = hoursForRecord(record)
    if (hours <= 0) continue
    const key = dateKey(day)
    buckets.set(key, (buckets.get(key) || 0) + hours)
  }

  const todayKey = dateKey(today)

  if (range === 'week') {
    const monday = startOfWeek(today)
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(monday, i)
      const key = dateKey(day)
      return {
        key,
        date: key,
        endDate: key,
        label: WEEKDAYS[day.getDay()],
        hours: buckets.get(key) || 0,
        isCurrent: key === todayKey,
      }
    })
  }

  const weeks = range === '12w' ? 12 : 4
  const thisMonday = startOfWeek(today)
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(thisMonday, (i - (weeks - 1)) * 7)
    const end = addDays(start, 6)
    let hours = 0
    for (let d = 0; d < 7; d++) {
      hours += buckets.get(dateKey(addDays(start, d))) || 0
    }
    return {
      key: dateKey(start),
      date: dateKey(start),
      endDate: dateKey(end),
      label: `${MONTHS[start.getMonth()]} ${start.getDate()}`,
      hours,
      isCurrent: i === weeks - 1,
    }
  })
}
