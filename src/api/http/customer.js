/* GET /management/customers/:id → the profile page and the quick-view drawer. */
import { get } from './client'
import { toAccount, notesOf, planKey, RECORD_LIMITS, CYCLE_MAP } from './account'
import { fa, money, ago, daysAgo, date, dateTime } from 'src/lib/format'
import { HEALTH_COMPONENTS } from 'src/lib/refs'
import { PLAN_NAME } from 'src/lib/ui'

// Invoice.status: Paid | Pending | Processing | Overdue | Failed — an abandoned checkout stays Pending
const INV_STATUS = { Paid: 'paid', Pending: 'pending', Processing: 'pending', Overdue: 'failed', Failed: 'failed' }
const peCls = (k) => (k === 'churn' ? 'crit' : k === 'contraction' ? 'warn' : 'good')
const PE_TITLE = { new: 'اولین پرداخت', expansion: 'ارتقا', contraction: 'کاهش پلن', churn: 'لغو اشتراک' }
const FEATURE_LABEL = { Record: 'رکورد', Cell: 'ویرایش سلول', View: 'نما و فیلتر', Automation: 'خودکارسازی', Collaborator: 'افزودن همکار', Page: 'درگاه و صفحه', Role: 'نقش و دسترسی', AI: 'هوش مصنوعی', ExportTemplate: 'خروجی تمپلیت' }
const ACTIONS = {
  activity: 'تماس بگیرید و دلیل کاهش استفاده را بپرسید — معمولاً تغییر آدم‌ها یا فرایند کار در سمت مشتری است.',
  trend: 'فعالیت دو هفتهٔ اخیر افت کرده؛ بپرسید چه چیزی در تیم یا کارشان تغییر کرده.',
  depth: 'فقط جدول‌ها را استفاده می‌کنند؛ یک جلسهٔ ۲۰ دقیقه‌ای برای خودکارسازی و فرم پیشنهاد دهید.',
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
    if (kind) out.push({ t: i.t, at: i.at, kind, plan: i.plan, seats: i.seats, cycle: i.cycle, mrr: i.mrr })
  })
  if (a.churnedAt != null && paid.length) { const last = paid[paid.length - 1]; out.push({ t: a.churnedAt, kind: 'churn', plan: last.plan, seats: last.seats, cycle: last.cycle, mrr: last.mrr }) }
  return out
}

/** The payment steps of the journey; every other step comes from GET /customers/:id/journey (customerJourney). */
function timeline(a, invoices, planEvents) {
  const ev = planEvents.map((e) => ({ t: e.t, at: e.at, cls: peCls(e.kind), title: PE_TITLE[e.kind], desc: e.kind === 'churn' ? a.churnReason : 'پلن ' + PLAN_NAME[e.plan] + ' · ' + money(e.mrr) + ' در ماه' }))
  const lastFailed = invoices.slice().reverse().find((invoice) => invoice.status === 'failed')
  if (a.pastDue && lastFailed) ev.push({ t: lastFailed.t, at: lastFailed.at, cls: 'crit', title: 'پرداخت تمدید ناموفق', desc: 'فاکتور پرداخت نشد' })
  return ev
}

/** Full profile page. Unknown id → the server's 404 error (the page shows it). */
export async function customer(id) {
  const s = await get('/customers/' + id)
  const a = accountOf(s)
  const invoices = (s.invoices || []).slice().reverse().map((inv, i) => {
    const cycle = inv.plan ? CYCLE_MAP[inv.cycle || 'monthly'] : null // PlanInvoiceService defaults to monthly
    return { id: i, t: daysAgo(inv.paidAt || inv.createdAt), at: inv.paidAt || inv.createdAt, type: inv.type, status: INV_STATUS[inv.status] || 'failed', amount: inv.amount, plan: inv.plan ? planKey(inv.plan) : null, cycle, seats: inv.seats ?? a.seats, mrr: inv.mrr ?? 0, retries: 0 }
  })
  const paid = invoices.filter((i) => i.status === 'paid')
  const bases = (s.basesList || []).map((b) => ({ id: b.id, name: b.name, slug: b.id.slice(-8), tables: b.tables, records: b.records, automations: b.automations, portals: b.portals ?? 0, collaborators: b.collaborators, lastActive: b.lastSeenDays ?? 9999, created: daysAgo(b.createdAt) ?? a.age, role: b.role || 'creator', creatorId: b.creator ? b.creator.id : null, creatorName: b.creator ? b.creator.name || fa(b.creator.mobile || '') : null }))
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
    timeline: timeline(a, invoices, planEvents),
    interactions: [],
    notes: notesOf(a.id),
    limits: { records: RECORD_LIMITS[s.plan] || RECORD_LIMITS.basic, seats: a.collaboratorLimit, runs: a.runsLimit },
    featureList: featureKeys.map((k) => ({ key: k, label: FEATURE_LABEL[k] || k })),
    profile: s.profile || null,
  }
}

const VIEW_TYPE = { Grid: 'جدولی', Gallery: 'گالری', Kanban: 'کانبان', Map: 'نقشه', Form: 'فرم', Calendar: 'تقویم', Gantt: 'گانت', Timeline: 'خط زمانی' }
const ACTION_LABEL = { Record: 'کار با رکورد', Cell: 'ویرایش سلول', View: 'کار با نما', Table: 'کار با جدول', Field: 'کار با فیلد', Automation: 'کار با خودکارسازی', Page: 'کار با صفحه', Collaborator: 'کار با همکاران', Role: 'کار با نقش‌ها', File: 'کار با فایل', ExportTemplate: 'خروجی', Export: 'خروجی', AI: 'هوش مصنوعی', Chat: 'گفتگو', Base: 'کار با بیس' }
const topActions = (byType) => Object.entries(byType || {}).filter(([k, v]) => ACTION_LABEL[k] && v > 0).sort((p, q) => q[1] - p[1]).slice(0, 3).map(([k, v]) => fa(v) + ' ' + ACTION_LABEL[k]).join('، ')
const named = (d) => d.name || (d.mobile ? fa(d.mobile) : 'یک کاربر')
const JOURNEY_STEP = {
  signup: (d) => (d.invitedBy
    ? { cls: 'mut', title: 'ساخت حساب با دعوت همکار', desc: named(d.invitedBy) + ' او را به بیس خودش اضافه کرد و حساب همان لحظه ساخته شد؛ خودش ثبت‌نام نکرده' }
    : { cls: 'mut', title: 'ثبت‌نام', desc: d.referrer ? 'با دعوت ' + named(d.referrer) : 'ثبت‌نام مستقیم' }),
  base: (d) => ({ title: 'اولین بیس', desc: '«' + d.name + '» · ' + (d.afterDays ? fa(d.afterDays) + ' روز بعد از ثبت‌نام' : 'همان روز ثبت‌نام') }),
  table: (d) => ({ title: 'اولین جدول', desc: '«' + d.name + '»' + (d.base ? ' در بیس «' + d.base + '»' : '') }),
  excelImport: () => ({ title: 'اولین ورود داده از Excel', desc: 'یک جدول را از فایل Excel ساخت' }),
  record: () => ({ title: 'اولین رکورد', desc: 'اولین رکوردی که خودش ساخت' }),
  activated: (d) => ({ cls: 'good', title: 'فعال‌سازی', desc: 'در ' + fa(d.dayIndex + 1) + ' روز اول به ' + fa(d.records) + ' ساخت یا ویرایش رکورد رسید' }),
  view: (d) => ({ title: 'اولین نمای جدید', desc: '«' + d.name + '»' + (d.type ? ' · ' + (VIEW_TYPE[d.type] || d.type) : '') }),
  viewUse: () => ({ title: 'اولین تنظیم نما', desc: 'فیلتر، مرتب‌سازی یا ستون‌های یک نما را تغییر داد' }),
  automation: (d) => ({ title: 'اولین خودکارسازی', desc: '«' + d.name + '»' }),
  automationRun: (d) => ({ cls: d.success ? '' : 'warn', title: 'اولین اجرای خودکارسازی', desc: d.success ? 'موفق' : 'ناموفق' }),
  collaborator: (d) => ({ title: 'اولین همکار', desc: named(d) + (d.base ? ' به بیس «' + d.base + '»' : '') + ' اضافه شد' }),
  habit: (d) => ({ cls: 'good', title: 'عادت', desc: 'در ' + fa(d.weeks) + ' هفته از ' + fa(d.of) + ' هفتهٔ اول فعال بود' }),
  page: () => ({ title: 'اولین صفحه', desc: 'یک صفحه (درگاه) ساخت' }),
  pagePublish: () => ({ title: 'اولین انتشار صفحه', desc: 'یک صفحه را عمومی کرد' }),
  role: () => ({ title: 'اولین نقش دسترسی', desc: 'برای همکاران نقش تعریف کرد' }),
  export: () => ({ title: 'اولین خروجی', desc: 'خروجی Excel یا Word گرفت' }),
  ai: () => ({ title: 'اولین استفاده از هوش مصنوعی', desc: 'سرویس هوش مصنوعی را به یک بیس اضافه کرد' }),
  wallet: () => ({ title: 'اولین شارژ کیف پول', desc: '' }),
  lastSeen: (d, at) => {
    const top = topActions(d.byType)
    return { cls: d.online ? 'good' : 'mut', title: 'آخرین فعالیت', desc: (d.online ? 'هم‌اکنون آنلاین است' : ago((Date.now() - Date.parse(at)) / 60000)) + (top && d.day ? ' · کارهای روز ' + date(daysAgo(d.day)) + ': ' + top : '') }
  },
}
const NOT_YET = { base: 'ساخت بیس', table: 'ساخت جدول', record: 'ساخت رکورد', view: 'نمای جدید', viewUse: 'تنظیم نما', automation: 'خودکارسازی', collaborator: 'دعوت همکار', activated: 'فعال‌سازی', habit: 'عادت' }
const BEHAVIOR_KEYS = ['record', 'viewUse', 'activated', 'habit']

/** GET /customers/:id/journey → the journey card's steps, oldest first, plus what the customer has not done yet. */
export async function customerJourney(id) {
  const r = await get('/customers/' + id + '/journey')
  const steps = r.steps.filter((s) => JOURNEY_STEP[s.key]).map((s) => ({
    ...JOURNEY_STEP[s.key](s.detail || {}, s.at),
    key: s.key, at: s.at, earliestSeen: !!s.earliestSeen,
    when: s.precision === 'day' ? date(daysAgo(s.at), { year: true }) : dateTime(s.at),
  }))
  const done = new Set(steps.map((s) => s.key))
  const notYet = Object.keys(NOT_YET).filter((k) => !done.has(k) && (r.fullyObserved || !BEHAVIOR_KEYS.includes(k))).map((k) => NOT_YET[k])
  return { steps, notYet, observedSince: r.observedSince, fullyObserved: r.fullyObserved, behaviorAvailable: r.behaviorAvailable }
}

/** Quick-view drawer. Unknown id → null, like the mock. Tasks/calls have no backend → empty. */
export async function quickView(id) {
  const s = await get('/customers/' + id).catch(() => null)
  if (!s) return null
  return { account: accountOf(s), tasks: [], notes: notesOf(String(id)).slice(0, 3), interactions: [], profile: s.profile || null }
}
