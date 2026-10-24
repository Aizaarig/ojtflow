import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Pencil,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { usePlacement } from '../../hooks/usePlacement'
import { useAttendance } from '../../hooks/useAttendance'
import TextField from '../../components/ui/TextField'
import Textarea from '../../components/ui/Textarea'
import Alert from '../../components/ui/Alert'
import InlineLoader from '../../components/ui/InlineLoader'
import LoadingButton from '../../components/ui/LoadingButton'
import Spinner from '../../components/ui/Spinner'
import { formatDate, formatHours, formatPercent } from '../../lib/format'
import { validatePlacementForm } from '../../lib/validators'

const EMPTY_FORM = {
  companyName: '',
  companyAddress: '',
  department: '',
  positionTitle: '',
  supervisorName: '',
  supervisorEmail: '',
  supervisorPhone: '',
  startDate: '',
  endDate: '',
  requiredHours: '',
  weeklySchedule: '',
  isActive: true,
}

function scheduleText(value) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return value.trim() || '—'
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-[12px] uppercase tracking-[0.08em] text-muted">
        {label}
      </dt>
      <dd className="text-sm font-medium text-navy sm:text-right">{value}</dd>
    </div>
  )
}

export default function Placement() {
  const { placement, save, loading, error } = usePlacement()
  const { completedHours, loading: attLoading } = useAttendance(placement?.id)

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const [lastPlacement, setLastPlacement] = useState(null)
  if (placement && placement !== lastPlacement) {
    setLastPlacement(placement)
    setForm({
      companyName: placement.company_name || '',
      companyAddress: placement.company_address || '',
      department: placement.department || '',
      positionTitle: placement.position_title || '',
      supervisorName: placement.supervisor_name || '',
      supervisorEmail: placement.supervisor_email || '',
      supervisorPhone: placement.supervisor_phone || '',
      startDate: placement.start_date || '',
      endDate: placement.end_date || '',
      requiredHours:
        placement.required_hours === null ||
        placement.required_hours === undefined
          ? ''
          : String(placement.required_hours),
      weeklySchedule:
        typeof placement.weekly_schedule === 'string'
          ? placement.weekly_schedule
          : '',
      isActive: !!placement.is_active,
    })
  }

  const update = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
    setOk('')
  }
  const toggle = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.checked }))

  const submit = async (e) => {
    e.preventDefault()
    if (saving) return

    const validation = validatePlacementForm(form)
    setErrors(validation)
    setErr('')
    setOk('')
    if (Object.keys(validation).length > 0) {
      setErr('Please fix the highlighted fields before saving.')
      return
    }

    setSaving(true)
    try {
      await save(form)
      setOk(
        placement
          ? 'Placement updated successfully.'
          : 'Placement saved successfully.'
      )
    } catch (e2) {
      setErr(e2?.message || 'Failed to save placement. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const hasPlacement = !!placement
  const required =
    placement?.required_hours != null ? Number(placement.required_hours) : null
  const completed = completedHours || 0
  const remaining =
    required != null && required > 0 ? Math.max(0, required - completed) : null
  const progress =
    required != null && required > 0
      ? Math.min(100, (completed / required) * 100)
      : null

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header>
        <p className="text-[12px] uppercase tracking-[0.12em] text-muted">
          Placement
        </p>
        <h1 className="mt-1 text-[24px] font-extrabold text-navy sm:text-[28px]">
          OJT Placement
        </h1>
        <p className="mt-1 text-sm text-ink">
          Enter and save the details of your OJT placement. Your saved data is
          loaded automatically the next time you sign in.
        </p>
      </header>

      {loading && <InlineLoader label="Loading placement..." />}

      {!loading && error && (
        <Alert variant="error">
          Could not load your placement. {error.message}
        </Alert>
      )}

      {!loading && !hasPlacement && (
        <section className="card flex flex-col gap-2 border-dashed p-6">
          <h2 className="text-[16px] font-bold text-navy">
            No placement yet
          </h2>
          <p className="text-sm text-ink">
            You haven&apos;t set up your OJT placement. Fill in the form below
            and save it to start tracking your hours.
          </p>
        </section>
      )}

      {hasPlacement && (
        <section className="card flex flex-col gap-5 p-6">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-mint text-brand-dark">
                <Building2 className="h-4 w-4" />
              </span>
              <h2 className="text-[16px] font-bold text-navy">
                Saved placement
              </h2>
            </div>
            <span className="dash-chip">
              {placement.is_active ? 'Active placement' : 'Inactive placement'}
            </span>
          </header>

          <dl className="grid gap-3">
            <SummaryRow
              label="Company"
              value={placement.company_name || '—'}
            />
            <SummaryRow
              label="Company address"
              value={placement.company_address || '—'}
            />
            <SummaryRow
              label="Department"
              value={placement.department || '—'}
            />
            <SummaryRow
              label="Position / role"
              value={placement.position_title || '—'}
            />
            <SummaryRow
              label="Supervisor"
              value={placement.supervisor_name || '—'}
            />
            <SummaryRow
              label="Supervisor email"
              value={placement.supervisor_email || '—'}
            />
            <SummaryRow
              label="Supervisor phone"
              value={placement.supervisor_phone || '—'}
            />
            <SummaryRow
              label="Start date"
              value={formatDate(placement.start_date) || '—'}
            />
            <SummaryRow
              label="Expected end date"
              value={formatDate(placement.end_date) || '—'}
            />
            <SummaryRow
              label="Required OJT hours"
              value={
                required != null && required > 0 ? formatHours(required) : '—'
              }
            />
            <SummaryRow
              label="Weekly schedule"
              value={scheduleText(placement.weekly_schedule)}
            />
          </dl>

          <div className="rounded-[14px] bg-mint px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] uppercase tracking-[0.12em] text-muted">
                Attendance progress
              </p>
              {attLoading ? (
                <Spinner className="h-4 w-4 text-brand-dark" />
              ) : (
                <span className="req-pill done">
                  {progress != null ? formatPercent(progress) : '—'}
                </span>
              )}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-brand-dark" />
                <div>
                  <p className="text-[12px] uppercase tracking-[0.08em] text-muted">
                    Completed
                  </p>
                  <p className="text-[18px] font-extrabold text-navy">
                    {formatHours(completed)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-brand-dark" />
                <div>
                  <p className="text-[12px] uppercase tracking-[0.08em] text-muted">
                    Remaining
                  </p>
                  <p className="text-[18px] font-extrabold text-navy">
                    {remaining != null ? formatHours(remaining) : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-dark" />
                <div>
                  <p className="text-[12px] uppercase tracking-[0.08em] text-muted">
                    Required
                  </p>
                  <p className="text-[18px] font-extrabold text-navy">
                    {required != null && required > 0
                      ? formatHours(required)
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-[12px] text-muted">
              Based on your actual attendance records. Completed hours only
              count finished shifts.
            </p>
          </div>
        </section>
      )}

      <form onSubmit={submit} noValidate className="card flex flex-col gap-6 p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-mint text-brand-dark">
            {hasPlacement ? (
              <Pencil className="h-4 w-4" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
          </span>
          <h2 className="text-[16px] font-bold text-navy">
            {hasPlacement ? 'Edit placement details' : 'Placement details'}
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
            Company information
          </h3>
          <TextField
            id="companyName"
            label="Company name (required)"
            name="companyName"
            value={form.companyName}
            onChange={update}
            error={errors.companyName}
            autoComplete="organization"
            required
          />
          <TextField
            id="companyAddress"
            label="Company address (optional)"
            name="companyAddress"
            value={form.companyAddress}
            onChange={update}
            autoComplete="street-address"
            placeholder="Enter company address (optional)"
          />
          <TextField
            id="department"
            label="Department (optional)"
            name="department"
            value={form.department}
            onChange={update}
            placeholder="Enter department or unit (optional)"
          />
          <TextField
            id="positionTitle"
            label="Assigned position / role (optional)"
            name="positionTitle"
            value={form.positionTitle}
            onChange={update}
            placeholder="Enter your assigned role (optional)"
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
              Supervisor information (optional)
            </h3>
            <p className="text-[12px] text-muted">
              Every supervisor field is optional. Save your placement now and add
              these details later if they change.
            </p>
          </div>
          <TextField
            id="supervisorName"
            label="Supervisor name (optional)"
            name="supervisorName"
            value={form.supervisorName}
            onChange={update}
            autoComplete="name"
            placeholder="Enter supervisor name (if known)"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="supervisorEmail"
              label="Supervisor contact email (optional)"
              name="supervisorEmail"
              type="email"
              value={form.supervisorEmail}
              onChange={update}
              error={errors.supervisorEmail}
              autoComplete="email"
              placeholder="Enter supervisor email (optional)"
            />
            <TextField
              id="supervisorPhone"
              label="Supervisor contact phone (optional)"
              name="supervisorPhone"
              type="tel"
              value={form.supervisorPhone}
              onChange={update}
              autoComplete="tel"
              placeholder="Enter supervisor phone (optional)"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
            OJT details
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="startDate"
              label="OJT start date (required)"
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={update}
              error={errors.startDate}
              required
            />
            <TextField
              id="endDate"
              label="Expected end date (required)"
              name="endDate"
              type="date"
              value={form.endDate}
              onChange={update}
              error={errors.endDate}
              required
            />
          </div>

          <TextField
            id="requiredHours"
            label="Required OJT hours (required)"
            name="requiredHours"
            type="number"
            min="1"
            step="any"
            inputMode="decimal"
            placeholder="e.g. 486, 600, or 720"
            value={form.requiredHours}
            onChange={update}
            error={errors.requiredHours}
            required
          />
          <p className="-mt-2 flex items-center gap-1.5 text-[12px] text-muted">
            <Clock className="h-3.5 w-3.5" />
            Enter the total hours required by your institution. This varies per
            student and is not defaulted.
          </p>

          <Textarea
            id="weeklySchedule"
            label="Weekly schedule (optional)"
            name="weeklySchedule"
            rows={3}
            placeholder="e.g. Monday to Friday, 8:00 AM - 5:00 PM"
            value={form.weeklySchedule}
            onChange={update}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="isActive"
            checked={form.isActive}
            onChange={toggle}
            className="h-4 w-4 rounded border-line text-brand-dark focus:ring-brand"
          />
          Set as active placement
        </label>

        {err && <Alert variant="error">{err}</Alert>}
        {ok && <Alert variant="success">{ok}</Alert>}

        <div className="flex flex-wrap items-center justify-end gap-3">
          {hasPlacement && (
            <Link to="/dashboard" className="btn btn-ghost btn-sm">
              Back to dashboard
            </Link>
          )}
          <LoadingButton
            type="submit"
            variant="plain"
            busy={saving}
            loadingLabel="Saving..."
            className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-brand px-4 py-2 text-sm font-semibold text-navy hover:opacity-90 disabled:opacity-50"
          >
            {hasPlacement ? 'Save changes' : 'Save placement'}
          </LoadingButton>
        </div>
      </form>

      <p className="flex items-center gap-2 text-[12px] text-muted">
        <CalendarDays className="h-3.5 w-3.5" />
        Tip: keep your dates and required hours up to date so your dashboard
        progress stays accurate.
      </p>
    </div>
  )
}
