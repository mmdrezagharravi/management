/* GET /management/definitions + this browser's thresholds/audit → the settings page.
   settingsPreview(v): what candidate thresholds would do to today's accounts. */
import { get } from './client'
import { customersAll, definitions, planKey, RECORD_LIMITS } from './account'
import { useLocalStore } from 'stores/local'
import { BANDS, PLAN_NAME } from 'src/lib/ui'
import { HEALTH_COMPONENTS, SEGMENT_LABEL } from 'src/lib/refs'

// copy of cloud-back src/limits.ts AUTOMATION_LIMITS (per user, per month)
const RUN_LIMITS = { basic: 100, team: 25000, business: 100000, enterprise: 500000, partner: 100000 }
// copy of cloud-back src/api/management/metrics.ts SEGMENTS, in the mock's "rule" notation
const SEGMENT_RULES = {
  new: ['signup_age <= 14', 'در دو هفتهٔ اخیر ثبت‌نام کرده‌اند'],
  stuck: ['signup_age 3..30 AND NOT activated', 'ثبت‌نام کرده‌اند ولی فعال نشده‌اند'],
  builders: ['bases >= 2 AND last_seen <= 30', 'بیش از یک بیس ساخته‌اند'],
  automators: ['automations >= 1 AND last_seen <= 30', 'خودکارسازی دارند — چسبنده‌ترین گروه'],
  teams: ['active_members_7d >= 2', 'بیش از یک نفر در هفتهٔ اخیر کار کرده'],
  upsell: ['plan = basic AND at_record_limit AND last_seen <= 14', 'به سقف رکورد پلن رایگان خورده‌اند'],
  risk: ['paying AND health < 50', 'پرداخت‌کننده با امتیاز سلامت زیر ۵۰'],
  champions: ['paying AND tenure >= 180 AND health >= 80', 'بیش از ۶ ماه پرداخت پیاپی و سالم — مرجع معرفی'],
  dormant: ['last_seen > 30', 'یک ماه است هیچ فعالیتی نداشته‌اند'],
}
const PERMS = ['دیدن همهٔ مشتریان', 'دیدن شماره/ایمیل', 'خروجی CSV', 'تغییر آستانه‌ها', 'دیدن درآمد']
const ROLES = [
  { key: 'manager', label: 'مدیر فروش', p: [1, 1, 1, 1, 1] },
  { key: 'support', label: 'پشتیبانی', p: [1, 1, 0, 0, 0] },
  { key: 'product', label: 'محصول', p: [1, 0, 1, 0, 0] },
  { key: 'admin', label: 'مدیر سیستم', p: [1, 1, 1, 1, 1] },
]
const ACTIVE_WINDOW = 7
const low = (a) => a.plan === 'basic'

async function defaultsOf() {
  const D = await definitions()
  const bandMin = (k) => ((D.bands || BANDS).find((b) => b.key === k) || {}).min ?? 0
  return {
    actRecords: D.activation ? D.activation.recordEvents : 10, actDays: D.activation ? D.activation.days : 7,
    good: bandMin('good'), warn: bandMin('warn'), ser: bandMin('ser'),
    // server upsell rule: free plan, at the record limit (= one "hit"), seen in 14 days; no pricing-page tracking
    upHits: 1, upPricing: 0, upSeen: 14,
  }
}

export async function settings() {
  const [D, accounts, DEFAULTS, ov] = await Promise.all([definitions(), customersAll(), defaultsOf(), get('/overview', { range: 30 }).catch(() => null)])
  const local = useLocalStore()
  const saved = local.thresholds
  const paying = accounts.filter((a) => a.paying)
  const dormantDays = D.dormantDays ?? 30
  // needs backend: /overview kpis.mrr/payingNow {value, prev} and movements {expansion, contraction, churn, churnCount}
  const k = (ov && ov.kpis) || {}, mv = (ov && ov.movements) || null
  const mrrPrev = k.mrrNow && k.mrrNow.prev != null ? k.mrrNow.prev : null // backend: kpis.mrrNow { value, prev }
  return {
    defaults: DEFAULTS, current: Object.assign({}, DEFAULTS, saved || {}), saved: !!saved,
    defs: {
      activeWindow: ACTIVE_WINDOW, activation: { records: DEFAULTS.actRecords, days: DEFAULTS.actDays }, habit: D.habit || { weeks: 3, of: 4 }, dormantDays,
      active7: accounts.filter((a) => a.lastSeenDays <= ACTIVE_WINDOW).length, dormant: accounts.filter((a) => a.lastSeenDays > dormantDays).length,
      mrrNow: paying.reduce((t, a) => t + a.mrr, 0), payNow: paying.length,
      payPrev: k.payingNow && k.payingNow.prev != null ? k.payingNow.prev : null, churnCount: mv ? mv.churnCount : null,
      churnRate: mv && mrrPrev ? -mv.churn / mrrPrev : null,
      nrr: mv && mrrPrev ? (mrrPrev + mv.expansion + mv.contraction + mv.churn) / mrrPrev : null,
      cycles: [],
      components: HEALTH_COMPONENTS,
      bands: BANDS.map((b) => ({ ...b, min: DEFAULTS[b.key] ?? b.min, n: paying.filter((a) => a.band === b.key).length })),
      plans: (D.plans || Object.keys(RECORD_LIMITS)).map((p) => ({ key: planKey(p), name: PLAN_NAME[planKey(p)] || p, price: p === 'basic' ? 0 : (D.planPrices && D.planPrices[p] ? D.planPrices[p].monthly : null), seatsIncluded: null, seatPrice: null, limits: { records: RECORD_LIMITS[p] || 0, runs: RUN_LIMITS[p] || 0, seats: planKey(p) === 'basic' ? 5 : null, sms: 0, ai: 0, storage: 0 } })),
      segments: (D.segments || Object.keys(SEGMENT_RULES)).map((key) => ({ key, label: SEGMENT_LABEL[key] || key, n: accounts.filter((a) => a.segments.includes(key)).length, rule: (SEGMENT_RULES[key] || [])[0] || '', desc: (SEGMENT_RULES[key] || [])[1] || '' })),
    },
    perms: PERMS, roles: ROLES,
    audit: local.audit.map((e, i) => ({ id: 'l' + i, src: 'local', ts: e.at, who: e.who, action: e.action, target: null, at: e.at })).sort((p, q) => q.ts - p.ts),
  }
}

/** Effect of candidate thresholds on today's accounts (before saving). */
export async function settingsPreview(v) {
  const accounts = await customersAll()
  const paying = accounts.filter((a) => a.paying)
  const bandN = (k) => paying.filter((a) => (k === 'good' ? a.health >= v.good : k === 'warn' ? a.health >= v.warn && a.health < v.good : k === 'ser' ? a.health >= v.ser && a.health < v.warn : a.health < v.ser)).length
  return {
    upsell: { n: accounts.filter((a) => low(a) && a.atLimit && a.lastSeenDays <= 14).length, today: accounts.filter((a) => a.segments.includes('upsell')).length },
    bands: BANDS.map((b) => ({ key: b.key, label: b.label, n: bandN(b.key), today: paying.filter((a) => a.band === b.key).length })),
  }
}
