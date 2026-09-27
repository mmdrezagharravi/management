/* Adapters from cloud-back shapes to the panel's account summary (the shape mock/shared.js enrich() returns).
   Fields the backend does not have yet are null/0/[] — components must tolerate that. */
import { all, get, memo } from './client'
import { useLocalStore } from 'stores/local'

/** Keep the exact plan keys owned by cloud-back. */
export const PLANS = ['basic', 'team', 'business', 'enterprise', 'partner']
export const planKey = (p) => (PLANS.includes(p) ? p : 'basic')
export const CYCLE_MAP = { '1m': 'monthly', '3m': 'quarterly', '6m': 'semiannual', '12m': 'yearly', monthly: 'monthly', quarterly: 'quarterly', yearly: 'yearly' }

export const RECORD_LIMITS = { basic: 1000, team: 50000, business: 125000, enterprise: 1500000, partner: 125000 }

export const notesOf = (id) => useLocalStore().notes[id] || []
export const taskState = (id) => useLocalStore().tasks[id] || null

/** CustomerSummary (GET /management/customers items) → panel account. */
export function toAccount(s) {
  const id = String(s.id)
  const name = s.name || (s.mobile ? 'کاربر ' + s.mobile.slice(-4) : id.slice(-6))
  const lastSeenDays = s.lastSeenDays == null ? 9999 : s.lastSeenDays
  const lastSeenMin = s.lastSeenMin == null ? lastSeenDays * 1440 : s.lastSeenMin
  const recLimit = s.recordLimit || RECORD_LIMITS[s.plan] || RECORD_LIMITS.basic
  const recordMax = s.recordMax ?? s.records ?? 0
  const collaborators = s.collaborators ?? s.memberCount ?? 1
  const collaboratorLimit = s.collaboratorLimit ?? null
  const usage = [
    { key: 'records', label: 'رکورد در پرمصرف‌ترین بیس', used: recordMax, limit: recLimit, ratio: recordMax / recLimit },
    { key: 'runs', label: 'اجرای اتوماسیون', used: s.runs || 0, limit: s.runsLimit || 0, ratio: s.runsLimit ? (s.runs || 0) / s.runsLimit : 0 },
    { key: 'seats', label: 'همکار', used: collaborators, limit: collaboratorLimit, ratio: collaboratorLimit ? collaborators / collaboratorLimit : 0 },
  ]
  const maxUsage = usage.slice().sort((p, q) => q.ratio - p.ratio)[0]
  const lapsed = !s.paying && s.plan !== 'basic' && s.renewIn != null && s.renewIn < 0
  const history = Array.isArray(s.healthHistory) ? s.healthHistory : []
  return {
    id, name, slug: id.slice(-8), industry: null, industryName: '', city: '', source: s.referredBy ? 'invite' : 'direct',
    age: s.age ?? 0, contact: { first: s.name || '', last: '', mobile: s.mobile || '', email: s.email || null },
    plan: planKey(s.plan), cycle: CYCLE_MAP[s.cycle] || null, seats: s.seats ?? null, collaborators, collaboratorLimit, mrr: s.mrr || 0, paying: !!s.paying, everPaid: !!s.everPaid,
    health: s.health ?? 0, band: s.band || 'crit', components: s.components || { activity: 0, trend: 0, depth: 0, team: 0, commercial: 0 },
    health2wAgo: s.health2wAgo ?? null, healthHistory: history,
    lastSeenDays, lastSeenMin, online: s.online === true || lastSeenMin <= 5,
    memberCount: s.memberCount ?? 1, activeMembers7: s.activeMembers7 ?? 0, activeDays28: s.activeDays28 ?? 0, activeDays7: s.activeDays7 ?? 0,
    events30: s.events30 ?? 0, records30: null, records: s.records ?? 0, trendPct: s.trendPct ?? 0,
    renewIn: s.renewIn ?? 0, churnedAt: lapsed ? -s.renewIn : undefined, churnReason: lapsed ? 'تمدید نشد' : null,
    pastDue: !!s.pastDue, tenureDays: s.payingDays ?? 0,
    limitHits30: 0, pricingVisits30: 0, tickets: 0, nps: null,
    segments: s.segments || [], maxUsage, usage, bases: s.bases ?? 0, automations: s.automations ?? 0,
    upgradeValue: 0, last30: Array.isArray(s.last30) ? s.last30 : [], milestones: milestonesOf(s), feat: {},
    invitesSent: 0, wk: [], decline: null,
    // backend-only extras, kept for adapters that need them
    blocked: !!s.blocked, referredBy: s.referredBy || null, signedUpAt: s.signedUpAt || null, lifetimeRevenue: s.lifetimeRevenue || 0,
    activated: s.activated ?? null, habit: s.habit ?? null, firstBaseDays: s.firstBaseDays ?? null, runs: s.runs || 0, runsLimit: s.runsLimit || 0,
    atLimit: !!s.atLimit, nearLimit: !!s.nearLimit || recordMax / recLimit >= 0.8,
    rawPlan: s.plan,
  }
}
/** Mock-style milestones (day offsets from signup, undefined = not reached). */
function milestonesOf(s) {
  const m = {}
  if (s.firstBaseDays != null) m.firstBase = s.firstBaseDays
  if (s.activated) m.activated = Math.min(7, s.age ?? 7)
  if (s.habit) m.habit = 28
  if (s.everPaid && s.firstPaidAt && s.signedUpAt) m.paid = Math.max(0, Math.round((new Date(s.firstPaidAt) - new Date(s.signedUpAt)) / 864e5))
  if ((s.memberCount ?? 1) > 1) m.team = m.firstBase ?? 0
  return m
}

/** Every customer as a panel account, cached for a minute (the server caches its summaries for 5). */
export const customersAll = memo(async () => (await all('/customers')).map(toAccount), 0)
/** Raw customer summaries (server shape), same cache window. */
export const customersRaw = memo(() => all('/customers'), 0)
export const basesAll = memo(() => all('/bases'), 0)
export const definitions = memo(() => get('/definitions'), 10 * 60_000)

export const accountById = async (id) => (await customersAll()).find((a) => a.id === String(id)) || null
export const clearCaches = () => { customersAll.clear(); customersRaw.clear(); basesAll.clear() }
