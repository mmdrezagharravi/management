/* GET /management/customers/:id → the profile page and the quick-view drawer. */
import { get } from './client'
import { toAccount, notesOf, planKey, RECORD_LIMITS } from './account'
import { fa, money, ago } from 'src/lib/format'
import { HEALTH_COMPONENTS, sourceName } from 'src/lib/refs'
import { PLAN_NAME } from 'src/lib/ui'

const daysAgo = (x) => (x ? Math.round((Date.now() - new Date(x)) / 864e5) : null)
const CYCLE_MONTHS = { '1m': 1, '3m': 3, '12m': 12, monthly: 1, quarterly: 3, yearly: 12 }
const peCls = (k) => (k === 'churn' ? 'crit' : k === 'contraction' ? 'warn' : 'good')
const PE_TITLE = { new: 'اولین پرداخت', expansion: 'ارتقا', contraction: 'کاهش پلن', churn: 'لغو اشتراک' }
const FEATURE_LABEL = { Record: 'رکورد', Cell: 'ویرایش سلول', View: 'نما و فیلتر', Automation: 'اتوماسیون', Page: 'درگاه و صفحه', Side: 'پنل کناری', Role: 'نقش و دسترسی', Webhook: 'وب‌هوک', AI: 'هوش مصنوعی', ExportTemplate: 'خروجی تمپلیت', ExpandTemplate: 'نصب تمپلیت' }
const ACTIONS = {
  activity: 'تماس بگیرید و دلیل کاهش استفاده را بپرسید — معمولاً تغییر فرد مسئول یا فرایند است.',
  trend: 'فعالیت دو هفتهٔ اخیر افت کرده؛ بپرسید چه چیزی در تیم یا کارشان تغییر کرده.',
  depth: 'فقط جدول‌ها را استفاده می‌کنند؛ یک جلسهٔ ۲۰ دقیقه‌ای برای اتوماسیون و فرم پیشنهاد دهید.',
  team: 'بیشتر اعضا وارد نمی‌شوند؛ با مدیر حساب برای فعال کردن تیم هماهنگ کنید.',
  commercial: 'مشکل پرداخت، تیکت باز یا برخورد مکرر با سقف دارد؛ اول همین را حل کنید.',
}

/** Detail → panel account. The detail's healthHistory is [{day,score}]; the account wants scores (and health2wAgo). */
function accountOf(s) {
  const hist = s.healthHistory || []
  const near14 = hist.find((h) => { const d = daysAgo(h.day); return d >= 12 && d <= 16 })
  const a = toAccount({ ...s, healthHistory: hist.map((h) => h.score), health2wAgo: s.health2wAgo ?? (near14 ? near14.score : null) })
  a.feat = Object.fromEntries(Object.entries(s.features || {}).filter(([, n]) => n > 0).map(([k, n]) => [k, { count: n, last: null }]))
  return a
}

/** Plan changes from paid plan invoices, oldest → newest; a lapsed subscription ends with a churn event. */
function planEventsOf(a, invoices) {
  const paid = invoices.filter((i) => i.status === 'paid' && i.type === 'PlanInvoice')
  const out = []
  paid.forEach((i, k) => {
    const prev = paid[k - 1]
    const kind = !prev ? 'new' : i.amount > prev.amount ? 'expansion' : i.amount < prev.amount ? 'contraction' : null
    if (kind) out.push({ t: i.t, kind, plan: i.plan, seats: i.seats, cycle: i.cycle, mrr: i.mrr })
  })
  if (a.churnedAt != null && paid.length) { const last = paid[paid.length - 1]; out.push({ t: a.churnedAt, kind: 'churn', plan: last.plan, seats: last.seats, cycle: last.cycle, mrr: last.mrr }) }
  return out
}

/** The customer's journey, newest first (same rules as the mock, minus what the backend lacks). */
function timeline(a, bases, invoices, planEvents) {
  const m = a.milestones, ev = []
  const at = (d) => a.age - d
  const add = (t, cls, title, desc) => ev.push({ t, cls, title, desc })
  add(a.age, 'mut', 'ثبت‌نام', 'از ' + sourceName(a.source) + ' · ' + a.contact.first)
  if (m.firstBase !== undefined) add(at(m.firstBase), '', 'اولین بیس', '«' + (bases[0] ? bases[0].name : '') + '» ' + (m.firstBase === 0 ? 'همان روز' : fa(m.firstBase) + ' روز بعد از ثبت‌نام'))
  else add(Math.max(0, a.age - 2), 'warn', 'هنوز بیسی نساخته', 'این حساب از مرحلهٔ اول جلوتر نرفته است')
  if (m.activated !== undefined) add(at(m.activated), 'good', 'فعال‌سازی', 'در هفتهٔ اول رکورد ثبت کرد')
  if (m.team !== undefined) add(at(m.team), '', 'اولین همکار', fa(a.memberCount - 1) + ' عضو دیگر')
  if (m.habit !== undefined) add(at(m.habit), 'good', 'عادت', 'در ۳ هفته از ۴ هفتهٔ اول فعال بود')
  planEvents.forEach((e) => add(e.t, peCls(e.kind), PE_TITLE[e.kind], e.kind === 'churn' ? a.churnReason : 'پلن ' + PLAN_NAME[e.plan] + ' · ' + money(e.mrr) + ' در ماه'))
  const last = invoices[invoices.length - 1]
  if (a.pastDue && last) add(last.t, 'crit', 'پرداخت تمدید ناموفق', 'آخرین فاکتور پرداخت نشد')
  add(0, 'mut', 'امروز', 'آخرین فعالیت ' + ago(a.lastSeenMin))
  return ev.sort((p, q) => q.t - p.t)
}

/** Full profile page. Unknown id → the server's 404 error (the page shows it). */
export async function customer(id) {
  const s = await get('/customers/' + id)
  const a = accountOf(s)
  const invoices = (s.invoices || []).slice().reverse().map((inv, i) => {
    const months = CYCLE_MONTHS[inv.cycle] || 1
    return { id: i, t: daysAgo(inv.paidAt || inv.createdAt), type: inv.type, status: inv.status === 'Paid' ? 'paid' : 'failed', amount: inv.amount, plan: planKey(inv.plan), cycle: a.cycle, seats: inv.seats ?? a.seats, mrr: Math.round(inv.amount / months), retries: 0 }
  })
  const paid = invoices.filter((i) => i.status === 'paid')
  const bases = (s.basesList || []).map((b) => ({ id: b.id, name: b.name, slug: b.id.slice(-8), tables: b.tables, records: b.records, automations: b.automations, pages: 0, shares: 0, collaborators: b.collaborators, lastActive: b.lastSeenDays ?? 9999, created: daysAgo(b.createdAt) ?? a.age }))
  const planEvents = planEventsOf(a, invoices)
  const weakest = HEALTH_COMPONENTS.slice().sort((p, q) => a.components[p.key] - a.components[q.key])[0].key
  const featureKeys = [...new Set(Object.keys(FEATURE_LABEL).concat(Object.keys(a.feat)))]
  return {
    fallback: false,
    account: a,
    ev120: (s.activity || []).map((d) => d.events), // 90 days: the page sizes its charts by length
    au120: [],
    paidTotal: paid.reduce((t, i) => t + i.amount, 0), paidCount: paid.length,
    lastInvoiceRetries: 0,
    weakest, nextStep: ACTIONS[weakest],
    log: notesOf(a.id).map((x) => ({ local: true, who: x.who, what: x.text, kind: x.kind === 'call' ? 'تماس' : 'یادداشت' })),
    activeMembersToday: null,
    invitesAccepted: Math.max(0, a.memberCount - 1),
    cycleDiscount: 0,
    members: (s.members || []).map((m) => ({ id: m.id, name: m.name || (m.mobile ? 'کاربر ' + m.mobile.slice(-4) : m.id.slice(-6)), mobile: m.mobile, role: m.id === a.id ? 'مالک' : 'عضو', joined: null, lastSeen: m.lastSeenDays ?? 9999 })),
    bases,
    invoices,
    planEvents: planEvents.map((e) => ({ ...e, title: { new: 'اولین خرید', expansion: 'افزایش', contraction: 'کاهش', churn: 'لغو اشتراک' }[e.kind], cls: peCls(e.kind) })),
    timeline: timeline(a, bases, invoices, planEvents),
    interactions: [],
    notes: notesOf(a.id),
    limits: { records: RECORD_LIMITS[s.plan] || RECORD_LIMITS.basic, seats: a.seats, runs: a.runsLimit },
    featureList: featureKeys.map((k) => ({ key: k, label: FEATURE_LABEL[k] || k })),
  }
}

/** Quick-view drawer. Unknown id → null, like the mock. Tasks/calls have no backend → empty. */
export async function quickView(id) {
  const s = await get('/customers/' + id).catch(() => null)
  if (!s) return null
  return { account: accountOf(s), tasks: [], notes: notesOf(String(id)).slice(0, 3), interactions: [] }
}
