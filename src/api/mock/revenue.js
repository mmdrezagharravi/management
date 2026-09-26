/* GET /management/revenue?range=30 */
import { DB } from 'src/mock/engine'
import { C, enrich, notesOf } from './shared'

const mrrOn = (a, t) => { let v = 0; for (const pe of a.planEvents) { if (pe.t >= t) v = pe.mrr; else break } return v }
// NRR over 90 days ending `end` days ago: accounts paying at the start, their MRR at the end ÷ at the start
function nrr(end) {
  let then = 0, now = 0
  for (const a of DB.accounts) { const v = mrrOn(a, end + 90); if (v > 0) { then += v; now += mrrOn(a, end) } }
  return then ? now / then : null
}
const netOf = (mv) => mv.new + mv.expansion + mv.contraction + mv.churn
export const lostMrr = (a) => { for (let i = a.planEvents.length - 1; i >= 0; i--) if (a.planEvents[i].mrr > 0) return a.planEvents[i].mrr; return 0 }
export const lostPlan = (a) => { for (let i = a.planEvents.length - 1; i >= 0; i--) if (a.planEvents[i].mrr > 0) return a.planEvents[i].plan; return 'basic' }
const lastInv = (a) => a.invoices[a.invoices.length - 1]
/** Past-due row: account summary + the failed invoice and the latest follow-up note. */
export const pastDueRow = (a) => { const inv = lastInv(a), note = notesOf(a.id)[0]; return { ...enrich(a), retries: inv.retries || 0, invT: inv.t, invAmount: inv.amount, lastNote: note ? note.text : null } }
export const churnRow = (a) => ({ ...enrich(a), lostMrr: lostMrr(a), lostPlan: lostPlan(a), tenure: a.planEvents[0].t - a.churnedAt })

export async function revenue({ range: R = 30 } = {}) {
  const { agg, accounts } = DB
  const paying = accounts.filter((a) => a.paying)
  const months = agg.mrrMonths(12)

  const mrrNow = agg.mrrAt(0), mrrPrev = agg.mrrAt(R)
  const payNow = agg.payingAt(0), payPrev = agg.payingAt(R)
  const net = netOf(agg.movements(R, 0)), netPrev = netOf(agg.movements(2 * R, R))
  const arpa = payNow ? mrrNow / payNow : 0, arpaPrev = payPrev ? mrrPrev / payPrev : 0

  const tot12 = months.reduce((t, m) => ({ n: t.n + m.new, e: t.e + m.expansion, c: t.c + m.contraction, ch: t.ch + m.churn }), { n: 0, e: 0, c: 0, ch: 0 })

  const mix = (keys, keyOf) => {
    const rows = keys.map((k) => { const l = paying.filter((a) => keyOf(a) === k); const m = l.reduce((t, a) => t + a.mrr, 0); return { k, n: l.length, mrr: m, arpa: l.length ? m / l.length : 0 } })
    return { rows, tm: rows.reduce((t, r) => t + r.mrr, 0), tn: rows.reduce((t, r) => t + r.n, 0) }
  }
  const planMix = mix(['basic', 'pro', 'ent'], (a) => a.plan)
  const cycMix = mix(['monthly', 'quarterly', 'yearly'], (a) => a.cycle)
  const basicUp = paying.filter((a) => a.plan === 'basic' && a.segments.includes('upsell')).length

  const jm = DB.jalaliMonths(12)
  const cash = jm.map((m) => ({ y: m.y, m: m.m, end: m.end, amount: 0, n: 0 }))
  for (const a of accounts) for (const inv of a.invoices) {
    if (inv.status !== 'paid') continue
    const i = jm.findIndex((m) => inv.t <= m.start && inv.t >= m.end)
    if (i >= 0) { cash[i].amount += inv.amount; cash[i].n++ }
  }
  const buckets = [{ lo: 1, hi: 30 }, { lo: 31, hi: 60 }, { lo: 61, hi: 90 }].map((b) => Object.assign(b, { ok: 0, risk: 0, nOk: 0, nRisk: 0 }))
  for (const a of paying) {
    const step = C.cycles[a.cycle].days
    for (let d = a.renewIn; d <= 90; d += step) {
      const b = buckets.find((x) => d >= x.lo && d <= x.hi); if (!b) continue
      if (a.health < 50) { b.risk += a.mrr; b.nRisk++ } else { b.ok += a.mrr; b.nOk++ }
    }
  }

  const pd = accounts.filter((a) => a.pastDue)
  const churned = accounts.filter((a) => a.churnedAt !== undefined && a.churnedAt < R)
  const reasons = {}; churned.forEach((a) => { reasons[a.churnReason] = (reasons[a.churnReason] || 0) + 1 })
  const topReason = Object.entries(reasons).sort((p, q) => q[1] - p[1])[0] || null

  return {
    range: R,
    kpis: {
      mrr: { now: mrrNow, prev: mrrPrev, spark: months.map((m) => m.mrr) },
      net: { now: net, prev: netPrev },
      nrr: { now: nrr(0), prev: nrr(R) },
      arpa: { now: arpa, prev: arpaPrev },
      paying: { now: payNow, prev: payPrev, spark: months.map((m) => m.paying) },
    },
    months: months.map((m) => ({ y: m.y, m: m.m, end: m.end, mrr: m.mrr, new: m.new, expansion: m.expansion, contraction: m.contraction, churn: m.churn, churnCount: m.churnCount })),
    tot12,
    planMix, cycMix, basicUp,
    cycleDiscount: { quarterly: C.cycles.quarterly.discount, yearly: C.cycles.yearly.discount },
    cash, buckets, riskDue: buckets.reduce((t, b) => t + b.risk, 0),
    pastDue: pd.map(pastDueRow),
    churned: churned.map(churnRow),
    topReason: topReason ? { reason: topReason[0], n: topReason[1] } : null,
  }
}
