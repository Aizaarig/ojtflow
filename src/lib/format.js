export function formatHours(hours) {
  if (hours === null || hours === undefined || Number.isNaN(hours)) return '—'
  const val = Math.max(0, Number(hours))
  return val.toFixed(1)
}

export function formatPercent(pct) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return '—%'
  const val = Math.min(100, Math.max(0, Number(pct)))
  return `${Math.round(val * 10) / 10}%`
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/

export function formatDate(d) {
  if (!d) return ''
  let date
  if (typeof d === 'string') {
    const m = d.match(DATE_ONLY)
    // Parse date-only values in local time. `new Date('YYYY-MM-DD')` is parsed
    // as UTC midnight, which renders as the previous day in negative offsets.
    date = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(d)
  } else {
    date = d
  }
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatTime(t) {
  if (!t) return '—'
  const d = t instanceof Date ? t : new Date(t)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function toDateInput(d) {
  if (!d) return ''
  if (typeof d === 'string') {
    // Avoid the UTC-midnight shift for date-only strings.
    const m = d.match(DATE_ONLY)
    if (m) return `${m[1]}-${m[2]}-${m[3]}`
  }
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function diffHours(timeIn, timeOut, breakMinutes = 0) {
  if (!timeIn || !timeOut) return 0
  const inD = new Date(timeIn)
  const outD = new Date(timeOut)
  if (Number.isNaN(inD.getTime()) || Number.isNaN(outD.getTime())) return 0
  let ms = outD.getTime() - inD.getTime()
  if (ms <= 0) return 0
  const breakMs = Math.max(0, Number(breakMinutes) || 0) * 60000
  ms = ms - breakMs
  if (ms <= 0) return 0
  return ms / 3600000
}

export function nowISO() {
  return new Date().toISOString()
}

export function computeCompletedHours(records = []) {
  return records.reduce((sum, r) => {
    if (!r || !r.time_in || !r.time_out) return sum
    const inT = new Date(r.time_in)
    const outT = new Date(r.time_out)
    if (Number.isNaN(inT.getTime()) || Number.isNaN(outT.getTime()) || outT < inT) return sum
    const elapsedH = (outT - inT) / 3600000
    const breakH = Math.max(0, Number(r.break_minutes) || 0) / 60
    const net = elapsedH - breakH
    return net > 0 ? sum + net : sum
  }, 0)
}

/*
  Single source of truth for OJT hour progress.
  Used by the dashboard (Overview) and the Progress/Reports page so the two
  never drift. `completed` comes from completed attendance records only
  (unfinished shifts and breaks excluded), matching computeCompletedHours.
*/
export function computeProgress(requiredHours, records = []) {
  const completed = computeCompletedHours(records)
  const parsed =
    requiredHours != null && requiredHours !== '' ? Number(requiredHours) : NaN
  // Treat a missing, non-numeric, or non-positive target as "no target set".
  const required = Number.isFinite(parsed) && parsed > 0 ? parsed : null
  const remaining = required != null ? Math.max(0, required - completed) : null
  const progress = required != null ? Math.min(100, (completed / required) * 100) : null
  return { required, completed, remaining, progress }
}
