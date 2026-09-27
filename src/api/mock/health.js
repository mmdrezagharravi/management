/* GET /management/health — paying customers at risk, why, and the next step. */
import { DB } from 'src/mock/engine'
import { fa } from 'src/lib/format'
import { C, ok, enrich } from './shared'

const COMPS = C.health.components, BANDS = C.health.bands
const ACTION = {
  activity: 'تماس برای فهمیدن دلیل کاهش استفاده',
  trend: 'بررسی تغییر در تیم یا فرایند مشتری',
  depth: 'معرفی خودکارسازی و فرم در یک جلسهٔ کوتاه',
  team: 'جلسه با مدیر حساب برای فعال کردن اعضا',
  commercial: 'پیگیری پرداخت یا تیکت باز',
}

const sum = (list, f) => list.reduce((t, a) => t + f(a), 0)
const mrrOn = (a, t) => { let v = 0; for (const pe of a.planEvents) { if (pe.t >= t) v = pe.mrr; else break } return v }
const weakest = (a) => COMPS.reduce((m, c) => (a.components[c.key] < a.components[m.key] ? c : m), COMPS[0])
const bandOf = (s) => BANDS.find((b) => s >= b.min)
const bandRange = (b, i) => (i === 0 ? fa(b.min) + ' به بالا' : b.min === 0 ? 'زیر ' + fa(BANDS[i - 1].min) : fa(b.min) + '–' + fa(BANDS[i - 1].min - 1))
const withWeak = (a) => { const w = weakest(a); return { ...enrich(a), weak: { key: w.key, label: w.label, value: a.components[w.key] }, action: ACTION[w.key] } }

export function health() {
  const { accounts } = DB
  const paying = accounts.filter((a) => a.paying)
  const totalMrr = sum(paying, (a) => a.mrr)
  const atRisk = paying.filter((a) => a.health < 50 || a.pastDue)
  const riskMrr = sum(atRisk, (a) => a.mrr)
  const avg = sum(paying, (a) => a.health) / paying.length
  const had2w = paying.filter((a) => a.health2wAgo != null)
  const avg2w = sum(had2w, (a) => a.health2wAgo) / Math.max(1, had2w.length)
  const drops = paying.filter((a) => a.health2wAgo != null && a.health2wAgo - a.health >= 15)
  // paying customers under 50, per week, 8 weeks (oldest → today); "paying" judged on that week
  const riskN = []
  for (let w = 7; w >= 0; w--) riskN.push(accounts.filter((a) => { const h = a.healthHistory[7 - w]; return h != null && h < 50 && mrrOn(a, w * 7) > 0 }).length)

  const bands = BANDS.map((b, i) => {
    const list = paying.filter((a) => a.band.key === b.key)
    return { key: b.key, label: b.label, min: b.min, range: bandRange(b, i), n: list.length, prev: had2w.filter((a) => bandOf(a.health2wAgo).key === b.key).length, mrr: sum(list, (a) => a.mrr) }
  })
  const compAvg = COMPS.map((c) => ({ key: c.key, label: c.label, desc: c.desc, v: sum(paying, (a) => a.components[c.key]) / paying.length }))
  const weakAvg = compAvg.slice().sort((p, q) => p.v - q.v)[0]

  const moved = had2w.map((a) => ({ a, d: a.health - a.health2wAgo }))
  const mover = (x) => ({ ...enrich(x.a), d: x.d, weakLabel: weakest(x.a).label, bandLabel: x.a.band.label })
  const down = moved.filter((x) => x.d < 0).sort((p, q) => p.d - q.d || q.a.mrr - p.a.mrr).slice(0, 8).map(mover)
  const up = moved.filter((x) => x.d > 0).sort((p, q) => q.d - p.d || q.a.mrr - p.a.mrr).slice(0, 8).map(mover)

  return ok({
    payingCount: paying.length, totalMrr,
    kpis: { riskMrr, riskCount: atRisk.length, avg, avg2w, dropsCount: drops.length, dropsMrr: sum(drops, (a) => a.mrr) },
    bands, compAvg, weakAvg, riskN,
    atRisk: atRisk.map(withWeak),
    down, up,
  })
}
