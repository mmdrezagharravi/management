/* GET /management/features?range — feature adoption. Same shape as mock/features.js.
   imp/gaps = server retentionImpact: week-12 retention of key-feature users vs other base builders (signed up since dataSince). */
import { get } from './client'
import { PLAN_ORDER } from 'src/lib/refs'
import { PLAN_NAME } from 'src/lib/ui'

export const FEATURE_LABEL = {
  Record: 'رکورد', Cell: 'سلول', View: 'نما', Automation: 'خودکارسازی', Collaborator: 'افزودن همکار', Page: 'صفحه', Role: 'نقش',
  AI: 'هوش مصنوعی', ExportTemplate: 'خروجی قالب', Form: 'فرم', Share: 'اشتراک', Other: 'سایر',
  Chat: 'گفتگو', Base: 'بیس', Table: 'جدول', Field: 'فیلد', File: 'فایل', Backup: 'پشتیبان‌گیری', Export: 'خروجی',
}

export async function features({ range: R = 30 } = {}) {
  const f = await get('/features', { range: R })
  const rows = (f.features || []).map((x, i) => {
    // prevRate is null when the previous window predates the behaviour data: no change to report, not "grew from zero"
    const rate = x.rate ?? 0, prevRate = x.prevRate ?? null
    return { id: i, key: x.type, label: FEATURE_LABEL[x.type] || x.type, keyFeature: !!x.key, users: x.users, rate, prevRate, ch: prevRate == null ? null : rate - prevRate, pay: x.paidRate ?? 0, free: x.freeRate ?? 0, gated: false }
  })
  const byPlan = f.activeByPlan
  const planHeat = byPlan ? {
    plans: PLAN_ORDER.map((k) => ({ key: k, name: PLAN_NAME[k], n: byPlan[k] ?? 0 })),
    rows: rows.slice().sort((p, q) => q.rate - p.rate).map((r) => {
      const counts = PLAN_ORDER.map((k) => f.features[r.id].usersByPlan?.[k] ?? 0)
      return { label: r.label, counts, cells: PLAN_ORDER.map((k, i) => (byPlan[k] ? counts[i] / byPlan[k] : null)) }
    }),
  } : null
  const first = (list, by) => (list.length ? list.slice().sort((p, q) => by(q) - by(p))[0].key : null)
  const ri = f.retentionImpact || { features: [], upperPaying: 0 }
  const rateOf = (type) => (rows.find((r) => r.key === type) || { rate: 0 }).rate
  const imp = ri.features
    .filter((x) => x.usersRate != null && x.nonUsersRate)
    .map((x) => ({ key: x.type, label: FEATURE_LABEL[x.type] || x.type, rate: rateOf(x.type), gated: false, ad: x.usersRate, adN: x.users, no: x.nonUsersRate, noN: x.nonUsers, lift: x.usersRate / x.nonUsersRate, without: x.upperPayingWithout }))
    .sort((p, q) => q.lift - p.lift)
  const median = (v) => { const s = v.slice().sort((p, q) => p - q); return s.length ? s[s.length >> 1] : 0 }
  const medLift = median(imp.map((x) => x.lift)), medRate = median(imp.map((x) => x.rate))
  imp.forEach((x) => { x.opp = x.lift > 1 && x.lift >= medLift && x.rate <= medRate })
  const gaps = imp.filter((x) => x.opp).map((x) => ({ key: x.key, label: x.label, lift: x.lift, n: x.without }))
  return {
    range: R, dataSince: f.dataSince || null,
    active: f.activeCustomers ? f.activeCustomers.value : 0, activePrev: f.activeCustomers ? f.activeCustomers.prev : null,
    rows, top: first(rows.filter((r) => r.keyFeature), (r) => r.rate), grow: first(rows.filter((r) => r.ch != null && r.ch > 0), (r) => r.ch),
    imp, medRate, gaps, top2: ri.upperPaying, planHeat,
  }
}
