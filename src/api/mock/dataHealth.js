/* GET /management/data-health — ingestion freshness, expected vs received events, known issues. */
import { DB } from 'src/mock/engine'
import { C, ok } from './shared'

// Freshness policy (minutes of lag): the same thresholds colour the top-bar pill.
const FRESH = { good: 60, warn: 1440 }
const RANK = { good: 0, warn: 1, crit: 2 }
const byLag = (m) => (m < FRESH.good ? 'good' : m < FRESH.warn ? 'warn' : 'crit')
const statusOf = (s) => { const p = byLag(s.lagMin); return RANK[s.status] > RANK[p] ? s.status : p }
const ISSUE = { open: 'crit', in_progress: 'warn', done: 'good' }

const AFFECTED = [
  { to: '/customers', label: 'همهٔ مشتریان', src: 'behavior', what: 'ستون‌های «آخرین فعالیت» و «روند ۳۰ روز»' },
  { to: '/health', label: 'سلامت و ریسک', src: 'behavior', what: 'مؤلفهٔ «فعالیت» امتیاز سلامت؛ کار این چند ساعت هنوز حساب نشده' },
  { to: '/features', label: 'استفاده از قابلیت‌ها', src: 'behavior', what: 'استفادهٔ قابلیت‌ها در بازهٔ تأخیر ناقص است' },
  { to: '/journey', label: 'نقشهٔ مسیر مشتری', src: 'behavior', what: 'پذیرش دعوت و دیدن صفحهٔ قیمت' },
  { to: '/funnel', label: 'قیف تبدیل', src: 'clarity', what: 'پلهٔ «بازدید سایت» — بازدیدهای امروز هنوز نرسیده' },
  { to: '/acquisition', label: 'منابع جذب', src: 'clarity', what: 'بازدید هر منبع و نرخ ثبت‌نام امروز' },
]

export function dataHealth() {
  const { ops } = DB
  const S = ops.ingestion.map((s) => {
    // wall-clock time of the newest record that has arrived
    let t = C.nowMinutes - s.lagMin, d = 0
    while (t < 0) { t += 1440; d++ }
    return { key: s.key, name: s.name, desc: s.desc, lagMin: s.lagMin, rate: s.rate, dropped24: s.dropped24, status: statusOf(s), lastData: { daysAgo: d, min: t } }
  })
  const src = (k) => S.find((s) => s.key === k)
  const worst = S.slice().sort((p, q) => q.lagMin - p.lagMin)[0]

  const E = ops.eventsHourly // oldest → newest, h = hours ago
  const nowHr = Math.floor(C.nowMinutes / 60)
  const brk = E.filter((x) => x.received < x.expected * 0.9)
  const miss24 = E.filter((x) => x.h < 24).reduce((t, x) => t + x.expected - x.received, 0)
  const beh = src('behavior')

  const owners = {}
  ops.knownIssues.forEach((i) => { owners[i.owner] = (owners[i.owner] || 0) + 1 })
  return ok({
    sources: S,
    worst: { key: worst.key, name: worst.name, desc: worst.desc, lagMin: worst.lagMin },
    dropped: S.reduce((t, s) => t + s.dropped24, 0), dropSources: S.filter((s) => s.dropped24 > 0).map((s) => s.desc),
    issuesOpen: ops.knownIssues.filter((i) => i.status === 'open').length, issuesInProgress: ops.knownIssues.filter((i) => i.status === 'in_progress').length,
    events: E.map((x) => ({ h: x.h, hr: (((nowHr - x.h) % 24) + 24) % 24, day: x.h <= nowHr ? 'today' : x.h <= nowHr + 24 ? 'yesterday' : 'before', expected: x.expected, received: x.received })),
    gap: brk.length ? { sinceHours: Math.max(...brk.map((x) => x.h)), cap: Math.max(...brk.map((x) => x.received)), miss24, dropped24: beh.dropped24, queued: Math.max(0, miss24 - beh.dropped24) } : null,
    fresh: FRESH,
    policyExamples: { good: src('main') && S.find((s) => s.status === 'good') || null, warn: S.find((s) => s.status === 'warn') || null, crit: S.find((s) => s.status === 'crit') || null },
    issues: ops.knownIssues.map((i) => ({ id: i.id, title: i.title, impact: i.impact, owner: i.owner, status: i.status, level: ISSUE[i.status] || 'info' })),
    owners: Object.entries(owners).map(([name, n]) => ({ name, n })),
    affected: AFFECTED.map((p) => { const s = src(p.src); return { ...p, desc: s.desc, lagMin: s.lagMin, status: s.status } }),
    unaffected: [src('wallet').desc, src('main').desc],
  })
}
