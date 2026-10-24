import { useCallback, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  buildChatRequest,
  friendlyChatError,
  validateMessage,
} from '../lib/chat'

export const CHAT_WELCOME = {
  role: 'assistant',
  content:
    "Hi! I'm your OJTFlow assistant. Ask me about your completed hours, progress, tasks, activity logs, requirements, or how to use the app.",
}

// Pull a friendly message off a FunctionsHttpError, whose response body carries
// the JSON error the Edge Function returned.
async function readErrorDetail(error) {
  try {
    const res = error?.context
    if (res && typeof res.json === 'function') {
      const body = await res.json()
      return body?.error || body?.message || ''
    }
  } catch {
    // ignore unparsable body
  }
  return ''
}

/*
  Drives the assistant conversation. The Edge Function owns the Gemini key and
  all data access, so this hook only sends the thread and stores the replies.
  Nothing is persisted, so the chat needs no database tables.
*/
export function useChat() {
  const [messages, setMessages] = useState([CHAT_WELCOME])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const historyRef = useRef(messages)
  const busyRef = useRef(false)

  const update = useCallback((next) => {
    historyRef.current = next
    setMessages(next)
  }, [])

  const send = useCallback(
    async (text) => {
      const check = validateMessage(text)
      if (!check.ok) {
        setError(check.error)
        return
      }
      if (busyRef.current) return

      busyRef.current = true
      setError(null)
      setSending(true)

      const history = [
        ...historyRef.current,
        { role: 'user', content: check.value },
      ]
      update(history)

      try {
        const { data, error: invokeError } = await supabase.functions.invoke(
          'chat',
          { body: buildChatRequest(history) }
        )

        if (invokeError) {
          const detail = await readErrorDetail(invokeError)
          throw new Error(
            friendlyChatError({
              status: invokeError.context?.status,
              message: detail || invokeError.message,
            })
          )
        }

        const reply = data?.reply
        if (typeof reply !== 'string' || !reply.trim()) {
          throw new Error(
            'The assistant did not return a reply. Please try again.'
          )
        }

        update([...historyRef.current, { role: 'assistant', content: reply }])
      } catch (e) {
        setError(friendlyChatError(e))
      } finally {
        setSending(false)
        busyRef.current = false
      }
    },
    [update]
  )

  const reset = useCallback(() => {
    setError(null)
    update([CHAT_WELCOME])
  }, [update])

  return { messages, sending, error, send, reset }
}
