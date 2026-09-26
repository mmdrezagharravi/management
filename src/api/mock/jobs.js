/* GET /management/jobs — Bull queues, hourly automation runs and server crons. */
import { DB } from 'src/mock/engine'
import { C, ok, local } from './shared'
import { latin } from 'src/lib/format'

// How long a job may wait in each queue before we call it late (seconds).
const SLA = { automation: 60, notify: 30, rag: 300, backup: 900, export: 120 }
const T = { critWaiting: 1000, critFailed: 50, warnWaiting: 300, warnFailed: 10 }
function qStatus(q) {
  if (q.waiting >= T.critWaiting || q.failed24 >= T.critFailed) return 'crit'
  if (q.waiting >= T.warnWaiting || q.failed24 >= T.warnFailed || q.delay > (SLA[q.key] || 60)) return 'warn'
  return 'good'
}
function nextRun(c) {
  const now = C.nowMinutes
  if (/هر ساعت/.test(c.schedule)) { const m = (Math.floor(now / 60) + 1) * 60; return { day: m >= 1440 ? 1 : 0, min: m % 1440, wait: m - now } }
  const mt = latin(c.schedule).match(/(\d{1,2}):(\d{2})/)
  if (!/روزانه/.test(c.schedule) || !mt) return null
  const m = +mt[1] * 60 + +mt[2]
  return m > now ? { day: 0, min: m, wait: m - now } : { day: 1, min: m, wait: 1440 - now + m }
}

export function jobs() {
  const { accounts, ops } = DB
  const Q = ops.queues
  const sum = (k) => Q.reduce((t, q) => t + q[k], 0)
  const waitingThen = Q.reduce((t, q) => t + q.trend[0], 0)
  const trendSum = Q[0].trend.map((_, i) => Q.reduce((t, q) => t + q.trend[i], 0))
  const worstFail = Q.slice().sort((p, q) => q.failed24 - p.failed24)[0]
  const failedCrons = ops.crons.filter((c) => c.status === 'fail')
  const maxDelay = Q.slice().sort((p, q) => q.delay - p.delay)[0]
  const exp = failedCrons.find((c) => c.key === 'expire')
  const pd = accounts.filter((a) => a.pastDue)
  const qd = local().cronRuns
  const hourly = ops.hourly.map((x) => ({ hr: x.hr, runs: x.runs, failed: x.failed, day: x.hr * 60 > C.nowMinutes ? 'yesterday' : 'today' }))
  const failHours = hourly.filter((x) => x.failed > 0)
  return ok({
    thresholds: T,
    kpis: {
      waiting: sum('waiting'), waitingThen, trendSum, active: sum('active'), queues: Q.length,
      failed24: sum('failed24'), worstFail: { name: worstFail.name, failed24: worstFail.failed24 },
      failedCrons: failedCrons.map((c) => c.name), cronsTotal: ops.crons.length,
      maxDelay: { name: maxDelay.name, delay: maxDelay.delay, sla: SLA[maxDelay.key] || 60, late: maxDelay.delay > (SLA[maxDelay.key] || 60) },
    },
    expire: exp ? { name: exp.name, lastT: exp.lastT, lastAt: exp.lastAt, error: exp.error, pastDue: pd.length, pastDueMrr: pd.reduce((t, a) => t + a.mrr, 0), next: nextRun(exp) } : null,
    queues: Q.map((q) => ({ key: q.key, name: q.name, waiting: q.waiting, active: q.active, failed24: q.failed24, delay: q.delay, throughput: q.throughput, trend: q.trend, sla: SLA[q.key] || 60, status: qStatus(q) })),
    hourly,
    failWindow: failHours.length ? { from: failHours[0].hr, to: failHours[failHours.length - 1].hr, day: failHours[0].day } : null,
    crons: ops.crons.map((c) => ({ key: c.key, name: c.name, schedule: c.schedule, lastT: c.lastT, lastAt: c.lastAt, duration: c.duration, status: c.status, isNew: !!c.isNew, error: c.error || null, next: nextRun(c), queued: !!qd[c.key] })),
  })
}

/** Undo a manual "run now" (the old page's cancel button). */
export function cancelCron(key) { local().setCronRun(key, null); return ok(true) }
