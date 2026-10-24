/*
  Pure helpers for the OJTFlow AI assistant.

  These have no imports so they can be unit-tested under Node and reused by the
  chat hook. The network call and Supabase client live in src/hooks/useChat.js,
  and the Gemini key lives only in the server-side Edge Function.
*/

export const MAX_MESSAGE_LENGTH = 2000

// How many prior turns we forward as context. Keeps requests small and cheap.
export const MAX_REQUEST_MESSAGES = 20

// Validate a message the student typed. Returns a friendly error when empty or
// too long, otherwise the trimmed value.
export function validateMessage(text) {
  const value = typeof text === 'string' ? text.trim() : ''
  if (!value) {
    return { ok: false, error: 'Type a message first.' }
  }
  if (value.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `That message is too long. Please keep it under ${MAX_MESSAGE_LENGTH} characters.`,
    }
  }
  return { ok: true, value }
}

// Turn the on-screen conversation into the request body the Edge Function
// expects, dropping anything malformed and capping the history length.
export function buildChatRequest(messages = []) {
  const cleaned = (Array.isArray(messages) ? messages : [])
    .filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim()
    )
    .slice(-MAX_REQUEST_MESSAGES)
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, MAX_MESSAGE_LENGTH),
    }))
  return { messages: cleaned }
}

// Map a failure (from supabase-js or the Edge Function) to a short,
// beginner-friendly sentence.
export function friendlyChatError(error) {
  if (!error) return 'Something went wrong. Please try again.'
  const status = error.status
  const message = typeof error.message === 'string' ? error.message : ''

  if (status === 429) {
    return 'The assistant is busy right now. Please wait a moment and try again.'
  }
  if (status === 401 || status === 403) {
    return 'Your session has expired. Please sign in again and retry.'
  }
  if (status === 404) {
    return 'The assistant is not available yet. Please try again later.'
  }
  if (status === 500) {
    return 'The assistant is not set up yet. Please try again later.'
  }
  if (/failed to fetch|network|timed? ?out/i.test(message)) {
    return 'Could not reach the assistant. Check your connection and try again.'
  }
  return message || 'Something went wrong. Please try again.'
}
