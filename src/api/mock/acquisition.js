/* GET /management/acquisition?range=30 — site visits per channel (GA4, up to yesterday) and signups from our DB. */
import { DB } from 'src/mock/engine'
import { dayDate } from 'src/lib/format'
import { C, ok, enrich } from './shared'

const WEEKS = 12, MONTHS = 12
const dayKey = (daysAgo) => dayDate(daysAgo).toISOString().slice(0, 10)
const bySource = (from, len) => {
  const out = {}
  for (const s of C.sources) { const n = DB.agg.visits(from, len, s.key); if (n) out[s.key] = n }
  return out
}

const conversion = (list) => ({ accounts: list.length, activated: list.filter((a) => a.milestones.activated !== undefined).length, paying: list.filter((a) => a.paying).length, everPaid: list.filter((a) => a.everPaid).length, mrr: list.reduce((t, a) => t + a.mrr, 0) })
const groupBy = (list, keyOf) => {
  const m = new Map()
  for (const a of list) { const key = keyOf(a); if (key) m.set(key, [...(m.get(key) || []), a]) }
  return [...m].map(([key, l]) => ({ key, ...conversion(l) }))
}
function attribution(accounts, R) {
  const self = accounts.map(enrich).filter((a) => a.channel !== 'collaborator')
  const byChannel = (l) => groupBy(l, (a) => a.channel).map(({ key, ...r }) => ({ channel: key, ...r }))
  return {
    tracked: self.length, selfSignups: self.length,
    signupsByChannel: byChannel(self.filter((a) => a.age >= 1 && a.age < 1 + R)),
    revenueByChannel: byChannel(self),
    campaigns: groupBy(self, (a) => a.signupSource && a.signupSource.campaign).sort((p, q) => q.mrr - p.mrr),
  }
}

export function acquisition({ range: R = 30 } = {}) {
  const { agg, accounts } = DB
  const signedUp = (from, len) => accounts.filter((a) => a.age >= from && a.age < from + len)
  const visits = agg.visits(1, R), visitsPrev = agg.visits(R + 1, R)
  const channels = C.sources
    .map((s) => { const sessions = agg.visits(1, R, s.key); return { channel: s.key, sessions, newUsers: Math.round(sessions * C.newVisitorShare), prevSessions: agg.visits(R + 1, R, s.key) } })
    .filter((c) => c.sessions || c.prevSessions)
    .sort((p, q) => q.sessions - p.sessions)
  const now = new Date().toISOString()

  return ok({
    range: R,
    attribution: attribution(accounts, R),
    configured: true,
    sync: { lastRunAt: now, ok: true, error: null, lastSuccessAt: now },
    kpis: {
      visits, visitsPrev, newUsers: Math.round(visits * C.newVisitorShare), newUsersPrev: Math.round(visitsPrev * C.newVisitorShare),
      signups: signedUp(1, R).length, signupsPrev: signedUp(R + 1, R).length, inviteSignups: signedUp(1, R).filter((a) => a.source === 'invite').length,
    },
    channels,
    daily: Array.from({ length: R }, (_, i) => { const d = R - i; return { day: dayKey(d), sessions: bySource(d, 1) } }),
    weekly: Array.from({ length: WEEKS }, (_, i) => { const to = 1 + 7 * (WEEKS - 1 - i); return { from: dayKey(to + 6), to: dayKey(to), sessions: bySource(to, 7) } }),
    monthly: DB.jalaliMonths(MONTHS).map((mo) => {
      const from = Math.max(mo.end, 1)
      return { month: mo.y + '-' + String(mo.m).padStart(2, '0'), y: mo.y, m: mo.m, sessions: from <= mo.start ? bySource(from, mo.start - from + 1) : {} }
    }),
  })
}
