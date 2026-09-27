import { describe, it, expect, vi } from 'vitest'

// browser stores, quasar and the axios client are replaced; adapters only see server-shaped JSON
vi.mock('quasar', () => ({ Notify: { create() {} }, LocalStorage: { getItem: () => null, set() {} } }))
vi.mock('stores/local', () => ({ useLocalStore: () => ({ owners: {}, notes: { a1: [{ kind: 'offer', offer: 'upgrade', text: 'پیشنهاد ارتقا' }] }, tasks: {}, thresholds: { good: 75 }, audit: [{ at: Date.now(), who: 'من', action: 'تغییر آستانه‌ها' }], cronRuns: { 'management-nightly': { at: 1 } } }) }))
vi.mock('stores/session', () => ({ useSessionStore: () => ({ token: 't', user: null }) }))
vi.mock('src/api/http/client', () => ({ get: vi.fn(), all: vi.fn(), post: vi.fn(), memo: (fn) => fn }))
const { get, all } = await import('src/api/http/client')
const { bases } = await import('src/api/http/bases')
const { base } = await import('src/api/http/base')
const { quota } = await import('src/api/http/quota')
const { jobs } = await import('src/api/http/jobs')
const { dataHealth } = await import('src/api/http/dataHealth')
const { settings, settingsPreview } = await import('src/api/http/settings')

const iso = (d) => new Date(Date.now() - d * 864e5).toISOString()
const day = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(Date.now() - d * 864e5) // server day keys are Tehran dates
const B1 = 'b'.repeat(24), B2 = 'c'.repeat(24)
const customer = (o = {}) => ({
  id: 'a1', name: 'شرکت نمونه', mobile: '09121234567', plan: 'basic', seats: 1, cycle: null, paying: false, everPaid: false, mrr: 0, until: null, renewIn: null, pastDue: false,
  signedUpAt: iso(200), age: 200, blocked: false, referredBy: null, bases: 2, records: 950, automations: 1, runs: 90, runsLimit: 100, atLimit: true,
  memberCount: 2, activeMembers7: 1, lastSeenDays: 1, events7: 20, events30: 90, activeDays7: 4, activeDays28: 15, trendPct: 0, activated: true, habit: true, firstBaseDays: 1,
  firstPaidAt: null, payingDays: null, lifetimeRevenue: 0, health: 55, band: 'warn', components: { activity: 10, trend: 10, depth: 10, team: 10, commercial: 15 }, segments: ['upsell'], ...o,
})
const paying = customer({ id: 'a2', name: 'پرداختی', plan: 'team', paying: true, everPaid: true, mrr: 500000, records: 100, runs: 0, runsLimit: 25000, atLimit: false, health: 80, band: 'good', segments: [] })
const baseRow = (o = {}) => ({ id: B1, name: 'فروش', isTemplate: false, createdAt: iso(120), age: 120, creator: { id: 'a1', name: 'شرکت نمونه', plan: 'basic' }, records: 900, recordsLimit: 1000, usage: 0.9, atLimit: true, tables: 3, automations: 1, collaborators: 2, events30: 60, activeDays30: 12, lastSeenDays: 2, ...o })
const routes = {
  '/customers': () => [customer(), paying],
  '/bases': () => [baseRow(), baseRow({ id: B2, name: 'انبار', records: 5, usage: 0.005, atLimit: false, lastSeenDays: null, events30: 0 })],
  ['/bases/' + B1]: () => ({ ...baseRow(), slug: 'sales', cloneCount: 0, counts: { fields: 12, views: 4, portals: 3, roles: 0, recordRoles: 0, webhooks: 0, plugins: 0, automationsActive: 1, runs30: 40, failedRuns30: 2 }, members: [{ id: 'a1', name: 'علی', mobile: '0912', type: 'owner' }, { id: 'm2', name: null, mobile: '09351112233', type: 'collaborator' }], activity: Array.from({ length: 90 }, (_, i) => ({ day: day(89 - i), events: i % 3 })), features: { Record: 40 } }),
  '/customers/a1': () => ({ ...customer(), email: null, referredBy: null, referrals: 0, basesList: [], members: [{ id: 'm2', name: null, mobile: '0935', lastSeenDays: 30 }], invoices: [], contract: null, activity: [], features: {}, healthHistory: [] }),
  '/quota': () => ({ nearRatio: 0.8, bases: [baseRow()], automation: [{ ...customer(), runsUsage: 0.9 }] }),
  '/jobs': () => ({
    queues: [{ name: 'Automation', counts: { waiting: 350, active: 2, completed: 9000, failed: 12, delayed: 0 }, error: null }, { name: 'autopilot', counts: null, error: 'ECONNREFUSED' }],
    sync: { dataSince: day(30), lastSyncedDay: day(1), lastSyncedAt: iso(0), lagDays: 0 },
    crons: [{ key: 'expire', name: 'انقضای اشتراک', schedule: 'روزانه ۱۴:۰۰', lastRunAt: iso(1), lastStatus: 'fail', lastDurationMs: 250000, lastError: 'cursor id not found', runs24: 1, fails24: 1 }],
  }),
  '/data-health': () => ({ dataSince: day(30), lastSyncedDay: day(1), lastSyncedAt: iso(0), lagDays: 0, series: Array.from({ length: 30 }, (_, i) => ({ day: day(29 - i), synced: i !== 5, events: i === 5 ? null : 1000 + i, users: 10, bases: 5, lowVolume: false })), missingDays: [day(24)], lowVolumeDays: [] }),
  '/definitions': () => ({ plans: ['basic', 'team', 'business', 'enterprise', 'partner'], bands: [{ key: 'good', min: 70 }, { key: 'warn', min: 50 }, { key: 'ser', min: 30 }, { key: 'crit', min: 0 }], segments: ['new', 'stuck', 'upsell', 'risk', 'dormant'], activation: { days: 7, recordEvents: 10 }, habit: { weeks: 3, of: 4 }, dormantDays: 30 }),
  '/overview': () => ({ kpis: { mrr: 500000, mrrNow: { value: 500000, prev: 400000 }, payingNow: { value: 1, prev: 2 } }, movements: { new: 0, expansion: 100000, contraction: 0, churn: -50000, newCount: 0, expCount: 1, conCount: 0, churnCount: 1 } }),
}
const route = (path) => { const f = routes[path]; if (!f) return Promise.reject(new Error('404 ' + path)); return Promise.resolve(f()) }
get.mockImplementation(route); all.mockImplementation(route)

// key lists of the mock twins (src/api/mock/*.js)
const keysOf = (o) => Object.keys(o).sort()
const expectKeys = (o, keys) => expect(keysOf(o)).toEqual(expect.arrayContaining(keys.slice().sort()))

describe('bases()', () => {
  it('has the mock shape and formulas', async () => {
    const d = await bases()
    expectKeys(d, ['rows', 'kpis', 'top', 'hist', 'byPlan', 'byState', 'small', 'big'])
    expectKeys(d.kpis, ['total', 'withBases', 'active7', 'new30', 'new30prev', 'avgRec', 'medRec', 'nearBases', 'nearAcc'])
    expectKeys(d.rows[0], ['id', 'name', 'slug', 'tables', 'automations', 'collaborators', 'created', 'records', 'la', 'est30', 'accountId', 'accountName', 'plan', 'nearCap'])
    expect(d.kpis).toMatchObject({ total: 2, withBases: 1, active7: 1, nearBases: 1, nearAcc: 1 })
    expect(d.rows[0].plan).toBe('basic')
    expect(d.rows[1].la).toBe(9999)
    expect(d.byState).toEqual({ active7: 1, mid: 0, idle: 1 })
    expect(d.hist.counts.reduce((t, x) => t + x, 0)).toBe(2)
  })
})

describe('base(id)', () => {
  it('joins detail, creator and siblings', async () => {
    const d = await base(B1)
    expectKeys(d, ['fallback', 'requestedId', 'base', 'account', 'limits', 'seatLim', 'share', 'autoShare', 'runsEst', 'activity', 'activeDays', 'sumEv', 'people', 'peopleTotal', 'siblings', 'ownerName'])
    expectKeys(d.base, ['id', 'name', 'slug', 'created', 'tables', 'records', 'automations', 'portals', 'collaborators', 'lastActive'])
    expect(d.base.portals).toBe(3)
    expect(d.fallback).toBe(false)
    expect(d.base.slug).toBe('sales')
    expect(d.account.id).toBe('a1')
    expect(d.limits).toEqual({ records: 1000, runs: 100 })
    expect(d.runsEst).toBe(40)
    expect(d.activity).toHaveLength(90)
    expect(d.activity[89].daysAgo).toBe(0)
    expect(d.siblings.map((s) => s.id)).toEqual([B2])
    expect(d.people[0]).toMatchObject({ role: 'مالک', lastSeen: 1 }) // owner's own lastSeenDays; /customers/:id members are the others only
    expect(d.people[1].lastSeen).toBe(30)
  })
  it('lets a 404 propagate', async () => {
    await expect(base('d'.repeat(24))).rejects.toThrow('404')
  })
})

describe('quota()', () => {
  it('lists accounts at ≥80% of records or runs', async () => {
    const d = await quota()
    expectKeys(d, ['budgets', 'resources', 'kpis', 'perRes', 'rules', 'upsellN', 'rows'])
    expectKeys(d.kpis, ['near', 'seen30', 'full', 'fullTop', 'hits', 'hitAccounts', 'sms', 'ai'])
    expect(d.budgets).toBeNull()
    expect(d.resources.map((r) => r.key)).toEqual(['records', 'runs'])
    expect(d.rows).toHaveLength(1)
    expect(d.rows[0].usage.map((u) => u.key)).toEqual(['records', 'runs'])
    expect(d.rows[0].maxUsage.key).toBe('records')
    expect(d.rows[0].maxUsage.forecast).toBe('na')
    expect(d.rows[0].action).toEqual({ kind: 'upgrade' })
    expect(d.kpis).toMatchObject({ near: 1, hits: 1, hitAccounts: 1 })
    expect(d.perRes.map((r) => r.key).sort()).toEqual(['records', 'runs'])
  })
})

describe('jobs()', () => {
  it('maps Bull counts and crons, sync row first', async () => {
    const d = await jobs()
    expectKeys(d, ['thresholds', 'kpis', 'expire', 'queues', 'hourly', 'failWindow', 'crons'])
    expectKeys(d.kpis, ['waiting', 'waitingThen', 'trendSum', 'active', 'queues', 'failed24', 'worstFail', 'failedCrons', 'cronsTotal', 'maxDelay'])
    expectKeys(d.queues[0], ['key', 'name', 'waiting', 'active', 'failed24', 'delay', 'throughput', 'trend', 'sla', 'status'])
    expectKeys(d.crons[0], ['key', 'name', 'schedule', 'lastT', 'lastAt', 'duration', 'status', 'isNew', 'error', 'next', 'queued'])
    expect(d.queues[0]).toMatchObject({ waiting: 350, active: 2, failed24: 12, status: 'warn' })
    expect(d.queues[1].status).toBe('crit')
    expect(d.kpis.waiting).toBe(350)
    expect(d.crons[0]).toMatchObject({ key: 'management-nightly', status: 'ok', queued: true, canRun: true, lastT: 0 })
    expect(d.crons[1]).toMatchObject({ key: 'expire', status: 'fail', lastT: 1, error: 'cursor id not found', canRun: false })
    expect(d.crons[1].duration).toContain('دقیقه')
    expect(d.kpis.failedCrons).toEqual(['انقضای اشتراک'])
    expect(d.hourly).toEqual([])
    expect(d.expire).toBeNull()
  })
})

describe('dataHealth()', () => {
  it('has one daily source and a trailing-median expectation', async () => {
    const d = await dataHealth()
    expectKeys(d, ['sources', 'worst', 'dropped', 'dropSources', 'issuesOpen', 'issuesInProgress', 'events', 'gap', 'fresh', 'policyExamples', 'issues', 'affected', 'unaffected'])
    expect(d.sources).toHaveLength(1)
    expect(d.sources[0]).toMatchObject({ key: 'behavior', status: 'good', lagMin: 0 })
    expect(d.policyExamples.good).toBe(d.sources[0])
    expect(d.events).toHaveLength(30)
    expect(d.events[0]).toMatchObject({ daysAgo: 29, received: 1000, expected: 1000 })
    expect(d.events[10].expected).toBe(1007) // upper median of days 3..9 (day 5 missing), same floor(n/2) rule as the server
    expect(d.gap).toMatchObject({ missing: 1, low: 0, lastMissing: 24 })
    expect(d.affected.every((p) => p.src === 'behavior')).toBe(true)
  })
})

describe('settings()', () => {
  it('builds defaults from definitions and merges local thresholds', async () => {
    const d = await settings()
    expectKeys(d, ['defaults', 'current', 'saved', 'defs', 'perms', 'roles', 'audit'])
    expectKeys(d.defs, ['activeWindow', 'activation', 'habit', 'dormantDays', 'active7', 'dormant', 'mrrNow', 'payNow', 'payPrev', 'churnCount', 'churnRate', 'nrr', 'cycles', 'components', 'bands', 'plans', 'segments'])
    expect(d.defaults).toEqual({ actRecords: 10, actDays: 7, good: 70, warn: 50, ser: 30, upHits: 1, upPricing: 0, upSeen: 14 })
    expect(d.current.good).toBe(75)
    expect(d.saved).toBe(true)
    expect(d.defs).toMatchObject({ mrrNow: 500000, payNow: 1, payPrev: 2, churnCount: 1, churnRate: 0.125 })
    expect(d.defs.nrr).toBeCloseTo((400000 + 100000 - 50000) / 400000)
    expect(d.defs.plans.map((p) => p.key)).toEqual(['basic', 'team', 'business', 'enterprise', 'partner'])
    expect(d.defs.plans[0].limits).toMatchObject({ records: 1000, runs: 100 })
    expect(d.defs.segments.find((s) => s.key === 'upsell').n).toBe(1)
    expect(d.defs.bands.find((b) => b.key === 'good').n).toBe(1)
    expect(d.audit[0].src).toBe('local')
  })
  it('previews candidate thresholds', async () => {
    const p = await settingsPreview({ good: 90, warn: 50, ser: 30, upHits: 1, upPricing: 0, upSeen: 14 })
    expect(p.upsell).toEqual({ n: 1, today: 1 })
    expect(p.bands.find((b) => b.key === 'good').n).toBe(0)
    expect(p.bands.find((b) => b.key === 'warn')).toMatchObject({ n: 1, today: 0 })
  })
})
