/* GET /management/renewals?days=90&lapsedDays=120 + the customer list → the shape mock/sales.js returns. */
import { get } from './client'
import { customersAll, definitions, toAccount, yearlyDiscount } from './account'
import { HEALTH_COMPONENTS } from 'src/lib/refs'
import { pastDueRow, churnRow } from './revenue'

const sum = (list, f) => list.reduce((t, a) => t + (f(a) || 0), 0)
const weakest = (a) => HEALTH_COMPONENTS.reduce((m, c) => (a.components[c.key] < a.components[m.key] ? c : m), HEALTH_COMPONENTS[0])
/** Account summary + its weakest health component. */
const row = (a) => { const w = weakest(a); return { ...a, weakest: { key: w.key, label: w.label, value: a.components[w.key] } } }

export async function sales() {
  const [rn, accounts, D] = await Promise.all([get('/renewals', { days: 90, lapsedDays: 120 }), customersAll(), definitions()])
  const RISK = D.atRiskBelow ?? 50
  const paying = accounts.filter((a) => a.paying)
  const raw = {
    renew: (rn.upcoming || []).map(toAccount),
    upsell: accounts.filter((a) => a.segments.includes('upsell')),
    winback: (rn.lapsed || []).map(toAccount).filter((a) => a.churnedAt !== undefined),
    pastdue: accounts.filter((a) => a.pastDue),
    champions: accounts.filter((a) => a.segments.includes('champions')),
  }
  const r30 = paying.filter((a) => a.renewIn <= 30)
  const renewRisk = raw.renew.filter((a) => a.health < RISK)
  const upsell = { n: raw.upsell.length, value: sum(raw.upsell, (a) => a.upgradeValue) }
  const winback = { n: raw.winback.length, lostMrr: sum(raw.winback, (a) => a.lastMrr) }
  const pastdue = { n: raw.pastdue.length, mrr: sum(raw.pastdue, (a) => a.mrr) }
  const champions = { n: raw.champions.length, monthly: raw.champions.filter((a) => a.cycle === 'monthly').length }

  return {
    risk: RISK, yearlyDiscount: yearlyDiscount(D) || 0,
    kpis: { renew: { n: r30.length, mrr: sum(r30, (a) => a.mrr), risk: r30.filter((a) => a.health < RISK).length }, upsell, winback, pastdue, champions },
    lists: {
      renew: raw.renew.map(row),
      upsell: raw.upsell.map(row),
      winback: raw.winback.map(churnRow),
      pastdue: raw.pastdue.map(pastDueRow),
      champions: raw.champions.map(row),
    },
    stats: { renew: { n: raw.renew.length, risk: renewRisk.length, riskMrr: sum(renewRisk, (a) => a.mrr) }, upsell, winback, pastdue, champions },
  }
}
