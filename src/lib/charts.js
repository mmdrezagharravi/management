/* Charts — dependency-free SVG charts for an RTL dashboard.
   Ported from the mockup; each draw function renders into an element and
   wires hover. Vue components in components/charts wrap these. */
import { fa } from './format'

const nf0 = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 })
const defFmt = (v) => nf0.format(v)
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/* ---------------------------------------------------------------- tooltip */
let tipEl = null
function tip() {
  if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'tip'; tipEl.setAttribute('role', 'status'); document.body.appendChild(tipEl) }
  return tipEl
}
export function showTip(x, y, html) {
  const t = tip(); t.innerHTML = html; t.classList.add('on')
  const r = t.getBoundingClientRect()
  let left = x - r.width - 14; if (left < 8) left = x + 14
  let top = y - r.height / 2; top = Math.max(8, Math.min(window.innerHeight - r.height - 8, top))
  t.style.left = left + 'px'; t.style.top = top + 'px'
}
export function hideTip() { if (tipEl) tipEl.classList.remove('on') }
export function tipRow(color, label, value, box) {
  return '<div class="tr"><span>' + (color ? '<i class="key' + (box ? ' box' : '') + '" style="background:' + color + '"></i>' : '') + esc(label) + '</span><b>' + esc(value) + '</b></div>'
}

/* ------------------------------------------------------------------ scale */
function niceStep(range, count) {
  const raw = range / Math.max(1, count)
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)))
  const k = raw / mag
  return (k < 1.5 ? 1 : k < 3 ? 2 : k < 7 ? 5 : 10) * mag
}
export function ticks(min, max, count, intOnly) {
  if (max === min) max = min + (intOnly ? Math.max(1, count || 4) : 1)
  let step = niceStep(max - min, count || 4)
  if (intOnly) step = Math.max(1, Math.round(step))
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step
  const out = []; for (let v = lo; v <= hi + step / 2; v += step) out.push(+v.toFixed(10))
  return { lo, hi, step, ticks: out }
}

/** Draw when the element has a width; redraw on resize. Returns a dispose(). */
function mount(el, draw) {
  el.classList.add('chart')
  let w = 0
  const run = () => { const nw = Math.floor(el.clientWidth); if (nw && nw !== w) { w = nw; draw(w) } }
  run()
  let ro = null
  if ('ResizeObserver' in window) { ro = new ResizeObserver(() => run()); ro.observe(el) } else window.addEventListener('resize', run)
  if (!w) requestAnimationFrame(run)
  return () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', run); hideTip() }
}

function roundedBar(x, y, w, h, r, up) {
  r = Math.min(r, w / 2, Math.abs(h))
  if (h <= 0) return ''
  if (up) return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z'
  return 'M' + x + ',' + y + 'V' + (y + h - r) + 'Q' + x + ',' + (y + h) + ' ' + (x + r) + ',' + (y + h) + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + (y + h) + ' ' + (x + w) + ',' + (y + h - r) + 'V' + y + 'Z'
}

/* ------------------------------------------------------------------- line */
/** o = { labels:[oldest…newest], series:[{name, values, color, dash, muted, wash}], height, yFormat, endFormat, tipFormat,
 *        area, zero (default true), endLabel (default true), tipLabels, xTicks, ticksCount, target:{value,label}, marks:[{i,label}] } */
export function line(el, o) {
  const fmt = o.yFormat || defFmt
  const H = o.height || 220
  return mount(el, (W) => {
    const count = o.labels.length
    const all = []; o.series.forEach((s) => s.values.forEach((v) => { if (v != null) all.push(v) }))
    if (o.target) all.push(o.target.value)
    if (!all.length) { el.innerHTML = ''; return }
    let min = Math.min(...all), max = Math.max(...all)
    if (o.zero !== false) min = Math.min(0, min)
    const tk = ticks(min, max, o.ticksCount || 4, all.every(Number.isInteger))
    const yLabW = Math.max(...tk.ticks.map((t) => String(fmt(t)).length)) * 6.3 + 10
    const padL = yLabW + 4, padR = o.endLabel === false ? 12 : Math.max(44, String((o.endFormat || fmt)(max)).length * 6.6 + 14), padT = 12, padB = 26
    const pw = W - padR - padL, ph = H - padT - padB
    const X = (i) => padL + (count === 1 ? pw / 2 : (i * pw) / (count - 1))
    const Y = (v) => padT + ph - ((v - tk.lo) / (tk.hi - tk.lo)) * ph
    let s = '<svg width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(o.aria || '') + '">'
    tk.ticks.forEach((t) => {
      s += '<line class="' + (t === 0 ? 'base' : 'gl') + '" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/>'
      s += '<text x="' + (padL - 7) + '" y="' + (Y(t) + 3.5) + '" text-anchor="start" class="tnum">' + esc(fmt(t)) + '</text>'
    })
    const xt = o.xTicks || Math.min(count, W < 480 ? 4 : 7)
    const idx = []; for (let k = 0; k < xt; k++) idx.push(Math.round((k * (count - 1)) / Math.max(1, xt - 1)))
    ;[...new Set(idx)].forEach((i) => {
      const anchor = i === 0 && count > 1 ? 'end' : i === count - 1 && count > 1 ? 'start' : 'middle'
      s += '<text x="' + X(i) + '" y="' + (H - 7) + '" text-anchor="' + anchor + '">' + esc(o.labels[i]) + '</text>'
    })
    if (o.target) {
      s += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + Y(o.target.value) + '" y2="' + Y(o.target.value) + '" style="stroke:var(--ink-2);stroke-width:1;opacity:.55"/>'
      s += '<text x="' + (padL + 4) + '" y="' + (Y(o.target.value) - 5) + '" text-anchor="end" class="lab-mid">' + esc(o.target.label) + '</text>'
    }
    ;(o.marks || []).forEach((mk) => {
      s += '<line x1="' + X(mk.i) + '" x2="' + X(mk.i) + '" y1="' + padT + '" y2="' + (padT + ph) + '" style="stroke:var(--axis)"/>'
      s += '<text x="' + (X(mk.i) + 4) + '" y="' + (padT + 9) + '" text-anchor="end" class="lab-mid">' + esc(mk.label) + '</text>'
    })
    const single = o.series.length === 1
    o.series.forEach((se, si) => {
      const color = se.color || (se.muted ? 'var(--deemph)' : 'var(--series-' + (si + 1) + ')')
      const pts = []; se.values.forEach((v, i) => { if (v != null) pts.push([X(i), Y(v)]) })
      if (!pts.length) return
      if (single && o.area !== false) {
        s += '<path d="M' + pts[0][0] + ',' + Y(Math.max(0, tk.lo)) + 'L' + pts.map((p) => p.join(',')).join('L') + 'L' + pts[pts.length - 1][0] + ',' + Y(Math.max(0, tk.lo)) + 'Z" style="fill:' + (se.wash || 'var(--wash)') + '"/>'
      }
      s += '<path d="M' + pts.map((p) => p.join(',')).join('L') + '" fill="none" style="stroke:' + color + ';stroke-width:' + (se.muted ? 1.5 : 2) + '" stroke-linejoin="round" stroke-linecap="round"' + (se.dash ? ' stroke-dasharray="4 4"' : '') + '/>'
      if (!se.muted && o.endLabel !== false) {
        let li = se.values.length - 1; while (li > 0 && se.values[li] == null) li--
        const v = se.values[li]
        s += '<circle cx="' + X(li) + '" cy="' + Y(v) + '" r="4.5" style="fill:' + color + ';stroke:var(--surface);stroke-width:2"/>'
        s += '<text x="' + (X(li) + 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end" class="lab-strong">' + esc((o.endFormat || fmt)(v)) + '</text>'
      }
    })
    s += '<g class="hov"></g><rect class="hit" x="' + padL + '" y="' + padT + '" width="' + pw + '" height="' + ph + '"/></svg>'
    el.innerHTML = s
    const svg = el.firstChild, hov = svg.querySelector('.hov'), hit = svg.querySelector('.hit')
    hit.addEventListener('pointermove', (ev) => {
      const r = svg.getBoundingClientRect()
      const px = ev.clientX - r.left
      let i = Math.round((px - padL) / (count === 1 ? 1 : pw / (count - 1)))
      i = Math.max(0, Math.min(count - 1, i))
      let h = '<line class="xh" x1="' + X(i) + '" x2="' + X(i) + '" y1="' + padT + '" y2="' + (padT + ph) + '"/>'
      let rows = ''
      o.series.forEach((se, si) => {
        const v = se.values[i]; if (v == null) return
        const color = se.color || (se.muted ? 'var(--deemph)' : 'var(--series-' + (si + 1) + ')')
        h += '<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="4.5" style="fill:' + color + ';stroke:var(--surface);stroke-width:2"/>'
        rows += tipRow(color, se.name, (o.tipFormat || fmt)(v))
      })
      hov.innerHTML = h
      showTip(ev.clientX, ev.clientY, '<div class="th">' + esc((o.tipLabels || o.labels)[i]) + '</div>' + rows)
    })
    hit.addEventListener('pointerleave', () => { hov.innerHTML = ''; hideTip() })
  })
}

/* ---------------------------------------------------------------- columns */
/** o = { labels, series:[{name, values, color}], height, yFormat, stacked (default true), tipLabels, xEvery,
 *        total (label for the total row in the tip), valueLabels:'last'|'all'|false, labelFormat, highlight:[i], hideZero } */
export function columns(el, o) {
  const fmt = o.yFormat || defFmt
  const H = o.height || 220
  return mount(el, (W) => {
    const count = o.labels.length
    let max = 0, min = 0
    for (let i = 0; i < count; i++) {
      let p = 0, q = 0
      o.series.forEach((se) => { const v = se.values[i] || 0; if (o.stacked === false) { max = Math.max(max, v); min = Math.min(min, v) } else if (v >= 0) p += v; else q += v })
      max = Math.max(max, p); min = Math.min(min, q)
    }
    const tk = ticks(min, max, o.ticksCount || 4, o.series.every((se) => se.values.every((v) => v == null || Number.isInteger(v))))
    const yLabW = Math.max(...tk.ticks.map((t) => String(fmt(t)).length)) * 6.3 + 10
    const padL = yLabW + 4, padR = 8, padT = o.valueLabels ? 18 : 10, padB = 26
    const pw = W - padR - padL, ph = H - padT - padB
    const band = pw / Math.max(1, count)
    const groups = o.stacked === false ? o.series.length : 1
    const bw = Math.max(3, Math.min(24, (band * (groups > 1 ? 0.8 : 0.62)) / groups))
    const Y = (v) => padT + ph - ((v - tk.lo) / (tk.hi - tk.lo)) * ph
    const cx = (i) => padL + band * (i + 0.5)
    let s = '<svg width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(o.aria || '') + '">'
    tk.ticks.forEach((t) => {
      s += '<line class="' + (t === 0 ? 'base' : 'gl') + '" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/>'
      s += '<text x="' + (padL - 7) + '" y="' + (Y(t) + 3.5) + '" text-anchor="start">' + esc(fmt(t)) + '</text>'
    })
    const every = o.xEvery || Math.max(1, Math.ceil(count / (W < 480 ? 5 : 12)))
    for (let i = 0; i < count; i++) {
      if ((count - 1 - i) % every === 0) s += '<text x="' + cx(i) + '" y="' + (H - 7) + '" text-anchor="middle">' + esc(o.labels[i]) + '</text>'
      let up = 0, dn = 0
      const segs = []
      o.series.forEach((se, si) => {
        const v = se.values[i] || 0; if (!v) return
        const color = o.highlight && !o.highlight.includes(i) ? 'var(--deemph)' : se.color || 'var(--series-' + (si + 1) + ')'
        if (o.stacked === false) {
          const x = cx(i) - (bw * groups) / 2 + si * bw
          segs.push('<path class="mk" d="' + roundedBar(x + 1, v >= 0 ? Y(v) : Y(0), bw - 2, Math.abs(Y(v) - Y(0)), 4, v >= 0) + '" style="fill:' + color + '"/>')
          return
        }
        const x = cx(i) - bw / 2
        if (v >= 0) { const y0 = Y(up), y1 = Y(up + v); up += v; segs.push({ d: [x, y1, bw, y0 - y1], up: true, color }) }
        else { const y0 = Y(dn), y1 = Y(dn + v); dn += v; segs.push({ d: [x, y0, bw, y1 - y0], up: false, color }) }
      })
      if (o.stacked === false) { s += segs.join('') }
      else {
        const ups = segs.filter((g) => g.up), dns = segs.filter((g) => !g.up)
        ;[ups, dns].forEach((list) => list.forEach((g, k) => {
          const last = k === list.length - 1
          let [x, y, w, h] = g.d
          if (k > 0) { if (g.up) h -= 2; else { y += 2; h -= 2 } }
          if (h <= 0.5) return
          s += last ? '<path class="mk" d="' + roundedBar(x, y, w, h, 4, g.up) + '" style="fill:' + g.color + '"/>'
            : '<rect class="mk" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" style="fill:' + g.color + '"/>'
        }))
      }
      if (o.valueLabels === 'all' || (o.valueLabels === 'last' && i === count - 1)) {
        const tot = o.series.reduce((t, se) => t + Math.max(0, se.values[i] || 0), 0)
        s += '<text x="' + cx(i) + '" y="' + (Y(tot) - 5) + '" text-anchor="middle" class="lab-strong">' + esc((o.labelFormat || fmt)(tot)) + '</text>'
      }
    }
    s += '<g class="hov"></g>'
    for (let i = 0; i < count; i++) s += '<rect class="hit" data-i="' + i + '" x="' + (cx(i) - band / 2) + '" y="' + padT + '" width="' + band + '" height="' + ph + '"/>'
    s += '</svg>'
    el.innerHTML = s
    const svg = el.firstChild, hov = svg.querySelector('.hov')
    svg.querySelectorAll('.hit').forEach((r) => {
      r.addEventListener('pointermove', (ev) => {
        const i = +r.dataset.i
        hov.innerHTML = '<rect x="' + (cx(i) - band / 2) + '" y="' + padT + '" width="' + band + '" height="' + ph + '" style="fill:var(--ink);opacity:.045"/>'
        let rows = ''
        o.series.forEach((se, si) => { const v = se.values[i]; if (v == null || (!v && o.hideZero)) return; rows += tipRow(se.color || 'var(--series-' + (si + 1) + ')', se.name, (o.tipFormat || fmt)(v), true) })
        if (o.total) { const t = o.series.reduce((a, se) => a + (se.values[i] || 0), 0); rows += '<div class="tr" style="border-top:1px solid var(--grid);margin-top:3px;padding-top:3px"><span>' + esc(o.total) + '</span><b>' + esc((o.tipFormat || fmt)(t)) + '</b></div>' }
        showTip(ev.clientX, ev.clientY, '<div class="th">' + esc((o.tipLabels || o.labels)[i]) + '</div>' + rows)
      })
      r.addEventListener('pointerleave', () => { hov.innerHTML = ''; hideTip() })
    })
  })
}

/* -------------------------------------------------------------- sparkline */
/** Returns an SVG string. o = { w, h, bars, area, color, min0 } */
export function spark(values, o = {}) {
  const w = o.w || 84, h = o.h || 24, count = values.length
  if (!count) return ''
  const zero = o.min0 === true || o.bars
  const max = Math.max(...values, zero ? 0.0001 : -Infinity), min = zero ? 0 : Math.min(...values)
  const X = (i) => 3 + (count === 1 ? 0 : (i * (w - 6)) / (count - 1))
  const Y = (v) => h - 3 - (max === min ? 0 : ((v - min) / (max - min)) * (h - 6))
  const color = o.color || 'var(--series-1)'
  if (o.bars) {
    const bw = Math.max(1, (w - 2) / count - 1)
    let s = '<svg class="spark" width="' + w + '" height="' + h + '" aria-hidden="true">'
    values.forEach((v, i) => { const x = 1 + (i * (w - 2)) / count; const bh = v ? Math.max(1.5, (v / max) * (h - 2)) : 1; s += '<rect x="' + x.toFixed(1) + '" y="' + (h - bh).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1" style="fill:' + (v ? color : 'var(--grid)') + '"/>' })
    return s + '</svg>'
  }
  const d = values.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join('')
  return '<svg class="spark" width="' + w + '" height="' + h + '" aria-hidden="true">' +
    (o.area ? '<path d="' + d + 'L' + X(count - 1).toFixed(1) + ',' + (h - 3) + 'L' + X(0).toFixed(1) + ',' + (h - 3) + 'Z" style="fill:var(--wash)"/>' : '') +
    '<path d="' + d + '" fill="none" style="stroke:' + color + ';stroke-width:1.6" stroke-linejoin="round" stroke-linecap="round"/>' +
    '<circle cx="' + X(count - 1).toFixed(1) + '" cy="' + Y(values[count - 1]).toFixed(1) + '" r="2.6" style="fill:' + color + '"/></svg>'
}

/* ---------------------------------------------------------------- heatmap */
const RAMP = ['--seq-100', '--seq-150', '--seq-200', '--seq-250', '--seq-300', '--seq-400', '--seq-450', '--seq-500', '--seq-600', '--seq-700']
export function rampColor(t) {
  const i = Math.max(0, Math.min(RAMP.length - 1, Math.round(t * (RAMP.length - 1))))
  return { bg: 'var(' + RAMP[i] + ')', fg: i >= 5 ? '#fff' : '#0b0b0b' }
}
/** o = { cols:[labels], rows:[{label, sub, cells:[v|null], tips:[..]}], format, domain:[min,max], rowHead, tipLabel, naText } */
export function heat(el, o) {
  const fmt = o.format || ((v) => fa(Math.round(v * 100)) + '٪')
  const [lo, hi] = o.domain || [0, 1]
  let s = '<table class="heat"><thead><tr><th class="rh">' + esc(o.rowHead || '') + '</th>' + o.cols.map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>'
  o.rows.forEach((r, ri) => {
    s += '<tr><td class="rl">' + esc(r.label) + (r.sub ? '<span class="s">' + esc(r.sub) + '</span>' : '') + '</td>'
    o.cols.forEach((c, j) => {
      const v = r.cells[j]
      if (v == null) { s += '<td class="na">' + (o.naText || '') + '</td>'; return }
      const t = hi === lo ? 0 : (v - lo) / (hi - lo)
      const col = rampColor(Math.max(0, Math.min(1, t)))
      s += '<td tabindex="0" data-r="' + ri + '" data-c="' + j + '" style="background:' + col.bg + ';color:' + col.fg + '">' + esc(fmt(v)) + '</td>'
    })
    s += '</tr>'
  })
  s += '</tbody></table>'
  el.innerHTML = s
  el.querySelectorAll('td[data-r]').forEach((td) => {
    const f = (ev) => {
      const r = o.rows[+td.dataset.r], j = +td.dataset.c
      const rect = td.getBoundingClientRect()
      showTip(ev.clientX || rect.left, ev.clientY || rect.top, '<div class="th">' + esc(r.label + ' · ' + o.cols[j]) + '</div>' + tipRow(null, o.tipLabel || 'مقدار', fmt(r.cells[j])) + (r.tips && r.tips[j] ? '<div class="th" style="margin-top:3px">' + esc(r.tips[j]) + '</div>' : ''))
    }
    td.addEventListener('pointermove', f); td.addEventListener('focus', f)
    td.addEventListener('pointerleave', hideTip); td.addEventListener('blur', hideTip)
  })
  return hideTip
}

/* ---------------------------------------------------- 100% stacked bar (html) */
/** o = { parts:[{label, value, color}], format, height } */
export function stack100(el, o) {
  const fmt = o.format || defFmt
  const tot = o.parts.reduce((t, p) => t + p.value, 0) || 1
  let bar = '<div style="display:flex;gap:2px;height:' + (o.height || 14) + 'px;border-radius:4px;overflow:hidden">'
  o.parts.forEach((p) => { if (p.value > 0) bar += '<i tabindex="0" data-l="' + esc(p.label) + '" data-v="' + esc(fmt(p.value)) + '" data-p="' + fa(Math.round((p.value / tot) * 100)) + '٪" style="flex:' + p.value + ' 1 0;background:' + p.color + ';min-width:2px"></i>' })
  bar += '</div><div class="legend" style="margin-top:9px">' + o.parts.map((p) => '<span class="k"><i class="sw" style="background:' + p.color + '"></i>' + esc(p.label) + ' <b style="color:var(--ink)">' + esc(fmt(p.value)) + '</b> <span class="muted">' + fa(Math.round((p.value / tot) * 100)) + '٪</span></span>').join('') + '</div>'
  el.innerHTML = bar
  el.querySelectorAll('i[data-l]').forEach((i) => {
    i.addEventListener('pointermove', (ev) => showTip(ev.clientX, ev.clientY, '<div class="th">' + esc(i.dataset.l) + '</div>' + tipRow(null, 'مقدار', i.dataset.v) + tipRow(null, 'سهم', i.dataset.p)))
    i.addEventListener('pointerleave', hideTip)
  })
  return hideTip
}
