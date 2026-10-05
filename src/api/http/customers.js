/* GET /management/customers as the list page's rows, plus the shared helpers mock/shared.js exported
   (search, alerts, navBadges, freshness, interactionsOf) that the layout and components call. */
import { get, memo } from './client'
import { customersAll, toAccount } from './account'
import { fa, norm } from 'src/lib/format'
import { cronsNeedingAttention } from './jobs'


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
const failedCrons = cronsNeedingAttention
// minutes since the live sync last wrote; null = unknown (data-health failed or never synced), never "fresh"
const lagOf = (h) => (h && h.lagMinutes != null ? h.lagMinutes : null)
export const LAG = { warn: 60, crit: 6 * 60 }
const lagStatus = (m) => (m == null ? 'unknown' : m < LAG.warn ? 'good' : m < LAG.crit ? 'warn' : 'crit')
const lagWords = (m) => (m < 60 ? fa(m) + ' دقیقه' : m < 2880 ? fa(Math.round(m / 60)) + ' ساعت' : fa(Math.round(m / 1440)) + ' روز')
const PAID_PLANS = ['team', 'business', 'enterprise', 'partner']

/* ----------------------------------------------------------------- alerts */
export async function alerts() {
  const [rows, j, h] = await Promise.all([customersAll(), jobs(), dataHealth()])
  const out = []
  failedCrons(j).forEach((c) => out.push({ lvl: 'crit', t: 'کران «' + c.name + '» ' + (c.stale ? 'متوقف شده' : 'اجرا نشد'), d: (c.lastT != null ? fa(c.lastT) + ' روز پیش' : '') + (c.consecutiveFails > 1 ? ' · ' + fa(c.consecutiveFails) + ' بار پشت سر هم' : '') + (c.error ? ' · ' + c.error : ''), to: '/jobs' }))
  const lag = lagOf(h), ls = lagStatus(lag)
  if (ls === 'crit') out.push({ lvl: 'crit', t: 'تأخیر در رویدادهای رفتاری', d: 'آخرین همگام‌سازی ' + lagWords(lag) + ' پیش', to: '/data-health' })
  else if (ls === 'unknown') out.push({ lvl: 'warn', t: 'وضعیت همگام‌سازی رویدادها معلوم نیست', d: 'گزارش سلامت داده نرسید', to: '/data-health' })
  const pd = rows.filter((a) => a.pastDue)
  if (pd.length) out.push({ lvl: 'warn', t: fa(pd.length) + ' پرداخت تمدید ناموفق', d: 'درآمد ماهانه در دورهٔ مهلت', mrr: pd.reduce((t, a) => t + a.mrr, 0), to: '/sales?tab=pastdue' })
  const crit = rows.filter((a) => a.paying && a.mrr > 0 && a.health < 30 && PAID_PLANS.includes(a.plan))
  if (crit.length) out.push({ lvl: 'crit', t: fa(crit.length) + ' مشتری پولی بحرانی شده', d: 'مجموع درآمد ماهانه', mrr: crit.reduce((t, a) => t + a.mrr, 0), to: '/health' })
  return out
}

/* ------------------------------------------------------------- nav badges */
export async function navBadges() {
  const [rows, j, h] = await Promise.all([customersAll(), jobs(), dataHealth()])
  return {
    today: null,
    health: { n: rows.filter((a) => a.paying && a.health < 30).length, warn: true },
    jobs: { n: failedCrons(j).length, warn: true },
    'data-health': { n: ['crit', 'unknown'].includes(lagStatus(lagOf(h))) ? 1 : 0, warn: true },
  }
}

/* -------------------------------------------------------------- freshness */
/** The only ingestion source is the behaviour index, synced every minute; its lag is minutes since the last sync. */
export async function freshness() {
  const lagMin = lagOf(await dataHealth())
  return { key: 'behavior', name: 'index=behavior', desc: 'رویدادهای رفتاری', lagMin, status: lagStatus(lagMin) }
}

/** Calls/deals live nowhere on the backend. */
export const interactionsOf = () => []

/** One page of the customer list: the server applies view, filters, search and sort (GET /management/customers). */
export async function customersPage(params) {
  const r = await get('/customers', params)
  return { rows: r.items.map(toAccount), total: r.total, counts: r.counts || {}, totals: r.totals || r.counts || {} }
}
