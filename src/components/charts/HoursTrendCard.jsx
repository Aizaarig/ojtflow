import { useMemo, useState } from 'react'
import { CircleAlert, TrendingUp } from 'lucide-react'
import TrendChart from './TrendChart'
import Spinner from '../ui/Spinner'
import { formatHours } from '../../lib/format'
import { TREND_RANGES, buildTrendSeries, sumSeriesHours } from '../../lib/trend'

/*
  Dashboard card: "OJT Hours Trend".
  Receives the already-loaded attendance records from the page so the chart and
  the progress cards share one data source (no duplicate fetching), then buckets
  them into the selected range.
*/
export default function HoursTrendCard({ records, loading, error }) {
  const [range, setRange] = useState('week')

  const points = useMemo(
    () => buildTrendSeries(records, range, new Date()),
    [records, range]
  )
  const total = useMemo(() => sumSeriesHours(points), [points])
  const hasData = total > 0
  const rangeLabel =
    TREND_RANGES.find((r) => r.key === range)?.label?.toLowerCase() || ''

  return (
    <section className="card flex flex-col gap-4 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-bold text-navy">OJT Hours Trend</h2>
          <p className="text-[12.5px] text-muted">
            Your logged training hours over time.
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Time range"
          className="inline-flex rounded-[12px] border border-line bg-mint-soft p-1"
        >
          {TREND_RANGES.map((r) => {
            const selected = r.key === range
            return (
              <button
                key={r.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setRange(r.key)}
                className={`rounded-[9px] px-3 py-1.5 text-[12.5px] font-semibold transition ${
                  selected
                    ? 'bg-white text-brand-dark shadow-card'
                    : 'text-muted hover:text-navy'
                }`}
              >
                {r.label}
              </button>
            )
          })}
        </div>
      </header>

      {loading ? (
        <div className="flex h-[260px] items-center justify-center gap-2 text-sm text-muted">
          <Spinner className="h-4 w-4" /> Loading your hours…
        </div>
      ) : error ? (
        <div className="flex h-[260px] flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-line text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FDECEC] text-[#A83B3B]">
            <CircleAlert className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-navy">
            Couldn&apos;t load your hours
          </p>
          <p className="max-w-[280px] text-[12.5px] text-muted">
            {error.message || 'Please refresh the page and try again.'}
          </p>
        </div>
      ) : !hasData ? (
        <div className="flex h-[260px] flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-line text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-mint text-brand-dark">
            <TrendingUp className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-navy">
            No hours logged yet
          </p>
          <p className="max-w-[280px] text-[12.5px] text-muted">
            Completed attendance in this range will appear here. Log a shift to
            start your trend.
          </p>
        </div>
      ) : (
        <>
          <TrendChart points={points} />
          <p className="text-[12.5px] text-muted">
            <span className="font-semibold text-navy">{formatHours(total)}</span>{' '}
            hours logged {rangeLabel}. Only completed shifts are counted.
          </p>
        </>
      )}
    </section>
  )
}
