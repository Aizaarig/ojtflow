import { useMemo, useState } from 'react'
import { CheckCircle2, Circle, Pencil, Trash2, X } from 'lucide-react'
import { useRequirements } from '../../hooks/useRequirements'
import TextField from '../../components/ui/TextField'
import Textarea from '../../components/ui/Textarea'
import Alert from '../../components/ui/Alert'
import InlineLoader from '../../components/ui/InlineLoader'
import LoadingButton from '../../components/ui/LoadingButton'
import Skeleton from '../../components/ui/Skeleton'
import Spinner from '../../components/ui/Spinner'

const EMPTY = { title: '', description: '' }
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
]

export default function Requirements() {
  const {
    requirements,
    loading,
    error,
    addRequirement,
    updateRequirement,
    setCompleted,
    removeRequirement,
    totalCount,
    completedCount,
    pendingCount,
  } = useRequirements()

  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
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
    if (!form.title.trim()) next.title = 'Please enter a requirement name.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const startEdit = (req) => {
    setErr('')
    setOk('')
    setEditingId(req.id)
    setForm({ title: req.title || '', description: req.description || '' })
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
        await updateRequirement(editingId, form)
        setOk('Requirement updated')
      } else {
        await addRequirement(form)
        setOk('Requirement added')
      }
      resetForm()
    } catch (e2) {
      setErr(e2.message || 'Failed to save requirement')
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (req) => {
    if (togglingId || busy) return
    setErr('')
    setOk('')
    setTogglingId(req.id)
    try {
      const next = !req.is_completed
      await setCompleted(req.id, next)
      setOk(next ? 'Marked as completed' : 'Marked as pending')
    } catch (e2) {
      setErr(e2.message || 'Failed to update requirement')
    } finally {
      setTogglingId(null)
    }
  }

  const remove = async (id) => {
    if (busy) return
    setErr('')
    setOk('')
    setBusy(true)
    try {
      await removeRequirement(id)
      setOk('Requirement deleted')
      if (editingId === id) resetForm()
    } catch (e2) {
      setErr(e2.message || 'Failed to delete requirement')
    } finally {
      setBusy(false)
      setConfirmId(null)
    }
  }

  const visible = useMemo(() => {
    if (filter === 'pending') return requirements.filter((r) => !r.is_completed)
    if (filter === 'completed') return requirements.filter((r) => r.is_completed)
    return requirements
  }, [requirements, filter])

  const summary = [
    { label: 'Total', value: totalCount, tone: 'bg-mint' },
    { label: 'Completed', value: completedCount, tone: 'bg-mint-soft' },
    { label: 'Pending', value: pendingCount, tone: 'bg-mint-soft' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-[12px] uppercase tracking-[0.12em] text-muted">Requirements</p>
        <h1 className="mt-1 text-[24px] font-extrabold text-navy sm:text-[28px]">OJT Requirements</h1>
        <p className="mt-1 text-sm text-ink">
          Track the documents and requirements you need to complete for your OJT.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {summary.map(({ label, value, tone }) => (
          <article key={label} className="card flex items-center gap-4 p-5">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${tone} text-brand-dark`}>
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[12px] uppercase tracking-[0.08em] text-muted">{label}</p>
              {loading ? (
                <Skeleton className="mt-1 h-[22px] w-10" rounded="rounded-[8px]" />
              ) : (
                <p className="mt-1 text-[22px] font-extrabold text-navy">{value}</p>
              )}
            </div>
          </article>
        ))}
      </div>

      {loading && <InlineLoader label="Loading requirements..." />}
      {error && <Alert variant="error">{error.message || 'Error loading requirements'}</Alert>}
      {err && <Alert variant="error">{err}</Alert>}
      {ok && <Alert variant="success">{ok}</Alert>}

      <form onSubmit={submit} id="add-requirement" noValidate className="card flex flex-col gap-5 p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[16px] font-bold text-navy">
            {editingId ? 'Edit requirement' : 'Add requirement'}
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
          id="requirement-title"
          label="Requirement name"
          name="title"
          value={form.title}
          onChange={update}
          error={errors.title}
          required
        />
        <Textarea
          label="Description"
          name="description"
          rows={3}
          value={form.description}
          onChange={update}
          placeholder="Optional details"
        />

        <div className="flex justify-end">
          <LoadingButton
            type="submit"
            variant="plain"
            busy={busy}
            loadingLabel="Saving..."
            className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-brand px-4 py-2 text-sm font-semibold text-navy hover:opacity-90 disabled:opacity-50"
          >
            {editingId ? 'Update requirement' : 'Add requirement'}
          </LoadingButton>
        </div>
      </form>

      <section className="card flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 border-b border-line">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`px-4 py-2 text-sm ${filter === f.key ? 'border-b-2 border-brand text-navy' : 'text-muted'}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="text-[12.5px] text-muted" aria-busy={loading || undefined}>
            {loading
              ? 'Loading…'
              : `${visible.length} ${visible.length === 1 ? 'item' : 'items'}`}
          </span>
        </div>

        {loading && (
          <div role="status" aria-label="Loading requirements" className="flex flex-col gap-3">
            <Skeleton className="h-[72px] w-full" />
            <Skeleton className="h-[72px] w-full" />
            <Skeleton className="h-[72px] w-full" />
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="flex items-center gap-3 rounded-[12px] border border-dashed border-line px-4 py-3 text-sm text-muted">
            {filter === 'all'
              ? 'No requirements yet. Add your first requirement above.'
              : `No ${filter} requirements.`}
          </div>
        )}

        {!loading && (
        <ul className="flex flex-col gap-3">
          {visible.map((req) => {
            const done = !!req.is_completed
            return (
              <li
                key={req.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-[12px] border border-line px-4 py-3"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggle(req)}
                    disabled={togglingId === req.id || busy}
                    aria-busy={togglingId === req.id || undefined}
                    className="mt-0.5 shrink-0 text-brand-dark hover:opacity-80 disabled:opacity-50"
                    aria-label={done ? 'Mark as pending' : 'Mark as completed'}
                  >
                    {togglingId === req.id ? (
                      <Spinner className="h-5 w-5" />
                    ) : done ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-sm font-semibold ${done ? 'text-muted line-through' : 'text-navy'}`}>
                        {req.title}
                      </p>
                      <span className={done ? 'req-pill done' : 'req-pill todo'}>
                        {done ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    {req.description && (
                      <p className="mt-1 whitespace-pre-wrap text-[13px] text-ink">{req.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => startEdit(req)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-navy disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  {confirmId === req.id ? (
                    <span className="inline-flex items-center gap-2 text-[13px]">
                      <button
                        type="button"
                        onClick={() => remove(req.id)}
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
                      onClick={() => setConfirmId(req.id)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-[13px] text-[#A83B3B] hover:underline disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        )}
      </section>
    </div>
  )
}
