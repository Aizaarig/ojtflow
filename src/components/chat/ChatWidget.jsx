import { useEffect, useRef, useState } from 'react'
import { Bot, MessageCircle, RefreshCw, Send, X } from 'lucide-react'
import { useChat } from '../../hooks/useChat'
import { MAX_MESSAGE_LENGTH } from '../../lib/chat'

function Bubble({ role, content }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-[14px] px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
          isUser
            ? 'bg-brand-dark text-white'
            : 'border border-line bg-mint-soft text-navy'
        }`}
      >
        {content}
      </div>
    </div>
  )
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const { messages, sending, error, send, reset } = useChat()
  const listRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, sending, open])

  async function onSubmit(e) {
    e.preventDefault()
    if (sending) return
    const value = text
    setText('')
    await send(value)
    inputRef.current?.focus()
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="OJTFlow assistant"
          className="fixed bottom-24 right-5 z-50 flex h-[min(560px,75vh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-[20px] border border-line bg-white shadow-product"
        >
          <header className="flex items-center gap-3 border-b border-line bg-white px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mint text-brand-dark">
              <Bot className="h-5 w-5" />
            </span>
            <div className="flex-1 leading-tight">
              <p className="text-[14px] font-bold text-navy">OJTFlow Assistant</p>
              <p className="text-[11.5px] text-muted">
                Help with hours, tasks &amp; logs
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              aria-label="Start a new chat"
              title="Start a new chat"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-muted transition hover:border-brand hover:text-brand"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-muted transition hover:border-brand hover:text-brand"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto bg-canvas px-4 py-4"
          >
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} />
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-[14px] border border-line bg-mint-soft px-3.5 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" />
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="border-t border-line bg-[#fdf2f2] px-4 py-2.5 text-[12.5px] text-[#c05050]">
              {error}
            </p>
          )}

          <form
            onSubmit={onSubmit}
            className="flex items-end gap-2 border-t border-line bg-white px-3 py-3"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  onSubmit(e)
                }
              }}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Ask about your OJT…"
              aria-label="Message the assistant"
              className="input max-h-28 min-h-[44px] flex-1 resize-none py-2.5"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              aria-label="Send message"
              className="btn btn-primary h-11 w-11 shrink-0 p-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close OJTFlow assistant' : 'Open OJTFlow assistant'}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-dark text-white shadow-btn transition hover:bg-brand-deeper"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  )
}
