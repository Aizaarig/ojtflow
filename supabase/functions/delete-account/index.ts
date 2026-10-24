// OJTFlow "Delete Account Permanently" Edge Function.
//
// Runs entirely server-side with the service-role key so privileged cleanup is
// never possible from the browser. The caller is authenticated with their
// Supabase JWT and must re-enter their password; only then are their own
// records, their own avatar files, and finally their Auth user removed.
//
// Ordering guarantees resumability: the Auth user is deleted LAST, so if any
// earlier step fails the session stays valid and the student can safely retry.
//
// Secrets (set with the Supabase CLI or the dashboard, never committed):
//   SUPABASE_URL                required  — auto-provided in hosted functions
//   SUPABASE_ANON_KEY           required  — auto-provided in hosted functions
//   SUPABASE_SERVICE_ROLE_KEY   required  — DESTRUCTIVE key, server-side only
//
// NOTE: the service-role key must never be exposed to the client, placed in a
// VITE_* variable, or committed. It only ever lives in this server function.

import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  AVATARS_BUCKET,
  PROFILE_ID_COLUMN,
  USER_ID_TABLES,
  deletionOutcome,
  isConfirmationValid,
  partitionListing,
} from './cleanup.js'

const MAX_LIST_PAGE = 100
const MAX_LIST_BATCHES = 100
const MAX_FOLDER_DEPTH = 10
const MAX_PASSWORD_LENGTH = 1024

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/*
  List every entry under a prefix, following pagination. Folder pseudo-entries
  and real files are separated. Bounded by MAX_LIST_BATCHES to avoid an infinite
  loop if the backend ever misbehaves.
*/
async function listPrefix(
  supabase: any,
  prefix: string
): Promise<{ files: string[]; folders: string[] }> {
  const files: string[] = []
  const folders: string[] = []
  let offset = 0
  for (let guard = 0; guard < MAX_LIST_BATCHES; guard++) {
    const { data, error } = await supabase.storage
      .from(AVATARS_BUCKET)
      .list(prefix, { limit: MAX_LIST_PAGE, offset })
    if (error) throw error
    if (!data || data.length === 0) break

    const part = partitionListing(data, prefix)
    files.push(...part.files)
    folders.push(...part.folders)

    if (data.length < MAX_LIST_PAGE) break
    offset += data.length
  }
  return { files, folders }
}

/*
  Recursively remove everything under a prefix: files are deleted in batches and
  subfolders are drained depth-first. Returns false on any failure or excessive
  nesting so the caller never reports success while files remain.
*/
async function clearPrefix(
  supabase: any,
  prefix: string,
  depth = 0
): Promise<boolean> {
  if (depth > MAX_FOLDER_DEPTH) return false
  const { files, folders } = await listPrefix(supabase, prefix)
  if (files.length > 0) {
    const { error } = await supabase.storage.from(AVATARS_BUCKET).remove(files)
    if (error) return false
  }
  for (const folder of folders) {
    const ok = await clearPrefix(supabase, folder, depth + 1)
    if (!ok) return false
  }
  return true
}

/*
  Remove every storage object the student owns, then verify their folder is
  empty. Only ever touches paths under "<user_id>/" — the prefix comes from the
  verified JWT and matches the live storage RLS rule (first segment = uid), so
  other students' files are never in scope.
*/
async function clearOwnedFiles(supabase: any, userId: string): Promise<boolean> {
  try {
    const cleared = await clearPrefix(supabase, userId)
    if (!cleared) return false
    const { data, error } = await supabase.storage
      .from(AVATARS_BUCKET)
      .list(userId, { limit: 1 })
    if (error) return false
    return !data || data.length === 0
  } catch {
    return false
  }
}

async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('delete-account: missing required environment secrets')
    return json(
      { error: 'Account deletion is not configured yet. Please try again later.' },
      500
    )
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'You must be signed in to delete your account.' }, 401)
  }

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid request.' }, 400)
  }

  const password = typeof payload?.password === 'string' ? payload.password : ''
  // Validate the typed confirmation on the server; never trust the client to
  // have enforced it.
  if (!isConfirmationValid(payload?.confirmation)) {
    return json(
      { error: 'Please type the confirmation phrase exactly as shown.' },
      400
    )
  }
  if (!password) {
    return json({ error: 'Please enter your password to confirm.' }, 400)
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return json({ error: 'Invalid request.' }, 400)
  }

  // Identify the caller from their verified token only.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let userId: string
  let userEmail: string
  try {
    const { data, error } = await userClient.auth.getUser()
    if (error || !data?.user?.email) {
      return json(
        { error: 'Your session has expired. Please sign in again.' },
        401
      )
    }
    userId = data.user.id
    userEmail = data.user.email
  } catch {
    return json(
      { error: 'Could not verify your session. Please sign in again.' },
      401
    )
  }

  // Re-authenticate server-side. Only email/password is enabled on this
  // project, so a fresh password sign-in is the re-auth check.
  try {
    const verifier = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error: signInError } = await verifier.auth.signInWithPassword({
      email: userEmail,
      password,
    })
    if (signInError) {
      return json({ error: 'That password is incorrect. Please try again.' }, 401)
    }
  } catch {
    return json(
      { error: 'Could not verify your password. Please try again.' },
      401
    )
  }

  // Privileged client — service role bypasses RLS by design. Never use this for
  // reads the caller should be authorized for; here it is strictly the approved
  // cleanup of the caller's own rows.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // 1) Database rows (child-first). Each delete is idempotent.
  let dbDone = true
  for (const table of USER_ID_TABLES) {
    const { error } = await admin.from(table).delete().eq('user_id', userId)
    if (error) {
      console.error(`delete-account: failed to delete ${table}`)
      dbDone = false
      break
    }
  }
  if (dbDone) {
    const { error } = await admin
      .from('profiles')
      .delete()
      .eq(PROFILE_ID_COLUMN, userId)
    if (error) {
      console.error('delete-account: failed to delete profile')
      dbDone = false
    }
  }

  // 2) Owned storage files (only if the database cleanup succeeded).
  const storageDone = dbDone ? await clearOwnedFiles(admin, userId) : false

  // 3) Auth user LAST, only once all data is confirmed gone.
  let authDone = false
  if (dbDone && storageDone) {
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) {
      console.error('delete-account: failed to delete auth user')
    } else {
      authDone = true
    }
  }

  const outcome = deletionOutcome({ dbDone, storageDone, authDone })
  return json(outcome, 200)
}

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    return await handle(req)
  } catch {
    // Never leak internal details or secrets; the request is safe to retry.
    console.error('delete-account: unhandled error')
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
})
