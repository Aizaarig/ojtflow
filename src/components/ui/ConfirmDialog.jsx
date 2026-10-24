import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TriangleAlert, X } from 'lucide-react'
import { matchesConfirmation } from '../../lib/account'
import Alert from './Alert'
import Spinner from './Spinner'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/*
  Accessible confirmation modal for destructive actions.

  Mount it only while it should be visible (the parent renders it conditionally)
  so its internal state starts fresh each time. The primary action stays disabled
  until the student types the exact confirmation phrase, and optional extra
  fields (such as a password re-entry) can be passed as children.
*/
export default function ConfirmDialog({
  title,
  description,
  confirmPhrase,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  busy = false,
  error = '',
  children,
  onConfirm,
  onClose,
}) {
  const [value, setValue] = useState('')
  const dialogRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 0)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) {
        event.stopPropagation()
        onClose?.()
        return
      }
      if (event.key !== 'Tab') return
      const nodes = dialogRef.current?.querySelectorAll(FOCUSABLE)
      if (!nodes || nodes.length === 0) return
      const list = Array.prototype.filter.call(nodes, (node) => !node.disabled)
      if (list.length === 0) return
      const first = list[0]
      const last = list[list.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(timer)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [busy, onClose])

  const confirmed = matchesConfirmation(value, confirmPhrase)
  const danger = tone === 'danger'
  const confirmClasses = danger
    ? 'bg-[#A83B3B] text-white hover:opacity-90'
    : 'bg-brand text-navy hover:opacity-90'

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center overflow-y-auto bg-navy/40 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose?.()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-busy={busy || undefined}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="card my-auto flex w-full max-w-md flex-col gap-4 p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="confirm-dialog-title"
            className="flex items-center gap-2 text-[17px] font-bold text-navy"
          >
            {danger && (
              <TriangleAlert className="h-5 w-5 shrink-0 text-[#A83B3B]" aria-hidden="true" />
            )}
            {title}
          </h2>
          <button
            type="button"
            onClick={() => !busy && onClose?.()}
            disabled={busy}
            aria-label="Close"
            className="rounded-[10px] p-1 text-muted hover:bg-mint disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {description && (
          <div id="confirm-dialog-desc" className="text-[13.5px] leading-relaxed text-ink">
            {description}
          </div>
        )}

        {children}

        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <label className="label" htmlFor="confirm-dialog-input">
            Type{' '}
            <span className="font-mono font-bold text-navy">{confirmPhrase}</span> to
            confirm
          </label>
          <input
            ref={inputRef}
            id="confirm-dialog-input"
            type="text"
            className="input font-mono"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck="false"
            disabled={busy}
            aria-invalid={value && !confirmed ? 'true' : undefined}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => !busy && onClose?.()}
            disabled={busy}
            className="rounded-[12px] border border-line px-4 py-2 text-sm text-ink hover:bg-mint disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => onConfirm?.()}
            disabled={!confirmed || busy}
            className={`inline-flex items-center justify-center gap-2 rounded-[12px] px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${confirmClasses}`}
          >
            {busy && <Spinner className="h-4 w-4" />}
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
