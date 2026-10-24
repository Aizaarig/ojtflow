import { useEffect, useMemo, useState } from 'react'
import { usePlacement } from '../../hooks/usePlacement'
import { useAttendance } from '../../hooks/useAttendance'
import TextField from '../../components/ui/TextField'
import Alert from '../../components/ui/Alert'
import InlineLoader from '../../components/ui/InlineLoader'
import LoadingButton from '../../components/ui/LoadingButton'
import Skeleton from '../../components/ui/Skeleton'
import { formatHours, formatTime, diffHours } from '../../lib/format'

export default function Attendance() {
  const { placement, loading: placementLoading } = usePlacement()
  const { records, active, loading, error, startShift, stopShift, updateBreak, addManual } =
    useAttendance(placement?.id)

  const [now, setNow] = useState(0)
  const [tab, setTab] = useState('timer')
  const [notes, setNotes] = useState('')
  const [breakM, setBreakM] = useState(0)
  const [m, setM] = useState({ workDate: '', timeIn: '', timeOut: '', breakMinutes: 0, notes: '' })
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const [lastActiveId, setLastActiveId] = useState(null)
  if ((active?.id ?? null) !== lastActiveId) {
    setLastActiveId(active?.id ?? null)
    setBreakM(active?.break_minutes || 0)
  }

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const elapsed = active && now ? diffHours(active.time_in, new Date(now).toISOString(), breakM) : 0
  const canStart = !active && !!placement

  const start = async (e) => {
    e.preventDefault()
    if (busy) return
    setErr('')
    setOk('')
    setBusy('start')
    try {
      await startShift({ notes })
      setNotes('')
      setOk('Shift started')
      setBreakM(0)
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setBusy('')
    }
  }

  const stop = async () => {
    if (busy) return
    setErr('')
    setOk('')
    setBusy('stop')
    try {
      await stopShift()
      setOk('Shift ended')
      setBreakM(0)
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setBusy('')
    }
  }

  const saveBreak = async () => {
    if (busy) return
    setErr('')
    setOk('')
    setBusy('break')
    try {
      await updateBreak(breakM)
      setOk('Break updated')
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setBusy('')
    }
  }

  const add = async (e) => {
    e.preventDefault()
    if (busy) return
    setErr('')
    setOk('')
    setBusy('manual')
    try {
      await addManual(m)
      setM({ workDate: '', timeIn: '', timeOut: '', breakMinutes: 0, notes: '' })
      setOk('Manual entry added')
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setBusy('')
    }
  }

  const history = useMemo(
    () =>
      [...records].sort(
        (a, b) =>
          b.work_date.localeCompare(a.work_date) ||
          new Date(b.time_in).getTime() - new Date(a.time_in).getTime()
      ),
    [records]
  )

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-[12px] uppercase tracking-[0.12em] text-muted">Attendance</p>
        <h1 className="mt-1 text-[24px] font-extrabold text-navy sm:text-[28px]">Shift &amp; Time Tracking</h1>
        <p className="mt-1 text-sm text-ink">Track your OJT hours accurately.</p>
      </header>

      {!placementLoading && !placement && <Alert variant="info">No active placement found.</Alert>}
      {loading && <InlineLoader label="Loading attendance..." />}
      {error && <Alert variant="error">{error.message || 'Error loading attendance'}</Alert>}
      {err && <Alert variant="error">{err}</Alert>}
      {ok && <Alert variant="success">{ok}</Alert>}

      <div className="card flex flex-col gap-5 p-6">
        <div className="flex gap-2 border-b border-line">
          <button
            type="button"
            className={`px-4 py-2 text-sm ${tab === 'timer' ? 'border-b-2 border-brand text-navy' : 'text-muted'}`}
            onClick={() => setTab('timer')}
          >
            Shift Timer
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm ${tab === 'manual' ? 'border-b-2 border-brand text-navy' : 'text-muted'}`}
            onClick={() => setTab('manual')}
          >
            Manual Entry
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm ${tab === 'history' ? 'border-b-2 border-brand text-navy' : 'text-muted'}`}
            onClick={() => setTab('history')}
          >
            History
          </button>
        </div>

        {tab === 'timer' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-[14px] bg-mint px-6 py-6 text-center">
              <p className="text-[12px] uppercase tracking-[0.12em] text-muted">
                Elapsed (excluding break)
              </p>
              <p className="mt-2 text-[38px] font-extrabold text-navy sm:text-[48px]">
                {elapsed.toFixed(2)} hrs
              </p>
              <p className="mt-2 text-sm text-ink">
                {active ? 'Shift in progress' : 'No active shift'}
              </p>
            </div>

            <form onSubmit={start} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <TextField
                label="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <LoadingButton
                  type="submit"
                  variant="plain"
                  busy={busy === 'start'}
                  loadingLabel="Starting…"
                  disabled={!canStart}
                  className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-brand px-4 py-2 text-sm font-semibold text-navy hover:opacity-90 disabled:opacity-50"
                >
                  Start Shift
                </LoadingButton>
                <LoadingButton
                  type="button"
                  variant="plain"
                  busy={busy === 'stop'}
                  loadingLabel="Ending…"
                  onClick={stop}
                  disabled={!active}
                  className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-line px-4 py-2 text-sm text-ink hover:bg-mint disabled:opacity-50"
                >
                  End Shift
                </LoadingButton>
              </div>
            </form>

            {active && (
              <div className="grid gap-4 sm:grid-cols-[240px_auto] sm:items-end">
                <TextField
                  label="Break minutes (active shift)"
                  type="number"
                  min="0"
                  max="720"
                  value={breakM}
                  onChange={(e) => setBreakM(Number(e.target.value) || 0)}
                />
                <LoadingButton
                  type="button"
                  variant="plain"
                  busy={busy === 'break'}
                  loadingLabel="Saving…"
                  onClick={saveBreak}
                  className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-line px-4 py-2 text-sm text-ink hover:bg-mint disabled:opacity-50"
                >
                  Update Break
                </LoadingButton>
              </div>
            )}
          </div>
        )}

        {tab === 'manual' && (
          <form onSubmit={add} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Work date"
                type="date"
                value={m.workDate}
                onChange={(e) => setM((p) => ({ ...p, workDate: e.target.value }))}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Time in"
                  type="datetime-local"
                  value={m.timeIn}
                  onChange={(e) => setM((p) => ({ ...p, timeIn: e.target.value }))}
                  required
                />
                <TextField
                  label="Time out"
                  type="datetime-local"
                  value={m.timeOut}
                  onChange={(e) => setM((p) => ({ ...p, timeOut: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Break minutes"
                type="number"
                min="0"
                max="720"
                value={m.breakMinutes}
                onChange={(e) => setM((p) => ({ ...p, breakMinutes: Number(e.target.value) || 0 }))}
              />
              <TextField
                label="Notes"
                value={m.notes}
                onChange={(e) => setM((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <div className="flex justify-end">
              <LoadingButton
                type="submit"
                variant="plain"
                busy={busy === 'manual'}
                loadingLabel="Adding…"
                className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-brand px-4 py-2 text-sm font-semibold text-navy hover:opacity-90 disabled:opacity-50"
              >
                Add Manual Entry
              </LoadingButton>
            </div>
          </form>
        )}

        {tab === 'history' && (
          <div className="flex flex-col gap-3">
            {loading && (
              <div role="status" aria-label="Loading attendance history" className="flex flex-col gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )}
            {!loading && history.length === 0 && (
              <div className="text-sm text-muted">No attendance records yet.</div>
            )}
            {!loading && history.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[12px] uppercase tracking-[0.08em] text-muted">
                      <th className="px-2 py-2">Date</th>
                      <th className="px-2 py-2">In</th>
                      <th className="px-2 py-2">Out</th>
                      <th className="px-2 py-2">Break</th>
                      <th className="px-2 py-2">Hours</th>
                      <th className="px-2 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {history.map((r) => {
                      const hrs = diffHours(r.time_in, r.time_out, r.break_minutes)
                      const status = r.time_out ? 'Completed' : 'Active'
                      return (
                        <tr key={r.id}>
                          <td className="px-2 py-2">{r.work_date}</td>
                          <td className="px-2 py-2">{formatTime(r.time_in)}</td>
                          <td className="px-2 py-2">{r.time_out ? formatTime(r.time_out) : '-'}</td>
                          <td className="px-2 py-2">{r.break_minutes || 0}m</td>
                          <td className="px-2 py-2">{formatHours(hrs)}</td>
                          <td className="px-2 py-2">{status}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
