/* Customer profile + quick view. */
import { DB } from 'src/mock/engine'
import { fa, money, ago } from 'src/lib/format'
import { C, ok, enrich, taskState, notesOf, interactionsOf, accountById } from './shared'

/** Everything the quick-view drawer shows for one account. */
export function quickView(id) {
  const a = accountById(id)
  if (!a) return ok(null)
  const tasks = C.reps.flatMap((r) => DB.tasksFor(r.id)).filter((t) => t.accountId === a.id && !(taskState(t.id) || {}).status)
  return ok({
    account: enrich(a),
    tasks: tasks.map((t) => ({ id: t.id, type: t.type, due: t.due, why: t.why })),
    notes: notesOf(a.id).slice(0, 3),
    interactions: interactionsOf(a.id).slice(0, 4),
    profile: profileOf(a),
  })
}

/** Contact and account block (GET /management/customers/:id → profile). */
function profileOf(a) {
  const c = a.contact
  return {
    name: c.first + ' ' + c.last, mobile: c.mobile, email: c.email, username: null,
    signedUpAt: new Date(Date.now() - a.age * 864e5).toISOString(), planFrom: null,
    planUntil: a.paying ? new Date(Date.now() + a.renewIn * 864e5).toISOString() : null,
    blocked: false, baleConnected: false, referralCode: null, referredBy: null, referrals: 0,
    credits: { aiTokens: 0, sms: 0, email: 0 }, wallet: null,
    company: a.plan === 'enterprise' ? { name: a.name, nationalId: null, registrationNumber: null, phone: null, address: a.city || null } : null,
    sessions: [], sessionCount: 0,
  }
}

const PE_TITLE = { new: 'اولین پرداخت', expansion: 'ارتقا', contraction: 'کاهش پلن', churn: 'لغو اشتراک' }
const peCls = (k) => (k === 'churn' ? 'crit' : k === 'contraction' ? 'warn' : 'good')

/** The customer's journey from first visit to today, newest first. t = days ago. */
function timeline(a) {
  const m = a.milestones, ev = []
  const at = (d) => a.age - d // milestone offset → days ago
  const add = (t, cls, title, desc) => ev.push({ t, cls, title, desc })
  add(a.age, 'mut', 'اولین بازدید و ثبت‌نام', 'از ' + DB.source(a.source).name + ' · ' + a.contact.first + ' ' + a.contact.last)
  if (m.firstBase !== undefined) add(at(m.firstBase), '', 'اولین بیس', '«' + (a.bases[0] ? a.bases[0].name : '') + '» ' + (m.firstBase === 0 ? 'همان روز' : fa(m.firstBase) + ' روز بعد از ثبت‌نام'))
  else add(Math.max(0, a.age - 2), 'warn', 'هنوز بیسی نساخته', 'این حساب از مرحلهٔ اول جلوتر نرفته است')
  if (m.activated !== undefined) add(at(m.activated), 'good', 'فعال‌سازی', 'به ' + fa(C.activation.records) + ' رکورد رسید · روز ' + fa(m.activated))
  if (m.team !== undefined) add(at(m.team), '', 'اولین همکار', fa(a.invitesAccepted) + ' دعوت پذیرفته از ' + fa(a.invitesSent))
  if (m.habit !== undefined) add(at(m.habit), 'good', 'عادت', 'در ۳ هفته از ۴ هفتهٔ اول فعال بود')
  if (a.feat.automation) add(a.feat.automation.first, '', 'اولین خودکارسازی', fa(a.automations) + ' خودکارسازی فعال')
  if (m.pricing !== undefined && m.paid === undefined) add(at(m.pricing), '', 'بازدید صفحهٔ قیمت', 'هنوز خرید نکرده')
  a.planEvents.forEach((e) => add(e.t, peCls(e.kind), PE_TITLE[e.kind], e.kind === 'churn' ? a.churnReason : 'پلن ' + C.plans[e.plan].name + ' · ' + money(e.mrr) + ' در ماه'))
  if (a.decline) add(a.decline.start, 'warn', 'شروع افت فعالیت', 'فعالیت از این هفته پیوسته کم شده است')
  if (a.pastDue) add(a.invoices[a.invoices.length - 1].t, 'crit', 'پرداخت تمدید ناموفق', fa(a.invoices[a.invoices.length - 1].retries) + ' تلاش ناموفق')
  add(0, a.online ? 'good' : 'mut', 'امروز', a.online ? 'هم‌اکنون آنلاین است' : 'آخرین فعالیت ' + ago(a.lastSeenMin))
  return ev.sort((p, q) => q.t - p.t)
}

const KIND = { call: 'تماس', email: 'ایمیل', meeting: 'جلسه', deal: 'قرارداد' }

/** Full profile page. Unknown id → the paying customer with the most revenue at risk (fallback: true). */
export function customer(id) {
  let a = accountById(id)
  let fallback = false
  if (!a) { a = DB.accounts.filter((x) => x.paying && x.health < 50).sort((p, q) => q.mrr - p.mrr)[0]; fallback = true }
  const ev120 = [], au120 = []
  for (let d = 119; d >= 0; d--) { ev120.push(a.ev[d]); au120.push(a.au[d]) }
  const paid = a.invoices.filter((i) => i.status === 'paid')
  const paidTotal = paid.reduce((s, i) => s + i.amount, 0)
  const last = a.invoices[a.invoices.length - 1]
  const interactions = interactionsOf(a.id)
  // interaction log: browser notes first, then calls/deals oldest → newest (same day: latest first)
  const log = notesOf(a.id).map((x) => ({ local: true, who: x.who, what: x.text, kind: x.kind === 'call' ? 'تماس' : 'یادداشت' }))
    .concat(interactions.slice().sort((p, q) => p.t - q.t || q.min - p.min).map((x) => ({ local: false, t: x.t, min: x.min, who: DB.rep(x.rep).name, what: x.label + (x.mrr ? ' · ' + money(x.mrr) : '') + (x.reason ? ' · ' + x.reason : ''), kind: KIND[x.type] })))
  return ok({
    fallback,
    account: enrich(a),
    ev120, au120,
    paidTotal, paidCount: paid.length,
    lastInvoiceRetries: last ? last.retries : 0,
    log,
    activeMembersToday: a.au[0],
    invitesAccepted: a.invitesAccepted,
    cycleDiscount: C.cycles[a.cycle].discount,
    members: a.members.map((m, i) => ({ id: i, ...m })),
    bases: a.bases.map((b) => ({ id: b.id, name: b.name, slug: b.slug, tables: b.tables, records: b.records, automations: b.automations, portals: b.pages, collaborators: b.collaborators, lastActive: b.lastActive, created: b.created })),
    invoices: a.invoices.map((inv, i) => ({ id: i, ...inv })),
    planEvents: a.planEvents.map((e) => ({ ...e, title: { new: 'اولین خرید', expansion: 'افزایش', contraction: 'کاهش', churn: 'لغو اشتراک' }[e.kind], cls: peCls(e.kind) })),
    timeline: timeline(a),
    interactions,
    notes: notesOf(a.id),
    limits: C.plans[a.plan].limits,
    featureList: C.features,
    profile: profileOf(a),
  })
}

/* GET /management/customers/:id/journey — the mock's whole journey already comes with customer(id).timeline */
export function customerJourney() {
  return ok({ steps: [], notYet: [], observedSince: null, fullyObserved: true, behaviorAvailable: true })
}
