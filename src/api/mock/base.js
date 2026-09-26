/* GET /management/bases/:id — one base with its account context.
   Falls back to the busiest base of a paying customer when the id is unknown. */
import { DB } from 'src/mock/engine'
import { C, ok, enrich } from './shared'

// A base cannot have been last active before it existed.
const lastAct = (b) => Math.min(b.lastActive, b.created)

export function base(id) {
  const reqId = +id || 0
  let b = reqId ? DB.base(reqId) : null
  const fallback = !b
  if (!b) b = DB.bases().filter((x) => DB.byId.get(x.accountId).paying).sort((p, q) => q.records - p.records)[0]
  const a = DB.byId.get(b.accountId)
  const L = C.plans[a.plan].limits
  const recTotal = a.bases.reduce((t, x) => t + x.records, 0)
  const share = recTotal ? b.records / recTotal : 1 / a.bases.length
  // On capped plans the account holds at most a.records; scale its bases down so they add up to that.
  const recsOf = (x) => (recTotal > a.records ? Math.round((x.records * a.records) / recTotal) : x.records)
  const autoShare = a.automations ? b.automations / a.automations : 0
  const la = lastAct(b)
  const seatLim = (a.usage.find((u) => u.key === 'seats') || {}).limit || a.seats

  // daily activity (estimate): account events × this base's share of records
  const days = 90, activity = []
  for (let d = days - 1; d >= 0; d--) activity.push({ daysAgo: d, v: d >= la && d <= b.created ? Math.round(a.ev[d] * share) : 0 })

  const people = a.members.slice(0, b.collaborators)
  return ok({
    fallback, requestedId: reqId,
    base: { id: b.id, name: b.name, slug: b.slug, created: b.created, tables: b.tables, records: recsOf(b), automations: b.automations, pages: b.pages, shares: b.shares, collaborators: b.collaborators, lastActive: la },
    account: enrich(a),
    limits: { records: L.records, runs: L.runs }, seatLim, share, autoShare, runsEst: Math.round(a.runs30 * autoShare),
    activity, activeDays: activity.filter((x) => x.v > 0).length, sumEv: activity.reduce((t, x) => t + x.v, 0),
    people: people.slice(0, 8).map((m) => ({ name: m.name, role: m.role, lastSeen: m.lastSeen })), peopleTotal: people.length,
    siblings: a.bases.filter((x) => x.id !== b.id).sort((p, q) => q.records - p.records).map((x) => ({ id: x.id, name: x.name, slug: x.slug, records: recsOf(x), lastActive: lastAct(x) })),
    ownerName: a.members[0].name,
  })
}
