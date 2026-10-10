import { describe, it, expect, vi } from 'vitest'

vi.mock('stores/local', () => ({ useLocalStore: () => ({ owners: {}, notes: {}, tasks: {} }) }))
vi.mock('stores/session', () => ({ useSessionStore: () => ({ token: 't', user: null }) }))
vi.mock('src/api/http/client', () => ({ get: vi.fn(), all: vi.fn(), post: vi.fn(), memo: (fn) => fn }))
const { get, all } = await import('src/api/http/client')
const { toAccount } = await import('src/api/http/account')
const { sales } = await import('src/api/http/sales')
const { channelLabel } = await import('src/lib/refs')

const intent = (o = {}) => ({ pricing_view: 0, upgrade_click: 0, limit_hit: 0, checkout_view: 0, checkout_submit: 0, ...o })
const base = (o = {}) => ({
  id: 'a1', name: 'نمونه', mobile: '09120000000', plan: 'basic', paying: false, everPaid: false, mrr: 0, renewIn: null, health: 40, band: 'warn',
  components: { activity: 5, trend: 5, depth: 10, team: 10, commercial: 10 }, segments: [], channel: 'unknown', intent30: intent(), ...o,
})

describe('toAccount marketing fields', () => {
  it('maps profile, channel, churn reason and intent', () => {
    const a = toAccount(base({
      channel: 'instagram', industry: 'retail', companySize: '2-10', jobRole: 'sales', profileAnswered: true,
      churnReason: { reason: 'price', note: null, at: '2026-09-01' }, intent30: intent({ pricing_view: 3, limit_hit: 2 }), buyingIntentDays: 1,
    }))
    expect(a).toMatchObject({ industry: 'retail', industryName: 'فروشگاه و بازرگانی', companySize: '2-10', jobRole: 'sales', churnReason: 'گران است', churnReasonKey: 'price', pricingVisits30: 3, limitHits30: 2, buyingIntentDays: 1, source: 'direct' })
    expect(channelLabel(a)).toBe('اینستاگرام')
  })

  it('treats referral-link signups as invite, collaborators keep the badge, unknown falls back to the old source', () => {
    expect(toAccount(base({ channel: 'invite' })).source).toBe('invite')
    expect(channelLabel(toAccount(base({ channel: 'collaborator', invitedBy: 'x' })))).toBe('دعوت همکار در بیس')
    expect(channelLabel(toAccount(base({ channel: 'unknown' })))).toBe('مستقیم')
    expect(toAccount(base({ plan: 'team', renewIn: -3 })).churnReason).toBe('منقضی شد')
  })
})

describe('sales hot leads', () => {
  it('lists accounts in the hot segment and counts checkout visits', async () => {
    const hot = base({ id: 'h1', segments: ['hot'], intent30: intent({ pricing_view: 2, checkout_view: 1 }), buyingIntentDays: 0 })
    const warm = base({ id: 'h2', segments: ['hot'], intent30: intent({ pricing_view: 1 }), buyingIntentDays: 5 })
    all.mockResolvedValue([hot, warm, base({ id: 'cold' })])
    get.mockImplementation((p) => Promise.resolve(p === '/renewals' ? { upcoming: [], lapsed: [] } : p === '/definitions' ? { atRiskBelow: 50 } : {}))
    const d = await sales()
    expect(d.lists.hot.map((a) => a.id)).toEqual(['h1', 'h2'])
    expect(d.kpis.hot).toEqual({ n: 2, checkout: 1 })
    expect(d.lists.hot[0].weakest).toBeTruthy()
  })
})
