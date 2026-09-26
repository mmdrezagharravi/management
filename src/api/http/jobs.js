/* GET /management/jobs → Bull queue counts, the management sync and the server crons. */
import { get } from './client'
import { useLocalStore } from 'stores/local'
import { fa, clock } from 'src/lib/format'

const T = { critWaiting: 1000, critFailed: 50, warnWaiting: 300, warnFailed: 10 }
const SLA = 60
const qStatus = (q) => (q.error || q.waiting >= T.critWaiting || q.failed24 >= T.critFailed ? 'crit' : q.waiting >= T.warnWaiting || q.failed24 >= T.warnFailed ? 'warn' : 'good')
const daysAgo = (x) => (x ? Math.round((Date.now() - new Date(x)) / 864e5) : null)
const tehranMin = (x) => { const [h, m] = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Tehran' }).format(new Date(x)).split(':'); return +h * 60 + +m }
const durText = (ms) => { if (ms == null) return '—'; const s = Math.round(ms / 1000); return s < 120 ? fa(s) + ' ثانیه' : fa(Math.round(s / 60)) + ' دقیقه' }

export async function jobs() {
  const j = await get('/jobs')
  const qd = useLocalStore().cronRuns
  const queues = (j.queues || []).map((q) => {
    const c = q.counts || {}
    // Bull's `failed` is the failed set as a whole, not a 24-hour window; delay/throughput/trend are not exposed
    const row = { key: q.name.toLowerCase(), name: q.name, waiting: c.waiting || 0, active: c.active || 0, failed24: c.failed || 0, delayed: c.delayed || 0, completed: c.completed || 0, delay: 0, throughput: null, trend: [], sla: SLA, error: q.error || null }
    return { ...row, status: qStatus(row) }
  })
  const sum = (k) => queues.reduce((t, q) => t + q[k], 0)
  const worstFail = queues.slice().sort((p, q) => q.failed24 - p.failed24)[0] || { name: '—', failed24: 0 }

  const s = j.sync || {}
  const syncRow = {
    key: 'management-nightly', name: 'همگام‌سازی پنل مدیریت', schedule: 'روزانه ۰۱:۳۰', canRun: true,
    lastT: daysAgo(s.lastSyncedAt), lastAt: s.lastSyncedAt ? clock(tehranMin(s.lastSyncedAt)) : '', duration: '—',
    status: s.lastSyncedAt && s.lagDays <= 1 ? 'ok' : 'fail', isNew: false,
    error: !s.lastSyncedAt ? 'هنوز هیچ روزی همگام نشده' : s.lagDays > 1 ? 'داده‌ها ' + fa(s.lagDays) + ' روز عقب‌اند (آخرین روز: ' + s.lastSyncedDay + ')' : null,
    next: null, queued: !!qd['management-nightly'],
  }
  // needs backend: `crons` is being added to GET /jobs
  const crons = [syncRow].concat((j.crons || []).map((c) => ({
    key: c.key, name: c.name, schedule: c.schedule, canRun: false,
    lastT: daysAgo(c.lastRunAt), lastAt: c.lastRunAt ? clock(tehranMin(c.lastRunAt)) : '', duration: durText(c.lastDurationMs),
    status: c.lastStatus === 'fail' ? 'fail' : 'ok', isNew: false, error: c.lastError || null, next: null, queued: !!qd[c.key],
  })))
  const failedCrons = crons.filter((c) => c.status === 'fail')
  return {
    thresholds: T,
    kpis: {
      waiting: sum('waiting'), waitingThen: null, trendSum: [], active: sum('active'), queues: queues.length,
      failed24: sum('failed24'), worstFail: { name: worstFail.name, failed24: worstFail.failed24 },
      failedCrons: failedCrons.map((c) => c.name), cronsTotal: crons.length,
      maxDelay: null,
    },
    expire: null,
    queues,
    hourly: [],
    failWindow: null,
    crons,
  }
}
