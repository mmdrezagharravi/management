/* GET /management/revenue?months=12 + /overview?range + the customer list → the shape mock/revenue.js returns. */
import { get } from './client'
import { customersAll, notesOf, planKey, CYCLE_MAP } from './account'
import { jalali } from 'src/lib/format'
import { PLAN_ORDER } from 'src/lib/refs'

export const CYCLE_DAYS = { monthly: 30, quarterly: 91, yearly: 365 }
const sum = (list, f) => list.reduce((t, a) => t + (f(a) || 0), 0)
const neg = (x) => -Math.abs(x || 0) // lost MRR is drawn below zero whichever sign the server uses

/** Last n Jalali months as { key, y, m, end } (end = daysAgo of the month's last day, 0 = month to date), oldest first. */
export function lastMonths(n) {
  const out = []; let cur = jalali(0), end = 0
  for (let d = 1; out.length < n && d < 40 * n; d++) {
    const j = jalali(d)
    if (j.m !== cur.m) { out.push({ key: cur.y + '-' + String(cur.m).padStart(2, '0'), y: cur.y, m: cur.m, end }); end = d; cur = j }
  }
  return out.reverse()
}

/** Past-due row: no invoice detail on the server (retries / failed invoice), only the latest local follow-up note. */
export const pastDueRow = (a) => { const note = notesOf(a.id)[0]; return { ...a, retries: 0, invT: null, invAmount: null, lastNote: note ? note.text : null } }
/** Churn row: the server keeps no MRR for a lapsed account, so lostMrr is unknown; tenure = first payment → lapse. */
export const churnRow = (a) => ({ ...a, lostMrr: null, lostPlan: a.plan, tenure: a.milestones.paid == null ? null : Math.max(0, a.age - a.milestones.paid - a.churnedAt) })

/** Renewal due dates within `horizon` days, one per cycle step (monthly plans repeat), fed to `add(d, a)`. */
export function eachDue(paying, horizon, add) {
  for (const a of paying) {
    const step = CYCLE_DAYS[a.cycle] || Infinity
    for (let d = a.renewIn; d <= horizon; d += step) add(d, a)
  }
}

export async function revenue({ range: R = 30 } = {}) {
  const [rev, ov, accounts] = await Promise.all([get('/revenue', { months: 12 }), get('/overview', { range: R }), customersAll()])
  const paying = accounts.filter((a) => a.paying)
  const k = ov.kpis || {}
  const mrrNow = rev.mrr || 0, payNow = rev.paying || 0
  const mrrPrev = k.mrrNow ? k.mrrNow.prev : null // backend: /overview kpis.mrrNow { value, prev }
  const payPrev = k.payingNow ? k.payingNow.prev : null // needs backend: /overview kpis.payingNow { value, prev }
  const mv = ov.movements // needs backend: /overview movements for the range
  const byKey = new Map((rev.mrrMonths || []).map((m) => [m.month, m])) // needs backend: /revenue mrrMonths
  const months = lastMonths(12).map((mo) => {
    const m = byKey.get(mo.key) || {}
    return { y: mo.y, m: mo.m, end: mo.end, mrr: m.mrr || 0, paying: m.paying || 0, new: m.new || 0, expansion: m.expansion || 0, contraction: neg(m.contraction), churn: neg(m.churn), churnCount: m.churnCount || 0 }
  })
  const tot12 = months.reduce((t, m) => ({ n: t.n + m.new, e: t.e + m.expansion, c: t.c + m.contraction, ch: t.ch + m.churn }), { n: 0, e: 0, c: 0, ch: 0 })

  const mix = (src, keyOf, keys) => {
    const acc = {}
    for (const [k2, v] of Object.entries(src || {})) { const key = keyOf(k2); if (!key) continue; const r = acc[key] || (acc[key] = { k: key, n: 0, mrr: 0 }); r.n += v.n; r.mrr += v.mrr }
    const rows = (keys || Object.keys(acc).sort((p, q) => PLAN_ORDER.indexOf(p) - PLAN_ORDER.indexOf(q))).map((key) => { const r = acc[key] || { k: key, n: 0, mrr: 0 }; return { ...r, arpa: r.n ? r.mrr / r.n : 0 } })
    return { rows, tm: sum(rows, (r) => r.mrr), tn: sum(rows, (r) => r.n) }
  }
  const planMix = mix(rev.byPlan, (p) => (p === 'unknown' ? null : planKey(p)))
  const cycMix = mix(rev.byCycle, (c) => CYCLE_MAP[c] || null, ['monthly', 'quarterly', 'yearly'])

  const paidByKey = new Map((rev.months || []).map((m) => [m.month, m]))
  const cash = lastMonths(12).map((mo) => { const m = paidByKey.get(mo.key); return { y: mo.y, m: mo.m, end: mo.end, amount: m ? m.total : 0, n: m ? m.count : 0 } })

  const buckets = [{ lo: 1, hi: 30 }, { lo: 31, hi: 60 }, { lo: 61, hi: 90 }].map((b) => Object.assign(b, { ok: 0, risk: 0, nOk: 0, nRisk: 0 }))
  eachDue(paying, 90, (d, a) => {
    const b = buckets.find((x) => d >= x.lo && d <= x.hi); if (!b) return
    if (a.health < 50) { b.risk += a.mrr; b.nRisk++ } else { b.ok += a.mrr; b.nOk++ }
  })

  const churned = accounts.filter((a) => a.churnedAt !== undefined && a.churnedAt < R)
  const reasons = {}; churned.forEach((a) => { reasons[a.churnReason] = (reasons[a.churnReason] || 0) + 1 })
  const topReason = Object.entries(reasons).sort((p, q) => q[1] - p[1])[0] || null

  return {
    range: R,
    kpis: {
      mrr: { now: mrrNow, prev: mrrPrev, spark: months.map((m) => m.mrr) },
      net: { now: mv ? mv.new + mv.expansion + neg(mv.contraction) + neg(mv.churn) : mrrPrev == null ? null : mrrNow - mrrPrev, prev: null },
      nrr: rev.nrr || { now: null, prev: null }, // needs backend: /revenue nrr
      arpa: { now: payNow ? mrrNow / payNow : 0, prev: payPrev ? (mrrPrev || 0) / payPrev : null },
      paying: { now: payNow, prev: payPrev, spark: months.map((m) => m.paying) },
    },
    months, tot12,
    planMix, cycMix,
    basicUp: paying.filter((a) => a.segments.includes('upsell')).length,
    cycleDiscount: null, // no discount table on the server
    cash, buckets, riskDue: sum(buckets, (b) => b.risk),
    pastDue: accounts.filter((a) => a.pastDue).map(pastDueRow),
    churned: churned.map(churnRow),
    topReason: topReason ? { reason: topReason[0], n: topReason[1] } : null,
  }
}
