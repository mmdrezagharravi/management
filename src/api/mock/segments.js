/* GET /management/segments?seg=upsell — behavioural groups, their overlap, and the members of one group. */
import { DB } from 'src/mock/engine'
import { C, ok, enrich } from './shared'

export function segments() {
  const { accounts, agg } = DB
  const segs = agg.segmentCounts()
  const members = {}
  segs.forEach((s) => { members[s.key] = accounts.filter((a) => a.segments.includes(s.key)) })
  const idSets = {}
  segs.forEach((s) => { idSets[s.key] = new Set(members[s.key].map((a) => a.id)) })
  const isActive = (a) => DB.countRange(a.ev, 0, C.activeWindow) > 0
  const activeN = accounts.filter(isActive).length
  const totalMrr = accounts.reduce((t, a) => t + a.mrr, 0)

  // overlap: share of row members that are also in the column group
  const cells = segs.map((r) => segs.map((c) => {
    if (!r.n) return null
    if (r.key === c.key) return 1
    let k = 0; for (const id of idSets[r.key]) if (idSets[c.key].has(id)) k++
    return k / r.n
  }))
  let top = null
  segs.forEach((r, i) => segs.forEach((c, j) => {
    if (i === j || r.n < 20 || cells[i][j] == null) return
    if (!top || cells[i][j] > top.v) top = { r: { key: r.key, label: r.label }, c: { key: c.key, label: c.label }, v: cells[i][j] }
  }))

  return ok({
    totalAccounts: accounts.length, inAny: accounts.filter((a) => a.segments.length).length, activeN, totalMrr, activeWindow: C.activeWindow,
    segs: segs.map((s) => {
      const list = members[s.key]
      return {
        key: s.key, label: s.label, rule: s.rule, desc: s.desc, n: s.n, mrr: s.mrr,
        active: list.filter(isActive).length,
        dist: agg.healthDist(list).map((d) => ({ key: d.key, label: d.label, n: d.n })),
        avgHealth: list.length ? Math.round(list.reduce((x, a) => x + a.health, 0) / list.length) : 0,
      }
    }),
    cells, top,
    membersBy: Object.fromEntries(Object.entries(members).map(([k, list]) => [k, list.map(enrich)])),
  })
}
