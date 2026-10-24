import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { formatDate, formatHours } from '../../lib/format'
import { niceMax } from '../../lib/trend'

const PAD = { top: 18, right: 16, bottom: 30, left: 40 }
const Y_TICKS = 4

const COLOR = {
  brand: '#0f9d7a',
  brandDark: '#087a62',
  grid: '#e2e9e6',
  muted: '#64737d',
  navy: '#0b1f2a',
}

/*
  Monotone cubic interpolation (Fritsch–Carlson). Produces a smooth line that
  never overshoots the data points, so values stay readable.
*/
function monotonePath(coords) {
  const n = coords.length
  if (n === 0) return ''
  if (n === 1) return `M ${coords[0].x} ${coords[0].y}`

  const dx = []
  const slope = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = coords[i + 1].x - coords[i].x
    slope[i] = dx[i] === 0 ? 0 : (coords[i + 1].y - coords[i].y) / dx[i]
  }

  const tangent = new Array(n)
  tangent[0] = slope[0]
  tangent[n - 1] = slope[n - 2]
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) {
      tangent[i] = 0
    } else {
      const w1 = 2 * dx[i] + dx[i - 1]
      const w2 = dx[i] + 2 * dx[i - 1]
      tangent[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i])
    }
  }

  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0
      tangent[i + 1] = 0
      continue
    }
    const a = tangent[i] / slope[i]
    const b = tangent[i + 1] / slope[i]
    const s = a * a + b * b
    if (s > 9) {
      const t = 3 / Math.sqrt(s)
      tangent[i] = t * a * slope[i]
      tangent[i + 1] = t * b * slope[i]
    }
  }

  let d = `M ${coords[0].x} ${coords[0].y}`
  for (let i = 0; i < n - 1; i++) {
    const cx1 = coords[i].x + dx[i] / 3
    const cy1 = coords[i].y + (tangent[i] * dx[i]) / 3
    const cx2 = coords[i + 1].x - dx[i] / 3
    const cy2 = coords[i + 1].y - (tangent[i + 1] * dx[i]) / 3
    d += ` C ${cx1} ${cy1} ${cx2} ${cy2} ${coords[i + 1].x} ${coords[i + 1].y}`
  }
  return d
}

function labelStep(count) {
  if (count >= 10) return 3
  if (count > 7) return 2
  return 1
}

function axisValue(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export default function TrendChart({ points, height = 260 }) {
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(0)
  const [hover, setHover] = useState(null)
  const gradientId = useId().replace(/:/g, '')

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const update = () => setWidth(el.clientWidth)
    update()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const geometry = useMemo(() => {
    const innerW = Math.max(0, width - PAD.left - PAD.right)
    const innerH = Math.max(0, height - PAD.top - PAD.bottom)
    const n = points.length
    const yMax = niceMax(Math.max(0, ...points.map((p) => p.hours)))
    const xFor = (i) => (n <= 1 ? PAD.left + innerW / 2 : PAD.left + (i / (n - 1)) * innerW)
    const yFor = (h) => PAD.top + innerH - (Math.min(Math.max(h, 0), yMax) / yMax) * innerH
    const coords = points.map((p, i) => ({ x: xFor(i), y: yFor(p.hours) }))
    const linePath = monotonePath(coords)
    const baseY = PAD.top + innerH
    const areaPath =
      coords.length > 0
        ? `${linePath} L ${coords[coords.length - 1].x} ${baseY} L ${coords[0].x} ${baseY} Z`
        : ''
    const ticks = Array.from({ length: Y_TICKS + 1 }, (_, i) => (yMax * i) / Y_TICKS)
    return { innerW, innerH, yMax, xFor, yFor, coords, linePath, areaPath, ticks }
  }, [points, width, height])

  const { xFor, yFor, coords, linePath, areaPath, ticks } = geometry
  const step = labelStep(points.length)
  const showValues = points.length <= 7

  const onMove = (e) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect || geometry.innerW <= 0) return
    const n = points.length
    const x = e.clientX - rect.left
    const stepX = n > 1 ? geometry.innerW / (n - 1) : geometry.innerW
    let idx = n > 1 ? Math.round((x - PAD.left) / stepX) : 0
    idx = Math.max(0, Math.min(n - 1, idx))
    setHover(idx)
  }

  const hoverPoint = hover != null ? points[hover] : null
  const hoverX = hover != null ? xFor(hover) : 0
  const hoverY = hover != null ? yFor(hoverPoint.hours) : 0
  const tooltipLeft = Math.max(56, Math.min(width - 56, hoverX))

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`OJT hours trend. ${points
            .map((p) => `${p.label}: ${formatHours(p.hours)} hours`)
            .join(', ')}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLOR.brand} stopOpacity="0.22" />
              <stop offset="100%" stopColor={COLOR.brand} stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((t) => {
            const y = yFor(t)
            return (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={PAD.left + geometry.innerW}
                  y1={y}
                  y2={y}
                  stroke={COLOR.grid}
                  strokeWidth="1"
                />
                <text
                  x={PAD.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill={COLOR.muted}
                >
                  {axisValue(t)}
                </text>
              </g>
            )
          })}

          {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={COLOR.brandDark}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {hover != null && (
            <line
              x1={hoverX}
              x2={hoverX}
              y1={PAD.top}
              y2={PAD.top + geometry.innerH}
              stroke={COLOR.brand}
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.5"
            />
          )}

          {coords.map((c, i) => {
            const p = points[i]
            const isHover = hover === i
            const r = p.isCurrent ? 5 : isHover ? 5 : 3.5
            return (
              <circle
                key={p.key ?? i}
                cx={c.x}
                cy={c.y}
                r={r}
                fill={p.isCurrent || isHover ? COLOR.brandDark : '#fff'}
                stroke={p.isCurrent || isHover ? '#fff' : COLOR.brandDark}
                strokeWidth="2"
              />
            )
          })}

          {showValues &&
            points.map((p, i) =>
              p.hours > 0 ? (
                <text
                  key={`v-${p.key ?? i}`}
                  x={xFor(i)}
                  y={yFor(p.hours) - 10}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill={COLOR.brandDark}
                >
                  {formatHours(p.hours)}
                </text>
              ) : null
            )}

          {points.map((p, i) => {
            const show = i % step === 0 || i === points.length - 1
            if (!show) return null
            return (
              <text
                key={`x-${p.key ?? i}`}
                x={xFor(i)}
                y={height - 9}
                textAnchor="middle"
                fontSize="11"
                fontWeight={p.isCurrent ? '700' : '400'}
                fill={p.isCurrent ? COLOR.brandDark : COLOR.muted}
              >
                {p.label}
              </text>
            )
          })}
        </svg>
      )}

      {hoverPoint && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-[10px] border border-line bg-white px-3 py-2 text-left shadow-card"
          style={{ left: tooltipLeft, top: Math.max(4, hoverY - 58) }}
        >
          <p className="text-[11px] font-medium text-muted">
            {hoverPoint.date === hoverPoint.endDate
              ? formatDate(hoverPoint.date)
              : `Week of ${formatDate(hoverPoint.date)}`}
          </p>
          <p className="text-[13px] font-bold text-navy">
            {formatHours(hoverPoint.hours)} hrs
          </p>
        </div>
      )}

      <table className="sr-only">
        <caption>OJT hours trend</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Hours</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.key}>
              <th scope="row">{p.label}</th>
              <td>{formatHours(p.hours)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
