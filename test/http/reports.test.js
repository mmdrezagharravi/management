/* funnel / retention / features / journey http adapters return the mock contract's keys from server-shaped responses. */
import { describe, it, expect, vi } from 'vitest'

vi.mock('stores/local', () => ({ useLocalStore: () => ({ owners: {}, notes: {}, tasks: {} }) }))

const step = (key, n, prev, start) => ({ key, n, fromPrev: prev ? n / prev : null, fromStart: start ? n / start : null })
const stepsOf = (n) => [step('signup', n, n, n), step('firstBase', n * 0.6, n, n), step('activated', n * 0.4, n * 0.6, n), step('habit', n * 0.2, n * 0.4, n), step('paid', n * 0.05, n * 0.2, n)]
const cells = (eligible) => Array.from({ length: 12 }, (_, w) => ({ week: w, eligible, rate: eligible ? 0.9 - w * 0.05 : null }))
const cust = (i, o = {}) => ({
  id: String(i).padStart(24, '0'), name: 'c' + i, mobile: '0912000000' + i, plan: 'team', seats: 3, cycle: 'monthly', paying: true, everPaid: true, mrr: 500000, until: null,
  renewIn: 12, pastDue: false, signedUpAt: '2026-06-01T00:00:00Z', age: 100, blocked: false, referredBy: null, bases: 2, records: 300, automations: 1, runs: 3, runsLimit: 100,
  atLimit: false, memberCount: 2, activeMembers7: 1, lastSeenDays: 2, events7: 5, events30: 20, activeDays7: 3, activeDays28: 10, trendPct: 5, activated: true, habit: true,
  firstBaseDays: 1, firstPaidAt: '2026-06-10T00:00:00Z', payingDays: 90, lifetimeRevenue: 1500000, health: 70, band: 'good', components: { activity: 15, trend: 15, depth: 10, team: 10, commercial: 20 }, segments: [], ...o,
})
const customers = [
  cust(1), cust(2, { referredBy: 'x', age: 5, firstBaseDays: null, activated: null, paying: false, plan: 'basic', mrr: 0, cycle: null }),
  cust(3, { age: 10, activated: false, paying: false, plan: 'basic', mrr: 0 }), cust(4, { age: 20, activated: true, automations: 0 }),
  cust(5, { paying: false, renewIn: -20, mrr: 0, payingDays: null }), // the server sends payingDays only while paying
]
const SERVER = {
  '/funnel': { range: 30, matureDays: 30, dataSince: '2026-05-01', cohort: { from: '', to: '', size: 100 }, steps: stepsOf(100), paidAny: 5, biggestDrop: 'paid', bySource: { referral: stepsOf(20), direct: stepsOf(80) } },
  '/retention': { dataSince: '2026-05-01', weeks: 12, cohorts: [{ month: '1405-03', size: 30, cells: cells(30) }, { month: '1405-04', size: 20, cells: cells(20) }, { month: '1405-06', size: 5, cells: cells(0) }],
    curves: { all: cells(50), withAutomation: cells(20), withoutAutomation: cells(30), team: cells(10) } },
  '/features': { range: 30, dataSince: '2026-05-01', activeCustomers: { value: 40, prev: 35 }, features: [
    { type: 'Record', key: false, users: 30, events: 900, rate: 0.75, prevUsers: 20, prevRate: 0.57, paidRate: 0.9, freeRate: 0.5 },
    { type: 'Automation', key: true, users: 10, events: 50, rate: 0.25, prevUsers: 5, prevRate: 0.14, paidRate: 0.5, freeRate: 0.1 },
    { type: 'Zed', key: true, users: 1, events: 1, rate: 0.02, prevUsers: 0, prevRate: 0, paidRate: 0, freeRate: 0.01 }] },
  '/renewals': { days: 30, lapsedDays: 180, upcoming: [customers[0]], lapsed: [customers[4]], totals: { upcoming: { n: 1, mrr: 500000 }, lapsed: { n: 1 } } },
  '/revenue': { mrr: 1, paying: 1, mrrMonths: [{ month: '1405-05', y: 1405, m: 5, end: 31, mrr: 1000, paying: 2, new: 100, expansion: 50, contraction: 20, churn: 30 }], nrr: { now: 1.02, prev: 0.98 } },
  '/customers': { items: customers, total: customers.length, page: 0, size: 0 },
}
vi.mock('../../src/api/http/client.js', () => ({
  get: vi.fn(async (path) => SERVER[path]),
  all: vi.fn(async (path) => SERVER[path].items),
  post: vi.fn(),
  memo: (fn) => { const f = () => fn(); f.clear = () => {}; return f },
}))

const { funnel } = await import('../../src/api/http/funnel.js')
const { retention } = await import('../../src/api/http/retention.js')
const { features } = await import('../../src/api/http/features.js')
const { journey } = await import('../../src/api/http/journey.js')

const keys = (o) => Object.keys(o).sort()
const hasKeys = (o, list) => expect(keys(o)).toEqual(expect.arrayContaining(list.slice().sort()))

describe('funnel', () => {
  it('mock contract keys, visit step present with n = null', async () => {
    const d = await funnel({ range: 30 })
    hasKeys(d, ['range', 'mature', 'source', 'sourceName', 'activationRecords', 'steps', 'prev', 'worst', 'stuck', 'bySource', 'total', 'weekly'])
    expect(d.steps.map((s) => s.key)).toEqual(['visit', 'signup', 'firstBase', 'activated', 'habit', 'paid'])
    hasKeys(d.steps[1], ['key', 'label', 'n', 'def', 'fromPrev', 'fromStart', 'medianDays'])
    expect(d.steps[0].n).toBeNull()
    expect(d.steps[1].n).toBe(100)
    expect(d.worst).toBe('paid')
    expect(d.prev).toEqual([])
    expect(d.stuck).toEqual({ pool: 2, noBase: 1, notAct: 1 })
    expect(d.bySource.map((s) => s.key)).toEqual(['invite', 'direct'])
    hasKeys(d.bySource[0], ['key', 'name', 'visits', 'signups', 'sr', 'fb', 'act', 'habit', 'paid'])
    expect(d.weekly).toHaveLength(16)
    hasKeys(d.weekly[0], ['from', 'n', 'rate'])
  })
  it('honours invite/direct source filter only', async () => {
    const d = await funnel({ range: 30, source: 'invite' })
    expect(d.source).toBe('invite'); expect(d.steps[1].n).toBe(20); expect(d.stuck).toEqual({ pool: 1, noBase: 1, notAct: 0 })
    expect((await funnel({ source: 'google' })).source).toBeNull()
  })
})

describe('retention', () => {
  it('mock contract keys with weekly cells', async () => {
    const d = await retention({})
    hasKeys(d, ['kpis', 'cohortMode', 'cohorts', 'domain', 'curves', 'revMonths', 'churn'])
    hasKeys(d.kpis, ['m1', 'm3', 'logo', 'logoPrev', 'rev90', 'rev90Prev'])
    hasKeys(d.kpis.m1, ['v', 'p', 'months']); hasKeys(d.kpis.logo, ['n', 'base', 'r']); hasKeys(d.kpis.rev90, ['n', 'S', 'E', 'exp', 'lost', 'nrr', 'grr'])
    hasKeys(d.cohorts[0], ['y', 'm', 'end', 'size', 'partial', 'cells'])
    expect(d.cohorts[0]).toMatchObject({ y: 1405, m: 3, size: 30 }); expect(d.cohorts[0].cells).toHaveLength(12)
    expect(d.cohorts[2].cells.every((v) => v === null)).toBe(true)
    hasKeys(d.curves, ['automation', 'noAutomation', 'team', 'lift', 'autoShare', 'payNoAuto'])
    expect(d.curves.automation).toEqual({ values: expect.any(Array), n: 20 })
    expect(d.curves.lift).toBeCloseTo(1)
    expect(d.kpis.rev90.nrr).toBe(1.02)
    hasKeys(d.revMonths[0], ['y', 'm', 'end', 'S', 'exp', 'lost', 'nrr', 'grr']); expect(d.revMonths[0].S).toBe(900)
    hasKeys(d.churn, ['total', 'lostMrr', 'early', 'medianTenure', 'reasons', 'reasonList', 'rows'])
    expect(d.churn.total).toBe(1); expect(d.churn.rows[0]).toMatchObject({ churnedAt: 20, tenure: 71, lastMrr: null })
    expect(d.kpis.logo).toEqual({ n: 1, base: 3, r: 1 / 3 })
  })
})

describe('features', () => {
  it('mock contract keys, Persian labels, unavailable blocks empty', async () => {
    const d = await features({ range: 30 })
    hasKeys(d, ['range', 'active', 'activePrev', 'rows', 'top', 'grow', 'imp', 'medRate', 'gaps', 'top2', 'planHeat'])
    hasKeys(d.rows[0], ['id', 'key', 'label', 'keyFeature', 'users', 'rate', 'prevRate', 'ch', 'pay', 'free', 'gated'])
    expect(d.rows.map((r) => r.label)).toEqual(['رکورد', 'خودکارسازی', 'Zed'])
    expect(d.top).toBe('Automation'); expect(d.grow).toBe('Record')
    expect(d.imp).toEqual([]); expect(d.planHeat).toBeNull(); expect(d.active).toBe(40)
  })
})

describe('journey', () => {
  it('mock contract keys, stages without data are null', async () => {
    const d = await journey({ range: 30 })
    hasKeys(d, ['range', 'mature', 'stages', 'funnel', 'renew', 'refer', 'weakest', 'drops', 'assisted'])
    expect(d.stages.map((s) => s.key)).toEqual(['visit', 'signup', 'firstBase', 'activated', 'habit', 'paid', 'renew', 'refer'])
    expect(d.funnel[0]).toMatchObject({ key: 'visit', n: null }); expect(d.funnel[1].fromPrev).toBeNull()
    hasKeys(d.renew, ['due', 'renewed', 'rate', 'expanded', 'paying']); expect(d.renew.expanded).toBeNull()
    hasKeys(d.refer, ['invited', 'signups', 'rate']); expect(d.refer).toEqual({ invited: 1, signups: 3, rate: 1 / 3 })
    expect(d.weakest).toBe('paid'); expect(d.drops).toHaveLength(3); hasKeys(d.drops[0], ['from', 'to', 'key', 'lost', 'rate'])
    hasKeys(d.assisted, ['count', 'b2a', 'gain', 'top']); expect(d.assisted.count).toBe(1); expect(d.assisted.top[0].id).toBe(customers[1].id)
  })
})
