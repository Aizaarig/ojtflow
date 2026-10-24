import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building,
  GraduationCap,
  Lock,
  Mail,
  User,
} from 'lucide-react'
import AuthLayout from '../../components/auth/AuthLayout'
import GoogleButton from '../../components/auth/GoogleButton'
import OtpInput from '../../components/auth/OtpInput'
import Alert from '../../components/ui/Alert'
import LoadingButton from '../../components/ui/LoadingButton'
import Spinner from '../../components/ui/Spinner'
import TextField from '../../components/ui/TextField'
import { useAuth } from '../../hooks/useAuth'
import { mapAuthError } from '../../lib/authErrors'
import {
  isExistingAccount,
  isSixDigitCode,
  mapSignupOtpError,
  maskEmail,
  resendCountdown,
  startResendCooldown,
  verificationDestination,
} from '../../lib/signupOtp'

const EMPTY = {
  fullName: '',
  email: '',
  password: '',
  confirm: '',
  schoolName: '',
  course: '',
  yearLevel: '',
}

export default function Register() {
  const { signUp, signInWithGoogle, verifySignUpOtp, resendSignUpOtp } =
    useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [resending, setResending] = useState(false)

  // 'form' -> registration form, 'otp' -> 6-digit email verification,
  // 'verified' -> success screen when Supabase did not return a session.
  const [step, setStep] = useState('form')
  const [pendingEmail, setPendingEmail] = useState('')
  const [code, setCode] = useState('')

  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const cooldown = resendCountdown(cooldownUntil, now)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const id = setTimeout(() => setNow(Date.now()), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const update = (event) =>
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))

  const validate = () => {
    const next = {}
    if (!form.fullName.trim()) next.fullName = 'Please enter your full name.'
    if (!form.email.trim()) next.email = 'Please enter your email address.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = 'Please enter a valid email address.'
    if (!form.password) next.password = 'Please choose a password.'
    else if (form.password.length < 8)
      next.password = 'Use at least 8 characters.'
    if (form.confirm !== form.password)
      next.confirm = 'Passwords do not match.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const openOtpStep = (email) => {
    setPendingEmail(email)
    setCode('')
    setStep('otp')
    setCooldownUntil(startResendCooldown())
    setNow(Date.now())
    setNotice(
      `We sent a 6-digit code to ${maskEmail(
        email
      )}. Enter it below to verify your email.`
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return
    setError('')
    if (!validate()) return

    const email = form.email.trim()
    setSubmitting(true)
    try {
      const data = await signUp(form)

      if (data.session) {
        // Supabase signed the student in right away (confirmation off):
        // keep following the existing session-based flow.
        navigate('/dashboard', { replace: true })
        return
      }

      if (isExistingAccount(data)) {
        // Coming back from the verification screen with the same address must
        // never create a second account - send a fresh code instead.
        if (pendingEmail && pendingEmail === email) {
          setPendingEmail(email)
          setCode('')
          setStep('otp')
          try {
            await resendSignUpOtp(email)
            setCooldownUntil(startResendCooldown())
            setNow(Date.now())
            setNotice(`We sent a new 6-digit code to ${maskEmail(email)}.`)
          } catch (err) {
            setCooldownUntil(0)
            setError(mapSignupOtpError(err))
          }
          return
        }
        setError(
          'An account with this email already exists. Try signing in instead.'
        )
        return
      }

      openOtpStep(email)
    } catch (err) {
      setError(mapAuthError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogle = async () => {
    if (googleBusy || submitting) return
    setError('')
    setGoogleBusy(true)
    try {
      await signInWithGoogle({
        redirectTo: `${window.location.origin}/auth/callback`,
      })
    } catch (err) {
      setError(mapAuthError(err))
    } finally {
      setGoogleBusy(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || submitting || resending) return
    setError('')
    setResending(true)
    try {
      await resendSignUpOtp(pendingEmail)
      setCode('')
      setCooldownUntil(startResendCooldown())
      setNow(Date.now())
      setNotice(`We sent a new 6-digit code to ${maskEmail(pendingEmail)}.`)
    } catch (err) {
      setError(mapSignupOtpError(err))
    } finally {
      setResending(false)
    }
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
      const data = await verifySignUpOtp({ email: pendingEmail, token: code })
      const destination = verificationDestination(data)
      if (data?.session) {
        navigate(destination, { replace: true })
        return
      }
      setStep('verified')
      setTimeout(() => navigate(destination, { replace: true }), 1500)
    } catch (err) {
      setError(mapSignupOtpError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleChangeEmail = () => {
    if (submitting) return
    setError('')
    setNotice('')
    setCode('')
    setStep('form')
  }

  const signinFooter = (
    <span>
      Already confirmed?{' '}
      <Link className="font-semibold text-brand-dark" to="/login">
        Back to sign in
      </Link>
    </span>
  )

  if (step === 'verified') {
    return (
      <AuthLayout
        title="Verify your email"
        subtitle="Your email has been verified. You can now sign in to your OJT workspace."
        footer={
          <span>
            <Link className="font-semibold text-brand-dark" to="/login">
              Continue to sign in
            </Link>
          </span>
        }
      >
        <Alert variant="success">
          Your email address has been verified successfully.
        </Alert>
      </AuthLayout>
    )
  }

  if (step === 'otp') {
    return (
      <AuthLayout
        title="Verify your email"
        subtitle={`We sent a 6-digit code to ${maskEmail(
          pendingEmail
        )}. Enter it below to finish creating your account.`}
        footer={signinFooter}
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
            label="Email verification code"
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
            Verify Email
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
              onClick={handleChangeEmail}
              disabled={submitting}
            >
              Use a different email
            </button>
          </div>
        </form>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up your student profile to start logging your OJT."
      footer={
        <span>
          Already have an account?{' '}
          <Link className="font-semibold text-brand-dark" to="/login">
            Sign in
          </Link>
        </span>
      }
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        {error && <Alert variant="error">{error}</Alert>}

        <TextField
          id="fullName"
          name="fullName"
          label="Full name"
          placeholder="Juan Dela Cruz"
          autoComplete="name"
          icon={User}
          value={form.fullName}
          onChange={update}
          error={errors.fullName}
        />

        <TextField
          id="email"
          name="email"
          type="email"
          label="Email address"
          placeholder="you@school.edu"
          autoComplete="email"
          icon={Mail}
          value={form.email}
          onChange={update}
          error={errors.email}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="password"
            name="password"
            type="password"
            label="Password"
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
            label="Confirm password"
            placeholder="Re-enter password"
            autoComplete="new-password"
            icon={Lock}
            value={form.confirm}
            onChange={update}
            error={errors.confirm}
          />
        </div>

        <TextField
          id="schoolName"
          name="schoolName"
          label="School / University"
          placeholder="Optional"
          icon={GraduationCap}
          value={form.schoolName}
          onChange={update}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="course"
            name="course"
            label="Course"
            placeholder="Optional"
            icon={Building}
            value={form.course}
            onChange={update}
          />
          <TextField
            id="yearLevel"
            name="yearLevel"
            label="Year level"
            placeholder="e.g. 4th Year"
            value={form.yearLevel}
            onChange={update}
          />
        </div>

        <LoadingButton
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          busy={submitting}
          loadingLabel="Creating account…"
          disabled={googleBusy}
        >
          Create account
        </LoadingButton>

        <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
          or
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
        </div>

        <GoogleButton
          busy={googleBusy}
          disabled={submitting}
          onClick={handleGoogle}
        />
      </form>
    </AuthLayout>
  )
}
