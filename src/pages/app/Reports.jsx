import { useState } from 'react'
import { CalendarCheck, ClipboardList, Download, FileText, TrendingUp } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { usePlacement } from '../../hooks/usePlacement'
import { useAttendance } from '../../hooks/useAttendance'
import { useDailyLogs } from '../../hooks/useDailyLogs'
import { useTasks, isTaskDone } from '../../hooks/useTasks'
import { useRequirements } from '../../hooks/useRequirements'
import { buildReportPdf, downloadPdf } from '../../lib/pdf'
import { formatHours, formatPercent, formatTime, diffHours, computeCompletedHours, computeProgress } from '../../lib/format'
import Alert from '../../components/ui/Alert'
import InlineLoader from '../../components/ui/InlineLoader'
import LoadingButton from '../../components/ui/LoadingButton'

function sortedByDate(list, key) {
  return [...list].sort((a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? '')))
}

export default function Reports() {
  const { user, profile } = useAuth()
  const { placement, loading: plLoading, error: plError } = usePlacement()
  const { records, loading: attLoading, error: attError } = useAttendance(placement?.id)
  const { logs, loading: logsLoading, error: logsError } = useDailyLogs(placement?.id)
  const { tasks, loading: taskLoading, error: taskError } = useTasks()
  const { requirements, loading: reqLoading, error: reqError } = useRequirements()

  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const loading = plLoading || attLoading || logsLoading || taskLoading || reqLoading
  const hookError = plError || attError || logsError || taskError || reqError

  const { required, completed, remaining, progress } = computeProgress(
    placement?.required_hours,
    records
  )

  const studentName = profile?.full_name || user?.user_metadata?.full_name || user?.email || 'Student'

  const run = (key, filename, buildSections) => {
    if (busy) return
    setErr('')
    setOk('')
    setBusy(key)
    try {
      const blob = buildReportPdf({
        title: filename.title,
        subtitle: filename.subtitle,
        generatedAt: new Date(),
        sections: buildSections(),
      })
      downloadPdf(blob, filename.file)
      setOk(`${filename.title} downloaded.`)
    } catch (e) {
      setErr(e?.message || 'Failed to generate report.')
    } finally {
      setBusy('')
    }
  }

  const progressSections = () => [
    {
      heading: 'Student & Placement',
      paragraphs: [
        `Student: ${studentName}`,
        `Email: ${user?.email || '—'}`,
        `School: ${profile?.school_name || '—'}   Course: ${profile?.course || '—'}   Year level: ${profile?.year_level || '—'}`,
      ],
      table: {
        columns: [
          { header: 'Field', width: 1 },
          { header: 'Details', width: 2.2 },
        ],
        rows: placement
          ? [
              ['Company', placement.company_name || '—'],
              ['Position', placement.position_title || '—'],
              ['Start date', placement.start_date || '—'],
              ['End date', placement.end_date || '—'],
              ['Schedule', placement.weekly_schedule || '—'],
            ]
          : [],
      },
      empty: 'No placement configured.',
    },
    {
      heading: 'OJT Progress',
      paragraphs: placement
        ? []
        : ['No placement configured, so required hours and progress are unavailable.'],
      table: {
        columns: [
          { header: 'Metric', width: 1.4 },
          { header: 'Value', width: 1, align: 'right' },
        ],
        rows: [
          ['Required hours', required != null ? formatHours(required) : '—'],
          ['Completed hours', formatHours(completed)],
          ['Remaining hours', remaining != null ? formatHours(remaining) : '—'],
          ['Progress', progress != null ? formatPercent(progress) : '—'],
        ],
      },
    },
  ]

  const attendanceSections = () => {
    const ordered = sortedByDate(records, 'work_date')
    const rows = ordered.map((r) => [
      String(r.work_date ?? '').slice(0, 10),
      r.time_in ? formatTime(r.time_in) : '—',
      r.time_out ? formatTime(r.time_out) : '—',
      String(Number(r.break_minutes) || 0),
      formatHours(diffHours(r.time_in, r.time_out, r.break_minutes)),
      r.time_out ? 'Completed' : 'Incomplete',
    ])
    return [
      {
        heading: 'Attendance Summary',
        paragraphs: [
          `Total records: ${records.length}`,
          `Total completed hours: ${formatHours(computeCompletedHours(records))} (unfinished shifts and breaks excluded)`,
        ],
      },
      {
        heading: 'Attendance Records',
        table: {
          columns: [
            { header: 'Date', width: 1.1 },
            { header: 'Time In', width: 0.9 },
            { header: 'Time Out', width: 0.9 },
            { header: 'Break (min)', width: 0.8, align: 'right' },
            { header: 'Hours', width: 0.7, align: 'right' },
            { header: 'Status', width: 1 },
          ],
          rows,
        },
        empty: 'No attendance records available.',
      },
    ]
  }

  const activitySections = () => {
    const ordered = sortedByDate(logs, 'log_date')
    const rows = ordered.map((l) => [
      String(l.log_date ?? '').slice(0, 10),
      l.activities || '—',
      l.learnings || '—',
    ])
    return [
      {
        heading: 'Daily Activity Log',
        paragraphs: [`Total entries: ${logs.length}`],
      },
      {
        heading: 'Log Entries (oldest first)',
        table: {
          columns: [
            { header: 'Date', width: 1 },
            { header: 'Activities', width: 2.2 },
            { header: 'Learnings', width: 2.2 },
          ],
          rows,
        },
        empty: 'No daily log entries available.',
      },
    ]
  }

  const summarySections = () => {
    const done = tasks.filter(isTaskDone).length
    const open = tasks.length - done
    const reqCompleted = requirements.filter((r) => r.is_completed).length
    const reqPending = requirements.length - reqCompleted
    const metric = (label, value) => [label, String(value)]
    return [
      {
        heading: 'Tasks',
        table: {
          columns: [
            { header: 'Metric', width: 1.4 },
            { header: 'Count', width: 1, align: 'right' },
          ],
          rows: [metric('Total tasks', tasks.length), metric('Open tasks', open), metric('Completed tasks', done)],
        },
        empty: 'No tasks recorded.',
      },
      {
        heading: 'Requirements',
        table: {
          columns: [
            { header: 'Metric', width: 1.4 },
            { header: 'Count', width: 1, align: 'right' },
          ],
          rows: [
            metric('Total requirements', requirements.length),
            metric('Pending requirements', reqPending),
            metric('Completed requirements', reqCompleted),
          ],
        },
        empty: 'No requirements recorded.',
      },
    ]
  }

  const REPORTS = [
    {
      key: 'progress',
      icon: TrendingUp,
      title: 'OJT Progress Report',
      desc: 'Student and placement details with required, completed, and remaining hours.',
      file: 'ojt-progress-report.pdf',
      subtitle: 'OJT progress summary',
      build: progressSections,
    },
    {
      key: 'attendance',
      icon: CalendarCheck,
      title: 'Attendance Report',
      desc: 'Attendance dates, time in/out, breaks, daily hours, and totals.',
      file: 'ojt-attendance-report.pdf',
      subtitle: 'Attendance summary',
      build: attendanceSections,
    },
    {
      key: 'activity',
      icon: FileText,
      title: 'Daily Activity Report',
      desc: 'Daily activities and learnings in chronological order.',
      file: 'ojt-daily-activity-report.pdf',
      subtitle: 'Daily activity log',
      build: activitySections,
    },
    {
      key: 'summary',
      icon: ClipboardList,
      title: 'Tasks & Requirements Summary',
      desc: 'Counts of open, completed, and pending tasks and requirements.',
      file: 'ojt-tasks-requirements-report.pdf',
      subtitle: 'Tasks and requirements summary',
      build: summarySections,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-[12px] uppercase tracking-[0.12em] text-muted">Progress / Reports</p>
        <h1 className="mt-1 text-[24px] font-extrabold text-navy sm:text-[28px]">Downloadable Reports</h1>
        <p className="mt-1 text-sm text-ink">
          Generate printable PDF reports from your saved OJT data.
        </p>
      </header>

      {loading && <InlineLoader label="Loading your data..." />}
      {hookError && <Alert variant="error">{hookError.message || 'Error loading report data'}</Alert>}
      {err && <Alert variant="error">{err}</Alert>}
      {ok && <Alert variant="success">{ok}</Alert>}

      <div className="grid gap-4 lg:grid-cols-2">
        {REPORTS.map(({ key, icon: Icon, title, desc, file, subtitle, build }) => (
          <article key={key} className="card flex flex-col gap-4 p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-mint text-brand-dark">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-[16px] font-bold text-navy">{title}</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{desc}</p>
              </div>
            </div>
            <div className="mt-auto flex justify-end">
              <LoadingButton
                type="button"
                variant="plain"
                busy={busy === key}
                loadingLabel="Generating..."
                disabled={loading}
                onClick={() =>
                  run(key, { title, subtitle, file }, build)
                }
                className="inline-flex items-center gap-2 rounded-[12px] bg-brand px-4 py-2 text-sm font-semibold text-navy hover:opacity-90 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </LoadingButton>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
