/* GET /management/funnel + /renewals + customers — customer journey map. Same shape as mock/journey.js.
   Visits (آگاهی) come from Google Analytics 4 through /funnel; until GA4 is configured visit n = null. */
import { get } from './client'
import { dateTime, date, daysAgo } from 'src/lib/format'
import { JOURNEY_STAGES as STAGES } from 'src/lib/refs'
import { customersAll } from './account'
import { funnel } from './funnel'
import { CYCLE_DAYS } from './revenue'

const TR = ['firstBase', 'activated', 'habit', 'paid']
const cycleDays = (a) => CYCLE_DAYS[a.cycle] || (/^(\d+)m$/.test(a.rawCycle || '') ? +a.rawCycle.slice(0, -1) * 30 : null)
const gaGapSource = (g) => 'Google Analytics 4 · ' + (g.lastDataDay ? 'از ' + date(daysAgo(g.lastDataDay), { year: true }) + ' داده‌ای نرسیده (تگ GA؟)' : 'هیچ داده‌ای نرسیده')

const gaSource = (v) => 'Google Analytics 4 · ' + (v.sync && v.sync.lastSuccessAt ? 'آخرین همگام‌سازی ' + dateTime(v.sync.lastSuccessAt) : 'هنوز همگام نشده') + (v.sync && v.sync.ok === false ? ' · آخرین تلاش ناموفق: ' + v.sync.error : '')

export async function journey({ range: R = 30 } = {}) {
  const [fn, ren, accounts] = await Promise.all([funnel({ range: R }), get('/renewals', { days: R, lapsedDays: R }), customersAll()])
  const f = fn.steps.map((s) => ({ key: s.key, label: s.label, n: s.n, fromPrev: s.key === 'signup' && !fn.visits ? null : s.fromPrev, fromStart: s.fromStart, medianDays: s.medianDays }))
  const K = {}; f.forEach((s) => { K[s.key] = s })

  // post-purchase: renewals that fell due in the last R days — renewed (paying, last payment inside the window, not their first)
  // vs lapsed (server: not renewed within R days). ponytail: renewal date inferred from cycle length; exact once invoices are exposed
  const paying = accounts.filter((a) => a.paying)
  const renewed = paying.filter((a) => { const cd = cycleDays(a); return cd && a.renewIn <= cd && a.renewIn > cd - R && a.tenureDays > cd }).length
  const due = renewed + (ren.lapsed || []).length

  const weakest = TR.slice().sort((p, q) => (K[p].fromPrev ?? Infinity) - (K[q].fromPrev ?? Infinity))[0]
  const steps = f.slice(1)
  const drops = steps.slice(1).map((s, i) => ({ from: steps[i].label, to: s.label, key: s.key, lost: steps[i].n - s.n, rate: 1 - (s.fromPrev ?? 0) }))
    .sort((p, q) => q.lost - p.lost).slice(0, 3)
  return {
    range: R, mature: fn.mature, dataSince: fn.dataSince,
    stages: STAGES.map((s) => (s.key !== 'visit' ? s : fn.visits ? { ...s, src: gaSource(fn.visits) } : fn.gaGap ? { ...s, src: gaGapSource(fn.gaGap) } : s)), funnel: f,
    visits: fn.visits,
    renew: { due, renewed, rate: due ? renewed / due : 0 },
    weakest, drops,
  }
}
