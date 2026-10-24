import { useEffect, useRef } from 'react'
import { OTP_LENGTH } from '../../lib/recovery'

function toDigits(value, length) {
  const chars = String(value ?? '').split('')
  return Array.from({ length }, (_, i) => (/^\d$/.test(chars[i]) ? chars[i] : ''))
}

export default function OtpInput({
  value = '',
  onChange,
  length = OTP_LENGTH,
  disabled = false,
  autoFocus = false,
  label = 'Verification code',
}) {
  const refs = useRef([])
  const digits = toDigits(value, length)

  useEffect(() => {
    if (autoFocus && refs.current[0]) {
      refs.current[0].focus()
    }
  }, [autoFocus])

  const focusAt = (index) => {
    const el = refs.current[index]
    if (el) el.focus()
  }

  const commit = (nextDigits, focusIndex) => {
    onChange(nextDigits.join('').replace(/[^0-9]/g, ''))
    if (focusIndex !== undefined) focusAt(focusIndex)
  }

  const spread = (startIndex, incoming) => {
    const next = [...digits]
    let cursor = startIndex
    for (const char of incoming) {
      if (cursor >= length) break
      next[cursor] = char
      cursor += 1
    }
    commit(next, Math.min(cursor, length - 1))
  }

  const handleChange = (index, event) => {
    const raw = event.target.value.replace(/[^0-9]/g, '')
    if (!raw) {
      const next = [...digits]
      next[index] = ''
      commit(next)
      return
    }
    if (raw.length > 1) {
      spread(index, raw.slice(0, length - index))
      return
    }
    const next = [...digits]
    next[index] = raw
    commit(next, index < length - 1 ? index + 1 : index)
  }

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const next = [...digits]
      if (next[index]) {
        next[index] = ''
        commit(next, index)
      } else if (index > 0) {
        next[index - 1] = ''
        commit(next, index - 1)
      }
    } else if (event.key === 'Delete') {
      event.preventDefault()
      const next = [...digits]
      next[index] = ''
      commit(next, index)
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      focusAt(index - 1)
    } else if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault()
      focusAt(index + 1)
    }
  }

  const handlePaste = (index, event) => {
    event.preventDefault()
    const incoming = event.clipboardData
      .getData('text')
      .replace(/[^0-9]/g, '')
      .slice(0, length - index)
    if (!incoming) return
    spread(index, incoming)
  }

  return (
    <div
      className="flex justify-center gap-2 sm:gap-3"
      role="group"
      aria-label={label}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={(e) => handlePaste(index, e)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${length}`}
          className="h-12 w-11 rounded-[10px] border border-line bg-white text-center text-lg font-semibold text-navy focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-dark disabled:opacity-60 sm:w-12"
        />
      ))}
    </div>
  )
}
