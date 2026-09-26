/* GET /management/overview?range + /revenue + /funnel + the customer list → the shape mock/overview.js returns. */
import { get } from './client'
import { customersAll, definitions, planKey } from './account'
import { alerts } from './customers'

const FUNNEL_LABEL = { signup: 'ثبت‌نام', firstBase: 'اولین بیس', activated: 'فعال‌سازی', habit: 'عادت', paid: 'پرداخت' }
const sum = (list, f) => list.reduce((t, a) => t + f(a), 0)
const num = (x) => (x == null || isNaN(x) ? 0 : x)

export async function overview({ range: R = 30 } = {}) {
  const [ov, ov90, rev, fn, def, accounts] = await Promise.all([
    get('/overview', { range: R }),
    R === 90 ? null : get('/overview', { range: 90 }), // the daily-active chart is always 90 days
    get('/revenue', { months: 12 }),
    get('/funnel', { range: 60 }), // cohort = signups 90..30 days ago, like the mock
    definitions(),
    customersAll(),
  ])
  const k = ov.kpis || {}
  const cohort = (from, len) => accounts.filter((a) => a.age >= from && a.age < from + len)
  const actRate = (from, len) => { const c = cohort(from, len); return c.length ? c.filter((a) => a.activated === true).length / c.length : 0 }
  const wk = (f) => { const o = []; for (let w = 11; w >= 0; w--) o.push(f(w * 7)); return o }
  const active7 = (a) => a.lastSeenDays < 7

  const paying = accounts.filter((a) => a.paying)
  const mrrNow = k.mrrNow ? k.mrrNow.value : num(k.mrr) // backend: kpis.mrrNow { value, prev } (kpis.mrr is the plain number)
  const mrrPrev = k.mrrNow ? k.mrrNow.prev : null
  const payingNow = k.payingNow ? k.payingNow.value : num(k.paying) // needs backend: kpis.payingNow { value, prev }
  const risk = paying.filter((a) => a.health < 50 || a.pastDue)
  const riskMrr = sum(risk, (a) => a.mrr)
  const idx = 7 - Math.min(7, Math.round(R / 7))
  const withHist = paying.filter((a) => a.healthHistory.length) // needs backend: healthHistory on /customers
  const riskPrevMrr = withHist.length ? sum(withHist.filter((a) => a.healthHistory[idx] != null && a.healthHistory[idx] < 50), (a) => a.mrr) : null

  const mrrMonths = rev.mrrMonths || [] // needs backend: /revenue mrrMonths
  const daily = ((ov90 || ov).series || []).map((s) => num(s.activeCustomers))
  const ma = daily.map((_, i) => { const w = daily.slice(Math.max(0, i - 6), i + 1); return Math.round(sum(w, (x) => x) / w.length) })
  const signupWeeks = []
  for (let w = 11; w >= 0; w--) { const c = cohort(w * 7, 7); const x = c.filter((a) => a.activated === true).length; signupWeeks.push({ daysAgo: w * 7 + 6, activated: x, pending: c.length - x }) }
  const planMix = ['free', 'team', 'business', 'ent', 'partner'].map((p) => ({ plan: p, mrr: sum(accounts.filter((a) => a.plan === p), (a) => a.mrr) })).filter((p) => p.mrr > 0)
  const upsAll = accounts.filter((a) => a.segments.includes('upsell'))

  return {
    range: R,
    dataSince: ov.dataSince || null,
    kpis: {
      mrr: { now: mrrNow, prev: mrrPrev, spark: mrrMonths.map((m) => m.mrr) },
      paying: { now: payingNow, prev: k.payingNow ? k.payingNow.prev : null, spark: mrrMonths.map((m) => m.paying) },
      wau: { now: accounts.filter(active7).length, prev: null, users: null, spark: [] },
      signups: { now: num(k.signups && k.signups.value), prev: k.signups ? k.signups.prev : null, spark: wk((d) => cohort(d, 7).length) },
      activation: { now: actRate(7, R), prev: actRate(7 + R, R), records: (def.activation && def.activation.recordEvents) || 0 },
      riskMrr: { now: riskMrr, prev: riskPrevMrr, count: risk.length, share: mrrNow ? riskMrr / mrrNow : 0 },
    },
    months: mrrMonths.map((m) => ({ y: m.y, m: m.m, end: m.end, mrr: m.mrr })),
    movements: ov.movements || { new: 0, expansion: 0, contraction: 0, churn: 0, newCount: 0, expCount: 0, conCount: 0, churnCount: 0 }, // needs backend
    mrrPrev: mrrPrev || 0,
    planMix: ov.planMix ? ov.planMix.map((p) => ({ plan: planKey(p.plan), mrr: p.mrr })) : planMix, // needs backend: planMix
    attention: (await alerts()).slice(0, 4),
    topRisk: risk.slice().sort((p, q) => q.mrr - p.mrr).slice(0, 5),
    dailyActive: { daily, ma },
    signupWeeks,
    funnel: (fn.steps || []).map((s) => ({ key: s.key, label: FUNNEL_LABEL[s.key] || s.key, n: s.n, fromStart: num(s.fromStart) })),
    upsell: { total: upsAll.length, top: upsAll.slice().sort((p, q) => q.events30 - p.events30).slice(0, 6) },
    team: [], since: Math.min(R, 44),
  }
}
