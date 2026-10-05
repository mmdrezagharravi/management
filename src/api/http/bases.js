/* GET /management/bases → the list page: rows + aggregates, same formulas as the mock. */
import { basesAll, planKey } from './account'
import { get } from './client'
import { PLAN_ORDER } from 'src/lib/refs'

const EDGES = [0, 1, 10, 100, 1000, 10000, 100000]
const BUCKET_LABELS = ['۰', '۱–۹', '۱۰–۹۹', '۱۰۰–۹۹۹', '۱–۹ هزار', '۱۰–۹۹ هزار', '۱۰۰ هزار+']
const BUCKET_TIPS = ['بدون رکورد', '۱ تا ۹ رکورد', '۱۰ تا ۹۹ رکورد', '۱۰۰ تا ۹۹۹ رکورد', '۱٬۰۰۰ تا ۹٬۹۹۹ رکورد', '۱۰٬۰۰۰ تا ۹۹٬۹۹۹ رکورد', '۱۰۰٬۰۰۰ رکورد و بیشتر']

const NEAR_RATIO = 0.8 // cloud-back metrics.ts QUOTA_NEAR_RATIO, the quota page's threshold too

/** BaseSummary → list row (nearCap is per base here: Airsheet's record limit is per base). */
export const toBaseRow = (b) => ({
  id: b.id, name: b.name, slug: b.id.slice(-8), tables: b.tables || 0, automations: b.automations || 0, collaborators: b.collaborators || 0,
  created: b.age ?? 0, records: b.records || 0, la: b.lastSeenDays ?? 9999, est30: b.events30 || 0,
  accountId: b.creator ? b.creator.id : null, accountName: (b.creator && b.creator.name) || 'بدون مالک',
  plan: planKey(b.creator && b.creator.plan), nearCap: b.usage >= NEAR_RATIO || !!b.atLimit, isTemplate: !!b.isTemplate,
})

export async function bases() {
  const everything = (await basesAll()).map(toBaseRow)
  const rows = everything.filter((r) => !r.isTemplate) // templates are Airsheet's own gallery, not customer work
  const total = rows.length
  const active7 = rows.filter((r) => r.la <= 6)
  const new30 = rows.filter((r) => r.created < 30).length, new30prev = rows.filter((r) => r.created >= 30 && r.created < 60).length
  const avgRec = active7.length ? active7.reduce((t, r) => t + r.records, 0) / active7.length : 0
  const sortedRec = active7.map((r) => r.records).sort((p, q) => p - q)
  const medRec = sortedRec.length ? sortedRec[Math.floor(sortedRec.length / 2)] : 0
  const withBases = new Set(rows.map((r) => r.accountId)).size
  const nearAcc = new Set(rows.filter((r) => r.nearCap).map((r) => r.accountId)).size
  const nearBases = rows.filter((r) => r.nearCap).length

  const counts = EDGES.map(() => 0)
  rows.forEach((r) => { let k = 0; while (k + 1 < EDGES.length && r.records >= EDGES[k + 1]) k++; counts[k]++ })
  let last = counts.length - 1; while (last > 0 && !counts[last]) last--

  return {
    rows,
    kpis: { total, withBases, active7: active7.length, new30, new30prev, avgRec, medRec, nearBases, nearAcc },
    top: rows.slice().sort((p, q) => q.est30 - p.est30).slice(0, 10),
    hist: { labels: BUCKET_LABELS.slice(0, last + 1), tips: BUCKET_TIPS.slice(0, last + 1), counts: counts.slice(0, last + 1) },
    byPlan: PLAN_ORDER.map((k) => ({ plan: k, n: rows.filter((r) => r.plan === k).length })).filter((p) => p.n),
    byState: { active7: active7.length, mid: rows.filter((r) => r.la > 6 && r.la <= 30).length, idle: rows.filter((r) => r.la > 30).length },
    small: rows.filter((r) => r.records < 100).length, big: rows.filter((r) => r.records >= 10000).length,
    templates: everything.length - rows.length,
  }
}

/** One page of the base list: the server applies view, filters, search and sort (GET /management/bases). */
export async function basesPage(params) {
  const r = await get('/bases', { templates: false, ...params })
  return { rows: r.items.map(toBaseRow), total: r.total, counts: r.counts || {} }
}
