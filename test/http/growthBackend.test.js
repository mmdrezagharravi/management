import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'

const FIX = JSON.parse(fs.readFileSync(new URL('../fixtures/growth-backend.json', import.meta.url), 'utf8'))

vi.mock('stores/local', () => ({ useLocalStore: () => ({ owners: {}, notes: {}, tasks: {} }) }))
vi.mock('stores/session', () => ({ useSessionStore: () => ({ token: null, user: null }) }))
vi.mock('src/api/http/client', () => ({ get: vi.fn(), all: vi.fn(), post: vi.fn(), memo: (fn) => fn }))
const { get, all } = await import('src/api/http/client')
const http = await import('src/api/http')
const mock = await import('src/api/mock')

const pathOf = (p, params = {}) => {
  const q = new URLSearchParams(params).toString()
  return p + (q ? '?' + q : '')
}
get.mockImplementation((p, params) => {
  const body = FIX[pathOf(p, params)]
  return body ? Promise.resolve(body) : Promise.reject(new Error('not in fixture: ' + pathOf(p, params)))
})
all.mockImplementation((p) => Promise.resolve(p === '/customers' ? FIX['/customers?size=0'].items : []))

const keysOf = (o) => Object.keys(o).sort()
const broken = (v, path = '$', out = []) => {
  if (typeof v === 'number' && !Number.isFinite(v)) out.push(path + '=' + v)
  else if (v === undefined) out.push(path + '=undefined')
  else if (Array.isArray(v)) v.forEach((x, i) => broken(x, path + '[' + i + ']', out))
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) broken(x, path + '.' + k, out)
  return out
}

describe('growth pages on real cloud-back output', () => {
  it.each(['funnel', 'retention', 'acquisition', 'features', 'journey'])('%s keeps the mock shape and has no NaN, Infinity or undefined', async (page) => {
    const d = await http[page]({ range: 30 })
    const m = await mock[page]({ range: 30 })
    expect(keysOf(d)).toEqual(expect.arrayContaining(keysOf(m).filter((k) => k in d)))
    const waitingOnMarketingBackend = page === 'acquisition' ? ['attribution', 'range'] : []
    expect(keysOf(m).filter((k) => !(k in d))).toEqual(waitingOnMarketingBackend)
    expect(broken(d)).toEqual([])
  })

  it('funnel: the panel cohort is the server cohort', async () => {
    const f = await http.funnel({ range: 30 })
    expect(f.steps.map((s) => s.n)).toEqual([null, 7, 6, 5, 4, 2])
    expect(f.cohort.size).toBe(7)
    expect(f.paidAny).toBeCloseTo(2 / 7)
    expect(f.medianDays.firstBase).toBe(0)
    expect(f.worst).toBe('paid')
    expect(f.bySource.map((s) => [s.key, s.signups])).toEqual([['invite', 1], ['direct', 6]])
    const invite = await http.funnel({ range: 30, source: 'invite' })
    expect(invite.steps.map((s) => s.n)).toEqual([null, 1, 1, 1, 1, 1])
  })

  it('retention: cohorts, week-1 curve and churn', async () => {
    const r = await http.retention()
    expect(r.cohorts.reduce((t, c) => t + c.size, 0)).toBe(13)
    expect(r.curves.all.values[0]).toBeCloseTo(8 / 12)
    expect(r.churn.total).toBe(1)
    expect(r.churn.lostMrr).toBe(990_000)
    expect(r.kpis.logo.n).toBe(1)
  })

  it('acquisition: signups without GA', async () => {
    const a = await http.acquisition({ range: 30 })
    expect(a.kpis).toMatchObject({ signups: 2, inviteSignups: 1, signupsPrev: 7 })
  })

  it('features: adoption rates', async () => {
    const f = await http.features({ range: 30 })
    expect(f.active).toBe(5)
    expect(f.rows.find((r) => r.key === 'Record')).toMatchObject({ users: 5, rate: 1 })
    expect(f.rows.every((r) => r.rate >= 0 && r.rate <= 1)).toBe(true)
  })

  it('journey: funnel, renewals and weakest step', async () => {
    const j = await http.journey({ range: 30 })
    expect(j.funnel.map((s) => s.n)).toEqual([null, 7, 6, 5, 4, 2])
    expect(j.renew).toEqual({ due: 2, renewed: 1, rate: 0.5 })
    expect(j.weakest).toBe('paid')
    expect(j.drops[0]).toMatchObject({ key: 'paid', lost: 2 })
    expect(j.stages.map((s) => s.key)).toEqual(['visit', 'signup', 'firstBase', 'activated', 'habit', 'paid', 'renew'].filter((k) => j.stages.some((s) => s.key === k)))
  })

  it.each([7, 90])('journey and funnel stay readable at %i days', async (range) => {
    const j = await http.journey({ range })
    const f = await http.funnel({ range })
    console.log(range, JSON.stringify({ funnel: j.funnel.map((s) => [s.key, s.n, s.fromPrev]), weakest: j.weakest, drops: j.drops, renew: j.renew, worst: f.worst, total: f.total }))
    expect(broken(j)).toEqual([])
    expect(broken(f)).toEqual([])
  })
})
