/* GET /management/health + the customer list → the shape mock/health.js returns. */
import { get } from './client'
import { customersAll, toAccount } from './account'
import { fa } from 'src/lib/format'
import { HEALTH_COMPONENTS as COMPS } from 'src/lib/refs'
import { BANDS, band as bandOf } from 'src/lib/ui'

const ACTION = {
  activity: 'تماس برای فهمیدن دلیل کاهش استفاده',
  trend: 'بررسی تغییر در تیم یا فرایند مشتری',
  depth: 'معرفی خودکارسازی و فرم در یک جلسهٔ کوتاه',
  team: 'جلسه با مدیر حساب برای فعال کردن اعضا',
  commercial: 'پیگیری پرداخت یا تیکت باز',
}
const sum = (list, f) => list.reduce((t, a) => t + f(a), 0)
const avgOf = (list, f) => (list.length ? sum(list, f) / list.length : 0)
const weakest = (a) => COMPS.reduce((m, c) => (a.components[c.key] < a.components[m.key] ? c : m), COMPS[0])
const bandRange = (b, i) => (i === 0 ? fa(b.min) + ' به بالا' : b.min === 0 ? 'زیر ' + fa(BANDS[i - 1].min) : fa(b.min) + '–' + fa(BANDS[i - 1].min - 1))
const withWeak = (a) => { const w = weakest(a); return { ...a, weak: { key: w.key, label: w.label, value: a.components[w.key] }, action: ACTION[w.key] } }
const mover = (a, d) => ({ ...a, d, weakLabel: weakest(a).label, bandLabel: bandOf(a.health).label })

export async function health() {
  const [h, accounts] = await Promise.all([get('/health'), customersAll()])
  const paying = accounts.filter((a) => a.paying)
  const totalMrr = sum(paying, (a) => a.mrr)
  const atRisk = paying.filter((a) => a.health < 50 || a.pastDue)
  const had2w = paying.filter((a) => a.health2wAgo != null) // needs backend: health2wAgo on /customers
  const movers = (h.movers || []).filter((m) => m.customer.paying) // drops ≥ 15 in two weeks, biggest first; the server lists free accounts too

  const bands = BANDS.map((b, i) => {
    const list = paying.filter((a) => a.band === b.key)
    return { key: b.key, label: b.label, min: b.min, range: bandRange(b, i), n: list.length, prev: had2w.filter((a) => bandOf(a.health2wAgo).key === b.key).length, mrr: sum(list, (a) => a.mrr) }
  })
  const compAvg = COMPS.map((c) => ({ key: c.key, label: c.label, desc: c.desc, v: avgOf(paying, (a) => a.components[c.key]) }))

  const down = movers.slice(0, 8).map((m) => mover({ ...toAccount(m.customer), health: m.to, health2wAgo: m.from }, m.to - m.from))
  const up = had2w.map((a) => ({ a, d: a.health - a.health2wAgo })).filter((x) => x.d > 0).sort((p, q) => q.d - p.d || q.a.mrr - p.a.mrr).slice(0, 8).map((x) => mover(x.a, x.d))

  return {
    payingCount: paying.length, totalMrr,
    kpis: { riskMrr: sum(atRisk, (a) => a.mrr), riskCount: atRisk.length, avg: avgOf(paying, (a) => a.health), avg2w: had2w.length ? avgOf(had2w, (a) => a.health2wAgo) : null, dropsCount: movers.length, dropsMrr: sum(movers, (m) => m.customer.mrr || 0) },
    bands, compAvg, weakAvg: compAvg.slice().sort((p, q) => p.v - q.v)[0],
    riskN: [], // no weekly snapshot series endpoint yet; the page shows a note instead of the chart
    atRisk: atRisk.map(withWeak),
    down, up,
  }
}
