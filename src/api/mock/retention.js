/* GET /management/retention?cohort=all|paid|<source> — do customers stay? monthly cohorts, weekly curve, revenue retention, churn. */
import { DB } from 'src/mock/engine'
import { C, ok, enrich } from './shared'

// MRR of one account at the end of day t (days ago) — same rule as agg.mrrAt
const mrrAt = (a, t) => { let v = 0; for (const pe of a.planEvents) { if (pe.t >= t) v = pe.mrr; else break } return v }
// revenue retention of the accounts paying at `from`, measured at `to`
function revRet(from, to) {
  let S = 0, E = 0, G = 0, exp = 0, lost = 0, n = 0
  for (const a of DB.accounts) {
    const s = mrrAt(a, from); if (!s) continue
    const e = mrrAt(a, to)
    n++; S += s; E += e; G += Math.min(s, e)
    if (e > s) exp += e - s; else lost += s - e
  }
  return { n, S, E, exp, lost, nrr: S ? E / S : null, grr: S ? G / S : null }
}
// paying at t0+30 that churned inside [t0, t0+30)
function logoChurn(t0) {
  const base = DB.accounts.filter((a) => mrrAt(a, t0 + 30) > 0)
  const lost = base.filter((a) => a.planEvents.some((pe) => pe.kind === 'churn' && pe.t < t0 + 30 && pe.t >= t0))
  return { n: lost.length, base: base.length, r: base.length ? lost.length / base.length : 0 }
}
const lastMrr = (a) => { for (let i = a.planEvents.length - 1; i >= 0; i--) if (a.planEvents[i].mrr > 0) return a.planEvents[i].mrr; return 0 }
const tenure = (a) => (a.planEvents.length ? a.planEvents[0].t - a.churnedAt : 0)
const curve = (c) => ({ values: Array.from(c), n: c.n })

export function retention({ cohort } = {}) {
  const { agg, accounts } = DB
  const all = agg.cohorts(12)

  // KPIs: month-k retention averaged over the last 3 complete cohorts vs the 3 before
  const monthK = (k) => {
    const c = all.filter((r) => !r.partial && r.cells[k] != null)
    const avg = (rows) => (rows.length ? rows.reduce((t, r) => t + r.cells[k], 0) / rows.length : null)
    const cur = c.slice(-3), prev = c.slice(-6, -3)
    return { v: avg(cur), p: prev.length === 3 ? avg(prev) : null, months: cur.map((r) => ({ y: r.y, m: r.m })) }
  }
  const lc = logoChurn(0), lcp = logoChurn(30)
  const r90 = revRet(90, 0), r90p = revRet(180, 90)

  // heatmap with its own filter (kept in the URL): all | paid | <source key>
  let mode = cohort || 'all'
  if (mode !== 'all' && mode !== 'paid' && !DB.source(mode)) mode = 'all'
  const filter = mode === 'paid' ? (a) => a.everPaid : DB.source(mode) ? (a) => a.source === mode : null
  const rows = agg.cohorts(12, filter)
  const later = []; rows.forEach((r) => r.cells.forEach((v, k) => { if (k && v != null) later.push(v) }))
  const cohorts = rows.map((r) => {
    const cells = []; for (let k = 0; k < 12; k++) cells.push(r.cells[k] != null && !r.partial ? r.cells[k] : null)
    return { y: r.y, m: r.m, end: r.end, size: r.size, partial: r.partial, cells }
  })

  // curves + revenue
  const cA = agg.retentionCurve((a) => !!a.feat.automation, 12)
  const cN = agg.retentionCurve((a) => !a.feat.automation, 12)
  const cT = agg.retentionCurve((a) => a.milestones.team !== undefined, 12)
  const active30 = accounts.filter((a) => a.lastSeenDays < 30)
  const payNoAuto = accounts.filter((a) => a.paying && !a.feat.automation).length
  const revMonths = DB.jalaliMonths(6).map((mo) => { const r = revRet(mo.start + 1, mo.end); return { y: mo.y, m: mo.m, end: mo.end, S: r.S, exp: r.exp, lost: r.lost, nrr: r.nrr, grr: r.grr } })

  // churn (180 days)
  const churned = accounts.filter((a) => a.churnedAt !== undefined && a.churnedAt <= 180)
  const reasons = C.churnReasons.map((r) => { const l = churned.filter((a) => a.churnReason === r); return { reason: r, n: l.length, mrr: l.reduce((t, a) => t + lastMrr(a), 0) } }).sort((p, q) => q.n - p.n)
  const early = churned.filter((a) => tenure(a) < 92).length
  const medTen = (() => { const v = churned.map(tenure).sort((p, q) => p - q); return v.length ? v[v.length >> 1] : 0 })()

  return ok({
    kpis: { m1: monthK(1), m3: monthK(3), logo: lc, logoPrev: lcp, rev90: r90, rev90Prev: r90p },
    cohortMode: mode, cohorts, domain: later.length ? [Math.min(...later), Math.max(...later)] : [0, 1],
    curves: { automation: curve(cA), noAutomation: curve(cN), team: curve(cT), liftWeek: 12, small: false, lift: cN[12] ? cA[12] / cN[12] : null, autoShare: active30.length ? active30.filter((a) => a.feat.automation).length / active30.length : 0, payNoAuto },
    revMonths,
    churn: { total: churned.length, lostMrr: churned.reduce((t, a) => t + lastMrr(a), 0), early, medianTenure: medTen, reasons, reasonList: C.churnReasons, rows: churned.map((a) => ({ ...enrich(a), lastMrr: lastMrr(a), tenure: tenure(a) })) },
  })
}
