/* Shared mock pieces: the world, local edits, search, alerts, mutations.
   `enrich(a)` turns a raw engine account into the plain "account summary" every
   list on every page shows; keep it the single definition of that shape. */
import { DB } from 'src/mock/engine'
import { setNow, fa, norm } from 'src/lib/format'
import { useLocalStore } from 'stores/local'
import { useSessionStore } from 'stores/session'

setNow(DB.CONFIG.now)
export const C = DB.CONFIG
export const NOW_MINUTES = C.nowMinutes

/* tiny async wrapper: the real API is async, so the mock is too */
export const ok = (v) => Promise.resolve(v)

export const local = () => useLocalStore()
export const session = () => useSessionStore()

export const rep = (id) => DB.rep(id)
export const whoName = () => 'مدیر فروش'
export const taskState = (id) => local().tasks[id] || null
export const notesOf = (id) => local().notes[id] || []

/** Reference lists the UI needs for labels and filters. */
export function config() {
  return ok({
    now: C.now, nowMinutes: C.nowMinutes, currency: C.currency,
    plans: C.plans, planOrder: C.planOrder, cycles: C.cycles, reps: C.reps, sources: C.sources,
    health: C.health, segments: C.segments, features: C.features, activation: C.activation, habit: C.habit,
    activeWindow: C.activeWindow, dormantDays: C.dormantDays, taskTypes: DB.TASK_TYPES, outcomeLabel: DB.OUTCOME_LABEL,
  })
}
export const CONFIG = config

/** Plain summary of an account for lists, drawers and tables. */
export function enrich(a) {
  const last30 = []; for (let d = 29; d >= 0; d--) last30.push(a.ev[d])
  return {
    id: a.id, name: a.name, slug: a.slug, industry: a.industry, industryName: a.industryName, city: a.city, source: a.source,
    age: a.age, contact: a.contact, plan: a.plan, cycle: a.cycle, seats: a.seats, mrr: a.mrr, paying: a.paying, everPaid: a.everPaid,
    health: a.health, band: a.band.key, components: a.components, health2wAgo: a.health2wAgo, healthHistory: a.healthHistory,
    lastSeenDays: a.lastSeenDays, lastSeenMin: a.lastSeenMin, online: a.online,
    memberCount: a.memberCount, collaborators: a.memberCount, collaboratorLimit: (a.usage.find((u) => u.key === 'seats') || {}).limit ?? null, activeMembers7: a.activeMembers7, activeDays28: a.activeDays28, activeDays7: a.activeDays7,
    events30: a.events30, records30: a.records30, records: a.records, trendPct: a.trendPct,
    renewIn: a.renewIn, churnedAt: a.churnedAt, churnReason: a.churnReason, pastDue: !!a.pastDue, tenureDays: a.tenureDays,
    limitHits30: a.limitHits30, pricingVisits30: a.pricingVisits30, tickets: a.tickets, nps: a.nps,
    atLimit: a.maxUsage.ratio >= 1, nearLimit: a.maxUsage.ratio >= 0.8,
    segments: a.segments, maxUsage: a.maxUsage, usage: a.usage, bases: a.bases.length, automations: a.automations,
    upgradeValue: DB.upgradeValue(a), last30, milestones: a.milestones, feat: a.feat,
    invitesSent: a.invitesSent, wk: Array.from(a.wk), decline: a.decline || null,
  }
}
export const accountById = (id) => DB.byId.get(+id)

/* ---------------------------------------------------------------- alerts */
export function alerts() {
  const out = []
  DB.ops.crons.filter((c) => c.status === 'fail').forEach((c) => out.push({ lvl: 'crit', t: 'کران «' + c.name + '» اجرا نشد', d: (c.lastT === 0 ? 'امروز' : 'دیروز') + ' ' + c.lastAt + ' · اشتراک‌های منقضی هنوز فعال‌اند', to: '/jobs' }))
  DB.ops.ingestion.filter((s) => s.status === 'crit').forEach((s) => out.push({ lvl: 'crit', t: 'تأخیر در ' + s.desc, d: s.name + ' · ' + fa(Math.round(s.lagMin / 60)) + ' ساعت عقب', to: '/data-health' }))
  const pd = DB.accounts.filter((a) => a.pastDue)
  if (pd.length) out.push({ lvl: 'warn', t: fa(pd.length) + ' پرداخت تمدید ناموفق', d: 'درآمد ماهانه در دورهٔ مهلت', mrr: pd.reduce((t, a) => t + a.mrr, 0), to: '/sales?tab=pastdue' })
  const crit = DB.accounts.filter((a) => a.paying && a.health < 30 && (a.plan === 'business' || a.plan === 'enterprise'))
  if (crit.length) out.push({ lvl: 'crit', t: fa(crit.length) + ' مشتری کسب و کار/سازمانی بحرانی شده', d: 'مجموع درآمد ماهانه', mrr: crit.reduce((t, a) => t + a.mrr, 0), to: '/health' })
  DB.ops.queues.filter((q) => q.waiting > 1000).forEach((q) => out.push({ lvl: 'warn', t: 'صف ' + q.name + ' عقب افتاده', d: fa(q.waiting) + ' کار در انتظار · ' + fa(q.failed24) + ' ناموفق در ۲۴ ساعت', to: '/jobs' }))
  return ok(out)
}

/* ------------------------------------------------------------- nav badges */
export function navBadges() {
  return ok({
    health: { n: DB.accounts.filter((a) => a.paying && a.health < 30).length, warn: true },
    jobs: { n: DB.ops.crons.filter((c) => c.status === 'fail').length, warn: true },
    'data-health': { n: DB.ops.ingestion.filter((s) => s.status === 'crit').length, warn: true },
  })
}

/* -------------------------------------------------------------- freshness */
/** Worst ingestion source among the ones a page depends on. */
export function freshness(sources) {
  const list = DB.ops.ingestion.filter((s) => (sources || ['main']).includes(s.key))
  const worst = list.slice().sort((p, q) => q.lagMin - p.lagMin)[0] || DB.ops.ingestion[0]
  return ok({ key: worst.key, name: worst.name, desc: worst.desc, lagMin: worst.lagMin, status: worst.status })
}

/* ----------------------------------------------------------------- search */
export function search(q) {
  const s = norm(q)
  const customers = [], bases = []
  if (s) {
    const hits = []
    for (const a of DB.accounts) {
      const hay = norm(a.name + ' ' + a.slug + ' ' + a.contact.first + ' ' + a.contact.last + ' ' + a.contact.mobile + ' ' + a.contact.email + ' ' + a.city)
      const i = hay.indexOf(s)
      if (i >= 0) hits.push([a, (i === 0 ? 0 : 1) - a.mrr / 1e8 - (a.lastSeenDays < 7 ? 0.5 : 0)])
    }
    hits.sort((p, q2) => p[1] - q2[1]).slice(0, 7).forEach(([a]) => customers.push(enrich(a)))
    outer: for (const a of DB.accounts) for (const b of a.bases) {
      if (norm(b.name + ' ' + b.slug + ' ' + a.name).includes(s)) { bases.push({ id: b.id, name: b.name, slug: b.slug, records: b.records, accountName: a.name }); if (bases.length >= 4) break outer }
    }
  }
  return ok({ customers, bases })
}

/* -------------------------------------------------------------- mutations */
export function addNote(accountId, note) { local().addNote(accountId, Object.assign({ who: whoName() }, note)); return ok(true) }
export function removeNote(accountId, text) { local().removeNote(accountId, text); return ok(true) }
export function setTask(id, patch) { local().setTask(id, patch); return ok(true) }
export function logAudit(action) { local().logAudit(whoName(), action); return ok(true) }
export function setThresholds(v, changed) {
  local().setThresholds(v)
  local().logAudit(whoName(), v === null ? 'بازگشت آستانه‌ها به پیش‌فرض' : 'تغییر آستانه‌ها' + (changed ? ' (' + fa(changed) + ' مقدار متفاوت با پیش‌فرض)' : ''))
  return ok(true)
}
export function runCron(key) {
  const c = DB.ops.crons.find((x) => x.key === key)
  local().setCronRun(key, { at: Date.now() }); local().logAudit(whoName(), 'اجرای دوبارهٔ کران «' + (c ? c.name : key) + '»'); return ok(true)
}
export function setAiFeedback(k, v) { local().setAiFeedback(k, v); return ok(true) }

/** Interactions (calls, deals) for one account, newest first, plus notes made here. */
export function interactionsOf(id) {
  return DB.activities.filter((x) => x.accountId === id).map((x) => ({ ...x, label: DB.OUTCOME_LABEL[x.outcome] || x.outcome }))
}

/** Server-style list paging over an in-memory list: view, filters, search, sort, page, per-view counts. */
export function pageOf(all, p, { views, sorts, filters = {}, text }) {
  const q = p.q ? norm(p.q) : ''
  const matching = all.filter((r) => Object.entries(filters).every(([k, test]) => !p[k] || test(r, p[k])) && (!q || norm(text(r)).includes(q)))
  const countIn = (rows) => Object.fromEntries(Object.entries(views).map(([k, test]) => [k, rows.filter(test).length]))
  const counts = countIn(matching)
  let rows = matching.filter(views[p.view || 'all'] || views.all)
  const read = sorts[p.sort]
  if (read) {
    const dir = p.dir === 'asc' ? 1 : -1
    rows = rows.slice().sort((a, b) => { const x = read(a), y = read(b); if (x == null) return 1; if (y == null) return -1; return (x > y ? 1 : x < y ? -1 : 0) * dir })
  }
  const size = p.size ?? 25, page = p.page ?? 0
  return ok({ rows: size === 0 ? rows : rows.slice(page * size, page * size + size), total: rows.length, counts, totals: countIn(all) })
}

