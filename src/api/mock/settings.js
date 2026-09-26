/* GET /management/settings — metric definitions, thresholds, roles and the audit trail.
   GET /management/settings/preview?good=..&warn=..  — how many accounts a threshold change would move today. */
import { DB } from 'src/mock/engine'
import { C, ok, local } from './shared'

const upRule = DB.segment('upsell').rule
const ruleNum = (re, def) => { const m = upRule.match(re); return m ? +m[1] : def }
const bandMin = (k) => C.health.bands.find((b) => b.key === k).min
const DEFAULTS = {
  actRecords: C.activation.records, actDays: C.activation.days,
  good: bandMin('good'), warn: bandMin('warn'), ser: bandMin('ser'),
  upHits: ruleNum(/limit_hits_30d\s*>=\s*(\d+)/, 2), upPricing: ruleNum(/pricing_visits_30d\s*>=\s*(\d+)/, 1), upSeen: ruleNum(/last_seen\s*<=\s*(\d+)/, 14),
}

const PERMS = ['دیدن همهٔ مشتریان', 'دیدن شماره/ایمیل', 'خروجی CSV', 'تغییر مسئول', 'تغییر آستانه‌ها', 'دیدن درآمد']
const ROLES = [
  { key: 'manager', label: 'مدیر فروش', p: [1, 1, 1, 1, 1, 1] },
  { key: 'rep', label: 'کارشناس فروش', p: [0, 1, 0, 0, 0, 1] },
  { key: 'support', label: 'پشتیبانی', p: [1, 1, 0, 0, 0, 0] },
  { key: 'product', label: 'محصول', p: [1, 0, 1, 0, 0, 0] },
  { key: 'admin', label: 'مدیر سیستم', p: [1, 1, 1, 1, 1, 1] },
]

const tsOf = (e) => C.now + (e.min - C.nowMinutes) * 60000 - e.t * 864e5
function auditRows() {
  const server = DB.audit.map((e, i) => { const a = e.target != null ? DB.byId.get(e.target) : null; return { id: 's' + i, src: 'server', ts: tsOf(e), who: e.who, action: e.action, target: a ? { id: a.id, name: a.name } : null, t: e.t, min: e.min } })
  const mine = local().audit.map((e, i) => ({ id: 'l' + i, src: 'local', ts: e.at, who: e.who, action: e.action, target: null, at: e.at }))
  return mine.concat(server).sort((p, q) => q.ts - p.ts)
}

export function settings() {
  const { accounts, agg } = DB
  const mrrNow = agg.mrrAt(0), payNow = agg.payingAt(0), mrrPrev = agg.mrrAt(30), payPrev = agg.payingAt(30)
  const mv = agg.movements(30, 0)
  const saved = local().thresholds
  const dist = agg.healthDist()
  return ok({
    defaults: DEFAULTS, current: Object.assign({}, DEFAULTS, saved || {}), saved: !!saved,
    defs: {
      activeWindow: C.activeWindow, activation: C.activation, habit: C.habit, dormantDays: C.dormantDays,
      active7: agg.activeInWindow(0, C.activeWindow), dormant: accounts.filter((a) => a.lastSeenDays > C.dormantDays).length,
      mrrNow, payNow, payPrev, churnCount: mv.churnCount,
      churnRate: mrrPrev ? -mv.churn / mrrPrev : 0,
      nrr: mrrPrev ? (mrrPrev + mv.expansion + mv.contraction + mv.churn) / mrrPrev : 0,
      cycles: Object.values(C.cycles).filter((c) => c.discount).map((c) => ({ key: c.key, name: c.name, discount: c.discount })),
      components: C.health.components,
      bands: C.health.bands.slice().sort((p, q) => q.min - p.min).map((b) => ({ ...b, n: (dist.find((x) => x.key === b.key) || {}).n || 0 })),
      plans: C.planOrder.map((k) => C.plans[k]),
      segments: agg.segmentCounts().map((s) => ({ key: s.key, label: s.label, n: s.n, rule: s.rule, desc: s.desc })),
    },
    perms: PERMS, roles: ROLES,
    audit: auditRows(),
  })
}

/** Effect of candidate thresholds on today's accounts (before saving). */
export function settingsPreview(v) {
  const { accounts } = DB
  const paying = accounts.filter((a) => a.paying)
  const bandN = (k) => paying.filter((a) => (k === 'good' ? a.health >= v.good : k === 'warn' ? a.health >= v.warn && a.health < v.good : k === 'ser' ? a.health >= v.ser && a.health < v.warn : a.health < v.ser)).length
  return ok({
    upsell: { n: accounts.filter((a) => (a.plan === 'free' || a.plan === 'basic') && a.limitHits30 >= v.upHits && a.pricingVisits30 >= v.upPricing && a.lastSeenDays <= v.upSeen).length, today: accounts.filter((a) => a.segments.includes('upsell')).length },
    bands: C.health.bands.map((b) => ({ key: b.key, label: b.label, n: bandN(b.key), today: paying.filter((a) => a.band.key === b.key).length })),
  })
}
