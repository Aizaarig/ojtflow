import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, Lock, Mail } from 'lucide-react'
import AuthLayout from '../../components/auth/AuthLayout'
import OtpInput from '../../components/auth/OtpInput'
import Alert from '../../components/ui/Alert'
import LoadingButton from '../../components/ui/LoadingButton'
import Spinner from '../../components/ui/Spinner'
import TextField from '../../components/ui/TextField'
import { useAuth } from '../../hooks/useAuth'
import { mapAuthError } from '../../lib/authErrors'
import {
  RESEND_COOLDOWN_SECONDS,
  isSixDigitCode,
  mapOtpError,
  maskEmail,
  validateNewPassword,
} from '../../lib/recovery'

export default function ForgotPassword() {
  const { sendPasswordReset, verifyRecoveryOtp, updatePassword, signOut } =
    useAuth()

  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const id = setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const update = (event) =>
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))

  const requestCode = async ({ resend = false } = {}) => {
    if (submitting || resending) return
    setError('')
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    if (resend) setResending(true)
    else setSubmitting(true)
    try {
      await sendPasswordReset(email)
      setCode('')
      setStep('otp')
      setCooldown(RESEND_COOLDOWN_SECONDS)
      setNotice(
        resend
          ? `We sent a new 6-digit code to ${maskEmail(email)}.`
          : `If an account exists for ${maskEmail(email)}, we've emailed a 6-digit code.`
      )
    } catch (err) {
      setError(mapAuthError(err))
    } finally {
      setSubmitting(false)
      setResending(false)
    }
  }

  const handleEmailSubmit = (event) => {
    event.preventDefault()
    requestCode()
  }

  const handleResend = () => {
    if (cooldown > 0 || submitting || resending) return
    requestCode({ resend: true })
  }

  const handleVerify = async (event) => {
    event.preventDefault()
    if (submitting) return
    setError('')
    if (!isSixDigitCode(code)) {
      setError('Enter the 6-digit code from your email.')
      return
    }
    setSubmitting(true)
    try {
      await verifyRecoveryOtp({ email, token: code })
      setStep('password')
      setNotice('')
    } catch (err) {
      setError(mapOtpError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return
    setError('')

    const nextErrors = validateNewPassword(form.password, form.confirm)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      await updatePassword(form.password)
      try {
        await signOut()
      } catch {
        // Password already changed; signing out is best-effort cleanup.
      }
      setForm({ password: '', confirm: '' })
      setCode('')
      setStep('done')
    } catch (err) {
      setError(mapAuthError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const backLink = (
    <span>
      Remembered it?{' '}
      <Link className="font-semibold text-brand-dark" to="/login">
        Back to sign in
      </Link>
    </span>
  )

  if (step === 'done') {
    return (
      <AuthLayout
        title="Password updated"
        subtitle="You can now sign in with your new password."
        footer={
          <span>
            <Link className="font-semibold text-brand-dark" to="/login">
              Back to sign in
            </Link>
          </span>
        }
      >
        <Alert variant="success">
          Your password has been changed successfully.
        </Alert>
      </AuthLayout>
    )
  }

  if (step === 'otp') {
    return (
      <AuthLayout
        title="Enter your code"
        subtitle={`Enter the 6-digit code we sent to ${maskEmail(email)}.`}
        footer={backLink}
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={handleVerify}
          noValidate
        >
          {error && <Alert variant="error">{error}</Alert>}
          {!error && notice && <Alert variant="info">{notice}</Alert>}

          <OtpInput
            value={code}
            onChange={setCode}
            disabled={submitting}
            autoFocus
          />

          <LoadingButton
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            busy={submitting}
            loadingLabel="Verifying…"
            disabled={!isSixDigitCode(code)}
          >
            Verify code
          </LoadingButton>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted">
            <button
              type="button"
              className="inline-flex items-center gap-2 font-semibold text-brand-dark disabled:cursor-not-allowed disabled:text-muted"
              onClick={handleResend}
              disabled={cooldown > 0 || submitting || resending}
              aria-busy={resending || undefined}
            >
              {resending && <Spinner className="h-3.5 w-3.5" />}
              {resending
                ? 'Sending…'
                : cooldown > 0
                  ? `Resend code in ${cooldown}s`
                  : 'Resend code'}
            </button>
            <button
              type="button"
              className="font-semibold text-brand-dark"
              onClick={() => {
                setError('')
                setNotice('')
                setCode('')
                setStep('email')
              }}
              disabled={submitting}
            >
              Use a different email
            </button>
          </div>
        </form>
      </AuthLayout>
    )
  }

  if (step === 'password') {
    return (
      <AuthLayout
        title="Choose a new password"
        subtitle="Make sure it's at least 8 characters long."
        footer={backLink}
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={handlePasswordSubmit}
          noValidate
        >
          {error && <Alert variant="error">{error}</Alert>}

          <TextField
            id="password"
            name="password"
            type="password"
            label="New password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            icon={Lock}
            value={form.password}
            onChange={update}
            error={errors.password}
          />

          <TextField
            id="confirm"
            name="confirm"
            type="password"
            label="Confirm new password"
            placeholder="Re-enter password"
            autoComplete="new-password"
            icon={Lock}
            value={form.confirm}
            onChange={update}
            error={errors.confirm}
          />

          <LoadingButton
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            busy={submitting}
            loadingLabel="Updating password…"
          >
            Update password
          </LoadingButton>
        </form>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email you signed up with and we'll send a 6-digit code."
      footer={backLink}
    >
      <form className="flex flex-col gap-5" onSubmit={handleEmailSubmit} noValidate>
        {error && <Alert variant="error">{error}</Alert>}

        <TextField
          id="email"
          name="email"
          type="email"
          label="Email address"
          placeholder="you@school.edu"
          autoComplete="email"
          icon={Mail}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <LoadingButton
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          busy={submitting}
          loadingLabel="Sending code…"
        >
          <KeyRound className="h-5 w-5" aria-hidden="true" />
          Send code
        </LoadingButton>
      </form>
    </AuthLayout>
  )
}
