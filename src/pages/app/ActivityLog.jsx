import { useState } from 'react'
import { Pencil, Trash2, X } from 'lucide-react'
import { usePlacement } from '../../hooks/usePlacement'
import { useDailyLogs } from '../../hooks/useDailyLogs'
import TextField from '../../components/ui/TextField'
import Textarea from '../../components/ui/Textarea'
import Alert from '../../components/ui/Alert'
import InlineLoader from '../../components/ui/InlineLoader'
import LoadingButton from '../../components/ui/LoadingButton'
import Skeleton from '../../components/ui/Skeleton'
import Spinner from '../../components/ui/Spinner'
import { toDateInput } from '../../lib/format'

const EMPTY = { logDate: '', activities: '', learnings: '' }

function toInputDate(value) {
  if (!value) return ''
  const s = String(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return toDateInput(s)
}

export default function ActivityLog() {
  const { placement, loading: placementLoading } = usePlacement()
  const { logs, loading, error, addLog, updateLog, removeLog } =
    useDailyLogs(placement?.id)

  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [confirmId, setConfirmId] = useState(null)

  const update = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
    setErrors((p) => (p[name] ? { ...p, [name]: undefined } : p))
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(EMPTY)
    setErrors({})
  }

  const validate = () => {
    const next = {}
    if (!form.logDate) next.logDate = 'Please choose a date.'
    if (!form.activities.trim())
      next.activities = 'Please describe your activities.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const startEdit = (log) => {
    setErr('')
    setOk('')
    setEditingId(log.id)
    setForm({
      logDate: toInputDate(log.log_date),
      activities: log.activities || '',
      learnings: log.learnings || '',
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setErr('')
    setOk('')
    if (!validate()) return
    setBusy(true)
    try {
      if (editingId) {
        await updateLog(editingId, form)
        setOk('Log updated')
      } else {
        await addLog(form)
        setOk('Log added')
      }
      resetForm()
    } catch (e2) {
      setErr(e2.message || 'Failed to save log')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id) => {
    if (busy) return
    setErr('')
    setOk('')
    setBusy(true)
    try {
      await removeLog(id)
      setOk('Log deleted')
      if (editingId === id) resetForm()
    } catch (e2) {
      setErr(e2.message || 'Failed to delete log')
    } finally {
      setBusy(false)
      setConfirmId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-[12px] uppercase tracking-[0.12em] text-muted">Activity Log</p>
        <h1 className="mt-1 text-[24px] font-extrabold text-navy sm:text-[28px]">Daily OJT Activities</h1>
        <p className="mt-1 text-sm text-ink">
          Record what you worked on and what you learned each day.
        </p>
      </header>

      {!placementLoading && !placement && (
        <Alert variant="info">No active placement found. Logs will not be linked to a placement.</Alert>
      )}
      {loading && <InlineLoader label="Loading daily logs..." />}
      {error && <Alert variant="error">{error.message || 'Error loading daily logs'}</Alert>}
      {err && <Alert variant="error">{err}</Alert>}
      {ok && <Alert variant="success">{ok}</Alert>}

      <form onSubmit={submit} noValidate className="card flex flex-col gap-5 p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[16px] font-bold text-navy">
            {editingId ? 'Edit log entry' : 'New log entry'}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-navy"
            >
              <X className="h-3.5 w-3.5" /> Cancel edit
            </button>
          )}
        </div>

        <TextField
          id="log-date"
          label="Log date"
          name="logDate"
          type="date"
          value={form.logDate}
          onChange={update}
          error={errors.logDate}
          required
        />
        <Textarea
          id="log-activities"
          label="Activities"
          name="activities"
          rows={3}
          value={form.activities}
          onChange={update}
          error={errors.activities}
          placeholder="What did you work on today?"
          required
        />
        <Textarea
          id="log-learnings"
          label="Learnings"
          name="learnings"
          rows={3}
          value={form.learnings}
          onChange={update}
          placeholder="What did you learn? (optional)"
        />

        <div className="flex justify-end">
          <LoadingButton
            type="submit"
            variant="plain"
            busy={busy}
            loadingLabel="Saving..."
            className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-brand px-4 py-2 text-sm font-semibold text-navy hover:opacity-90 disabled:opacity-50"
          >
            {editingId ? 'Update log' : 'Add log'}
          </LoadingButton>
        </div>
      </form>

      <section className="card flex flex-col gap-4 p-6">
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-bold text-navy">History</h2>
          <span className="text-[12.5px] text-muted" aria-busy={loading || undefined}>
            {loading ? 'Loading…' : `${logs.length} ${logs.length === 1 ? 'entry' : 'entries'}`}
          </span>
        </header>

        {loading && (
          <div role="status" aria-label="Loading daily logs" className="flex flex-col gap-3">
            <Skeleton className="h-[110px] w-full" />
            <Skeleton className="h-[110px] w-full" />
            <Skeleton className="h-[110px] w-full" />
          </div>
        )}

        {!loading && logs.length === 0 && (
          <div className="flex items-center gap-3 rounded-[12px] border border-dashed border-line px-4 py-3 text-sm text-muted">
            No daily logs yet.
          </div>
        )}

        {!loading && (
        <ul className="flex flex-col gap-3">
          {logs.map((log) => (
            <li key={log.id} className="rounded-[12px] border border-line px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold text-navy">{log.log_date}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(log)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-navy disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  {confirmId === log.id ? (
                    <span className="inline-flex items-center gap-2 text-[13px]">
                      <button
                        type="button"
                        onClick={() => remove(log.id)}
                        disabled={busy}
                        aria-busy={busy || undefined}
                        className="inline-flex items-center gap-1 text-[#A83B3B] hover:underline disabled:opacity-50"
                      >
                        {busy && <Spinner className="h-3.5 w-3.5" />}
                        {busy ? 'Deleting...' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        disabled={busy}
                        className="text-muted hover:text-navy disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(log.id)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-[13px] text-[#A83B3B] hover:underline disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{log.activities}</p>
              {log.learnings && (
                <p className="mt-2 whitespace-pre-wrap text-[13px] text-muted">
                  <span className="font-semibold text-navy">Learnings: </span>
                  {log.learnings}
                </p>
              )}
            </li>
          ))}
        </ul>
        )}
      </section>
    </div>
  )
}
