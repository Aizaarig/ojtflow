import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  KeyRound,
  LogOut,
  Mail,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useAccount } from '../../hooks/useAccount'
import {
  DELETE_CONFIRM_PHRASE,
  RESET_CONFIRM_PHRASE,
  RESET_RECORDS,
  friendlyAccountError,
  summarizeReset,
} from '../../lib/account'
import TextField from '../../components/ui/TextField'
import Alert from '../../components/ui/Alert'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import LoadingButton from '../../components/ui/LoadingButton'

export default function Settings() {
  const { user, profile, signOut, updatePassword, sendPasswordReset } = useAuth()
  const { resetting, deleting, resetProgress, deleteAccount } = useAccount()
  const navigate = useNavigate()

  const [pw, setPw] = useState({ password: '', confirm: '' })
  const [pwBusy, setPwBusy] = useState(false)
  const [pwErr, setPwErr] = useState('')
  const [pwOk, setPwOk] = useState('')

  const [resetBusy, setResetBusy] = useState(false)
  const [resetErr, setResetErr] = useState('')
  const [resetOk, setResetOk] = useState('')

  const [resetDialog, setResetDialog] = useState(false)
  const [resetDialogErr, setResetDialogErr] = useState('')

  const [deleteDialog, setDeleteDialog] = useState(false)
  const [deleteDialogErr, setDeleteDialogErr] = useState('')
  const [deletePw, setDeletePw] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  const changePassword = async (e) => {
    e.preventDefault()
    if (pwBusy) return
    setPwErr('')
    setPwOk('')
    if (pw.password.length < 6) {
      setPwErr('Password must be at least 6 characters.')
      return
    }
    if (pw.password !== pw.confirm) {
      setPwErr('Passwords do not match.')
      return
    }
    setPwBusy(true)
    try {
      await updatePassword(pw.password)
      setPw({ password: '', confirm: '' })
      setPwOk('Password updated.')
    } catch (e2) {
      setPwErr(e2.message || 'Failed to update password.')
    } finally {
      setPwBusy(false)
    }
  }

  const emailReset = async () => {
    if (resetBusy) return
    setResetErr('')
    setResetOk('')
    if (!user?.email) {
      setResetErr('No email address on this account.')
      return
    }
    setResetBusy(true)
    try {
      await sendPasswordReset(user.email)
      setResetOk(`Password reset link sent to ${user.email}.`)
    } catch (e2) {
      setResetErr(e2.message || 'Failed to send reset email.')
    } finally {
      setResetBusy(false)
    }
  }

  const closeResetDialog = () => {
    if (resetting) return
    setResetDialog(false)
    setResetDialogErr('')
  }

  const onResetProgress = async () => {
    setResetDialogErr('')
    try {
      const result = await resetProgress()
      setResetDialog(false)
      setResetOk(summarizeReset(result))
    } catch (e2) {
      const msg = e2?.message || ''
      setResetDialogErr(
        /not exist|schema cache/i.test(msg)
          ? 'Reset is not available yet. Please try again later.'
          : msg || 'Failed to reset your OJT progress.'
      )
    }
  }

  const closeDeleteDialog = () => {
    if (deleting) return
    setDeleteDialog(false)
    setDeleteDialogErr('')
    setDeletePw('')
  }

  const onDeleteAccount = async () => {
    setDeleteDialogErr('')
    if (!deletePw) {
      setDeleteDialogErr('Please enter your password to continue.')
      return
    }
    try {
      await deleteAccount({
        password: deletePw,
        confirmation: DELETE_CONFIRM_PHRASE,
      })
      setDeleteDialog(false)
      setDeletePw('')
      navigate('/', { replace: true })
    } catch (e2) {
      setDeleteDialogErr(
        friendlyAccountError({ message: e2?.message }) || 'Failed to delete your account.'
      )
    }
  }

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut()
    } catch {
      // Sign-out failures leave the session intact; the user can retry.
    } finally {
      setSigningOut(false)
    }
  }

  const account = [
    { label: 'Full name', value: profile?.full_name || '—' },
    { label: 'Email', value: user?.email || '—' },
    { label: 'School / University', value: profile?.school_name || '—' },
    { label: 'Course', value: profile?.course || '—' },
    { label: 'Year level', value: profile?.year_level || '—' },
  ]

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <header>
        <p className="text-[12px] uppercase tracking-[0.12em] text-muted">Settings</p>
        <h1 className="mt-1 text-[24px] font-extrabold text-navy sm:text-[28px]">Account Settings</h1>
        <p className="mt-1 text-sm text-ink">Manage your account security and review your details.</p>
      </header>

      <section className="card flex flex-col gap-4 p-6">
        <h2 className="text-[16px] font-bold text-navy">Account information</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {account.map(({ label, value }) => (
            <div key={label}>
              <label className="label">{label}</label>
              <div className="input bg-mint-soft/40 text-ink">{value}</div>
            </div>
          ))}
        </div>
        <p className="text-[12.5px] text-muted">
          Name, school, course, and year level can be edited on the Profile page.
        </p>
      </section>

      <form onSubmit={changePassword} className="card flex flex-col gap-4 p-6">
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-navy">
          <KeyRound className="h-4 w-4 text-brand-dark" /> Change password
        </h2>
        {pwErr && <Alert variant="error">{pwErr}</Alert>}
        {pwOk && <Alert variant="success">{pwOk}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="New password"
            type="password"
            value={pw.password}
            onChange={(e) => setPw((p) => ({ ...p, password: e.target.value }))}
            autoComplete="new-password"
            required
          />
          <TextField
            label="Confirm password"
            type="password"
            value={pw.confirm}
            onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
            autoComplete="new-password"
            required
          />
        </div>
        <div className="flex justify-end">
          <LoadingButton
            type="submit"
            variant="plain"
            busy={pwBusy}
            loadingLabel="Updating..."
            className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-brand px-4 py-2 text-sm font-semibold text-navy hover:opacity-90 disabled:opacity-50"
          >
            Update password
          </LoadingButton>
        </div>
      </form>

      <section className="card flex flex-col gap-4 p-6">
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-navy">
          <Mail className="h-4 w-4 text-brand-dark" /> Password reset email
        </h2>
        {resetErr && <Alert variant="error">{resetErr}</Alert>}
        {resetOk && <Alert variant="success">{resetOk}</Alert>}
        <p className="text-[13px] text-muted">
          Send a password reset link to your account email address.
        </p>
        <div className="flex justify-end">
          <LoadingButton
            type="button"
            variant="secondary"
            size="sm"
            busy={resetBusy}
            loadingLabel="Sending..."
            onClick={emailReset}
          >
            Send reset email
          </LoadingButton>
        </div>
      </section>

      <section className="card flex flex-col gap-4 p-6">
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-navy">
          <LogOut className="h-4 w-4 text-brand-dark" /> Session
        </h2>
        <p className="text-[13px] text-muted">Sign out of OJTFlow on this device.</p>
        <div className="flex justify-end">
          <LoadingButton
            type="button"
            variant="secondary"
            size="sm"
            busy={signingOut}
            loadingLabel="Signing out..."
            onClick={handleSignOut}
          >
            Sign out
          </LoadingButton>
        </div>
      </section>

      <header className="mt-2">
        <h2 className="text-[18px] font-extrabold text-navy">Account management</h2>
        <p className="mt-1 text-sm text-muted">
          These actions affect your OJT data and cannot be undone.
        </p>
      </header>

      <section className="card flex flex-col gap-4 border-[#F3CFCF] p-6">
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-navy">
          <RotateCcw className="h-4 w-4 text-[#A83B3B]" /> Reset OJT Progress
        </h2>
        <p className="text-[13px] leading-relaxed text-ink">
          Clears the OJT records you have logged so you can start tracking over.
          This permanently removes:
        </p>
        <ul className="flex flex-col gap-1 pl-5 text-[13px] text-ink">
          {RESET_RECORDS.map(({ key, label }) => (
            <li key={key} className="list-disc">
              {label}
            </li>
          ))}
        </ul>
        <p className="text-[13px] leading-relaxed text-ink">
          Your placement details, required hours, profile, profile picture, and
          sign-in account are kept.
        </p>
        {resetOk && <Alert variant="success">{resetOk}</Alert>}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setResetOk('')
              setResetDialogErr('')
              setResetDialog(true)
            }}
            className="rounded-[12px] border border-[#F3CFCF] px-4 py-2 text-sm font-semibold text-[#A83B3B] hover:bg-[#FDECEC]"
          >
            Reset OJT Progress
          </button>
        </div>
      </section>

      <section className="card flex flex-col gap-4 border-[#F3CFCF] p-6">
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-navy">
          <TriangleAlert className="h-4 w-4 text-[#A83B3B]" /> Delete account permanently
        </h2>
        <p className="text-[13px] leading-relaxed text-ink">
          Permanently deletes your account and all data tied to it: your profile,
          placement, attendance records, daily logs, tasks, requirements, and
          profile picture. This cannot be undone.
        </p>
        <p className="text-[13px] leading-relaxed text-ink">
          You will confirm with your password and a typed phrase before anything
          is deleted.
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setDeleteDialogErr('')
              setDeletePw('')
              setDeleteDialog(true)
            }}
            className="rounded-[12px] bg-[#A83B3B] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Delete account permanently
          </button>
        </div>
      </section>

      {resetDialog && (
        <ConfirmDialog
          title="Reset OJT Progress"
          description={
            <>
              This clears your attendance records, daily activity logs, tasks, and
              requirements checklist. Your placement, required hours, profile, and
              account are kept. This cannot be undone.
            </>
          }
          confirmPhrase={RESET_CONFIRM_PHRASE}
          confirmLabel="Reset progress"
          tone="danger"
          busy={resetting}
          error={resetDialogErr}
          onConfirm={onResetProgress}
          onClose={closeResetDialog}
        />
      )}

      {deleteDialog && (
        <ConfirmDialog
          title="Delete account permanently"
          description={
            <>
              Your account, profile, placement, attendance, daily logs, tasks,
              requirements, and profile picture will be permanently deleted. This
              cannot be undone.
            </>
          }
          confirmPhrase={DELETE_CONFIRM_PHRASE}
          confirmLabel="Delete my account"
          tone="danger"
          busy={deleting}
          error={deleteDialogErr}
          onConfirm={onDeleteAccount}
          onClose={closeDeleteDialog}
        >
          <TextField
            label="Your password"
            type="password"
            value={deletePw}
            onChange={(e) => setDeletePw(e.target.value)}
            autoComplete="current-password"
            placeholder="Confirm with your password"
          />
        </ConfirmDialog>
      )}
    </div>
  )
}
