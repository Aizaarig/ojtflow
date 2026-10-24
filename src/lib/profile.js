/*
  Profile row helpers.

  Extracted from AuthProvider so the behaviour that runs after a successful
  signup verification can be unit tested: the record must be created exactly
  once (idempotent), never duplicated, and must fall back to re-reading when
  the insert is blocked (e.g. a trigger-only setup or RLS).

  All functions receive the Supabase client as an argument; none of them
  touch React state.
*/

export const PROFILE_COLUMNS =
  'id, full_name, school_name, course, year_level, avatar_path, created_at, updated_at'

export function buildProfilePayload(authUser) {
  const meta = authUser?.user_metadata || {}
  return {
    id: authUser.id,
    full_name: meta.full_name || meta.name || '',
    school_name: meta.school_name || '',
    course: meta.course || '',
    year_level: meta.year_level || '',
  }
}

export async function fetchProfileRecord(client, authUser) {
  if (!authUser) return null
  const { data, error } = await client
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', authUser.id)
    .maybeSingle()
  if (error) throw error
  return data
}

/*
  Creates the student's profile row from the registration metadata when one
  does not already exist. This is intentionally idempotent: if a database
  trigger already created the row (on auth.users insert), the initial SELECT
  finds it and nothing is inserted. If the insert is blocked by RLS
  (trigger-only setup), we re-read before giving up.
*/
export async function ensureProfileRecord(client, authUser) {
  if (!authUser) return null

  const existing = await fetchProfileRecord(client, authUser)
  if (existing) return existing

  const { data, error } = await client
    .from('profiles')
    .upsert(buildProfilePayload(authUser), { onConflict: 'id' })
    .select(PROFILE_COLUMNS)
    .maybeSingle()

  if (error) {
    const retry = await fetchProfileRecord(client, authUser)
    return retry ?? null
  }

  return data ?? null
}
