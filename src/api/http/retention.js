/* GET /management/retention?months=12 (+ /renewals, /revenue) — same shape as mock/retention.js.
   Server cohorts are Jalali signup months with 12 WEEKLY cells; the page labels columns as weeks.
   Gaps: no cohort filter (cohortFilters: false), no churn reasons, no per-customer MRR after churn. */
import { get } from './client'
import { customersAll, toAccount } from './account'
import { churnRow } from './revenue'

const WEEKS = 12
const CHURN_DAYS = 180
const rates = (cells) => (cells || []).map((c) => (c.eligible ? c.rate : null))
const curve = (c) => ({ values: rates(c), n: c && c.length ? c[0].eligible : 0 })
const last = (v) => { for (let i = v.length - 1; i >= 0; i--) if (v[i] != null) return v[i]; return null }
const median = (v) => { const s = v.slice().sort((p, q) => p - q); return s.length ? s[s.length >> 1] : 0 }
const monthOf = (key) => ({ y: +key.slice(0, 4), m: +key.slice(5, 7) })
const jalaliNow = () => {
  const p = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
  const g = (t) => p.find((x) => x.type === t).value
  return g('year') + '-' + g('month')
}

export async function retention() {
  const [r, ren, rev, accounts] = await Promise.all([
    get('/retention', { months: 12 }),
    get('/renewals', { days: 1, lapsedDays: CHURN_DAYS }),
    get('/revenue', { months: 6 }).catch(() => ({})),
    customersAll(),
  ])
  const now = jalaliNow()
  const cohorts = (r.cohorts || []).map((c) => {
    const partial = c.month >= now
    return { ...monthOf(c.month), end: partial ? 0 : null, size: c.size, partial, cells: rates(c.cells) }
  })
  const later = []; cohorts.forEach((c) => c.cells.forEach((v, k) => { if (k && v != null) later.push(v) }))

  // KPIs: week-k retention averaged over the last 3 complete cohorts vs the 3 before (m1 = week 4, m3 = week 12)
  const weekK = (k) => {
    const c = cohorts.filter((x) => !x.partial && x.cells[k] != null)
    const avg = (rows) => (rows.length ? rows.reduce((t, x) => t + x.cells[k], 0) / rows.length : null)
    const cur = c.slice(-3), prev = c.slice(-6, -3)
    return { v: avg(cur), p: prev.length === 3 ? avg(prev) : null, months: cur.map((x) => ({ y: x.y, m: x.m })) }
  }

  // logo churn: lapsed inside 30 days ÷ (paying for more than 30 days + those lapsed)
  // ponytail: approximates "paying 30 days ago"; exact once the server exposes MRR snapshots
  const lapsed = (ren.lapsed || []).map((s) => toAccount(s))
  const lapsed30 = lapsed.filter((a) => a.churnedAt <= 30)
  const paying = accounts.filter((a) => a.paying)
  const base = paying.filter((a) => a.tenureDays > 30).length + lapsed30.length
  const logo = { n: lapsed30.length, base, r: base ? lapsed30.length / base : 0 }

  // revenue retention — needs backend: /revenue nrr {now, prev} and mrrMonths
  const nrr = rev.nrr || {}
  const revMonths = (rev.mrrMonths || []).map((m) => {
    // the server sends contraction and churn as negative MRR; lost is their magnitude
    const exp = m.expansion || 0, lost = Math.abs(m.contraction || 0) + Math.abs(m.churn || 0)
    const S = m.mrr - (m.new || 0) - exp + lost
    return { y: m.y, m: m.m, end: m.end, S, exp, lost, nrr: S ? (S + exp - lost) / S : null, grr: S ? (S - lost) / S : null }
  })
  const rev90 = (v) => ({ n: null, S: null, E: null, exp: null, lost: null, nrr: v ?? null, grr: null })

  const cv = r.curves || {}
  const cA = curve(cv.withAutomation), cN = curve(cv.withoutAutomation), cT = curve(cv.team)
  const active30 = accounts.filter((a) => a.lastSeenDays < 30)
  const lA = last(cA.values), lN = last(cN.values)

  const rows = lapsed.map((a) => ({ ...churnRow(a), lastMrr: null }))
  const tenures = rows.map((a) => a.tenure).filter((t) => t != null)
  return {
    kpis: { m1: weekK(3), m3: weekK(WEEKS - 1), logo, logoPrev: { n: null, base: null, r: null }, rev90: rev90(nrr.now), rev90Prev: rev90(nrr.prev) },
    cohortMode: 'all', cohortFilters: false, weeks: r.weeks || WEEKS, dataSince: r.dataSince || null,
    cohorts, domain: later.length ? [Math.min(...later), Math.max(...later)] : [0, 1],
    curves: {
      automation: cA, noAutomation: cN, team: cT, all: curve(cv.all),
      lift: lN ? lA / lN : null,
      autoShare: active30.length ? active30.filter((a) => a.automations > 0).length / active30.length : 0,
      payNoAuto: paying.filter((a) => a.automations === 0).length,
    },
    revMonths,
    churn: { total: rows.length, lostMrr: null, early: tenures.filter((t) => t < 92).length, medianTenure: median(tenures), reasons: [], reasonList: [], rows },
  }
}
