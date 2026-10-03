/* GET /management/bases/:id (+ the creator's /customers/:id and sibling bases) → the base detail page.
   Unknown id: the server's 404 propagates (no fallback base). */
import { all, get } from './client'
import { toAccount } from './account'
import { toBaseRow } from './bases'
import { daysAgo } from 'src/lib/format'

const NO_OWNER = { id: '000000000000000000000000', name: 'بدون مالک', plan: 'basic' }

export async function base(id) {
  const d = await get('/bases/' + id)
  const cid = d.creator && d.creator.id
  const [owner, sibs] = await Promise.all([cid ? get('/customers/' + cid) : NO_OWNER, cid ? all('/bases', { creator: cid }) : []])
  const a = toAccount(owner)
  const row = toBaseRow(d)
  const c = d.counts || {}
  const share = a.records ? Math.min(1, row.records / a.records) : 1
  const autoShare = a.automations ? Math.min(1, row.automations / a.automations) : 0
  const activity = (d.activity || []).map((x) => ({ daysAgo: daysAgo(x.day) ?? 0, v: x.events || 0 }))
  const seenOf = new Map((owner.members || []).map((m) => [m.id, m.lastSeenDays ?? null]).concat([[cid, owner.lastSeenDays ?? null]]))
  const members = d.members || []
  return {
    fallback: false, requestedId: id, exact: true, recordsUsed: row.records, // activity/runs are this base's own, limits are per base
    base: { id: d.id, name: d.name, slug: d.slug || row.slug, created: row.created, tables: row.tables, records: row.records, automations: row.automations, portals: c.portals ?? 0, collaborators: row.collaborators, lastActive: row.la },
    account: a,
    limits: { records: d.recordsLimit || 0, runs: a.runsLimit || 0 }, seatLim: a.collaboratorLimit,
    share, autoShare, runsEst: c.runs30 ?? 0, failedRuns30: c.failedRuns30 ?? 0,
    activity, activeDays: activity.filter((x) => x.v > 0).length, sumEv: activity.reduce((t, x) => t + x.v, 0),
    people: members.slice(0, 8).map((m) => ({ name: m.name || (m.mobile ? 'کاربر ' + m.mobile.slice(-4) : m.id.slice(-6)), role: m.type === 'owner' ? 'مالک' : 'همکار', lastSeen: seenOf.get(m.id) ?? null })),
    peopleTotal: members.length,
    siblings: sibs.filter((x) => x.id !== d.id).map(toBaseRow).sort((p, q) => q.records - p.records).map((x) => ({ id: x.id, name: x.name, slug: x.slug, records: x.records, lastActive: x.la })),
    ownerName: a.name,
    ownership: d.ownership || { transfers: [], earlier: [], createdBeforeOwnerSignup: false, logsAvailable: false },
  }
}
