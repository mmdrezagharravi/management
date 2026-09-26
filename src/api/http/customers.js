/* GET /management/customers as the list page's rows, plus the shared helpers mock/shared.js exported
   (search, alerts, navBadges, freshness, interactionsOf) that the layout and components call. */
import { get, memo } from './client'
import { customersAll, toAccount, ownerOf } from './account'
import { fa, norm } from 'src/lib/format'

const daysAgo = (x) => (x ? Math.round((Date.now() - new Date(x)) / 864e5) : null)

/** All accounts. The backend has no city → `cities` stays empty and the page drops that filter. */
export async function customers() {
  return { rows: await customersAll(), cities: [] }
}

/* ----------------------------------------------------------------- search */
export async function search(q) {
  const s = norm(q)
  if (!s) return { customers: [], bases: [] }
  const [c, b] = await Promise.all([get('/customers', { q: s, size: 7 }), get('/bases', { q: s, size: 4 })])
  return {
    customers: c.items.map(toAccount),
    bases: b.items.map((x) => ({ id: x.id, name: x.name, slug: x.id.slice(-8), records: x.records, accountName: (x.creator && x.creator.name) || '' })),
  }
}

/* ------------------------------------------------------- ops (jobs, sync) */
const jobs = memo(() => get('/jobs').catch(() => null))
const dataHealth = memo(() => get('/data-health').catch(() => null))
const failedCrons = (j) => ((j && j.crons) || []).filter((c) => c.lastStatus === 'fail') // needs backend: /jobs.crons
const lagOf = (h) => (h && h.lagDays != null ? h.lagDays : 0)
const PAID_PLANS = ['team', 'business', 'ent', 'partner']

/* ----------------------------------------------------------------- alerts */
export async function alerts() {
  const [rows, j, h] = await Promise.all([customersAll(), jobs(), dataHealth()])
  const out = []
  failedCrons(j).forEach((c) => out.push({ lvl: 'crit', t: 'کران «' + c.name + '» اجرا نشد', d: (c.lastRunAt ? fa(daysAgo(c.lastRunAt)) + ' روز پیش' : '') + (c.lastError ? ' · ' + c.lastError : ''), to: '/jobs' }))
  const lag = lagOf(h)
  if (lag >= 2) out.push({ lvl: 'crit', t: 'تأخیر در رویدادهای رفتاری', d: 'index=behavior · ' + fa(lag) + ' روز عقب', to: '/data-health' })
  const pd = rows.filter((a) => a.pastDue)
  if (pd.length) out.push({ lvl: 'warn', t: fa(pd.length) + ' پرداخت تمدید ناموفق', d: 'درآمد ماهانه در دورهٔ مهلت', mrr: pd.reduce((t, a) => t + a.mrr, 0), to: '/sales?tab=pastdue' })
  const crit = rows.filter((a) => a.paying && a.health < 30 && PAID_PLANS.includes(a.plan))
  if (crit.length) out.push({ lvl: 'crit', t: fa(crit.length) + ' مشتری پولی بحرانی شده', d: 'مجموع درآمد ماهانه', mrr: crit.reduce((t, a) => t + a.mrr, 0), to: '/health' })
  const un = rows.filter((a) => a.segments.includes('upsell') && !ownerOf(a.id))
  if (un.length) out.push({ lvl: 'info', t: fa(un.length) + ' سرنخ ارتقا بدون مسئول', d: 'به یکی از اعضای تیم فروش بدهید', to: '/customers?view=unassigned' })
  return out
}

/* ------------------------------------------------------------- nav badges */
export async function navBadges() {
  const [rows, j, h] = await Promise.all([customersAll(), jobs(), dataHealth()])
  return {
    today: null,
    health: { n: rows.filter((a) => a.paying && a.health < 30).length, warn: true },
    jobs: { n: failedCrons(j).length, warn: true },
    'data-health': { n: lagOf(h) >= 2 ? 1 : 0, warn: true },
  }
}

/* -------------------------------------------------------------- freshness */
/** The only ingestion source is the behaviour index synced nightly; its lag is in days. */
export async function freshness() {
  const lagDays = lagOf(await dataHealth())
  return { key: 'behavior', name: 'index=behavior', desc: 'رویدادهای رفتاری', lagMin: lagDays * 1440, status: lagDays <= 1 ? 'good' : lagDays <= 3 ? 'warn' : 'crit' }
}

/** Calls/deals live nowhere on the backend. */
export const interactionsOf = () => []
