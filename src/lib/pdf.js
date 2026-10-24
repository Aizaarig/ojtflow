const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 40
const CONTENT_W = PAGE_W - MARGIN * 2
const HEADER_H = 64
const TOP = 84
const BOTTOM = PAGE_H - 52

const NAVY = '0.043 0.122 0.165'
const BRAND = '0.059 0.616 0.478'
const MINT = '0.910 0.969 0.949'
const INK = '0.322 0.388 0.435'
const MUTED = '0.510 0.565 0.604'
const LINE = '0.886 0.914 0.902'
const WHITE = '1 1 1'

const WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278,
  278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584,
  584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556,
  833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278,
  278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222,
  500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500,
  500, 334, 260, 334, 584,
]

const fmt = (v) => {
  const r = Math.round(v * 100) / 100
  return Number.isFinite(r) ? String(r) : '0'
}

const measure = (s, size, bold = false) => {
  let total = 0
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i)
    total += WIDTHS[code - 32] ?? 556
  }
  return (total / 1000) * size * (bold ? 1.06 : 1)
}

const sanitize = (s) =>
  String(s ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/[^\x20-\x7E]/g, '?')

const escape = (s) =>
  sanitize(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

export function buildReportPdf({ title, subtitle = '', generatedAt = new Date(), sections = [] }) {
  const pages = []
  let ops = null
  let y = TOP

  const startPage = () => {
    ops = []
    pages.push(ops)
    y = TOP
  }
  const newPage = () => startPage()
  const push = (s) => ops.push(s)
  const txt = (str, x, dy, size, bold, color) =>
    push(
      `BT /${bold ? 'F2' : 'F1'} ${fmt(size)} Tf ${color} rg ${fmt(x)} ${fmt(
        PAGE_H - dy
      )} Td (${escape(str)}) Tj ET`
    )
  const rect = (x, dy, w, h, color) =>
    push(`${color} rg ${fmt(x)} ${fmt(PAGE_H - dy - h)} re f`)
  const rule = (x1, dy1, x2, dy2, color, w = 0.5) =>
    push(
      `${color} RG ${fmt(w)} w ${fmt(x1)} ${fmt(PAGE_H - dy1)} m ${fmt(
        x2
      )} ${fmt(PAGE_H - dy2)} l S`
    )
  const ensure = (h) => {
    if (y + h > BOTTOM) newPage()
  }

  const wrap = (str, maxW, size, bold = false) => {
    const s = sanitize(str).trim()
    if (!s) return ['']
    const lines = []
    let cur = ''
    for (const word of s.split(/\s+/)) {
      const test = cur ? `${cur} ${word}` : word
      if (measure(test, size, bold) <= maxW) {
        cur = test
        continue
      }
      if (cur) {
        lines.push(cur)
      }
      if (measure(word, size, bold) <= maxW) {
        cur = word
        continue
      }
      let chunk = ''
      for (const ch of word) {
        if (measure(chunk + ch, size, bold) <= maxW) {
          chunk += ch
        } else {
          lines.push(chunk)
          chunk = ch
        }
      }
      cur = chunk
    }
    if (cur) lines.push(cur)
    return lines.length ? lines : ['']
  }

  const drawTable = (columns, rows) => {
    const totalWeight = columns.reduce((sum, c) => sum + (c.width || 1), 0)
    const colW = columns.map((c) => ((c.width || 1) / totalWeight) * CONTENT_W)
    const headerH = 20

    const drawHeader = () => {
      rect(MARGIN, y, CONTENT_W, headerH, MINT)
      let x = MARGIN
      columns.forEach((c, i) => {
        txt(c.header, x + 6, y + 13.5, 9.5, true, NAVY)
        x += colW[i]
      })
      y += headerH
    }

    ensure(headerH + 22)
    drawHeader()

    rows.forEach((row) => {
      const cellLines = columns.map((c, i) =>
        wrap(row[i], colW[i] - 12, 9, false)
      )
      const lineCount = Math.max(1, ...cellLines.map((a) => a.length))
      const rowH = lineCount * 11.5 + 8
      if (y + rowH > BOTTOM) {
        newPage()
        drawHeader()
      }
      let x = MARGIN
      columns.forEach((c, i) => {
        cellLines[i].forEach((ln, j) => {
          const align = c.align || 'left'
          let tx = x + 6
          if (align === 'right') tx = x + colW[i] - 6 - measure(ln, 9, false)
          else if (align === 'center')
            tx = x + (colW[i] - measure(ln, 9, false)) / 2
          txt(ln, tx, y + 12 + j * 11.5, 9, false, INK)
        })
        x += colW[i]
      })
      rule(MARGIN, y + rowH, MARGIN + CONTENT_W, y + rowH, LINE)
      y += rowH
    })
  }

  startPage()

  for (const section of sections) {
    ensure(46)
    rect(MARGIN, y + 2, 4, 15, BRAND)
    txt(section.heading, MARGIN + 12, y + 13.5, 12.5, true, NAVY)
    y += 26

    if (section.paragraphs?.length) {
      for (const p of section.paragraphs) {
        const lines = wrap(p, CONTENT_W, 10, false)
        for (const l of lines) {
          ensure(14)
          txt(l, MARGIN, y + 10, 10, false, INK)
          y += 14
        }
        y += 2
      }
    }

    const hasRows = section.table?.rows?.length
    if (!hasRows && section.empty) {
      ensure(22)
      txt(section.empty, MARGIN, y + 11, 10, false, MUTED)
      y += 22
    }
    if (hasRows) {
      drawTable(section.table.columns, section.table.rows)
    }
    y += 16
  }

  const n = pages.length
  const obj = {}
  const contentNum = (i) => 5 + i * 2
  const pageNum = (i) => 6 + i * 2

  obj[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  obj[2] = `<< /Type /Pages /Kids [${pages
    .map((_, i) => `${pageNum(i)} 0 R`)
    .join(' ')}] /Count ${n} >>`
  obj[3] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  obj[4] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'

  const generatedLabel = `Generated ${formatDateTime(generatedAt)}`

  for (let i = 0; i < n; i++) {
    const cn = contentNum(i)
    const pn = pageNum(i)
    const header = [
      `${NAVY} rg 0 ${fmt(PAGE_H - HEADER_H)} ${fmt(PAGE_W)} ${fmt(HEADER_H)} re f`,
      `BT /F2 15 Tf ${WHITE} rg ${fmt(MARGIN)} ${fmt(PAGE_H - 30)} Td (${escape(
        title
      )}) Tj ET`,
      `BT /F1 9 Tf ${MINT} rg ${fmt(MARGIN)} ${fmt(PAGE_H - 48)} Td (${escape(
        subtitle
      )}) Tj ET`,
      `BT /F1 8.5 Tf ${MINT} rg ${fmt(
        PAGE_W - MARGIN - measure(generatedLabel, 8.5)
      )} ${fmt(PAGE_H - 30)} Td (${escape(generatedLabel)}) Tj ET`,
    ]
    const footerOps = [
      `${LINE} RG 0.5 w ${fmt(MARGIN)} ${fmt(42)} m ${fmt(PAGE_W - MARGIN)} ${fmt(
        42
      )} l S`,
      `BT /F1 8.5 Tf ${MUTED} rg ${fmt(MARGIN)} ${fmt(27)} Td (${escape(
        'OJTFlow — Student OJT Tracker'
      )}) Tj ET`,
    ]
    const pageLabel = `Page ${i + 1} of ${n}`
    footerOps.push(
      `BT /F1 8.5 Tf ${MUTED} rg ${fmt(
        PAGE_W - MARGIN - measure(pageLabel, 8.5)
      )} ${fmt(27)} Td (${escape(pageLabel)}) Tj ET`
    )

    const content = [...header, pages[i].join('\n'), ...footerOps, ''].join('\n')
    obj[cn] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
    obj[pn] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(PAGE_W)} ${fmt(PAGE_H)}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cn} 0 R >>`
  }

  const total = 4 + n * 2
  let file = '%PDF-1.4\n'
  const offsets = {}
  for (let num = 1; num <= total; num++) {
    offsets[num] = file.length
    file += `${num} 0 obj\n${obj[num]}\nendobj\n`
  }
  const xrefStart = file.length
  file += `xref\n0 ${total + 1}\n0000000000 65535 f \n`
  for (let num = 1; num <= total; num++) {
    file += `${String(offsets[num]).padStart(10, '0')} 00000 n \n`
  }
  file += `trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`

  const bytes = new Uint8Array(file.length)
  for (let i = 0; i < file.length; i++) bytes[i] = file.charCodeAt(i) & 0xff
  return new Blob([bytes], { type: 'application/pdf' })
}

function formatDateTime(d) {
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function downloadPdf(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
