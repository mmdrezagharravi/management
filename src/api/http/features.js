/* GET /management/features?range — feature adoption. Same shape as mock/features.js.
   Gap: retention lift (imp/gaps) is not computable → imp: []. */
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
  return {
    range: R, dataSince: f.dataSince || null,
    active: f.activeCustomers ? f.activeCustomers.value : 0, activePrev: f.activeCustomers ? f.activeCustomers.prev : null,
    rows, top: first(rows.filter((r) => r.keyFeature), (r) => r.rate), grow: first(rows.filter((r) => r.ch != null && r.ch > 0), (r) => r.ch),
    imp: [], medRate: 0, gaps: [], top2: 0, planHeat,
  }
}
