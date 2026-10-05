import { describe, it, expect, vi } from 'vitest'

// local (browser) stores and the axios client are replaced; the adapters only see server-shaped JSON
vi.mock('stores/local', () => ({ useLocalStore: () => ({ owners: {}, notes: { a1: [{ who: 'من', text: 'زنگ زدم', kind: 'call' }] }, tasks: {} }) }))
vi.mock('stores/session', () => ({ useSessionStore: () => ({ token: 't', user: null }) }))
vi.mock('src/api/http/client', () => {
  const memo = (fn) => fn
  const get = vi.fn(), all = vi.fn()
  return { get, all, post: vi.fn(), memo }
})
const { get, all } = await import('src/api/http/client')
const { customers, customersPage, search, alerts, navBadges, freshness } = await import('src/api/http/customers')
const { basesPage } = await import('src/api/http/bases')
const { customer, quickView, customerJourney } = await import('src/api/http/customer')

const iso = (d) => new Date(Date.now() - d * 864e5).toISOString()
const day = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(Date.now() - d * 864e5) // server day keys are Tehran dates
const summary = (o = {}) => ({
  id: 'a1', name: 'شرکت نمونه', mobile: '09121234567', plan: 'team', seats: 5, cycle: '12m', paying: true, everPaid: true, mrr: 500000, until: iso(-40), renewIn: 40, pastDue: true,
  signedUpAt: iso(200), age: 200, blocked: false, referredBy: null, bases: 2, records: 1200, automations: 3, runs: 10, runsLimit: 100, atLimit: false,
  memberCount: 3, activeMembers7: 2, lastSeenDays: 1, events7: 20, events30: 90, activeDays7: 4, activeDays28: 15, trendPct: -20, activated: true, habit: true, firstBaseDays: 1,
  last30: Array.from({ length: 30 }, (_, i) => i),
  firstPaidAt: iso(150), payingDays: 150, lifetimeRevenue: 1100000, health: 25, band: 'crit', components: { activity: 5, trend: 3, depth: 8, team: 6, commercial: 3 }, segments: ['upsell'],
  health2wAgo: 40, healthHistory: [50, 48, 45, 44, 40, 35, 30, 25], ...o,
})
const detail = () => ({
  ...summary(), email: 'x@y.z', referredBy: null, referrals: 0,
  basesList: [{ id: 'b'.repeat(24), name: 'فروش', createdAt: iso(199), isTemplate: false, records: 1000, recordsLimit: 50000, usage: 0.02, atLimit: false, tables: 4, automations: 3, collaborators: 2, lastSeenDays: 1 },
    { id: 'c'.repeat(24), name: 'مشترک', createdAt: iso(20), records: 5, tables: 1, automations: 0, collaborators: 3, lastSeenDays: 2, role: 'owner', creator: { id: 'd'.repeat(24), name: 'ابوالفضل', mobile: '0912' } }],
  members: [{ id: 'm2', name: null, mobile: '09351112233', lastSeenDays: 30 }],
  invoices: [
    { id: 'i3', type: 'PlanInvoice', status: 'Failed', amount: 6000000, mrr: 500000, createdAt: iso(2), paidAt: null, plan: 'team', cycle: '12m', seats: 5 },
    { id: 'i2', type: 'PlanInvoice', status: 'Paid', amount: 6000000, mrr: 500000, createdAt: iso(100), paidAt: iso(100), plan: 'team', cycle: '12m', seats: 5 },
    { id: 'i1', type: 'PlanInvoice', status: 'Paid', amount: 3000000, mrr: 250000, createdAt: iso(150), paidAt: iso(150), plan: 'team', cycle: '12m', seats: 2 },
  ],
  contract: null,
  activity: Array.from({ length: 90 }, (_, i) => ({ day: day(89 - i), events: i })),
  features: { Record: 40, View: 3, Automation: 0 },
  healthHistory: [{ day: day(14), score: 41, band: 'warn' }, { day: day(0), score: 25, band: 'crit' }],
})

// keys of the mock twins (src/api/mock/customer.js, shared.js enrich())
const ACCOUNT_KEYS = ['id', 'name', 'slug', 'industry', 'industryName', 'city', 'source', 'age', 'contact', 'plan', 'cycle', 'seats', 'mrr', 'paying', 'everPaid', 'health', 'band', 'components', 'health2wAgo', 'healthHistory', 'lastSeenDays', 'lastSeenMin', 'online', 'memberCount', 'activeMembers7', 'activeDays28', 'activeDays7', 'events30', 'records30', 'records', 'trendPct', 'renewIn', 'churnedAt', 'churnReason', 'pastDue', 'tenureDays', 'limitHits30', 'pricingVisits30', 'tickets', 'nps', 'segments', 'maxUsage', 'usage', 'bases', 'automations', 'upgradeValue', 'last30', 'milestones', 'feat', 'invitesSent', 'wk', 'decline']
const CUSTOMER_KEYS = ['fallback', 'account', 'ev120', 'au120', 'paidTotal', 'paidCount', 'lastInvoiceRetries', 'weakest', 'nextStep', 'log', 'activeMembersToday', 'invitesAccepted', 'cycleDiscount', 'members', 'bases', 'invoices', 'planEvents', 'timeline', 'interactions', 'notes', 'limits', 'featureList', 'profile']

describe('http customers adapter', () => {
  it('customers() lists every account, no cities', async () => {
    all.mockResolvedValue([summary(), summary({ id: 'a2', paying: false, plan: 'basic', mrr: 0, health: 80, band: 'good', pastDue: false, segments: [] })])
    const d = await customers()
    expect(d.cities).toEqual([])
    expect(d.rows).toHaveLength(2)
    for (const k of ACCOUNT_KEYS) expect(d.rows[0]).toHaveProperty(k)
    expect(d.rows[0].plan).toBe('team'); expect(d.rows[1].plan).toBe('basic')
    expect(d.rows[0].last30).toHaveLength(30)
  })
  it('customersPage()/basesPage() send the table state to the server and map one page back', async () => {
    get.mockResolvedValueOnce({ items: [summary()], total: 41, page: 1, size: 25, counts: { all: 90, risk: 41 } })
    const params = { view: 'risk', q: '0912', plan: 'team', band: 'crit', sort: 'health', dir: 'asc', page: 1, size: 25 }
    const r = await customersPage(params)
    expect(get).toHaveBeenLastCalledWith('/customers', params)
    expect(r.total).toBe(41)
    expect(r.counts).toEqual({ all: 90, risk: 41 })
    expect(r.rows[0].id).toBe('a1')
    expect(r.rows[0]).toHaveProperty('collaboratorLimit')

    get.mockResolvedValueOnce({ items: [{ id: 'b1', name: 'crm', creator: { id: 'a1', name: 'x', plan: 'team' }, records: 5, lastSeenDays: 2 }], total: 1, counts: { all: 1 } })
    const b = await basesPage({ view: 'active', page: 0, size: 25 })
    expect(get).toHaveBeenLastCalledWith('/bases', { templates: false, view: 'active', page: 0, size: 25 })
    expect(b.rows[0]).toMatchObject({ id: 'b1', name: 'crm', la: 2, plan: 'team' })
  })
  it('search() hits both lists', async () => {
    get.mockImplementation((p) => Promise.resolve(p === '/customers' ? { items: [summary()], total: 1 } : { items: [{ id: 'b'.repeat(24), name: 'فروش', records: 9, creator: { id: 'a1', name: 'شرکت نمونه' } }], total: 1 }))
    const r = await search('فروش')
    expect(r.customers[0].contact.mobile).toBe('09121234567')
    expect(r.bases[0]).toEqual({ id: 'b'.repeat(24), name: 'فروش', slug: 'bbbbbbbb', records: 9, accountName: 'شرکت نمونه' })
    expect(await search('  ')).toEqual({ customers: [], bases: [] })
  })
  it('alerts()/navBadges()/freshness() from customers + jobs + data-health', async () => {
    get.mockImplementation((p) => Promise.resolve(p === '/jobs' ? { crons: [{ key: 'k', name: 'شبانه', schedule: '30 1 * * *', lastStatus: 'fail', lastRunAt: iso(1), lastError: 'boom', consecutiveFails: 1, intervalMs: 864e5 }], sync: {} } : { lagMinutes: 8 * 60 }))
    const al = await alerts()
    expect(al.map((x) => x.to)).toEqual(['/jobs', '/data-health', '/sales?tab=pastdue', '/health'])
    expect(al[2].mrr).toBe(500000)
    for (const x of al) expect(Object.keys(x)).toEqual(expect.arrayContaining(['lvl', 't', 'd', 'to']))
    expect(await navBadges()).toEqual({ today: null, health: { n: 1, warn: true }, jobs: { n: 1, warn: true }, 'data-health': { n: 1, warn: true } })
    expect(await freshness(['main'])).toEqual({ key: 'behavior', name: 'index=behavior', desc: 'رویدادهای رفتاری', lagMin: 8 * 60, status: 'crit' })
  })

  it('treats a missing data-health report as unknown, not fresh', async () => {
    get.mockImplementation((p) => (p === '/data-health' ? Promise.reject(new Error('down')) : Promise.resolve(p === '/jobs' ? { crons: [] } : { items: [], total: 0 })))
    expect(await freshness(['main'])).toMatchObject({ lagMin: null, status: 'unknown' })
  })
})

describe('http customer adapter', () => {
  it('customer() has every mock key and derives billing/timeline', async () => {
    get.mockResolvedValue(detail())
    const d = await customer('a1')
    for (const k of CUSTOMER_KEYS) expect(d).toHaveProperty(k)
    for (const k of ACCOUNT_KEYS) expect(d.account).toHaveProperty(k)
    expect(d.fallback).toBe(false)
    expect(d.account.healthHistory).toEqual([null, null, null, null, null, 41, null, d.account.health]) // weekly + current, like the list
    expect(d.ev120).toHaveLength(90); expect(d.ev120[89]).toBe(89)
    expect(d.invoices.map((i) => i.status)).toEqual(['paid', 'paid', 'failed'])
    expect(d.invoices[0].plan).toBe('team'); expect(d.invoices[0].mrr).toBe(250000)
    expect(d.paidTotal).toBe(9000000); expect(d.paidCount).toBe(2)
    expect(d.planEvents.map((e) => e.kind)).toEqual(['new', 'expansion'])
    expect(d.members.map((m) => m.role)).toEqual(['مالک', 'عضو'])
    expect(d.bases[0]).toMatchObject({ slug: 'bbbbbbbb', tables: 4, lastActive: 1, created: 199, role: 'creator', creatorId: null })
    expect(d.bases[1]).toMatchObject({ role: 'owner', creatorId: 'd'.repeat(24), creatorName: 'ابوالفضل' })
    expect(d.weakest).toBe('trend'); expect(d.nextStep).toBeTruthy()
    expect(d.log).toEqual([{ local: true, who: 'من', what: 'زنگ زدم', kind: 'تماس' }])
    expect(d.account.feat).toEqual({ Record: true, View: true })
    expect(d.featureList.some((f) => f.key === 'View')).toBe(true)
    expect(d.featureList).toContainEqual({ key: 'Collaborator', label: 'افزودن همکار' })
    expect(d.timeline.map((e) => e.title)).toEqual(['اولین پرداخت', 'ارتقا', 'پرداخت تمدید ناموفق'])
    expect(d.timeline.every((e) => typeof e.at === 'string')).toBe(true)
  })
  it('customerJourney() labels every step, keeps the order and lists what is not done yet', async () => {
    get.mockResolvedValue({
      observedSince: '2026-08-30', fullyObserved: true, behaviorAvailable: true,
      steps: [
        { key: 'signup', at: '2026-09-01T08:00:00Z', precision: 'time', detail: { referrer: { name: 'رضا' } } },
        { key: 'base', at: '2026-09-01T09:00:00Z', precision: 'time', detail: { name: 'فروش', afterDays: 0 } },
        { key: 'record', at: '2026-09-01T10:00:00Z', precision: 'time', earliestSeen: false },
        { key: 'activated', at: '2026-09-03T20:29:59Z', precision: 'day', detail: { records: 12, dayIndex: 2 } },
        { key: 'unknownFutureStep', at: '2026-09-04T00:00:00Z', precision: 'time' },
      ],
    })
    const j = await customerJourney('a1')
    expect(get).toHaveBeenLastCalledWith('/customers/a1/journey')
    expect(j.steps.map((s) => s.title)).toEqual(['ثبت‌نام', 'اولین بیس', 'اولین رکورد', 'فعال‌سازی'])
    expect(j.steps[0].desc).toBe('با دعوت رضا')
    expect(j.steps[1].desc).toBe('«فروش» · همان روز ثبت‌نام')
    expect(j.steps[3]).toMatchObject({ cls: 'good', desc: 'در ۳ روز اول به ۱۲ ساخت یا ویرایش رکورد رسید' })
    expect(j.notYet).toEqual(['ساخت جدول', 'نمای جدید', 'تنظیم نما', 'خودکارسازی', 'دعوت همکار', 'عادت'])
  })
  it('customer() rethrows the 404, quickView() returns null', async () => {
    get.mockRejectedValue(new Error('مشتری پیدا نشد.'))
    await expect(customer('zzz')).rejects.toThrow('پیدا نشد')
    expect(await quickView('zzz')).toBeNull()
    get.mockResolvedValue(detail())
    const q = await quickView('a1')
    expect(Object.keys(q)).toEqual(['account', 'tasks', 'notes', 'interactions', 'profile'])
    expect(q.notes).toHaveLength(1)
  })
})

describe('accounts created by adding a collaborator', () => {
  it('are sourced "invite" and say who invited them on the journey', async () => {
    const { toAccount } = await import('src/api/http/account')
    expect(toAccount(summary({ invitedBy: 'b'.repeat(24) })).source).toBe('invite')
    expect(toAccount(summary({ invitedBy: null, referredBy: null })).source).toBe('direct')
    get.mockImplementation(() => Promise.resolve({ steps: [{ key: 'signup', at: '2026-09-01T10:00:00Z', precision: 'time', detail: { referrer: null, invitedBy: { id: 'b'.repeat(24), name: 'علی', mobile: null } } }] }))
    const j = await customerJourney('a1')
    const step = (j.steps || j)[0]
    expect(step.title).toBe('ساخت حساب با دعوت همکار')
    expect(step.desc).toContain('علی')
  })
})
