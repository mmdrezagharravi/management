/* GET /management/sales — the sales desk: KPIs, 13-week renewal calendar, this week's risky renewals
   and the five work lists (renew, upsell, winback, pastdue, champions). */
import { DB } from 'src/mock/engine'
import { ok, C, enrich } from './shared'
import { pastDueRow, churnRow, lostMrr } from './revenue'

const RISK = 60 // renewal is "at risk" below this health score
const sum = (list, f) => list.reduce((t, a) => t + f(a), 0)
const weakest = (a) => C.health.components.reduce((m, c) => (a.components[c.key] < a.components[m.key] ? c : m), C.health.components[0])
/** Account summary + its weakest health component. */
const row = (a) => { const w = weakest(a); return { ...enrich(a), weakest: { key: w.key, label: w.label, value: a.components[w.key] } } }

export function sales() {
  const { accounts } = DB
  const paying = accounts.filter((a) => a.paying)
  const raw = {
    renew: paying.filter((a) => a.renewIn <= 90),
    upsell: accounts.filter((a) => a.segments.includes('upsell')),
    winback: accounts.filter((a) => a.churnedAt !== undefined && a.churnedAt <= 120),
    pastdue: accounts.filter((a) => a.pastDue),
    champions: accounts.filter((a) => a.segments.includes('champions')),
  }
  const r30 = paying.filter((a) => a.renewIn <= 30), r30risk = r30.filter((a) => a.health < RISK)
  const renewRisk = raw.renew.filter((a) => a.health < RISK)

  // renewal calendar (13 weeks) — every due date counts, so monthly plans appear each month
  const W = 13, okW = new Array(W).fill(0), riskW = new Array(W).fill(0), nRisk = new Array(W).fill(0)
  for (const a of paying) {
    const step = C.cycles[a.cycle].days
    for (let d = a.renewIn; d <= W * 7; d += step) {
      const k = Math.floor((d - 1) / 7); if (k < 0 || k >= W) continue
      if (a.health < RISK) { riskW[k] += a.mrr; nRisk[k]++ } else okW[k] += a.mrr
    }
  }
  const week = paying.filter((a) => a.renewIn <= 7 && a.health < RISK).sort((p, q) => q.mrr - p.mrr)

  return ok({
    risk: RISK, yearlyDiscount: C.cycles.yearly.discount,
    kpis: {
      r30: { n: r30.length, mrr: sum(r30, (a) => a.mrr) },
      r30risk: { n: r30risk.length, mrr: sum(r30risk, (a) => a.mrr), share: r30.length ? r30risk.length / r30.length : 0 },
      upsell: { n: raw.upsell.length, value: sum(raw.upsell, DB.upgradeValue) },
      winback: { n: raw.winback.length, lostMrr: sum(raw.winback, lostMrr) },
      pastdue: { n: raw.pastdue.length, mrr: sum(raw.pastdue, (a) => a.mrr) },
    },
    calendar: { weeks: W, ok: okW, risk: riskW, nRisk, riskTotal: riskW.reduce((t, x) => t + x, 0), nRiskTotal: nRisk.reduce((t, x) => t + x, 0) },
    week: { rows: week.map(row), n: week.length, mrr: sum(week, (a) => a.mrr) },
    lists: {
      renew: raw.renew.map(row),
      upsell: raw.upsell.map(row),
      winback: raw.winback.map(churnRow),
      pastdue: raw.pastdue.map(pastDueRow),
      champions: raw.champions.map(row),
    },
    // numbers the tab notes quote
    stats: {
      renew: { n: raw.renew.length, risk: renewRisk.length, riskMrr: sum(renewRisk, (a) => a.mrr) },
      upsell: { n: raw.upsell.length, value: sum(raw.upsell, DB.upgradeValue) },
      winback: { n: raw.winback.length, lostMrr: sum(raw.winback, lostMrr) },
      pastdue: { n: raw.pastdue.length, mrr: sum(raw.pastdue, (a) => a.mrr) },
      champions: { n: raw.champions.length, monthly: raw.champions.filter((a) => a.cycle === 'monthly').length },
    },
  })
}
