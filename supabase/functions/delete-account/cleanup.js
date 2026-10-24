/*
  Pure helpers for the "Delete Account Permanently" Edge Function.

  Dependency-free so they can be bundled into the Deno Edge Function AND unit
  tested with the Node test runner (mirrors the chat/progress.js pattern).
  Nothing here touches the network, so no secrets are involved.
*/

// The exact phrase the student must type. Compared case-insensitively after
// collapsing whitespace, but the surrounding UI shows it verbatim.
export const CONFIRM_PHRASE = 'DELETE MY ACCOUNT'

// Private bucket that holds each student's avatar (folder convention is
// "<user_id>/avatar", confirmed against the live storage policies).
export const AVATARS_BUCKET = 'avatars'

// Public tables whose rows belong to a student via a user_id column. Deletion
// order is child-first; ojt_placements is referenced by attendance and
// daily_logs (ON DELETE SET NULL), so clearing the children first keeps the
// cascade chatter to a minimum.
export const USER_ID_TABLES = [
  'attendance',
  'daily_logs',
  'tasks',
  'requirements',
  'ojt_placements',
]

// The profile row is keyed by the auth user id (profiles.id), not user_id.
export const PROFILE_ID_COLUMN = 'id'

// Collapse whitespace, trim, and upper-case so " delete  my account " matches.
export function normalizeConfirmation(value) {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').toUpperCase()
    : ''
}

export function isConfirmationValid(value, phrase = CONFIRM_PHRASE) {
  return normalizeConfirmation(value) === phrase
}

// A storage object is owned by the student when its first path segment equals
// their user id — exactly the rule the live storage RLS policies enforce.
export function ownsPath(path, userId) {
  if (!path || !userId) return false
  const firstSegment = String(path).split('/')[0]
  return firstSegment === userId
}

/*
  Split one page of a storage.list() result into real files and subfolders.
  Supabase returns folder pseudo-entries with a null id (and null metadata);
  everything else is a file. Names are joined onto the prefix so callers get
  full object paths. Invalid entries are ignored.
*/
export function partitionListing(entries, prefix) {
  const files = []
  const folders = []
  const base = String(prefix || '')
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!entry || typeof entry.name !== 'string' || !entry.name) continue
    const full = base ? `${base}/${entry.name}` : entry.name
    if (entry.id == null) folders.push(full)
    else files.push(full)
  }
  return { files, folders }
}

/*
  Decide the response for a deletion attempt. Success is reported ONLY when the
  database rows, the owned storage files, and the Auth user have all been
  removed. Anything else is a resumable partial result with a safe message that
  never includes internal details.
*/
export function deletionOutcome({ dbDone, storageDone, authDone }) {
  if (dbDone && storageDone && authDone) {
    return {
      ok: true,
      status: 'completed',
      message: 'Your account and all associated data have been deleted.',
    }
  }
  if (dbDone && storageDone && !authDone) {
    return {
      ok: false,
      status: 'partial',
      step: 'auth',
      message:
        'Your records and files were removed, but the sign-in account could not be deleted. Please retry to finish.',
    }
  }
  if (dbDone && !storageDone) {
    return {
      ok: false,
      status: 'partial',
      step: 'storage',
      message:
        'Your records were removed, but some files could not be deleted yet. Please retry to finish.',
    }
  }
  return {
    ok: false,
    status: 'partial',
    step: 'db',
    message: 'Your account could not be deleted. Please try again.',
  }
}
