import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import AuthLayout from '../../components/auth/AuthLayout'
import Alert from '../../components/ui/Alert'
import FullPageLoader from '../../components/ui/FullPageLoader'
import LoadingButton from '../../components/ui/LoadingButton'
import TextField from '../../components/ui/TextField'
import { useAuth } from '../../hooks/useAuth'
import { mapAuthError } from '../../lib/authErrors'

export default function ResetPassword() {
  const { session, loading, clearRecovery, updatePassword } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const update = (event) =>
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))

  if (loading) return <FullPageLoader label="Verifying your reset link…" />

  if (!session) {
    return (
      <AuthLayout
        title="Link expired"
        subtitle="This password reset link is invalid or has expired."
        footer={
          <span>
            <Link className="font-semibold text-brand-dark" to="/forgot-password">
              Request a new reset link
            </Link>
          </span>
        }
      >
        <Alert variant="error">
          Reset links are single-use and expire after a short time. Request a
          fresh one to continue.
        </Alert>
      </AuthLayout>
    )
  }

  if (done) {
    return (
      <AuthLayout
        title="Password updated"
        subtitle="You can now use your new password to sign in."
        footer={
          <span>
            <Link className="font-semibold text-brand-dark" to="/dashboard">
              Go to dashboard
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

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return
    setError('')

    const next = {}
    if (!form.password) next.password = 'Please choose a new password.'
    else if (form.password.length < 8) next.password = 'Use at least 8 characters.'
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    try {
      await updatePassword(form.password)
      clearRecovery()
      setDone(true)
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
    } catch (err) {
      setError(mapAuthError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Make sure it's at least 8 characters long."
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
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
