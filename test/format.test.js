import { describe, it, expect } from 'vitest'
import { fa, n, compact, compactParts, pct, signedPct, date, ago, inDays, clock, norm, setNow, jalali } from '../src/lib/format.js'
import { delta, band } from '../src/lib/ui.js'

// the mock world's fixed "today": 31 Shahrivar 1405
setNow(Date.UTC(2026, 8, 22, 9, 40))

describe('numbers', () => {
  it('uses Persian digits and separators', () => {
    expect(fa(1405)).toBe('۱۴۰۵')
    expect(n(1234567)).toBe('۱٬۲۳۴٬۵۶۷')
    expect(n(null)).toBe('—')
  })
  it('compacts with the right unit', () => {
    expect(compact(264653000)).toBe('۲۶۵ میلیون')
    expect(compact(26465300)).toBe('۲۶٫۵ میلیون')
    expect(compact(-360000)).toBe('−۳۶۰ هزار')
    expect(compactParts(2_900_000_000)).toEqual({ num: '۲٫۹', unit: 'میلیارد' })
    expect(compact(950)).toBe('۹۵۰')
  })
  it('formats percentages', () => {
    expect(pct(0.314)).toBe('۳۱٪')
    expect(signedPct(-0.052, 1)).toBe('−۵٫۲٪')
  })
})

describe('dates', () => {
  it('converts days-ago to Jalali', () => {
    expect(jalali(0)).toEqual({ y: 1405, m: 6, d: 31 })
    expect(date(0)).toBe('۳۱ شهریور')
    expect(date(0, { year: true })).toBe('۳۱ شهریور ۱۴۰۵')
    expect(date(365)).toBe('۳۱ شهریور ۱۴۰۴')   // year shown when it differs
  })
  it('relative time', () => {
    expect(ago(1)).toBe('هم‌اکنون')
    expect(ago(90)).toBe('۲ ساعت پیش')
    expect(ago(1440 * 3)).toBe('۳ روز پیش')
    expect(inDays(0)).toBe('امروز'); expect(inDays(1)).toBe('فردا'); expect(inDays(5)).toBe('۵ روز دیگر')
    expect(clock(13 * 60 + 5)).toBe('۱۳:۰۵')
  })
})

describe('text', () => {
  it('normalises Arabic variants and Persian digits for search', () => {
    expect(norm('كتاب ۱۲')).toBe('کتاب 12')
  })
})

describe('ui helpers', () => {
  it('delta: good change is green, and "goodUp:false" flips it', () => {
    expect(delta(110, 100)).toEqual({ cls: 'good', arrow: '▲', text: '۱۰٪' })
    expect(delta(110, 100, { goodUp: false }).cls).toBe('bad')
    expect(delta(50, 70, { abs: true })).toEqual({ cls: 'bad', arrow: '▼', text: '۲۰' })
    expect(delta(0.3, 0.3, { points: true }).text).toBe('بدون تغییر')
    expect(delta(5, 0)).toBeNull()
  })
  it('health bands are contiguous', () => {
    expect(band(70).key).toBe('good'); expect(band(69).key).toBe('warn'); expect(band(49).key).toBe('ser'); expect(band(0).key).toBe('crit')
  })
})
