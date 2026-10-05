/* GET /management/jobs → Bull queue counts, the management sync and the server crons. */
import { get } from './client'
import { fa, clock, daysAgo } from 'src/lib/format'

const T = { critWaiting: 1000, critFailed: 50, warnWaiting: 300, warnFailed: 10 }
const SLA = 60
const qStatus = (q) => (q.error || q.waiting >= T.critWaiting || q.failed24 >= T.critFailed ? 'crit' : q.waiting >= T.warnWaiting || q.failed24 >= T.warnFailed ? 'warn' : 'good')
const tehranMin = (x) => { const [h, m] = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Tehran' }).format(new Date(x)).split(':'); return +h * 60 + +m }
const durText = (ms) => { if (ms == null) return '—'; const s = Math.round(ms / 1000); return s < 120 ? fa(s) + ' ثانیه' : fa(Math.round(s / 60)) + ' دقیقه' }

const HOUR_MS = 3_600_000
const pad = (x) => String(x).padStart(2, '0')
/** Persian label for the five-field cron expressions server.ts uses; the server's own timezone is named when it is not Tehran. */
export function scheduleText(expr, tz = 'Asia/Tehran') {
  const [mi, h, dom] = String(expr || '').trim().split(/\s+/)
  const at = /^\d+$/.test(mi) && /^\d+$/.test(h) ? fa(pad(h) + ':' + pad(mi)) : null
  const zone = tz === 'Asia/Tehran' ? '' : ' (به وقت ' + tz + ')'
  const every = /^\*\/(\d+)$/.exec(mi || '')
  if (every && h === '*') return (every[1] === '1' ? 'هر دقیقه' : 'هر ' + fa(every[1]) + ' دقیقه')
  if (mi === '*' && h === '*') return 'هر دقیقه'
  if (/^\d+$/.test(mi) && h === '*') return 'هر ساعت'
  if (dom && dom !== '*' && at) return 'ماهانه، روز ' + fa(dom) + ' ساعت ' + at + zone
  if (at) return 'روزانه ' + at + zone
  return expr
}
/** One failure of a minutely job is noise; three in a row, a failed hourly-or-slower job, or a job that stopped running is not. */
export const needsAttention = (c) => c.stale || (c.status === 'fail' && (c.consecutiveFails >= 3 || c.intervalMs >= HOUR_MS))
function toCron(c, tz) {
  return {
    key: c.key, name: c.name, schedule: scheduleText(c.schedule, tz), canRun: c.key === 'management-nightly',
    lastT: daysAgo(c.lastRunAt), lastAt: c.lastRunAt ? clock(tehranMin(c.lastRunAt)) : '', duration: durText(c.lastDurationMs),
    status: c.lastStatus === 'fail' ? 'fail' : c.stale ? 'stale' : 'ok', stale: !!c.stale, consecutiveFails: c.consecutiveFails || 0, intervalMs: c.intervalMs || 0,
    runs24: c.runs24 || 0, fails24: c.fails24 || 0, isNew: false, error: c.lastError || null, next: null, running: !!c.running,
  }
}

/** Crons from a raw GET /jobs that need a human, for the alerts and nav badges every page shows. */
export const cronsNeedingAttention = (j) => ((j && j.crons) || []).map((c) => toCron(c, j.serverTimeZone)).filter(needsAttention)

export async function jobs() {
  const j = await get('/jobs')
  const queues = (j.queues || []).map((q) => {
    const c = q.counts || {}
    // failed24 = failed jobs that finished in the last 24h (server scans the retained failed set); delay/throughput/trend are not exposed
    const row = { key: q.name.toLowerCase(), name: q.name, waiting: c.waiting || 0, active: c.active || 0, failed24: q.failed24 ?? 0, failedKept: c.failed || 0, delayed: c.delayed || 0, completed: c.completed || 0, delay: 0, throughput: null, trend: [], sla: SLA, error: q.error || null }
    return { ...row, status: qStatus(row) }
  })
  const sum = (k) => queues.reduce((t, q) => t + q[k], 0)
  const worstFail = queues.slice().sort((p, q) => q.failed24 - p.failed24)[0] || { name: '—', failed24: 0 }

  const tz = j.serverTimeZone || 'Asia/Tehran'
  const crons = (j.crons || []).map((c) => toCron(c, tz))
  const failedCrons = crons.filter(needsAttention)
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
