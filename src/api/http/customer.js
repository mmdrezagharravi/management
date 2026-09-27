/* GET /management/customers/:id → the profile page and the quick-view drawer. */
import { get } from './client'
import { toAccount, notesOf, planKey, RECORD_LIMITS, CYCLE_MAP } from './account'
import { fa, money, ago, daysAgo } from 'src/lib/format'
import { HEALTH_COMPONENTS, sourceName } from 'src/lib/refs'
import { PLAN_NAME } from 'src/lib/ui'

const CYCLE_MONTHS = { monthly: 1, quarterly: 3, semiannual: 6, yearly: 12 }
// Invoice.status: Paid | Pending | Processing | Overdue | Failed — an abandoned checkout stays Pending
const INV_STATUS = { Paid: 'paid', Pending: 'pending', Processing: 'pending', Overdue: 'failed', Failed: 'failed' }
const peCls = (k) => (k === 'churn' ? 'crit' : k === 'contraction' ? 'warn' : 'good')
const PE_TITLE = { new: 'اولین پرداخت', expansion: 'ارتقا', contraction: 'کاهش پلن', churn: 'لغو اشتراک' }
const FEATURE_LABEL = { Record: 'رکورد', Cell: 'ویرایش سلول', View: 'نما و فیلتر', Automation: 'اتوماسیون', Collaborator: 'افزودن همکار', Page: 'درگاه و صفحه', Role: 'نقش و دسترسی', AI: 'هوش مصنوعی', ExportTemplate: 'خروجی تمپلیت' }
const ACTIONS = {
  activity: 'تماس بگیرید و دلیل کاهش استفاده را بپرسید — معمولاً تغییر آدم‌ها یا فرایند کار در سمت مشتری است.',
  trend: 'فعالیت دو هفتهٔ اخیر افت کرده؛ بپرسید چه چیزی در تیم یا کارشان تغییر کرده.',
  depth: 'فقط جدول‌ها را استفاده می‌کنند؛ یک جلسهٔ ۲۰ دقیقه‌ای برای اتوماسیون و فرم پیشنهاد دهید.',
  team: 'بیشتر اعضا وارد نمی‌شوند؛ با مدیر حساب برای فعال کردن تیم هماهنگ کنید.',
  commercial: 'مشکل پرداخت، تیکت باز یا برخورد مکرر با سقف دارد؛ اول همین را حل کنید.',
}

/** Detail → panel account. The detail's healthHistory is daily [{day,score}] up to yesterday; the account wants the
    list's shape: 7 weekly scores (7 weeks ago … last week) + the current score, like data.ts healthHistory. */
function accountOf(s) {
  const byAgo = new Map((s.healthHistory || []).map((h) => [daysAgo(h.day), h.score]))
  const weekly = [7, 6, 5, 4, 3, 2, 1].map((w) => byAgo.get(w * 7) ?? null).concat(s.health ?? null)
  const a = toAccount({ ...s, healthHistory: weekly, health2wAgo: s.health2wAgo ?? byAgo.get(14) ?? null })
  a.feat = Object.fromEntries(Object.entries(s.features || {}).filter(([, n]) => n > 0).map(([k]) => [k, true]))
  return a
}

/** Plan changes from paid plan invoices, oldest → newest; a lapsed subscription ends with a churn event. */
function planEventsOf(a, invoices) {
  const paid = invoices.filter((i) => i.status === 'paid' && i.type === 'PlanInvoice' && i.plan)
  const out = []
  paid.forEach((i, k) => {
    const prev = paid[k - 1]
    const kind = !prev ? 'new' : i.amount > prev.amount ? 'expansion' : i.amount < prev.amount ? 'contraction' : null
    if (kind) out.push({ t: i.t, kind, plan: i.plan, seats: i.seats, cycle: i.cycle, mrr: i.mrr })
  })
  if (a.churnedAt != null && paid.length) { const last = paid[paid.length - 1]; out.push({ t: a.churnedAt, kind: 'churn', plan: last.plan, seats: last.seats, cycle: last.cycle, mrr: last.mrr }) }
  return out
}

/** The customer's journey using only events with a real timestamp. */
function timeline(a, bases, invoices, planEvents) {
  const ev = []
  const add = (t, cls, title, desc) => ev.push({ t, cls, title, desc })
  add(a.age, 'mut', 'ثبت‌نام', 'از ' + sourceName(a.source) + ' · ' + a.contact.first)
  const firstBase = bases.slice().sort((p, q) => q.created - p.created)[0]
  if (firstBase) add(firstBase.created, '', 'اولین بیس', '«' + firstBase.name + '»')
  planEvents.forEach((e) => add(e.t, peCls(e.kind), PE_TITLE[e.kind], e.kind === 'churn' ? a.churnReason : 'پلن ' + PLAN_NAME[e.plan] + ' · ' + money(e.mrr) + ' در ماه'))
  const lastFailed = invoices.slice().reverse().find((invoice) => invoice.status === 'failed')
  if (a.pastDue && lastFailed) add(lastFailed.t, 'crit', 'پرداخت تمدید ناموفق', 'فاکتور پرداخت نشد')
  if (a.lastSeenDays < 9999) add(a.lastSeenDays, 'good', 'آخرین فعالیت', ago(a.lastSeenMin))
  return ev.sort((p, q) => q.t - p.t)
}

/** Full profile page. Unknown id → the server's 404 error (the page shows it). */
export async function customer(id) {
  const s = await get('/customers/' + id)
  const a = accountOf(s)
  const invoices = (s.invoices || []).slice().reverse().map((inv, i) => {
    const cycle = inv.plan ? CYCLE_MAP[inv.cycle || 'monthly'] : null // PlanInvoiceService defaults to monthly
    return { id: i, t: daysAgo(inv.paidAt || inv.createdAt), type: inv.type, status: INV_STATUS[inv.status] || 'failed', amount: inv.amount, plan: inv.plan ? planKey(inv.plan) : null, cycle, seats: inv.seats ?? a.seats, mrr: Math.round(inv.amount / (CYCLE_MONTHS[cycle] || 1)), retries: 0 }
  })
  const paid = invoices.filter((i) => i.status === 'paid')
  const bases = (s.basesList || []).map((b) => ({ id: b.id, name: b.name, slug: b.id.slice(-8), tables: b.tables, records: b.records, automations: b.automations, pages: 0, shares: 0, collaborators: b.collaborators, lastActive: b.lastSeenDays ?? 9999, created: daysAgo(b.createdAt) ?? a.age }))
  const planEvents = planEventsOf(a, invoices)
  const weakest = HEALTH_COMPONENTS.slice().sort((p, q) => a.components[p.key] - a.components[q.key])[0].key
  const featureKeys = Object.keys(FEATURE_LABEL)
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
    members: [{ id: a.id, name: s.name, mobile: s.mobile, lastSeenDays: s.lastSeenDays, lastSeenMin: s.lastSeenMin, online: s.online }].concat(s.members || []).map((m) => ({ id: m.id, name: m.name || (m.mobile ? 'کاربر ' + m.mobile.slice(-4) : m.id.slice(-6)), mobile: m.mobile, role: m.id === a.id ? 'مالک' : 'عضو', joined: null, lastSeen: m.lastSeenDays ?? 9999, lastSeenDays: m.lastSeenDays ?? 9999, lastSeenMin: m.lastSeenMin ?? (m.lastSeenDays == null ? 9999 * 1440 : m.lastSeenDays * 1440), online: m.online === true })),
    bases,
    invoices,
    planEvents: planEvents.map((e) => ({ ...e, title: { new: 'اولین خرید', expansion: 'افزایش', contraction: 'کاهش', churn: 'لغو اشتراک' }[e.kind], cls: peCls(e.kind) })),
    timeline: timeline(a, bases, invoices, planEvents),
    interactions: [],
    notes: notesOf(a.id),
    limits: { records: RECORD_LIMITS[s.plan] || RECORD_LIMITS.basic, seats: a.collaboratorLimit, runs: a.runsLimit },
    featureList: featureKeys.map((k) => ({ key: k, label: FEATURE_LABEL[k] || k })),
    profile: s.profile || null,
  }
}

/** Quick-view drawer. Unknown id → null, like the mock. Tasks/calls have no backend → empty. */
export async function quickView(id) {
  const s = await get('/customers/' + id).catch(() => null)
  if (!s) return null
  return { account: accountOf(s), tasks: [], notes: notesOf(String(id)).slice(0, 3), interactions: [], profile: s.profile || null }
}
