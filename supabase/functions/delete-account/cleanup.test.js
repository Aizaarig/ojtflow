import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AVATARS_BUCKET,
  CONFIRM_PHRASE,
  PROFILE_ID_COLUMN,
  USER_ID_TABLES,
  deletionOutcome,
  isConfirmationValid,
  normalizeConfirmation,
  ownsPath,
  partitionListing,
} from './cleanup.js'

test('server confirmation matches the client phrase', () => {
  assert.equal(CONFIRM_PHRASE, 'DELETE MY ACCOUNT')
  assert.equal(normalizeConfirmation('  delete   my account '), 'DELETE MY ACCOUNT')
  assert.equal(isConfirmationValid('delete my account'), true)
  assert.equal(isConfirmationValid('  DELETE  MY  ACCOUNT  '), true)
  assert.equal(isConfirmationValid('delete my accounts'), false)
  assert.equal(isConfirmationValid(''), false)
  assert.equal(isConfirmationValid(null), false)
})

test('USER_ID_TABLES covers the owned tables, children first, no profile', () => {
  assert.deepEqual(USER_ID_TABLES, [
    'attendance',
    'daily_logs',
    'tasks',
    'requirements',
    'ojt_placements',
  ])
  assert.equal(USER_ID_TABLES.includes('profiles'), false)
  assert.equal(PROFILE_ID_COLUMN, 'id')
  assert.equal(AVATARS_BUCKET, 'avatars')
})

test('ownsPath checks the first folder segment only', () => {
  const uid = '11111111-2222-3333-4444-555555555555'
  assert.equal(ownsPath(`${uid}/avatar`, uid), true)
  assert.equal(ownsPath(`${uid}/nested/file.png`, uid), true)
  assert.equal(ownsPath(`other-id/avatar`, uid), false)
  assert.equal(ownsPath('avatar', uid), false)
  assert.equal(ownsPath('', uid), false)
  assert.equal(ownsPath(`${uid}/avatar`, ''), false)
})

test('partitionListing separates files from folder pseudo-entries', () => {
  const uid = 'uid-1'
  const { files, folders } = partitionListing(
    [
      { id: 'abc', name: 'avatar', metadata: {} },
      { id: null, name: 'sub', metadata: null },
      { id: 'def', name: 'notes.txt', metadata: {} },
    ],
    uid
  )
  assert.deepEqual(files, [`${uid}/avatar`, `${uid}/notes.txt`])
  assert.deepEqual(folders, [`${uid}/sub`])
})

test('partitionListing ignores malformed entries and handles bare prefixes', () => {
  assert.deepEqual(partitionListing(null, 'uid-1'), { files: [], folders: [] })
  assert.deepEqual(partitionListing([null, { name: '' }, {}], 'uid-1'), {
    files: [],
    folders: [],
  })
  const bare = partitionListing([{ id: 'x', name: 'a' }], '')
  assert.deepEqual(bare.files, ['a'])
})

test('deletionOutcome reports success only when everything is done', () => {
  assert.deepEqual(
    deletionOutcome({ dbDone: true, storageDone: true, authDone: true }),
    {
      ok: true,
      status: 'completed',
      message: 'Your account and all associated data have been deleted.',
    }
  )
})

test('deletionOutcome reports a partial auth failure', () => {
  const result = deletionOutcome({ dbDone: true, storageDone: true, authDone: false })
  assert.equal(result.ok, false)
  assert.equal(result.status, 'partial')
  assert.equal(result.step, 'auth')
  assert.match(result.message, /account could not be deleted/i)
})

test('deletionOutcome reports a partial storage failure', () => {
  const result = deletionOutcome({ dbDone: true, storageDone: false, authDone: false })
  assert.equal(result.ok, false)
  assert.equal(result.status, 'partial')
  assert.equal(result.step, 'storage')
  assert.match(result.message, /files could not be deleted/i)
})

test('deletionOutcome reports a partial database failure', () => {
  const result = deletionOutcome({ dbDone: false, storageDone: false, authDone: false })
  assert.equal(result.ok, false)
  assert.equal(result.status, 'partial')
  assert.equal(result.step, 'db')
  assert.match(result.message, /could not be deleted/i)
})
