/* GET /management/bases — every base with its account context, plus the list-page aggregates. */
import { DB } from 'src/mock/engine'
import { C, ok, pageOf } from './shared'

// A base cannot have been last active before it existed.
const lastAct = (b) => Math.min(b.lastActive, b.created)
const recLimit = (a) => C.plans[a.plan].limits.records
const acctRecordRatio = (a) => (recLimit(a) ? a.records / recLimit(a) : 0)
// base share of its account's records (bases split the account's records between them)
const shareOf = (b, a) => { const t = a.bases.reduce((s, x) => s + x.records, 0); return t ? b.records / t : 1 / a.bases.length }
// On capped plans the account holds at most a.records; scale its bases down so they add up to that.
const recsOf = (b, a) => { const t = a.bases.reduce((s, x) => s + x.records, 0); return t > a.records ? Math.round((b.records * a.records) / t) : b.records }

const EDGES = [0, 1, 10, 100, 1000, 10000, 100000]
const BUCKET_LABELS = ['۰', '۱–۹', '۱۰–۹۹', '۱۰۰–۹۹۹', '۱–۹ هزار', '۱۰–۹۹ هزار', '۱۰۰ هزار+']
const BUCKET_TIPS = ['بدون رکورد', '۱ تا ۹ رکورد', '۱۰ تا ۹۹ رکورد', '۱۰۰ تا ۹۹۹ رکورد', '۱٬۰۰۰ تا ۹٬۹۹۹ رکورد', '۱۰٬۰۰۰ تا ۹۹٬۹۹۹ رکورد', '۱۰۰٬۰۰۰ رکورد و بیشتر']

export function bases() {
  const { accounts } = DB
  const rows = DB.bases().map((b) => {
    const a = DB.byId.get(b.accountId)
    return {
      id: b.id, name: b.name, slug: b.slug, tables: b.tables, automations: b.automations, collaborators: b.collaborators, created: b.created,
      records: recsOf(b, a), la: lastAct(b), est30: Math.round(a.records30 * shareOf(b, a)),
      accountId: a.id, accountName: a.name, plan: a.plan, nearCap: acctRecordRatio(a) >= 0.9,
    }
  })
  const total = rows.length
  const active7 = rows.filter((r) => r.la <= 6)
  const new30 = rows.filter((r) => r.created < 30).length, new30prev = rows.filter((r) => r.created >= 30 && r.created < 60).length
  const avgRec = active7.length ? active7.reduce((t, r) => t + r.records, 0) / active7.length : 0
  const sortedRec = active7.map((r) => r.records).sort((p, q) => p - q)
  const medRec = sortedRec.length ? sortedRec[Math.floor(sortedRec.length / 2)] : 0
  const nearAcc = accounts.filter((a) => a.bases.length && acctRecordRatio(a) >= 0.9).length
  const nearBases = rows.filter((r) => r.nearCap).length
  const withBases = accounts.filter((a) => a.bases.length).length

  const counts = EDGES.map(() => 0)
  rows.forEach((r) => { let k = 0; while (k + 1 < EDGES.length && r.records >= EDGES[k + 1]) k++; counts[k]++ })
  let last = counts.length - 1; while (last > 0 && !counts[last]) last--

  return ok({
    rows,
    kpis: { total, withBases, active7: active7.length, new30, new30prev, avgRec, medRec, nearBases, nearAcc },
    top: rows.slice().sort((p, q) => q.est30 - p.est30).slice(0, 10),
    hist: { labels: BUCKET_LABELS.slice(0, last + 1), tips: BUCKET_TIPS.slice(0, last + 1), counts: counts.slice(0, last + 1) },
    byPlan: C.planOrder.map((k) => ({ plan: k, n: rows.filter((r) => r.plan === k).length })),
    byState: { active7: active7.length, mid: rows.filter((r) => r.la > 6 && r.la <= 30).length, idle: rows.filter((r) => r.la > 30).length },
    small: rows.filter((r) => r.records < 100).length, big: rows.filter((r) => r.records >= 10000).length,
  })
}

const BASE_VIEWS = { all: () => true, active: (r) => r.la <= 6, idle: (r) => r.la > 30, auto: (r) => r.automations > 0 }
const BASE_SORTS = {
  name: (r) => r.name, creatorName: (r) => r.accountName, planRank: (r) => DB.CONFIG.planOrder.indexOf(r.plan), tables: (r) => r.tables,
  records: (r) => r.records, automations: (r) => r.automations, collaborators: (r) => r.collaborators, createdAt: (r) => -r.created, recent: (r) => -r.la,
}

/** GET /management/bases?view&q&plan&sort&dir&page&size — one page, per-view counts. */
export async function basesPage(p = {}) {
  const { rows } = await bases()
  return pageOf(rows, p, { views: BASE_VIEWS, sorts: BASE_SORTS, filters: { plan: (r, v) => r.plan === v }, text: (r) => r.name + ' ' + r.slug + ' ' + r.accountName })
}
