/* GET /management/data-health → one source (the nightly behavioural sync), daily expected vs received events. */
import { get } from './client'
import { clock, daysAgo } from 'src/lib/format'

// Freshness policy in minutes of lag: the sync runs once a day, so "good" is up to one day behind.
const FRESH = { good: 2 * 1440, warn: 4 * 1440 }
const byLag = (m) => (m == null ? 'crit' : m < FRESH.good ? 'good' : m < FRESH.warn ? 'warn' : 'crit')
const tehranMin = (x) => { const [h, m] = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Tehran' }).format(new Date(x)).split(':'); return +h * 60 + +m }

const AFFECTED = [
  { to: '/customers', label: 'همهٔ مشتریان', src: 'behavior', what: 'ستون‌های «آخرین فعالیت» و «روند ۳۰ روز»' },
  { to: '/health', label: 'سلامت و ریسک', src: 'behavior', what: 'مؤلفهٔ «فعالیت» امتیاز سلامت؛ کار روزهای همگام‌نشده هنوز حساب نشده' },
  { to: '/features', label: 'استفاده از قابلیت‌ها', src: 'behavior', what: 'استفادهٔ قابلیت‌ها در بازهٔ تأخیر ناقص است' },
  { to: '/journey', label: 'نقشهٔ مسیر مشتری', src: 'behavior', what: 'فعال‌سازی و عادت ثبت‌نام‌های تازه' },
]

export async function dataHealth() {
  const d = await get('/data-health')
  const lagMin = (d.lagDays == null ? 99 : d.lagDays) * 1440 // never synced → treated as 99 days behind
  const src = {
    key: 'behavior', name: 'SyncDay', desc: 'رویدادهای رفتاری', lagMin, rate: null, dropped24: 0, status: byLag(lagMin),
    lastData: { daysAgo: daysAgo(d.lastSyncedDay) ?? 0, min: d.lastSyncedAt ? tehranMin(d.lastSyncedAt) : 0 },
  }
  // expected = trailing 7-day median of the synced days before it (same rule the server uses for lowVolume)
  const series = d.series || []
  const events = series.map((x, i) => {
    const prev = series.slice(Math.max(0, i - 7), i).map((p) => p.events).filter((v) => v != null).sort((p, q) => p - q)
    const received = x.events || 0
    return { daysAgo: daysAgo(x.day) ?? 0, day: x.day, synced: !!x.synced, expected: prev.length ? prev[Math.floor(prev.length / 2)] : received, received }
  })
  const missing = d.missingDays || [], lowVol = d.lowVolumeDays || []
  return {
    sources: [src],
    worst: { key: src.key, name: src.name, desc: src.desc, lagMin: src.lagMin },
    dropped: 0, dropSources: [],
    issuesOpen: 0, issuesInProgress: 0,
    events,
    gap: missing.length || lowVol.length ? { missing: missing.length, low: lowVol.length, lastMissing: missing.length ? daysAgo(missing[missing.length - 1]) : null } : null,
    fresh: FRESH,
    policyExamples: { good: src.status === 'good' ? src : null, warn: src.status === 'warn' ? src : null, crit: src.status === 'crit' ? src : null },
    issues: [],
    affected: AFFECTED.map((p) => ({ ...p, desc: src.desc, lagMin: src.lagMin, status: src.status })),
    unaffected: ['فاکتورها و قراردادها (Mongo)'],
    dataSince: d.dataSince || null,
  }
}
