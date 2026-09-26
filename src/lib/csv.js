import { jalali } from './format'

/** Download rows as UTF-8 CSV (with BOM so Excel reads Persian). */
export function downloadCsv(name, header, rows) {
  const cell = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
  const lines = [header.map(cell).join(',')].concat(rows.map((r) => r.map(cell).join(',')))
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const j = jalali(0)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${name}-${j.y}-${j.m}-${j.d}.csv`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 500)
}
