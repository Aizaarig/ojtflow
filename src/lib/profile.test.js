import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PROFILE_COLUMNS,
  buildProfilePayload,
  ensureProfileRecord,
  fetchProfileRecord,
} from './profile.js'

/*
  Minimal chainable stand-in for the Supabase PostgrestBuilder:

    .from('profiles').select().eq().maybeSingle()
    .from('profiles').upsert().select().maybeSingle()

  `triggerRow` simulates a database trigger that creates the row when the
  insert itself is blocked (RLS / trigger-only setup): the upsert fails but a
  follow-up read finds the row.
*/
function createProfilesClient({
  rows = [],
  upsertResult,
  upsertError = null,
  selectError = null,
  triggerRow = null,
} = {}) {
  const state = { rows: [...rows], upserts: [] }

  return {
    state,
    from(table) {
      assert.equal(table, 'profiles')
      return {
        select() {
          return {
            eq() {
              return this
            },
            async maybeSingle() {
              if (selectError) return { data: null, error: selectError }
              return { data: state.rows[0] ?? null, error: null }
            },
          }
        },
        upsert(payload, options) {
          state.upserts.push({ payload, options })
          if (upsertError && triggerRow) state.rows.push(triggerRow)
          return {
            select() {
              return {
                async maybeSingle() {
                  if (upsertError) return { data: null, error: upsertError }
                  const record = upsertResult ?? payload
                  state.rows.push(record)
                  return { data: record, error: null }
                },
              }
            },
          }
        },
      }
    },
  }
}

const AUTH_USER = {
  id: 'user-1',
  user_metadata: {
    full_name: 'Juan Dela Cruz',
    school_name: 'State U',
    course: 'BSIT',
    year_level: '4th Year',
  },
}

test('buildProfilePayload maps registration metadata onto the row', () => {
  assert.deepEqual(buildProfilePayload(AUTH_USER), {
    id: 'user-1',
    full_name: 'Juan Dela Cruz',
    school_name: 'State U',
    course: 'BSIT',
    year_level: '4th Year',
  })
})

test('buildProfilePayload tolerates missing metadata', () => {
  assert.deepEqual(buildProfilePayload({ id: 'user-2' }), {
    id: 'user-2',
    full_name: '',
    school_name: '',
    course: '',
    year_level: '',
  })
  assert.equal(
    buildProfilePayload({ id: 'u', user_metadata: { name: 'Ana' } }).full_name,
    'Ana'
  )
})

test('fetchProfileRecord returns null without a user', async () => {
  assert.equal(await fetchProfileRecord(createProfilesClient(), null), null)
})

test('ensureProfileRecord reuses an existing row instead of duplicating it', async () => {
  const existing = { id: 'user-1', full_name: 'Juan Dela Cruz' }
  const client = createProfilesClient({ rows: [existing] })

  const first = await ensureProfileRecord(client, AUTH_USER)
  const second = await ensureProfileRecord(client, AUTH_USER)

  assert.equal(first, existing)
  assert.equal(second, existing)
  assert.equal(client.state.upserts.length, 0)
})

test('ensureProfileRecord creates the row once when it is missing', async () => {
  const client = createProfilesClient()

  const created = await ensureProfileRecord(client, AUTH_USER)

  assert.equal(created.id, 'user-1')
  assert.equal(client.state.upserts.length, 1)
  assert.deepEqual(client.state.upserts[0].options, { onConflict: 'id' })
  assert.equal(client.state.upserts[0].payload.full_name, 'Juan Dela Cruz')

  // A second verification/refresh must not insert a duplicate profile.
  const again = await ensureProfileRecord(client, AUTH_USER)
  assert.equal(again.id, 'user-1')
  assert.equal(client.state.upserts.length, 1)
})

test('ensureProfileRecord re-reads when the insert is blocked', async () => {
  const triggerRow = { id: 'user-1', full_name: 'Created by trigger' }
  const client = createProfilesClient({
    rows: [],
    upsertError: { message: 'new row violates row-level security policy' },
    triggerRow,
  })

  const record = await ensureProfileRecord(client, AUTH_USER)

  assert.equal(record, triggerRow)
  assert.equal(client.state.upserts.length, 1)
})

test('ensureProfileRecord gives up cleanly when the insert stays blocked', async () => {
  const client = createProfilesClient({
    rows: [],
    upsertError: { message: 'permission denied' },
  })

  const record = await ensureProfileRecord(client, AUTH_USER)

  assert.equal(record, null)
})

test('ensureProfileRecord surfaces a failed read so callers keep prior state', async () => {
  const client = createProfilesClient({
    selectError: new Error('TypeError: Failed to fetch'),
  })

  await assert.rejects(ensureProfileRecord(client, AUTH_USER), /Failed to fetch/)
})

test('ensureProfileRecord returns null without a user', async () => {
  const client = createProfilesClient()
  assert.equal(await ensureProfileRecord(client, undefined), null)
  assert.equal(client.state.upserts.length, 0)
})

test('PROFILE_COLUMNS includes every column the app renders', () => {
  for (const column of [
    'id',
    'full_name',
    'school_name',
    'course',
    'year_level',
    'created_at',
  ]) {
    assert.ok(PROFILE_COLUMNS.includes(column), `missing ${column}`)
  }
})
