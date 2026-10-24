/*
  Server-side mirror of the OJT hour/progress math in src/lib/format.js.

  The Edge Function cannot import frontend modules across the repo boundary, so
  this file is the single source of truth for the values the assistant is told.
  It stays dependency-free (no Deno or npm imports) so it can be bundled into
  the Edge Function AND unit-tested with the Node test runner.

  Keep this in sync with computeCompletedHours / computeProgress in
  src/lib/format.js.
*/

export function computeCompletedHours(records = []) {
  return records.reduce((sum, r) => {
    if (!r || !r.time_in || !r.time_out) return sum
    const inT = new Date(r.time_in)
    const outT = new Date(r.time_out)
    if (Number.isNaN(inT.getTime()) || Number.isNaN(outT.getTime()) || outT < inT) {
      return sum
    }
    const elapsedH = (outT - inT) / 3600000
    const breakH = Math.max(0, Number(r.break_minutes) || 0) / 60
    const net = elapsedH - breakH
    return net > 0 ? sum + net : sum
  }, 0)
}

/*
  Progress for a target number of required hours against attendance records.
  A missing, non-numeric, or non-positive target means "no target set" and all
  derived values are null — the assistant must not invent a percentage then.
*/
export function computeProgress(requiredHours, records = []) {
  const completed = computeCompletedHours(records)
  const parsed =
    requiredHours != null && requiredHours !== '' ? Number(requiredHours) : NaN
  const required = Number.isFinite(parsed) && parsed > 0 ? parsed : null
  const remaining = required != null ? Math.max(0, required - completed) : null
  const progress = required != null ? Math.min(100, (completed / required) * 100) : null
  return { required, completed, remaining, progress }
}

export function round1(n) {
  if (n == null || Number.isNaN(Number(n))) return null
  return Math.round(Number(n) * 10) / 10
}
