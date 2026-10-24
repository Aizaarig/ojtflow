/*
  Pure helpers for the Account Management features in Settings.

  No imports, so they can be unit-tested under Node and reused by the account
  hook and UI. Network calls live in src/hooks/useAccount.js; privileged cleanup
  lives in the delete-account Edge Function.
*/

// Phrases the student must type to unlock each destructive action. Kept here so
// the dialog and the tests agree.
export const RESET_CONFIRM_PHRASE = 'RESET MY OJT PROGRESS'
export const DELETE_CONFIRM_PHRASE = 'DELETE MY ACCOUNT'

// What "Reset OJT Progress" clears — shown in the confirmation UI. Kept in sync
// with public.reset_ojt_progress() in the migration.
export const RESET_RECORDS = [
  { key: 'attendance', label: 'Attendance records' },
  { key: 'daily_logs', label: 'Daily activity logs' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'requirements', label: 'Requirements checklist' },
]

// Collapse whitespace, trim, and upper-case, matching the server-side check in
// the delete-account Edge Function.
export function normalizeConfirmation(value) {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').toUpperCase()
    : ''
}

export function matchesConfirmation(value, phrase) {
  return normalizeConfirmation(value) === normalizeConfirmation(phrase)
}

// Build a short, friendly summary of a successful reset from the counts the RPC
// returns, e.g. "Removed 3 attendance records, 2 daily logs, 1 task."
export function summarizeReset(result) {
  if (!result || typeof result !== 'object') return 'Your OJT progress was reset.'
  const parts = RESET_RECORDS.map(({ key, label }) => {
    const count = Number(result[key]) || 0
    return count > 0 ? `${count} ${label.toLowerCase()}` : null
  }).filter(Boolean)

  if (parts.length === 0) {
    return 'Your OJT progress was already clear — nothing needed to be removed.'
  }
  return `Removed ${parts.join(', ')}. Your placement, required hours, profile, and account were kept.`
}

// Map a failure (from supabase-js or the Edge Function) to a short,
// beginner-friendly sentence.
export function friendlyAccountError(error) {
  if (!error) return 'Something went wrong. Please try again.'
  const status = error.status
  const message = typeof error.message === 'string' ? error.message : ''

  if (/incorrect|invalid login|password/i.test(message)) {
    return 'That password is incorrect. Please try again.'
  }
  if (status === 401 || status === 403) {
    return 'Your session has expired. Please sign in again and retry.'
  }
  if (status === 404) {
    return 'Account deletion is not available yet. Please try again later.'
  }
  if (status === 500) {
    return 'Account deletion is not set up yet. Please try again later.'
  }
  if (/failed to fetch|network|timed? ?out/i.test(message)) {
    return 'Could not reach the server. Check your connection and try again.'
  }
  return message || 'Something went wrong. Please try again.'
}
