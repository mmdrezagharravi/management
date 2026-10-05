/* GET /management/customers — every account as a list row. */
import { DB } from 'src/mock/engine'
import { ok, enrich, pageOf } from './shared'

export function customers() {
  return ok({
    rows: DB.accounts.map(enrich),
    cities: [...new Set(DB.accounts.map((a) => a.city))],
  })
}

const VIEWS = {
  all: () => true, paying: (a) => a.paying, risk: (a) => a.paying && a.health < 50, upsell: (a) => a.segments.includes('upsell'),
  pastdue: (a) => a.pastDue, new: (a) => a.age <= 14, active: (a) => a.lastSeenDays <= 30, online: (a) => a.online,
}
const SORTS = {
  name: (a) => a.name, planRank: (a) => DB.CONFIG.planOrder.indexOf(a.plan) * 1e12 + a.mrr, mrr: (a) => a.mrr, health: (a) => a.health,
  lastSeen: (a) => -a.lastSeenMin, activeMembers: (a) => a.activeMembers7, signal: (a) => (a.pastDue ? 4 : 0) + (a.atLimit ? 2 : 0) + (a.nearLimit ? 1 : 0),
  renew: (a) => (a.paying ? -a.renewIn : null),
}
const FILTERS = {
  plan: (a, v) => a.plan === v, band: (a, v) => a.band === v, source: (a, v) => (v === 'invite') === (a.source === 'invite'),
  segment: (a, v) => a.segments.includes(v),
}

/** GET /management/customers?view&q&plan&band&source&segment&sort&dir&page&size — one page, per-view counts. */
export function customersPage(p = {}) {
  return pageOf(DB.accounts.map(enrich), p, { views: VIEWS, sorts: SORTS, filters: FILTERS, text: (a) => a.name + ' ' + a.contact.first + ' ' + a.contact.last + ' ' + a.contact.mobile + ' ' + a.contact.email })
}
