/* GET /management/sales — the sales desk: one KPI per work list and the five lists
   (renew, upsell, winback, pastdue, champions). */
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
  const r30 = paying.filter((a) => a.renewIn <= 30)
  const renewRisk = raw.renew.filter((a) => a.health < RISK)
  const upsell = { n: raw.upsell.length, value: sum(raw.upsell, DB.upgradeValue) }
  const winback = { n: raw.winback.length, lostMrr: sum(raw.winback, lostMrr) }
  const pastdue = { n: raw.pastdue.length, mrr: sum(raw.pastdue, (a) => a.mrr) }
  const champions = { n: raw.champions.length, monthly: raw.champions.filter((a) => a.cycle === 'monthly').length }

  return ok({
    risk: RISK, yearlyDiscount: C.cycles.yearly.discount,
    kpis: { renew: { n: r30.length, mrr: sum(r30, (a) => a.mrr), risk: r30.filter((a) => a.health < RISK).length }, upsell, winback, pastdue, champions },
    lists: {
      renew: raw.renew.map(row),
      upsell: raw.upsell.map(row),
      winback: raw.winback.map(churnRow),
      pastdue: raw.pastdue.map(pastDueRow),
      champions: raw.champions.map(row),
    },
    stats: { renew: { n: raw.renew.length, risk: renewRisk.length, riskMrr: sum(renewRisk, (a) => a.mrr) }, upsell, winback, pastdue, champions },
  })
}
