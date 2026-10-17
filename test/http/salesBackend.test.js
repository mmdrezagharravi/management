import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'

const FIX = JSON.parse(fs.readFileSync(new URL('../fixtures/sales-backend.json', import.meta.url), 'utf8'))

vi.mock('stores/local', () => ({ useLocalStore: () => ({ owners: {}, notes: {}, tasks: {} }) }))
vi.mock('stores/session', () => ({ useSessionStore: () => ({ token: null, user: null }) }))
vi.mock('src/api/http/client', () => ({ get: vi.fn(), all: vi.fn(), post: vi.fn(), memo: (fn) => fn }))
const { get, all } = await import('src/api/http/client')
const { sales } = await import('src/api/http/sales')
const mock = await import('src/api/mock/sales')

all.mockImplementation((p) => Promise.resolve(p === '/customers' ? FIX.customers : []))
get.mockImplementation((p) => Promise.resolve(p === '/renewals' ? FIX.renewals : p === '/definitions' ? FIX.definitions : {}))

const names = (rows) => rows.map((a) => a.name)
const keysOf = (o) => Object.keys(o).sort()

describe('sales desk on real cloud-back output', () => {
  it('returns the same shape as the mock the page was built on', async () => {
    const d = await sales()
    const m = await mock.sales()
    expect(keysOf(d)).toEqual(keysOf(m))
    expect(keysOf(d.kpis)).toEqual(keysOf(m.kpis))
    expect(keysOf(d.lists)).toEqual(keysOf(m.lists))
    expect(keysOf(d.stats)).toEqual(keysOf(m.stats))
  })

  it('puts each seeded customer in its own tab', async () => {
    const { lists } = await sales()
    expect(names(lists.renew)).toEqual(['تمدید', 'معوق'])
    expect(names(lists.upsell)).toEqual(['ارتقا'])
    expect(names(lists.winback)).toEqual(['رفته'])
    expect(names(lists.pastdue)).toEqual(['معوق'])
    expect(names(lists.champions)).toEqual(['وفادار'])
  })

  it('fills every column the page reads, in toman', async () => {
    const { kpis, lists, stats, risk } = await sales()
    expect(risk).toBe(50)

    const renew = lists.renew[0]
    expect(renew).toMatchObject({ renewIn: 10, mrr: 990_000, plan: 'team', cycle: 'monthly' })
    expect(renew.weakest).toMatchObject({ label: expect.any(String), value: expect.any(Number) })
    expect(renew.health).toBeLessThan(risk)
    expect(kpis.renew).toEqual({ n: 2, mrr: 1_980_000, risk: 2 })
    expect(stats.renew).toMatchObject({ n: 2, risk: 2, riskMrr: 1_980_000 })

    const up = lists.upsell[0]
    expect(up.upgradeValue).toBeGreaterThan(0)
    expect(up.maxUsage).toMatchObject({ label: expect.any(String), ratio: expect.any(Number) })
    expect(Number.isFinite(up.lastSeenMin)).toBe(true)
    expect(kpis.upsell).toEqual({ n: 1, value: up.upgradeValue })

    const wb = lists.winback[0]
    expect(wb).toMatchObject({ lostMrr: 990_000, lostPlan: 'team', churnedAt: 21 })
    expect(wb.tenure).not.toBeUndefined()
    expect(kpis.winback).toEqual({ n: 1, lostMrr: 990_000 })

    const pd = lists.pastdue[0]
    expect(pd).toMatchObject({ pastDue: true, mrr: 990_000, lastNote: null })
    expect(kpis.pastdue).toEqual({ n: 1, mrr: 990_000 })

    const ch = lists.champions[0]
    expect(ch).toMatchObject({ mrr: 5_000_000, cycle: 'yearly' })
    expect(ch.tenureDays).toBeGreaterThanOrEqual(180)
    expect(kpis.champions).toEqual({ n: 1, monthly: 0 })
  })

  it('has no hot leads until the buying-intent backend ships', async () => {
    const { lists, kpis } = await sales()
    expect(lists.hot).toEqual([])
    expect(kpis.hot).toEqual({ n: 0, checkout: 0 })
    expect(FIX.customers.every((c) => !('intent30' in c))).toBe(true)
  })
})
