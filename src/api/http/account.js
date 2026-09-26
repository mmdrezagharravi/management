/* Adapters from cloud-back shapes to the panel's account summary (the shape mock/shared.js enrich() returns).
   Fields the backend does not have yet are null/0/[] — components must tolerate that. */
import { all, get, memo } from './client'
import { useLocalStore } from 'stores/local'

/** Real plan keys → panel keys. `basic` is Airsheet's free tier; `enterprise` keeps the panel's `ent` token. */
export const PLAN_MAP = { basic: 'free', team: 'team', business: 'business', enterprise: 'ent', partner: 'partner' }
export const planKey = (p) => PLAN_MAP[p] || p || 'free'
export const CYCLE_MAP = { '1m': 'monthly', '3m': 'quarterly', '12m': 'yearly', monthly: 'monthly', quarterly: 'quarterly', yearly: 'yearly' }

export const RECORD_LIMITS = { basic: 1000, team: 50000, business: 125000, enterprise: 1500000, partner: 125000 }

export const ownerOf = (id) => { const o = useLocalStore().owners; return o[id] !== undefined ? o[id] : null }
export const notesOf = (id) => useLocalStore().notes[id] || []
export const taskState = (id) => useLocalStore().tasks[id] || null

/** CustomerSummary (GET /management/customers items) → panel account. */
export function toAccount(s) {
  const id = String(s.id)
  const name = s.name || (s.mobile ? 'کاربر ' + s.mobile.slice(-4) : id.slice(-6))
  const lastSeenDays = s.lastSeenDays == null ? 9999 : s.lastSeenDays
  const recLimit = RECORD_LIMITS[s.plan] || RECORD_LIMITS.basic
  const usage = [
    { key: 'records', label: 'رکورد', used: s.records || 0, limit: recLimit, ratio: (s.records || 0) / recLimit },
    { key: 'runs', label: 'اجرای اتوماسیون', used: s.runs || 0, limit: s.runsLimit || 0, ratio: s.runsLimit ? (s.runs || 0) / s.runsLimit : 0 },
    { key: 'seats', label: 'صندلی', used: s.memberCount || 1, limit: s.seats || 1, ratio: (s.memberCount || 1) / (s.seats || 1) },
  ]
  const maxUsage = usage.slice().sort((p, q) => q.ratio - p.ratio)[0]
  const lapsed = !s.paying && s.plan !== 'basic' && s.renewIn != null && s.renewIn < 0
  const history = Array.isArray(s.healthHistory) ? s.healthHistory : []
  return {
    id, name, slug: id.slice(-8), industry: null, industryName: '', city: '', source: s.referredBy ? 'invite' : 'direct',
    age: s.age ?? 0, contact: { first: s.name || '', last: '', mobile: s.mobile || '', email: s.email || null },
    plan: planKey(s.plan), cycle: CYCLE_MAP[s.cycle] || null, seats: s.seats ?? 1, mrr: s.mrr || 0, paying: !!s.paying, everPaid: !!s.everPaid,
    health: s.health ?? 0, band: s.band || 'crit', components: s.components || { activity: 0, trend: 0, depth: 0, team: 0, commercial: 0 },
    health2wAgo: s.health2wAgo ?? null, healthHistory: history,
    lastSeenDays, lastSeenMin: lastSeenDays * 1440, online: false,
    memberCount: s.memberCount ?? 1, activeMembers7: s.activeMembers7 ?? 0, activeDays28: s.activeDays28 ?? 0, activeDays7: s.activeDays7 ?? 0,
    events30: s.events30 ?? 0, records30: null, records: s.records ?? 0, trendPct: s.trendPct == null ? 0 : s.trendPct / 100,
    renewIn: s.renewIn ?? 0, churnedAt: lapsed ? -s.renewIn : undefined, churnReason: lapsed ? 'تمدید نشد' : null,
    pastDue: !!s.pastDue, tenureDays: s.payingDays ?? 0,
    limitHits30: s.atLimit ? 1 : 0, pricingVisits30: 0, tickets: 0, nps: null,
    segments: s.segments || [], maxUsage, usage, bases: s.bases ?? 0, automations: s.automations ?? 0,
    upgradeValue: 0, owner: ownerOf(id), last30: [], milestones: milestonesOf(s), feat: {},
    invitesSent: 0, wk: [], decline: null,
    // backend-only extras, kept for adapters that need them
    blocked: !!s.blocked, referredBy: s.referredBy || null, signedUpAt: s.signedUpAt || null, lifetimeRevenue: s.lifetimeRevenue || 0,
    activated: s.activated ?? null, habit: s.habit ?? null, firstBaseDays: s.firstBaseDays ?? null, runs: s.runs || 0, runsLimit: s.runsLimit || 0, atLimit: !!s.atLimit,
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
export const customersAll = memo(async () => (await all('/customers')).map(toAccount))
/** Raw customer summaries (server shape), same cache window. */
export const customersRaw = memo(() => all('/customers'))
export const basesAll = memo(() => all('/bases'))
export const definitions = memo(() => get('/definitions'), 10 * 60_000)

export const accountById = async (id) => (await customersAll()).find((a) => a.id === String(id)) || null
export const clearCaches = () => { customersAll.clear(); customersRaw.clear(); basesAll.clear() }
