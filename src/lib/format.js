/* Formatting helpers shared by every page: Persian digits, compact numbers,
   money, percentages, Jalali dates and relative time.
   Dates are stored as Gregorian and only formatted to Jalali here. */

const FA = '۰۱۲۳۴۵۶۷۸۹'
const DAY = 864e5
let NOW = Date.now()

/** The mock world has a fixed "today"; the real API uses the wall clock. */
export function setNow(ms) { NOW = ms }
export function now() { return NOW }

export const fa = (s) => String(s).replace(/[0-9]/g, (d) => FA[+d])
export const latin = (s) => String(s).replace(/[۰-۹]/g, (d) => FA.indexOf(d))

const NF = {}
export const nfx = (d) => NF[d] || (NF[d] = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: d, minimumFractionDigits: 0 }))
export const n = (x, d) => (x == null || isNaN(x) ? '—' : nfx(d || 0).format(x))

export function compact(x, d) {
  if (x == null || isNaN(x)) return '—'
  const a = Math.abs(x)
  const sgn = x < 0 ? '−' : ''
  if (a >= 1e9) return sgn + nfx(d == null ? 1 : d).format(a / 1e9) + ' میلیارد'
  if (a >= 1e6) return sgn + nfx(d == null ? (a >= 1e8 ? 0 : 1) : d).format(a / 1e6) + ' میلیون'
  if (a >= 1e4) return sgn + nfx(0).format(a / 1e3) + ' هزار'
  return sgn + nfx(0).format(a)
}
export function compactParts(x) {
  const a = Math.abs(x || 0)
  if (a >= 1e9) return { num: nfx(1).format(x / 1e9), unit: 'میلیارد' }
  if (a >= 1e6) return { num: nfx(a >= 1e8 ? 0 : 1).format(x / 1e6), unit: 'میلیون' }
  if (a >= 1e4) return { num: nfx(0).format(x / 1e3), unit: 'هزار' }
  return { num: nfx(0).format(x), unit: '' }
}
export const CURRENCY = 'تومان'
export const money = (x, unit) => compact(x) + (unit === false ? '' : ' ' + CURRENCY)
export const pct = (x, d) => (x == null || isNaN(x) ? '—' : nfx(d || 0).format(x * 100) + '٪')
export const signedPct = (x, d) => (x > 0 ? '+' : x < 0 ? '−' : '') + nfx(d || 0).format(Math.abs(x * 100)) + '٪'
export const signed = (x, f) => (x > 0 ? '+' : x < 0 ? '−' : '') + (f || compact)(Math.abs(x))

/* ------------------------------------------------------------- dates */
export const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
export const WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه']

const jFmt = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'Asia/Tehran' })
const jCache = new Map()
export const dayDate = (daysAgo) => new Date(NOW - daysAgo * DAY)
const keyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }) // YYYY-MM-DD
/** Tehran calendar days from a timestamp or a server day key ("YYYY-MM-DD") to today; the inverse of date(). */
export function daysAgo(x) {
  if (!x) return null
  const key = /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : keyFmt.format(new Date(x))
  return Math.round((Date.parse(keyFmt.format(NOW)) - Date.parse(key)) / DAY)
}
/** Signup day of an account as "days ago": from signedUpAt (User.createdAt) when the server sent it, else from its age. */
export const signupDaysAgo = (a) => (a.signedUpAt ? daysAgo(a.signedUpAt) : a.age)
/** Jalali {y, m, d} for a day given as "days ago" (0 = today). */
export function jalali(daysAgo) {
  const key = NOW + ':' + daysAgo
  let v = jCache.get(key)
  if (!v) {
    const p = {}
    for (const x of jFmt.formatToParts(dayDate(daysAgo))) p[x.type] = x.value
    v = { y: +p.year, m: +p.month, d: +p.day }
    jCache.set(key, v)
  }
  return v
}
/** "۳۱ شهریور" or "۳۱ شهریور ۱۴۰۵" (year shown when it differs from this year, or o.year === true). */
export function date(daysAgo, o = {}) {
  const j = jalali(daysAgo)
  const cur = jalali(0)
  const y = o.year === true || (o.year !== false && j.y !== cur.y)
  return fa(j.d) + ' ' + MONTHS[j.m - 1] + (y ? ' ' + fa(j.y) : '')
}
export const monthLabel = (mo, withYear) => MONTHS[mo.m - 1] + (withYear ? ' ' + fa(String(mo.y).slice(2)) : '')
export const weekdayName = (daysAgo = 0) => WEEKDAYS[dayDate(daysAgo).getUTCDay()]
export const todayLabel = () => weekdayName(0) + ' ' + date(0, { year: true })

/** Jalali date and Tehran time for an ISO timestamp. */
export function dateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tehran',
  }).format(d)
}

export function ago(minutes) {
  if (minutes == null) return '—'
  if (minutes < 2) return 'هم‌اکنون'
  if (minutes < 60) return fa(Math.round(minutes)) + ' دقیقه پیش'
  if (minutes < 1440) return fa(Math.round(minutes / 60)) + ' ساعت پیش'
  const d = Math.floor(minutes / 1440)
  if (d >= 9999) return '—' // the http adapters' "no activity on record" (sorts last)
  if (d === 1) return 'دیروز'
  if (d < 31) return fa(d) + ' روز پیش'
  if (d < 365) return fa(Math.round(d / 30)) + ' ماه پیش'
  return 'بیش از یک سال'
}
export const agoDays = (d) => (d === 0 ? 'امروز' : d === 1 ? 'دیروز' : ago(d * 1440))
export const inDays = (d) => (d <= 0 ? 'امروز' : d === 1 ? 'فردا' : fa(d) + ' روز دیگر')
export const clock = (min) => fa(String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'))
export const duration = (d) => (d < 60 ? fa(d) + ' روز' : d < 730 ? fa(Math.round(d / 30.4)) + ' ماه' : n(d / 365, 1) + ' سال')
export const lagText = (m) => (m < 60 ? fa(m) + ' دقیقه' : m < 1440 * 2 ? fa(Math.round(m / 60)) + ' ساعت' : fa(Math.round(m / 1440)) + ' روز')

/* ------------------------------------------------------------- text */
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
/** Search normalisation: Arabic/Persian letter variants, diacritics, Persian digits. */
export const norm = (s) => String(s || '').toLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[‌‏ً-ٟ]/g, '').replace(/[۰-۹]/g, (d) => FA.indexOf(d)).trim()
export const initials = (name) => { const p = String(name).split(' ').filter(Boolean); return (p[1] || p[0] || '?').slice(0, 1) }
