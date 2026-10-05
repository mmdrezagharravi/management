/* GET /management/data-health → one source (the behavioural sync: every minute for today, settled nightly), daily expected vs received events. */
import { get } from './client'
import { clock, daysAgo } from 'src/lib/format'
import { LAG } from './customers'

// Freshness policy in minutes since the last sync — the same thresholds the page banners and alerts use.
const FRESH = { good: LAG.warn, warn: LAG.crit }
const byLag = (m) => (m == null ? 'unknown' : m < FRESH.good ? 'good' : m < FRESH.warn ? 'warn' : 'crit')
const tehranMin = (x) => { const [h, m] = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Tehran' }).format(new Date(x)).split(':'); return +h * 60 + +m }

const AFFECTED = [
  { to: '/customers', label: 'همهٔ مشتریان', src: 'behavior', what: 'ستون‌های «آخرین فعالیت» و «روند ۳۰ روز»' },
  { to: '/health', label: 'سلامت و ریسک', src: 'behavior', what: 'مؤلفهٔ «فعالیت» امتیاز سلامت؛ کار روزهای همگام‌نشده هنوز حساب نشده' },
  { to: '/features', label: 'استفاده از قابلیت‌ها', src: 'behavior', what: 'استفادهٔ قابلیت‌ها در بازهٔ تأخیر ناقص است' },
  { to: '/journey', label: 'نقشهٔ مسیر مشتری', src: 'behavior', what: 'فعال‌سازی و عادت ثبت‌نام‌های تازه' },
]

export async function dataHealth() {
  const d = await get('/data-health')
  const lagMin = d.lagMinutes ?? null
  const src = {
    key: 'behavior', name: 'SyncDay', desc: 'رویدادهای رفتاری', lagMin, rate: null, rateText: 'هر دقیقه؛ روزهای گذشته شبانه نهایی می‌شوند', dropped24: null, status: byLag(lagMin),
    lastData: d.lastSyncedAt ? { daysAgo: daysAgo(d.lastSyncedAt) ?? 0, min: tehranMin(d.lastSyncedAt) } : null,
  }
  // expected = median of the same weekday in the 4 weeks before (server rule; null until two such days exist)
  const series = d.series || []
  const events = series.map((x) => ({ daysAgo: daysAgo(x.day) ?? 0, day: x.day, synced: !!x.synced, expected: x.expected ?? null, received: x.events || 0 }))
  const missing = d.missingDays || [], lowVol = d.lowVolumeDays || []
  return {
    sources: [src],
    worst: { key: src.key, name: src.name, desc: src.desc, lagMin: src.lagMin },
    dropped: null, dropSources: [],
    issuesOpen: null, issuesInProgress: null, issuesTracked: false,
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
