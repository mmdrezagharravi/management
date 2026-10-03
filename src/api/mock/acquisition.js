/* GET /management/acquisition?range=30 — site visits per channel (GA4, up to yesterday) and signups from our DB. */
import { DB } from 'src/mock/engine'
import { dayDate } from 'src/lib/format'
import { C, ok } from './shared'

const WEEKS = 12, MONTHS = 12
const NEW_SHARE = 0.72 // mock only: share of sessions from first-time visitors
const dayKey = (daysAgo) => dayDate(daysAgo).toISOString().slice(0, 10)
const bySource = (from, len) => {
  const out = {}
  for (const s of C.sources) { const n = DB.agg.visits(from, len, s.key); if (n) out[s.key] = n }
  return out
}

export function acquisition({ range: R = 30 } = {}) {
  const { agg, accounts } = DB
  const signedUp = (from, len) => accounts.filter((a) => a.age >= from && a.age < from + len)
  const visits = agg.visits(1, R), visitsPrev = agg.visits(R + 1, R)
  const channels = C.sources
    .map((s) => { const sessions = agg.visits(1, R, s.key); return { channel: s.key, sessions, newUsers: Math.round(sessions * NEW_SHARE), prevSessions: agg.visits(R + 1, R, s.key) } })
    .filter((c) => c.sessions || c.prevSessions)
    .sort((p, q) => q.sessions - p.sessions)
  const now = new Date().toISOString()

  return ok({
    range: R,
    configured: true,
    sync: { lastRunAt: now, ok: true, error: null, lastSuccessAt: now },
    kpis: {
      visits, visitsPrev, newUsers: Math.round(visits * NEW_SHARE), newUsersPrev: Math.round(visitsPrev * NEW_SHARE),
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
