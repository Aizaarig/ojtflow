import { useMemo, useState } from 'react'
import { CheckCircle2, Pencil, RotateCcw, Trash2, X } from 'lucide-react'
import { useTasks, isTaskDone, getTaskStatusLabel, TASK_STATUS } from '../../hooks/useTasks'
import TextField from '../../components/ui/TextField'
import Textarea from '../../components/ui/Textarea'
import Alert from '../../components/ui/Alert'
import InlineLoader from '../../components/ui/InlineLoader'
import LoadingButton from '../../components/ui/LoadingButton'
import Skeleton from '../../components/ui/Skeleton'
import Spinner from '../../components/ui/Spinner'

const EMPTY = { title: '', description: '', dueDate: '' }
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'done', label: 'Done' },
]

function toInputDate(value) {
  if (!value) return ''
  const s = String(value)
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : ''
}

function isOverdue(task) {
  if (!task.due_date || isTaskDone(task)) return false
  const today = new Date().toISOString().slice(0, 10)
  return String(task.due_date).slice(0, 10) < today
}

export default function Tasks() {
  const { tasks, loading, error, addTask, updateTask, completeTask, reopenTask, removeTask } =
    useTasks()

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
    if (!form.title.trim()) next.title = 'Please enter a task title.'
    if (form.dueDate && Number.isNaN(new Date(form.dueDate).getTime()))
      next.dueDate = 'Please enter a valid date.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const startEdit = (task) => {
    setErr('')
    setOk('')
    setEditingId(task.id)
    setForm({
      title: task.title || '',
      description: task.description || '',
      dueDate: toInputDate(task.due_date),
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
        await updateTask(editingId, form)
        setOk('Task updated')
      } else {
        await addTask(form)
        setOk('Task added')
      }
      resetForm()
    } catch (e2) {
      setErr(e2.message || 'Failed to save task')
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (task) => {
    if (togglingId || busy) return
    setErr('')
    setOk('')
    setTogglingId(task.id)
    try {
      if (isTaskDone(task)) {
        await reopenTask(task.id)
        setOk('Task reopened')
      } else {
        await completeTask(task.id)
        setOk('Task completed')
      }
    } catch (e2) {
      setErr(e2.message || 'Failed to update task')
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
      await removeTask(id)
      setOk('Task deleted')
      if (editingId === id) resetForm()
    } catch (e2) {
      setErr(e2.message || 'Failed to delete task')
    } finally {
      setBusy(false)
      setConfirmId(null)
    }
  }

  const visible = useMemo(() => {
    if (filter === 'open') return tasks.filter((t) => !isTaskDone(t))
    if (filter === 'done') return tasks.filter((t) => isTaskDone(t))
    return tasks
  }, [tasks, filter])

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-[12px] uppercase tracking-[0.12em] text-muted">Tasks</p>
        <h1 className="mt-1 text-[24px] font-extrabold text-navy sm:text-[28px]">Task Management</h1>
        <p className="mt-1 text-sm text-ink">Track assignments, deadlines, and progress.</p>
      </header>

      {loading && <InlineLoader label="Loading tasks..." />}
      {error && <Alert variant="error">{error.message || 'Error loading tasks'}</Alert>}
      {err && <Alert variant="error">{err}</Alert>}
      {ok && <Alert variant="success">{ok}</Alert>}

      <form onSubmit={submit} noValidate className="card flex flex-col gap-5 p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[16px] font-bold text-navy">
            {editingId ? 'Edit task' : 'New task'}
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

        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <TextField
            id="task-title"
            label="Title"
            name="title"
            value={form.title}
            onChange={update}
            error={errors.title}
            required
          />
          <TextField
            id="task-due-date"
            label="Due date"
            name="dueDate"
            type="date"
            value={form.dueDate}
            onChange={update}
            error={errors.dueDate}
          />
        </div>
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
            {editingId ? 'Update task' : 'Add task'}
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
              : `${visible.length} ${visible.length === 1 ? 'task' : 'tasks'}`}
          </span>
        </div>

        {loading && (
          <div role="status" aria-label="Loading tasks" className="flex flex-col gap-3">
            <Skeleton className="h-[86px] w-full" />
            <Skeleton className="h-[86px] w-full" />
            <Skeleton className="h-[86px] w-full" />
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="flex items-center gap-3 rounded-[12px] border border-dashed border-line px-4 py-3 text-sm text-muted">
            {filter === 'all' ? 'No tasks yet.' : `No ${filter} tasks.`}
          </div>
        )}

        {!loading && (
        <ul className="flex flex-col gap-3">
          {visible.map((task) => {
            const done = isTaskDone(task)
            const overdue = isOverdue(task)
            return (
              <li
                key={task.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-[12px] border border-line px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-semibold ${done ? 'text-muted line-through' : 'text-navy'}`}
                    >
                      {task.title}
                    </p>
                    {overdue && <span className="req-pill doing">Overdue</span>}
                    {!done &&
                      String(task.status).toLowerCase() ===
                        TASK_STATUS.IN_PROGRESS && (
                        <span className="req-pill doing">
                          {getTaskStatusLabel(task.status)}
                        </span>
                      )}
                    {done && (
                      <span className="req-pill todo">
                        {getTaskStatusLabel(task.status)}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="mt-1 whitespace-pre-wrap text-[13px] text-ink">{task.description}</p>
                  )}
                  {task.due_date && (
                    <p className={`mt-1 text-[12.5px] ${overdue ? 'text-[#A83B3B]' : 'text-muted'}`}>
                      Due {String(task.due_date).slice(0, 10)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggle(task)}
                    disabled={togglingId === task.id || busy}
                    aria-busy={togglingId === task.id || undefined}
                    className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-navy disabled:opacity-50"
                  >
                    {togglingId === task.id ? (
                      <Spinner className="h-3.5 w-3.5" />
                    ) : done ? (
                      <RotateCcw className="h-3.5 w-3.5" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    {togglingId === task.id ? 'Working...' : done ? 'Reopen' : 'Complete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(task)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-navy disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  {confirmId === task.id ? (
                    <span className="inline-flex items-center gap-2 text-[13px]">
                      <button
                        type="button"
                        onClick={() => remove(task.id)}
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
                      onClick={() => setConfirmId(task.id)}
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
