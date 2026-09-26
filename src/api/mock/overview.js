/* GET /management/overview?range=30 */
import { DB } from 'src/mock/engine'
import { C, ok, enrich, ownerOf } from './shared'
import { alerts } from './shared'

export async function overview({ range: R = 30 } = {}) {
  const { agg, accounts } = DB
  const cohort = (from, len) => accounts.filter((a) => a.age >= from && a.age < from + len)
  const actRate = (from, len) => { const c = cohort(from, len); return c.length ? c.filter((a) => a.milestones.activated !== undefined).length / c.length : 0 }
  const risk = accounts.filter((a) => a.paying && (a.health < 50 || a.pastDue))
  const riskMrr = risk.reduce((t, a) => t + a.mrr, 0)
  const weeks = 12
  const wk = (f) => { const o = []; for (let w = weeks - 1; w >= 0; w--) o.push(f(w * 7)); return o }
  const mrrNow = agg.mrrAt(0)
  const riskPrevMrr = accounts.filter((a) => a.paying && a.healthHistory[7 - Math.min(7, Math.round(R / 7))] < 50).reduce((t, a) => t + a.mrr, 0)

  const months = agg.mrrMonths(12)
  const mv = agg.movements(R, 0)
  const days = 90, daily = agg.daily((d) => agg.activeOn(d), days + 6)
  const ma = []; for (let i = 6; i < daily.length; i++) { let s = 0; for (let k = i - 6; k <= i; k++) s += daily[k]; ma.push(Math.round(s / 7)) }
  const signupWeeks = []
  for (let w = 11; w >= 0; w--) { const c = cohort(w * 7, 7); const x = c.filter((a) => a.milestones.activated !== undefined).length; signupWeeks.push({ daysAgo: w * 7 + 6, activated: x, pending: c.length - x }) }
  const since = Math.min(R, 44)
  const team = C.reps.map((r) => {
    const acts = DB.activities.filter((x) => x.rep === r.id && x.t < since)
    const book = accounts.filter((a) => ownerOf(a) === r.id && a.paying)
    return {
      id: r.id, name: r.name,
      calls: acts.filter((x) => x.type === 'call' || x.type === 'meeting').length,
      won: acts.filter((x) => ['won_new', 'won_expansion', 'renewed'].includes(x.outcome)).reduce((t, x) => t + (x.mrr || 0), 0),
      lost: acts.filter((x) => x.outcome === 'lost').length,
      book: book.reduce((t, a) => t + a.mrr, 0), risk: book.filter((a) => a.health < 50).length,
    }
  })
  const upsAll = accounts.filter((a) => a.segments.includes('upsell'))
  return {
    range: R,
    kpis: {
      mrr: { now: mrrNow, prev: agg.mrrAt(R), spark: wk(agg.mrrAt) },
      paying: { now: agg.payingAt(0), prev: agg.payingAt(R), spark: wk(agg.payingAt) },
      wau: { now: agg.activeInWindow(0, 7), prev: agg.activeInWindow(R, 7), users: agg.activeUsersInWindow(0, 7), spark: wk((d) => agg.activeInWindow(d, 7)) },
      signups: { now: agg.signups(0, R), prev: agg.signups(R, R), spark: wk((d) => agg.signups(d, 7)) },
      activation: { now: actRate(7, R), prev: actRate(7 + R, R), records: C.activation.records },
      riskMrr: { now: riskMrr, prev: riskPrevMrr, count: risk.length, share: mrrNow ? riskMrr / mrrNow : 0 },
    },
    months: months.map((m) => ({ y: m.y, m: m.m, end: m.end, mrr: m.mrr })),
    movements: mv, mrrPrev: agg.mrrAt(R),
    planMix: ['basic', 'pro', 'ent'].map((k) => ({ plan: k, mrr: accounts.filter((a) => a.plan === k).reduce((t, a) => t + a.mrr, 0) })),
    attention: (await alerts()).slice(0, 4),
    topRisk: risk.slice().sort((p, q) => q.mrr - p.mrr).slice(0, 5).map(enrich),
    dailyActive: { daily: daily.slice(6), ma },
    signupWeeks,
    funnel: agg.funnel(30, 60).slice(1).map((s) => ({ key: s.key, label: s.label, n: s.n, fromStart: s.fromStart })),
    upsell: { total: upsAll.length, top: upsAll.slice().sort((p, q) => q.limitHits30 * DB.upgradeValue(q) - p.limitHits30 * DB.upgradeValue(p)).slice(0, 6).map(enrich) },
    team, since,
  }
}
