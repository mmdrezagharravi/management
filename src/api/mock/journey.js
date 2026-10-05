/* GET /management/journey?range=30 — customer journey map: live funnel numbers per stage + hand-written stage copy.
   Imports only the engine (not ./shared, which moves the app clock), so the real panel can load it as sample data. */
import { DB } from 'src/mock/engine'
import { JOURNEY_STAGES as STAGES } from 'src/lib/refs'

const MATURE = 30 // same cohort rule as the funnel page

export function journey({ range: R = 30 } = {}) {
  const { agg, accounts } = DB
  const f = agg.funnel(MATURE, R)
  const K = {}; f.forEach((s) => { K[s.key] = s })

  // post-purchase: renewals that fell due in the last R days (paid, failed, or churned instead)
  let due = 0, renewed = 0
  for (const a of accounts) {
    a.invoices.forEach((inv, i) => { if (i > 0 && inv.t < R) { due++; if (inv.status === 'paid') renewed++ } })
    a.planEvents.forEach((pe) => { if (pe.kind === 'churn' && pe.t < R) due++ })
  }

  // site visits of the cohort window per channel, shaped like /funnel visits (GA4)
  const channels = DB.CONFIG.sources
    .map((s) => { const sessions = agg.visits(MATURE, R, s.key); return { channel: s.key, sessions, newUsers: Math.round(sessions * DB.CONFIG.newVisitorShare) } })
    .filter((c) => c.sessions)
    .sort((p, q) => q.sessions - p.sessions)

  // weakest transition inside the account funnel
  const tr = ['firstBase', 'activated', 'habit', 'paid']
  const weakest = tr.slice().sort((p, q) => K[p].fromPrev - K[q].fromPrev)[0]

  // friction ranking: biggest drops between consecutive account-funnel steps
  const steps = f.slice(1)
  const drops = steps.slice(1).map((s, i) => ({ from: steps[i].label, to: s.label, key: s.key, lost: steps[i].n - s.n, rate: 1 - s.fromPrev }))
    .sort((p, q) => q.lost - p.lost).slice(0, 3)

  return Promise.resolve({
    range: R, mature: MATURE,
    stages: STAGES,
    visits: { sessions: K.visit.n, newUsers: Math.round(K.visit.n * DB.CONFIG.newVisitorShare), channels },
    funnel: f.map((s) => ({ key: s.key, label: s.label, n: s.n, fromPrev: s.fromPrev, fromStart: s.fromStart, medianDays: s.medianDays })),
    renew: { due, renewed, rate: due ? renewed / due : 0 },
    weakest,
    drops,
  })
}
