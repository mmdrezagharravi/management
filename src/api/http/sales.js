/* GET /management/renewals?days=90&lapsedDays=120 + the customer list → the shape mock/sales.js returns. */
import { get } from './client'
import { customersAll, toAccount } from './account'
import { HEALTH_COMPONENTS } from 'src/lib/refs'
import { pastDueRow, churnRow, eachDue } from './revenue'

const RISK = 60 // renewal is "at risk" below this health score
const sum = (list, f) => list.reduce((t, a) => t + (f(a) || 0), 0)
const weakest = (a) => HEALTH_COMPONENTS.reduce((m, c) => (a.components[c.key] < a.components[m.key] ? c : m), HEALTH_COMPONENTS[0])
/** Account summary + its weakest health component. */
const row = (a) => { const w = weakest(a); return { ...a, weakest: { key: w.key, label: w.label, value: a.components[w.key] } } }

export async function sales() {
  const [rn, accounts] = await Promise.all([get('/renewals', { days: 90, lapsedDays: 120 }), customersAll()])
  const paying = accounts.filter((a) => a.paying)
  const raw = {
    renew: (rn.upcoming || []).map(toAccount),
    upsell: accounts.filter((a) => a.segments.includes('upsell')),
    winback: (rn.lapsed || []).map(toAccount).filter((a) => a.churnedAt !== undefined),
    pastdue: accounts.filter((a) => a.pastDue),
    champions: accounts.filter((a) => a.segments.includes('champions')),
  }
  const r30 = paying.filter((a) => a.renewIn <= 30), r30risk = r30.filter((a) => a.health < RISK)
  const renewRisk = raw.renew.filter((a) => a.health < RISK)
  // the server has no pricing table, so an upsell's value and a lapsed account's lost MRR are unknown
  const upsell = { n: raw.upsell.length, value: null }
  const winback = { n: raw.winback.length, lostMrr: null }

  // renewal calendar (13 weeks) — every due date counts, so monthly plans appear each month
  const W = 13, okW = new Array(W).fill(0), riskW = new Array(W).fill(0), nRisk = new Array(W).fill(0)
  eachDue(paying, W * 7, (d, a) => {
    const k = Math.floor((d - 1) / 7); if (k < 0 || k >= W) return
    if (a.health < RISK) { riskW[k] += a.mrr; nRisk[k]++ } else okW[k] += a.mrr
  })
  const week = paying.filter((a) => a.renewIn <= 7 && a.health < RISK).sort((p, q) => q.mrr - p.mrr)

  return {
    risk: RISK, yearlyDiscount: 0,
    kpis: {
      r30: { n: r30.length, mrr: sum(r30, (a) => a.mrr) },
      r30risk: { n: r30risk.length, mrr: sum(r30risk, (a) => a.mrr), share: r30.length ? r30risk.length / r30.length : 0 },
      upsell, winback,
      pastdue: { n: raw.pastdue.length, mrr: sum(raw.pastdue, (a) => a.mrr) },
    },
    calendar: { weeks: W, ok: okW, risk: riskW, nRisk, riskTotal: sum(riskW, (x) => x), nRiskTotal: sum(nRisk, (x) => x) },
    week: { rows: week.map(row), n: week.length, mrr: sum(week, (a) => a.mrr) },
    lists: {
      renew: raw.renew.map(row),
      upsell: raw.upsell.map(row),
      winback: raw.winback.map(churnRow),
      pastdue: raw.pastdue.map(pastDueRow),
      champions: raw.champions.map(row),
    },
    stats: {
      renew: { n: raw.renew.length, risk: renewRisk.length, riskMrr: sum(renewRisk, (a) => a.mrr) },
      upsell, winback,
      pastdue: { n: raw.pastdue.length, mrr: sum(raw.pastdue, (a) => a.mrr) },
      champions: { n: raw.champions.length, monthly: raw.champions.filter((a) => a.cycle === 'monthly').length },
    },
  }
}
