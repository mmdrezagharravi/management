import { describe, it, expect, vi } from 'vitest'

vi.mock('stores/local', () => ({ useLocalStore: () => ({ owners: {}, notes: { a1: [{ who: 'من', text: 'زنگ زدم' }] }, tasks: { 'onb:n1': { status: 'done' }, 'onb:n2': { status: 'done', step: 'tpl' } } }) }))
vi.mock('stores/session', () => ({ useSessionStore: () => ({ token: 't', user: null }) }))
vi.mock('src/api/http/client', () => ({ get: vi.fn(), all: vi.fn(), post: vi.fn(), memo: (fn) => fn }))
const { get, all } = await import('src/api/http/client')
const { revenue, lastMonths } = await import('src/api/http/revenue')
const { sales } = await import('src/api/http/sales')
const { onboarding, onboardingPage } = await import('src/api/http/onboarding')
const { segments } = await import('src/api/http/segments')

const iso = (d) => new Date(Date.now() - d * 864e5).toISOString()
const summary = (o = {}) => ({
  id: 'a1', name: 'شرکت نمونه', mobile: '09121234567', plan: 'team', seats: 5, cycle: '1m', paying: true, everPaid: true, mrr: 500000, until: iso(-5), renewIn: 5, pastDue: true,
  signedUpAt: iso(200), age: 200, blocked: false, referredBy: null, bases: 2, records: 1200, automations: 3, runs: 10, runsLimit: 100, atLimit: false,
  memberCount: 3, activeMembers7: 2, lastSeenDays: 1, events7: 20, events30: 90, activeDays7: 4, activeDays28: 15, trendPct: -20, activated: true, habit: true, firstBaseDays: 1,
  firstPaidAt: iso(150), payingDays: 150, lifetimeRevenue: 1100000, health: 25, band: 'crit', components: { activity: 5, trend: 3, depth: 8, team: 6, commercial: 3 }, segments: ['risk'], ...o,
})
const lapsed = summary({ id: 'a2', paying: false, mrr: 0, lastMrr: 400000, renewIn: -10, pastDue: false, payingDays: null, segments: [], health: 60, band: 'warn' })
const champion = summary({ id: 'a3', cycle: '12m', renewIn: 200, pastDue: false, health: 90, band: 'good', segments: ['champions'] })
const fresh = summary({ id: 'n1', plan: 'basic', paying: false, everPaid: false, mrr: 0, renewIn: null, pastDue: false, age: 4, signedUpAt: iso(4), activated: null, habit: null, firstBaseDays: null, bases: 0, automations: 0, memberCount: 1, lastSeenDays: 0, segments: ['new', 'stuck'], referredBy: 'x'.repeat(24), atLimit: true })
const freeUp = summary({ id: 'n2', plan: 'basic', paying: false, everPaid: false, mrr: 0, renewIn: null, pastDue: false, age: 20, signedUpAt: iso(20), activated: true, firstBaseDays: 0, segments: ['upsell'], atLimit: true, memberCount: 1, upgradeValue: 990000 })
const ACCOUNTS = [summary(), lapsed, champion, fresh, freeUp]
const key = (i) => lastMonths(12)[i].key
const REVENUE = {
  mrr: 1000000, paying: 2, arpa: 500000, lifetime: 5000000,
  months: [{ month: key(11), total: 900000, count: 2, payers: 2, newRevenue: 0, recurringRevenue: 900000, byType: {} }],
  renewals: { d30: { n: 1, mrr: 500000 }, d60: { n: 0, mrr: 0 }, d90: { n: 0, mrr: 0 } },
  byPlan: { team: { n: 2, mrr: 1000000 } }, byCycle: { '1m': { n: 1, mrr: 500000 }, '12m': { n: 1, mrr: 500000 } },
  mrrMonths: [{ month: key(10), y: 1, m: 1, end: 20, mrr: 800000, paying: 2, new: 100000, expansion: 0, contraction: 50000, churn: 0, churnCount: 0 }, { month: key(11), y: 1, m: 2, end: 0, mrr: 1000000, paying: 2, new: 0, expansion: 200000, contraction: 0, churn: 100000, churnCount: 1 }],
  nrr: { now: 1.05, prev: 0.98 },
}
const OVERVIEW = { range: 30, kpis: { mrr: 1000000, mrrNow: { value: 1000000, prev: 900000 }, payingNow: { value: 2, prev: 3 }, signups: { value: 2, prev: 0 } }, movements: { new: 0, expansion: 200000, contraction: 0, churn: -100000, newCount: 0, expCount: 1, conCount: 0, churnCount: 1 }, series: [] }
const DEFINITIONS = { activation: { days: 7, recordEvents: 10 }, atRiskBelow: 50, planPrices: { team: { monthly: 1000000, yearly: 9000000 } } }
all.mockResolvedValue(ACCOUNTS)
get.mockImplementation((p) => Promise.resolve(p === '/revenue' ? REVENUE : p === '/overview' ? OVERVIEW
  : p === '/renewals' ? { upcoming: [summary()], lapsed: [lapsed], totals: {} } : p === '/definitions' ? DEFINITIONS : {}))

describe('http revenue adapter', () => {
  it('has every key of mock/revenue.js', async () => {
    const d = await revenue({ range: 30 })
    for (const k of ['range', 'risk', 'kpis', 'months', 'tot12', 'planMix', 'cycMix', 'basicUp', 'cycleDiscount', 'cash', 'calendar']) expect(d).toHaveProperty(k)
    expect(Object.keys(d.kpis).sort()).toEqual(['arpa', 'mrr', 'nrr', 'paying'])
    expect(d.kpis.mrr).toMatchObject({ now: 1000000, prev: 900000 }); expect(d.kpis.mrr.spark).toHaveLength(12)
    expect(d.kpis.nrr.now).toBe(1.05)
    expect(d.months).toHaveLength(12); expect(d.months[11]).toMatchObject({ end: 0, mrr: 1000000, churn: -100000, churnCount: 1 }); expect(d.months[10].contraction).toBe(-50000)
    expect(d.tot12).toEqual({ n: 100000, e: 200000, c: -50000, ch: -100000 })
    expect(d.planMix.rows).toEqual([{ k: 'team', n: 2, mrr: 1000000, arpa: 500000 }]); expect(d.planMix.tm).toBe(1000000)
    expect(d.cycMix.rows.map((r) => r.k)).toEqual(['monthly', 'quarterly', 'semiannual', 'yearly']); expect(d.cycMix.tn).toBe(2)
    expect(d.cash).toHaveLength(12); expect(d.cash[11]).toMatchObject({ end: 0, amount: 900000, n: 2 }); expect(d.cash[0].amount).toBe(0)
    // a1: monthly, renews in 5 days, health 25 → due in weeks 0 and 4 (days 5 and 35), both at risk
    expect(d.risk).toBe(50)
    expect(d.calendar.ok).toHaveLength(13); expect(d.calendar.nRisk.slice(0, 5)).toEqual([1, 0, 0, 0, 1]); expect(d.calendar.riskTotal).toBe(1500000)
    expect(d.basicUp).toBe(1); expect(d.cycleDiscount.yearly).toBeCloseTo(0.25)
  })
})

describe('http sales adapter', () => {
  it('has every key of mock/sales.js', async () => {
    const d = await sales()
    for (const k of ['risk', 'yearlyDiscount', 'kpis', 'lists', 'stats']) expect(d).toHaveProperty(k)
    for (const k of ['renew', 'upsell', 'winback', 'pastdue', 'champions']) { expect(d.lists).toHaveProperty(k); expect(d.stats).toHaveProperty(k) }
    expect(d.kpis.renew).toEqual({ n: 1, mrr: 500000, risk: 1 })
    expect(d.kpis.upsell).toEqual({ n: 1, value: 990000 }); expect(d.kpis.winback).toEqual({ n: 1, lostMrr: 400000 })
    expect(d.kpis.champions).toEqual({ n: 1, monthly: 0 })
    expect(d.risk).toBe(50); expect(d.yearlyDiscount).toBeCloseTo(0.25)
    expect(d.lists.renew[0].weakest).toEqual({ key: 'trend', label: 'روند', value: 3 })
    expect(d.lists.winback[0]).toMatchObject({ id: 'a2', lostPlan: 'team', lostMrr: 400000, tenure: 140 })
    expect(d.lists.pastdue[0]).toMatchObject({ id: 'a1', lastNote: 'زنگ زدم' })
    expect(d.stats.champions).toEqual({ n: 1, monthly: 0 })
  })
})

describe('http onboarding adapter', () => {
  it('asks for the range and adds the high-potential definition', async () => {
    get.mockImplementation(() => Promise.resolve({ range: 30, activation: { records: 10, days: 7 }, kpis: {}, daily: [], buckets: [] }))
    const d = await onboarding({ range: 30 })
    expect(get).toHaveBeenLastCalledWith('/onboarding', { range: 30 })
    expect(d).toHaveProperty('hpDef')
  })

  it('turns one server page of signups into table rows', async () => {
    const row = { ...fresh, status: 'stuck', stuck: true, highPot: true, hasBase: false, stepsDone: 0 }
    get.mockImplementation((path) => Promise.resolve(path === '/definitions' ? { activation: { days: 7, recordEvents: 10 } } : { items: [row], total: 1, counts: { all: 1, stuck: 1 } }))
    const r = await onboardingPage({ view: 'stuck', range: 30 })
    expect(get).toHaveBeenCalledWith('/onboarding/signups', { view: 'stuck', range: 30 })
    expect(r).toMatchObject({ total: 1, counts: { all: 1, stuck: 1 } })
    expect(r.rows[0]).toMatchObject({ sourceName: 'دعوت همکار', status: 'stuck', highPot: true })
    expect(r.rows[0].checklist.map((x) => x.s)).toEqual(['open', 'wait', 'open', 'open', 'wait'])
  })

  it('reads week-two return from last30', async () => {
    const last30 = Array.from({ length: 30 }, (_, i) => (i === 29 - 20 + 9 ? 3 : 0))
    const moved = { ...fresh, id: 'n2', age: 20, last30, status: 'path', stuck: false, highPot: false, hasBase: true, stepsDone: 1 }
    get.mockImplementation((path) => Promise.resolve(path === '/definitions' ? {} : { items: [moved], total: 1, counts: {} }))
    const r = await onboardingPage({ range: 30 })
    expect(r.rows[0].checklist[4]).toMatchObject({ s: 'done', d: 'برگشت' })
  })
})

describe('http segments adapter', () => {
  it('labels the server totals without loading every customer', async () => {
    get.mockImplementation(() => Promise.resolve({
      totalAccounts: 3, inAny: 2, activeN: 1, totalMrr: 0, activeWindow: 7,
      segs: [{ key: 'new', n: 2, mrr: 0, active: 1, avgHealth: 40, dist: [{ key: 'good', n: 0 }, { key: 'warn', n: 1 }, { key: 'ser', n: 0 }, { key: 'crit', n: 1 }] }],
      cells: [[1]], top: { r: 'new', c: 'stuck', v: 0.5 },
    }))
    all.mockClear()
    const d = await segments()
    expect(get).toHaveBeenLastCalledWith('/segments')
    expect(all).not.toHaveBeenCalled()
    expect(d.segs[0]).toMatchObject({ key: 'new', label: 'تازه‌وارد', n: 2 })
    expect(d.segs[0].dist.every((b) => b.label)).toBe(true)
    expect(d.top).toMatchObject({ r: { key: 'new' }, c: { key: 'stuck' }, v: 0.5 })
  })
})
