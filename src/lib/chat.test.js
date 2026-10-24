import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_MESSAGE_LENGTH,
  MAX_REQUEST_MESSAGES,
  buildChatRequest,
  friendlyChatError,
  validateMessage,
} from './chat.js'

test('validateMessage trims and accepts normal text', () => {
  assert.deepEqual(validateMessage('  hello  '), { ok: true, value: 'hello' })
})

test('validateMessage rejects empty and whitespace-only input', () => {
  for (const input of ['', '   ', '\n\t', null, undefined, 123]) {
    const res = validateMessage(input)
    assert.equal(res.ok, false, `input=${String(input)}`)
    assert.match(res.error, /type a message/i)
  }
})

test('validateMessage rejects messages over the length cap', () => {
  const ok = validateMessage('a'.repeat(MAX_MESSAGE_LENGTH))
  assert.equal(ok.ok, true)

  const tooLong = validateMessage('a'.repeat(MAX_MESSAGE_LENGTH + 1))
  assert.equal(tooLong.ok, false)
  assert.match(tooLong.error, /too long/i)
})

test('buildChatRequest keeps only user/assistant turns with content', () => {
  const req = buildChatRequest([
    { role: 'user', content: 'hi' },
    { role: 'system', content: 'ignore me' },
    { role: 'assistant', content: '  hello  ' },
    { role: 'user', content: '   ' },
    { role: 'user', content: 'bye' },
    null,
  ])
  assert.deepEqual(req, {
    messages: [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
      { role: 'user', content: 'bye' },
    ],
  })
})

test('buildChatRequest caps history to the most recent turns', () => {
  const many = Array.from({ length: MAX_REQUEST_MESSAGES + 5 }, (_, i) => ({
    role: 'user',
    content: `m${i}`,
  }))
  const req = buildChatRequest(many)
  assert.equal(req.messages.length, MAX_REQUEST_MESSAGES)
  assert.equal(req.messages[0].content, 'm5')
  assert.equal(req.messages.at(-1).content, `m${MAX_REQUEST_MESSAGES + 4}`)
})

test('buildChatRequest handles non-array input', () => {
  assert.deepEqual(buildChatRequest(undefined), { messages: [] })
  assert.deepEqual(buildChatRequest(null), { messages: [] })
})

test('friendlyChatError maps known statuses', () => {
  assert.match(friendlyChatError({ status: 429 }), /busy right now/i)
  assert.match(friendlyChatError({ status: 401 }), /session has expired/i)
  assert.match(friendlyChatError({ status: 403 }), /session has expired/i)
  assert.match(friendlyChatError({ status: 404 }), /not available yet/i)
  assert.match(friendlyChatError({ status: 500 }), /not set up yet/i)
})

test('friendlyChatError maps network failures', () => {
  assert.match(
    friendlyChatError({ message: 'TypeError: Failed to fetch' }),
    /could not reach the assistant/i
  )
  assert.match(
    friendlyChatError({ message: 'request timed out' }),
    /could not reach the assistant/i
  )
})

test('friendlyChatError passes through a readable message and has a default', () => {
  assert.equal(
    friendlyChatError({ message: 'Please rephrase and try again.' }),
    'Please rephrase and try again.'
  )
  assert.match(friendlyChatError(null), /something went wrong/i)
  assert.match(friendlyChatError({}), /something went wrong/i)
})
