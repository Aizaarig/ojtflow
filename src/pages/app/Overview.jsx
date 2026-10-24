import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { usePlacement } from '../../hooks/usePlacement'
import { useAttendance } from '../../hooks/useAttendance'
import { useTasks } from '../../hooks/useTasks'
import { useRequirements } from '../../hooks/useRequirements'
import { classifyTasks } from '../../lib/tasks'
import {
  computeProgress,
  diffHours,
  formatDate,
  formatHours,
  formatPercent,
  formatTime,
  toDateInput,
} from '../../lib/format'
import InlineLoader from '../../components/ui/InlineLoader'
import Skeleton from '../../components/ui/Skeleton'
import Alert from '../../components/ui/Alert'
import HoursTrendCard from '../../components/charts/HoursTrendCard'

const DAY = (value) => String(value || '').slice(0, 10)

function ProgressBar({ value, label }) {
  const pct = value == null ? 0 : Math.min(100, Math.max(0, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-3 w-full overflow-hidden rounded-full bg-mint"
    >
      <div
        className="h-full rounded-full bg-brand transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-[12px] bg-mint-soft px-4 py-3">
      <p className="text-[12px] uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-1 text-[15px] font-semibold text-navy">{value}</p>
    </div>
  )
}

export default function Overview() {
  const { profile } = useAuth()
  const { placement, loading: plLoading, error: plError } = usePlacement()
  const {
    records,
    active,
    loading: attLoading,
    error: attError,
  } = useAttendance(placement?.id)
  const { tasks, loading: taskLoading, error: taskError } = useTasks()
  const {
    requirements,
    completedCount: reqCompleted,
    pendingCount: reqPending,
    loading: reqLoading,
    error: reqError,
  } = useRequirements()

  const name = profile?.full_name || 'Student'
  const today = toDateInput(new Date())

  const { required, completed, remaining, progress } = useMemo(
    () => computeProgress(placement?.required_hours, records),
    [placement?.required_hours, records]
  )

  const { upcomingTasks, overdueTasks, doneTasks } = useMemo(() => {
    const { upcoming, overdue, done } = classifyTasks(tasks, today)
    return { upcomingTasks: upcoming, overdueTasks: overdue, doneTasks: done }
  }, [tasks, today])

  const [nowTick, setNowTick] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return undefined
    const id = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])

  const activeElapsed = active
    ? diffHours(active.time_in, new Date(nowTick).toISOString(), active.break_minutes)
    : 0

  const todayHrs = useMemo(() => {
    let total = 0
    for (const r of records) {
      if (DAY(r.work_date) !== today) continue
      if (!r.time_out) {
        if (!active || r.id !== active.id) continue
        total += diffHours(r.time_in, new Date(nowTick).toISOString(), r.break_minutes)
      } else {
        total += diffHours(r.time_in, r.time_out, r.break_minutes)
      }
    }
    return total
  }, [records, today, nowTick, active])

  const hookError = plError || attError || taskError || reqError
  const hasTarget = required != null && required > 0
  const reqTotal = requirements.length
  const reqPercent = reqTotal > 0 ? (reqCompleted / reqTotal) * 100 : 0

  const placementValue = (value) =>
    value ? (
      value
    ) : (
      <span className="font-medium text-muted">
        Not set{' '}
        <Link to="/placement" className="font-semibold text-brand-dark hover:underline">
          Add
        </Link>
      </span>
    )

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[12px] uppercase tracking-[0.12em] text-muted">Overview</p>
            <h1 className="mt-1 text-[24px] font-extrabold text-navy sm:text-[28px]">
              Good day, {name.split(/\s+/)[0] || 'there'}
            </h1>
            <p className="mt-1 text-sm text-ink">
              Your OJT snapshot, calculated from your saved records.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {active && <span className="dash-chip">Shift in progress</span>}
            {!placement && !plLoading && (
              <Link to="/placement" className="dash-chip transition hover:opacity-90">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                Set up your placement
              </Link>
            )}
          </div>
        </div>

        {(plLoading || attLoading) && (
          <InlineLoader label="Loading your data…" />
        )}
        {hookError && (
          <Alert variant="error">{hookError.message || 'Error loading your dashboard.'}</Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {plLoading || attLoading
            ? [0, 1, 2, 3].map((i) => (
                <article key={i} className="card flex items-center gap-4 p-5">
                  <Skeleton className="h-10 w-10 shrink-0" rounded="rounded-[12px]" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-24" rounded="rounded-[6px]" />
                    <Skeleton className="mt-2 h-5 w-16" rounded="rounded-[6px]" />
                  </div>
                </article>
              ))
            : [
                { label: 'Required hours', value: formatHours(required), icon: Timer },
                { label: 'Completed hours', value: formatHours(completed), icon: TrendingUp },
                { label: 'Remaining hours', value: formatHours(remaining), icon: CalendarCheck },
                { label: 'Progress', value: formatPercent(progress), icon: CheckCircle2 },
              ].map(({ label, value, icon: Icon }) => (
                <article key={label} className="card flex items-center gap-4 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-mint text-brand-dark">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.08em] text-muted">{label}</p>
                    <p className="mt-1 text-[22px] font-extrabold text-navy">{value}</p>
                  </div>
                </article>
              ))}
        </div>
      </section>

      <section className="card flex flex-col gap-4 p-6">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[16px] font-bold text-navy">OJT progress</h2>
            <p className="text-[12.5px] text-muted">
              Completed hours from your attendance records
            </p>
          </div>
          <Link to="/attendance" className="btn btn-soft btn-sm">
            Log attendance
          </Link>
        </header>

        {plLoading ? (
          <div role="status" aria-label="Loading progress" className="flex flex-col gap-3">
            <Skeleton className="h-3 w-full" rounded="rounded-full" />
            <Skeleton className="h-4 w-48" rounded="rounded-[6px]" />
          </div>
        ) : !hasTarget ? (
          <Alert variant="info">
            Set your required OJT hours on the{' '}
            <Link to="/placement" className="font-semibold underline">
              Placement
            </Link>{' '}
            page to see your progress.
          </Alert>
        ) : (
          <>
            <ProgressBar value={progress} label={`OJT progress ${formatPercent(progress)}`} />
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink">
              <span>
                <span className="font-semibold text-navy">{formatHours(completed)}</span> of{' '}
                <span className="font-semibold text-navy">{formatHours(required)}</span> hours
                completed
              </span>
              <span className="font-semibold text-brand-dark">{formatPercent(progress)}</span>
            </div>
            <p className="text-[12.5px] text-muted">
              {formatHours(remaining)} hours remaining to reach your target.
            </p>
          </>
        )}
      </section>

      <HoursTrendCard records={records} loading={attLoading} error={attError} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card flex flex-col gap-4 p-6">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[16px] font-bold text-navy">Attendance status</h2>
              <p className="text-[12.5px] text-muted">
                {active ? 'Shift currently in progress' : 'No active shift'}
              </p>
            </div>
            {active ? (
              <span className="req-pill doing">In progress</span>
            ) : (
              <span className="req-pill todo">Idle</span>
            )}
          </header>

          {plLoading ? (
            <div role="status" aria-label="Loading attendance status" className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[68px] w-full" />
              ))}
            </div>
          ) : !placement ? (
            <Alert variant="info">
              Configure a placement to start tracking attendance.
            </Alert>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Shift" value={active ? 'In progress' : 'Idle'} />
              <Stat label="Time in" value={active ? formatTime(active.time_in) : '—'} />
              <Stat
                label="Elapsed"
                value={active ? `${formatHours(activeElapsed)} hrs` : '—'}
              />
              <Stat label="Today logged" value={`${formatHours(todayHrs)} hrs`} />
            </div>
          )}

          <Link to="/attendance" className="btn btn-soft btn-sm self-start">
            Go to Attendance
          </Link>
        </section>

        <section className="card flex flex-col gap-4 p-6">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[16px] font-bold text-navy">
              <Clock className="h-4 w-4 text-brand-dark" /> Recent activity
            </h2>
            <Link
              to="/attendance"
              className="text-[13px] font-semibold text-brand-dark hover:underline"
            >
              View history
            </Link>
          </header>

          {attLoading ? (
            <div role="status" aria-label="Loading recent activity" className="flex flex-col gap-2">
              <Skeleton className="h-[52px] w-full" />
              <Skeleton className="h-[52px] w-full" />
              <Skeleton className="h-[52px] w-full" />
            </div>
          ) : records.length === 0 ? (
            <div className="flex items-center gap-3 rounded-[12px] border border-dashed border-line px-4 py-3 text-sm text-muted">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                No attendance recorded yet.{' '}
                <Link to="/attendance" className="font-semibold text-brand-dark hover:underline">
                  Log your first shift
                </Link>
              </span>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {records.slice(0, 5).map((r) => {
                const isActive = !r.time_out && active?.id === r.id
                const hrs = diffHours(
                  r.time_in,
                  r.time_out || new Date(nowTick).toISOString(),
                  r.break_minutes
                )
                return (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-line px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy">{formatDate(r.work_date)}</p>
                      <p className="text-[12.5px] text-muted">
                        {formatTime(r.time_in)} – {r.time_out ? formatTime(r.time_out) : 'Active'}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-navy">
                      {r.time_out || isActive ? `${formatHours(hrs)} hrs` : '—'}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card flex flex-col gap-4 p-6">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[16px] font-bold text-navy">Tasks</h2>
            <Link
              to="/tasks"
              className="text-[13px] font-semibold text-brand-dark hover:underline"
            >
              View all
            </Link>
          </header>

          {taskLoading ? (
            <div role="status" aria-label="Loading tasks" className="flex flex-col gap-3">
              <Skeleton className="h-[68px] w-full" />
              <Skeleton className="h-[36px] w-full" />
              <Skeleton className="h-[20px] w-2/3" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex items-center gap-3 rounded-[12px] border border-dashed border-line px-4 py-3 text-sm text-muted">
              <ClipboardList className="h-4 w-4 shrink-0" />
              <span>
                No tasks added yet.{' '}
                <Link to="/tasks" className="font-semibold text-brand-dark hover:underline">
                  Add a task
                </Link>
              </span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Upcoming" value={upcomingTasks.length} />
                <Stat label="Overdue" value={overdueTasks.length} />
                <Stat label="Completed" value={doneTasks.length} />
              </div>
              {upcomingTasks.length > 0 && (
                <div>
                  <p className="text-[12px] uppercase tracking-[0.08em] text-muted">
                    Next deadlines
                  </p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {upcomingTasks.slice(0, 3).map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-3 text-[13px]">
                        <span className="truncate text-navy">{t.title}</span>
                        <span className="shrink-0 text-muted">{formatDate(t.due_date)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>

        <section className="card flex flex-col gap-4 p-6">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[16px] font-bold text-navy">Requirements</h2>
            <Link
              to="/requirements"
              className="text-[13px] font-semibold text-brand-dark hover:underline"
            >
              View all
            </Link>
          </header>

          {reqLoading ? (
            <div role="status" aria-label="Loading requirements" className="flex flex-col gap-3">
              <Skeleton className="h-3 w-full" rounded="rounded-full" />
              <Skeleton className="h-4 w-40" rounded="rounded-[6px]" />
            </div>
          ) : reqTotal === 0 ? (
            <div className="flex items-center gap-3 rounded-[12px] border border-dashed border-line px-4 py-3 text-sm text-muted">
              <FileText className="h-4 w-4 shrink-0" />
              <span>
                No requirements tracked yet.{' '}
                <Link
                  to="/requirements"
                  className="font-semibold text-brand-dark hover:underline"
                >
                  Add one
                </Link>
              </span>
            </div>
          ) : (
            <>
              <ProgressBar value={reqPercent} label={`Requirements ${formatPercent(reqPercent)} complete`} />
              <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                <span className="text-ink">
                  <span className="font-semibold text-navy">{reqCompleted}</span> of{' '}
                  <span className="font-semibold text-navy">{reqTotal}</span> complete
                </span>
                <span className={reqPending > 0 ? 'font-semibold text-[#A83B3B]' : 'text-muted'}>
                  {reqPending} incomplete
                </span>
              </div>
            </>
          )}
        </section>
      </div>

      <section className="card flex flex-col gap-4 p-6">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-mint text-brand-dark">
              <Building2 className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[16px] font-bold text-navy">Placement</h2>
              <p className="text-[12.5px] text-muted">
                {placement ? 'Your saved placement details' : 'No placement saved yet'}
              </p>
            </div>
          </div>
          <Link to="/placement" className="btn btn-soft btn-sm">
            {placement ? 'Edit placement' : 'Set up placement'}
          </Link>
        </header>

        {plLoading ? (
          <div role="status" aria-label="Loading placement" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col gap-1">
                <Skeleton className="h-3 w-24" rounded="rounded-[6px]" />
                <Skeleton className="h-4 w-36" rounded="rounded-[6px]" />
              </div>
            ))}
          </div>
        ) : placement ? (
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Company', value: placement.company_name },
              { label: 'Position / role', value: placement.position_title },
              { label: 'Start date', value: formatDate(placement.start_date) },
              { label: 'Expected end date', value: formatDate(placement.end_date) },
              {
                label: 'Required OJT hours',
                value: required != null && required > 0 ? formatHours(required) : '',
              },
              { label: 'Completed hours', value: formatHours(completed) },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-1">
                <dt className="text-[12px] uppercase tracking-[0.08em] text-muted">{label}</dt>
                <dd className="text-sm font-semibold text-navy">{placementValue(value)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="flex items-center gap-3 rounded-[12px] border border-dashed border-line px-4 py-3 text-sm text-muted">
            <Building2 className="h-4 w-4 shrink-0" />
            <span>
              You haven&apos;t saved a placement yet. Open the Placement page to add your company,
              dates, and required OJT hours.{' '}
              <Link to="/placement" className="font-semibold text-brand-dark hover:underline">
                Set up placement
              </Link>
              .
            </span>
          </div>
        )}
      </section>
    </div>
  )
}
