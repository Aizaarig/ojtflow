import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import AuthLayout from '../../components/auth/AuthLayout'
import GoogleButton from '../../components/auth/GoogleButton'
import Alert from '../../components/ui/Alert'
import LoadingButton from '../../components/ui/LoadingButton'
import TextField from '../../components/ui/TextField'
import { useAuth } from '../../hooks/useAuth'
import { mapAuthError } from '../../lib/authErrors'

export default function Login() {
  const { signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/dashboard'

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)

  const update = (event) =>
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting || googleBusy) return
    setError('')

    if (!form.email || !form.password) {
      setError('Please enter your email and password.')
      return
    }

    setSubmitting(true)
    try {
      await signIn(form)
      navigate(from, { replace: true })
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

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to keep tracking your OJT hours, tasks, and requirements."
      footer={
        <span>
          New to OJTFlow?{' '}
          <Link className="font-semibold text-brand-dark" to="/register">
            Create an account
          </Link>
        </span>
      }
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        {error && <Alert variant="error">{error}</Alert>}

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
        />

        <TextField
          id="password"
          name="password"
          type="password"
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
          icon={Lock}
          value={form.password}
          onChange={update}
          labelAction={
            <Link
              className="text-[13px] font-semibold text-brand-dark"
              to="/forgot-password"
            >
              Forgot password?
            </Link>
          }
        />

        <LoadingButton
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          busy={submitting}
          loadingLabel="Signing in…"
          disabled={googleBusy}
        >
          Sign in
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
