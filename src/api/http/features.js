/* GET /management/features?range — feature adoption. Same shape as mock/features.js.
   Gaps: retention lift (imp/gaps) and the per-plan heatmap are not computable → imp: [], planHeat: null. */
import { get } from './client'

export const FEATURE_LABEL = {
  Record: 'رکورد', Cell: 'سلول', View: 'نما', Automation: 'اتوماسیون', Collaborator: 'افزودن همکار', Page: 'صفحه', Role: 'نقش',
  AI: 'هوش مصنوعی', ExportTemplate: 'خروجی قالب', Form: 'فرم', Share: 'اشتراک', Other: 'سایر',
}

export async function features({ range: R = 30 } = {}) {
  const f = await get('/features', { range: R })
  const rows = (f.features || []).map((x, i) => {
    const rate = x.rate ?? 0, prevRate = x.prevRate ?? 0
    return { id: i, key: x.type, label: FEATURE_LABEL[x.type] || x.type, keyFeature: !!x.key, users: x.users, rate, prevRate, ch: rate - prevRate, pay: x.paidRate ?? 0, free: x.freeRate ?? 0, gated: false }
  })
  const first = (list, by) => (list.length ? list.slice().sort((p, q) => by(q) - by(p))[0].key : null)
  return {
    range: R, dataSince: f.dataSince || null,
    active: f.activeCustomers ? f.activeCustomers.value : 0, activePrev: f.activeCustomers ? f.activeCustomers.prev : 0,
    rows, top: first(rows.filter((r) => r.keyFeature), (r) => r.rate), grow: first(rows, (r) => r.ch),
    imp: [], medRate: 0, gaps: [], top2: 0, planHeat: null,
  }
}
