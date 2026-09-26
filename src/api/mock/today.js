/* GET /management/today?rep=r1 — the rep's task list for today / this week / done,
   plus the small KPIs, the team strip (managers), upcoming renewals and today's activity. */
import { DB } from 'src/mock/engine'
import { ok, enrich, ownerOf, taskState, notesOf, whoName, local, session } from './shared'

const { accounts, activities, TASK_TYPES, CONFIG: C } = DB

/** Open state for a task, honouring what the rep did in this browser. */
function stateOf(t) {
  const s = taskState(t.id)
  if (!s || !s.status || s.status === 'open') return { bucket: t.due <= 0 ? 'today' : 'week', due: t.due }
  if (s.status === 'done') return { bucket: 'done', due: t.due, s }
  if (s.status === 'snoozed') return { bucket: 'week', due: Math.max(t.due, s.snoozeDays || 1), s }
  return { bucket: t.due <= 0 ? 'today' : 'week', due: t.due, s }
}
const withState = (list) => list.map((t) => Object.assign({}, t, stateOf(t)))
const callsToday = (repId) => activities.filter((x) => x.rep === repId && x.t === 0 && (x.type === 'call' || x.type === 'meeting')).length

export function today({ rep: repParam } = {}) {
  const me = session().me
  const repId = me.role === 'rep' ? me.rep : repParam || session().todayRep || 'r1'
  const rep = DB.rep(repId) || DB.rep('r1')
  const isManager = me.role !== 'rep'

  // tasks sent here from the AI brief (stored in this browser) join the rule-based list
  const aiTasks = Object.entries(local().tasks).filter(([id, s]) => id.startsWith('ai:today:') && s.status && s.accountId && s.owner === rep.id)
    .map(([id, s]) => ({ id, type: 'ai', accountId: s.accountId, due: 0, value: s.value || 0, why: 'پیشنهاد تحلیل هوشمند · ' + (s.why || '') }))
  const all = withState(DB.tasksFor(rep.id).concat(aiTasks))
  const row = (t) => {
    const T = TASK_TYPES[t.type] || { label: 'پیشنهاد هوشمند', icon: 'sparkle', prio: 2 }
    return {
      id: t.id, type: t.type, accountId: t.accountId, due: t.due, value: t.value || 0, why: t.why, bucket: t.bucket,
      label: T.label, icon: T.icon, prio: T.prio, overdue: t.bucket === 'today' && t.due < 0,
      outcome: t.s && t.s.outcome ? DB.OUTCOME_LABEL[t.s.outcome] || { won: 'موفق', lost: 'از دست رفت' }[t.s.outcome] || t.s.outcome : null,
      account: enrich(DB.byId.get(t.accountId)),
    }
  }
  const lists = {
    today: all.filter((t) => t.bucket === 'today').map(row),
    week: all.filter((t) => t.bucket === 'week').sort((p, q) => p.due - q.due).map(row),
    done: all.filter((t) => t.bucket === 'done').map(row),
  }
  const calls = callsToday(rep.id)
  const localCalls = accounts.reduce((n, a) => n + notesOf(a.id).filter((x) => x.kind === 'call' && Date.now() - x.at < 864e5).length, 0)
  const book = accounts.filter((a) => ownerOf(a) === rep.id && a.paying)
  const renew14 = book.filter((a) => a.renewIn <= 14)
  const valueToday = lists.today.reduce((s, t) => s + (t.value || 0), 0)

  const team = isManager ? C.reps.map((r) => {
    const ts = withState(DB.tasksFor(r.id))
    return { id: r.id, name: r.name, short: r.short, callTarget: r.callTarget, open: ts.filter((t) => t.bucket === 'today').length, done: ts.filter((t) => t.bucket === 'done').length, calls: callsToday(r.id) }
  }) : null

  // today's activity: from the log + calls logged in this browser
  const mine = activities.filter((x) => x.rep === rep.id && x.t === 0).sort((p, q) => q.min - p.min)
  const who = whoName()
  const acts = []
  accounts.forEach((a) => notesOf(a.id).forEach((nt) => { if (Date.now() - nt.at < 864e5 && nt.who === who) acts.push({ accountId: a.id, name: a.name, text: nt.text, local: true }) }))
  mine.slice(0, 8).forEach((x) => { const a = DB.byId.get(x.accountId); acts.push({ accountId: a.id, name: a.name, text: (DB.OUTCOME_LABEL[x.outcome] || x.outcome) + (x.mrr ? ' · ' : ''), mrr: x.mrr || 0, min: x.min, local: false }) })

  return ok({
    rep: { id: rep.id, name: rep.name, short: rep.short, callTarget: rep.callTarget }, isManager,
    reps: C.reps.map((r) => ({ id: r.id, short: r.short })),
    lists,
    kpis: {
      open: lists.today.length, done: lists.done.length, overdue: lists.today.filter((t) => t.due < 0).length,
      calls: calls + localCalls, callTarget: rep.callTarget,
      valueToday,
      renew14: { n: renew14.length, mrr: renew14.reduce((s, a) => s + a.mrr, 0), low: renew14.filter((a) => a.health < 60).length },
      book: { n: book.length, mrr: book.reduce((s, a) => s + a.mrr, 0), risk: book.filter((a) => a.health < 50).length },
    },
    spilled: all.filter((t) => t.spilled).length, capacity: rep.callTarget + 2,
    team,
    renewals: { in30: book.filter((a) => a.renewIn <= 30).length, top: book.slice().sort((p, q) => p.renewIn - q.renewIn).slice(0, 7).map(enrich) },
    acts,
  })
}
