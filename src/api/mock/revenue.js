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
export const lostMrr = (a) => { for (let i = a.planEvents.length - 1; i >= 0; i--) if (a.planEvents[i].mrr > 0) return a.planEvents[i].mrr; return 0 }
export const lostPlan = (a) => { for (let i = a.planEvents.length - 1; i >= 0; i--) if (a.planEvents[i].mrr > 0) return a.planEvents[i].plan; return 'team' }
/** Past-due row: account summary + the latest follow-up note. */
export const pastDueRow = (a) => { const note = notesOf(a.id)[0]; return { ...enrich(a), lastNote: note ? note.text : null } }
export const churnRow = (a) => ({ ...enrich(a), lostMrr: lostMrr(a), lostPlan: lostPlan(a), tenure: a.planEvents[0].t - a.churnedAt })

export async function revenue({ range: R = 30 } = {}) {
  const { agg, accounts } = DB
  const paying = accounts.filter((a) => a.paying)
  const months = agg.mrrMonths(12)

  const mrrNow = agg.mrrAt(0), mrrPrev = agg.mrrAt(R)
  const payNow = agg.payingAt(0), payPrev = agg.payingAt(R)
  const arpa = payNow ? mrrNow / payNow : 0, arpaPrev = payPrev ? mrrPrev / payPrev : 0

  const tot12 = months.reduce((t, m) => ({ n: t.n + m.new, e: t.e + m.expansion, c: t.c + m.contraction, ch: t.ch + m.churn }), { n: 0, e: 0, c: 0, ch: 0 })

  const mix = (keys, keyOf) => {
    const rows = keys.map((k) => { const l = paying.filter((a) => keyOf(a) === k); const m = l.reduce((t, a) => t + a.mrr, 0); return { k, n: l.length, mrr: m, arpa: l.length ? m / l.length : 0 } })
    return { rows, tm: rows.reduce((t, r) => t + r.mrr, 0), tn: rows.reduce((t, r) => t + r.n, 0) }
  }
  const planMix = mix(['team', 'business', 'enterprise'], (a) => a.plan)
  const cycMix = mix(['monthly', 'quarterly', 'yearly'], (a) => a.cycle)
  const basicUp = paying.filter((a) => a.plan === 'team' && a.segments.includes('upsell')).length

  const jm = DB.jalaliMonths(12)
  const cash = jm.map((m) => ({ y: m.y, m: m.m, end: m.end, amount: 0, n: 0 }))
  for (const a of accounts) for (const inv of a.invoices) {
    if (inv.status !== 'paid') continue
    const i = jm.findIndex((m) => inv.t <= m.start && inv.t >= m.end)
    if (i >= 0) { cash[i].amount += inv.amount; cash[i].n++ }
  }
  const RISK = 60, W = 13, okW = new Array(W).fill(0), riskW = new Array(W).fill(0), nRisk = new Array(W).fill(0)
  for (const a of paying) {
    const step = C.cycles[a.cycle].days
    for (let d = a.renewIn; d <= W * 7; d += step) {
      const w = Math.floor((d - 1) / 7); if (w < 0 || w >= W) continue
      if (a.health < RISK) { riskW[w] += a.mrr; nRisk[w]++ } else okW[w] += a.mrr
    }
  }
  const total = (list) => list.reduce((t, x) => t + x, 0)

  return {
    range: R, risk: RISK,
    kpis: {
      mrr: { now: mrrNow, prev: mrrPrev, spark: months.map((m) => m.mrr) },
      nrr: { now: nrr(0), prev: nrr(R) },
      arpa: { now: arpa, prev: arpaPrev },
      paying: { now: payNow, prev: payPrev, spark: months.map((m) => m.paying) },
    },
    months: months.map((m) => ({ y: m.y, m: m.m, end: m.end, mrr: m.mrr, new: m.new, expansion: m.expansion, contraction: m.contraction, churn: m.churn, churnCount: m.churnCount })),
    tot12,
    planMix, cycMix, basicUp,
    cycleDiscount: { quarterly: C.cycles.quarterly.discount, yearly: C.cycles.yearly.discount },
    cash,
    calendar: { weeks: W, ok: okW, risk: riskW, nRisk, riskTotal: total(riskW), nRiskTotal: total(nRisk) },
  }
}
