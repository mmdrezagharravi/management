import { describe, it, expect } from 'vitest'
import { now } from 'src/lib/format'

describe('journey sample data', () => {
  it('fills every live cell without moving the app clock', async () => {
    const before = now()
    const { journey } = await import('src/api/mock/journey')
    const d = await journey({ range: 30 })
    expect(now()).toBe(before)
    expect(d.funnel.map((s) => s.key)).toEqual(['visit', 'signup', 'firstBase', 'activated', 'habit', 'paid'])
    for (const s of d.funnel) expect(s.n).toBeGreaterThan(0)
    expect(d.visits.sessions).toBe(d.funnel[0].n)
    expect(d.visits.channels.length).toBeGreaterThan(1)
    expect(d.visits.channels.reduce((t, c) => t + c.sessions, 0)).toBe(d.visits.sessions)
    expect(d.renew.due).toBeGreaterThan(0)
    expect(d.drops).toHaveLength(3)
  })
})
