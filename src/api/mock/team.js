/* GET /management/team?range=30 — per-rep leaderboard, activity per workday, workload balance,
   outcome mix and coaching notes. Activity/deal numbers are capped to the kept call history. */
import { DB } from 'src/mock/engine'
import { ok, C, ownerOf, taskState } from './shared'
import { n, fa, pct, money } from 'src/lib/format'

const { accounts, activities } = DB
const HISTORY = Math.max(...activities.map((x) => x.t)) + 1 // days of activity history kept

const sum = (list, f) => list.reduce((t, x) => t + f(x), 0)
const mrrOn = (a, t) => { let v = 0; for (const pe of a.planEvents) { if (pe.t >= t) v = pe.mrr; else break } return v }
const WON = ['won_new', 'won_expansion', 'renewed']
const isCall = (x) => x.type === 'call' || x.type === 'meeting'
const connected = (x) => x.outcome === 'reached' || x.outcome === 'demo'
// MRR a deal is worth: first purchase = its MRR, expansion = the increase, renewal = the MRR kept
function dealMrr(x) {
  const a = DB.byId.get(x.accountId)
  if (x.outcome === 'won_new') return x.mrr || 0
  if (x.outcome === 'renewed') return mrrOn(a, x.t + 1)
  const i = a.planEvents.findIndex((pe) => pe.t === x.t && pe.kind === 'expansion')
  return i > 0 ? a.planEvents[i].mrr - a.planEvents[i - 1].mrr : 0
}
const isWorkday = (d) => DB.dayDate(d).getUTCDay() !== 5 // Friday is off
// ordered by how far the conversation got
const OUTCOMES = [
  { key: 'demo', label: DB.OUTCOME_LABEL.demo, color: 'var(--seq-600)' },
  { key: 'reached', label: DB.OUTCOME_LABEL.reached, color: 'var(--seq-400)' },
  { key: 'callback', label: DB.OUTCOME_LABEL.callback, color: 'var(--seq-250)' },
  { key: 'email', label: DB.OUTCOME_LABEL.email, color: 'var(--seq-150)' },
  { key: 'noanswer', label: DB.OUTCOME_LABEL.noanswer, color: 'var(--deemph)' },
]
const HOURS = [[9, 11], [11, 13], [13, 15], [15, 17]]
const hourLabel = (h) => 'ساعت ' + fa(h[0]) + ' تا ' + fa(h[1])

export function team({ range: R = 30 } = {}) {
  const since = Math.min(R, HISTORY), capped = R > HISTORY
  let wd = 0; for (let d = 0; d < since; d++) if (isWorkday(d)) wd++
  const acts = activities.filter((x) => x.t < since)

  const reps = C.reps.map((r, i) => {
    const mine = acts.filter((x) => x.rep === r.id)
    const calls = mine.filter(isCall)
    const conn = calls.filter(connected).length
    const won = mine.filter((x) => WON.includes(x.outcome))
    const lostL = mine.filter((x) => x.outcome === 'lost')
    const book = accounts.filter((a) => a.paying && ownerOf(a) === r.id)
    const owned = accounts.filter((a) => ownerOf(a) === r.id)
    const due = DB.tasksFor(r.id).filter((t) => t.due <= 0)
    const open = due.filter((t) => { const s = taskState(t.id); return !s || !s.status }).length
    const outc = {}; OUTCOMES.forEach((o) => { outc[o.key] = mine.filter((x) => x.outcome === o.key).length })
    const byHour = HOURS.map((h) => { const c = calls.filter((x) => x.min >= h[0] * 60 && x.min < h[1] * 60 + (h[1] === 17 ? 1 : 0)); return { h, n: c.length, rate: c.length ? c.filter(connected).length / c.length : 0 } })
    const risk = book.filter((a) => a.health < 50), renewRisk = risk.filter((a) => a.renewIn <= 30)
    return {
      id: r.id, name: r.name, short: r.short, callTarget: r.callTarget, i,
      calls: calls.length, perDay: wd ? calls.length / wd : 0, conn, connRate: calls.length ? conn / calls.length : 0,
      won: won.length, wonMrr: sum(won, dealMrr), lost: lostL.length, lostReasons: lostL.map((x) => x.reason),
      book: book.length, bookMrr: sum(book, (a) => a.mrr), avgHealth: book.length ? sum(book, (a) => a.health) / book.length : 0,
      risk: risk.length, renewRisk: renewRisk.length, renewRiskMrr: sum(renewRisk, (a) => a.mrr),
      owned: owned.length, leads: owned.filter((a) => !a.paying).length, due: due.length, open, outc, byHour,
    }
  })
  const T = {
    connRate: sum(reps, (x) => x.conn) / Math.max(1, sum(reps, (x) => x.calls)),
    riskShare: sum(reps, (x) => x.risk) / Math.max(1, sum(reps, (x) => x.book)),
    mrr: sum(reps, (x) => x.bookMrr),
  }
  const unassigned = accounts.filter((a) => (a.paying || a.segments.includes('upsell')) && !ownerOf(a)).length

  // coaching: the two most useful observations per rep, each with a next step
  function coach(s) {
    const out = []
    if (s.perDay < s.callTarget * 0.85) out.push({ w: 3, t: 'روزی ' + n(s.perDay, 1) + ' تماس و جلسه — ' + pct(s.perDay / s.callTarget) + ' هدف ' + fa(s.callTarget) + ' تماس. صبح‌ها یک بلوک ثابت تماس بگذارید.', to: '/today' })
    if (s.connRate < T.connRate - 0.03) {
      const best = s.byHour.filter((b) => b.n >= 8).sort((p, q) => q.rate - p.rate)[0]
      out.push({ w: 4, t: 'نرخ ارتباط ' + pct(s.connRate) + ' (میانگین تیم ' + pct(T.connRate) + ').' + (best && best.rate > s.connRate + 0.04 ? ' بیشترین پاسخ را ' + hourLabel(best.h) + ' گرفته (' + pct(best.rate) + ') — تماس‌ها را به آن ساعت ببرید.' : ' ساعت تماس را عوض کنید و پیش از تماس پیامک بفرستید.') })
    }
    if (s.renewRisk) out.push({ w: 5 + s.renewRisk, t: fa(s.renewRisk) + ' مشتری در خطر تا ۳۰ روز دیگر تمدید می‌کنند (' + money(s.renewRiskMrr) + ') — این هفته با آن‌ها تماس بگیرد.', to: '/sales' })
    else if (s.risk >= 3 && s.risk / Math.max(1, s.book) > T.riskShare) out.push({ w: 3, t: fa(s.risk) + ' مشتری در خطر در دفترش (' + pct(s.risk / s.book) + '، تیم ' + pct(T.riskShare) + ') — تمدیدها را اولویت دهد.', to: '/customers?view=risk&owner=' + s.id })
    if (s.open > s.callTarget) out.push({ w: 2, t: fa(s.open) + ' کار امروز هنوز باز است؛ بیش از ظرفیت روزانه — چند سرنخ ارتقا را به همکار بدهید.', to: '/customers?view=upsell&owner=' + s.id })
    if (s.lost >= 2) {
      const cnt = {}; s.lostReasons.forEach((x) => { cnt[x] = (cnt[x] || 0) + 1 })
      const top = Object.entries(cnt).sort((p, q) => q[1] - p[1])[0]
      out.push({ w: 2 + s.lost, t: fa(s.lost) + ' مشتری از دست رفت؛ دلیل غالب «' + top[0] + '». در جلسهٔ هفتگی مرور کنید.', to: '/sales?tab=winback' })
    }
    if (!out.length) out.push({ w: 0, t: 'بالای میانگین تیم در تماس و ارتباط — روش کارش را در جلسهٔ هفتگی با بقیه به اشتراک بگذارد.' })
    return out.sort((p, q) => q.w - p.w).slice(0, 2).map(({ t, to }) => ({ t, to: to || null }))
  }

  // activity per workday, last 30 days (calls, meetings, emails — not deals)
  const days = []; for (let d = 29; d >= 0; d--) if (isWorkday(d)) days.push(d)
  const activity = reps.map((s) => days.map((d) => activities.filter((x) => x.t === d && x.rep === s.id && x.type !== 'deal').length))
  const maxRep = reps.slice().sort((p, q) => q.bookMrr - p.bookMrr)[0], minRep = reps.slice().sort((p, q) => p.bookMrr - q.bookMrr)[0]

  return ok({
    range: R, since, capped, history: HISTORY, workdays: wd,
    reps: reps.map((s) => ({ ...s, coach: coach(s) })),
    team: T, unassigned,
    balance: { ratio: minRep.bookMrr ? maxRep.bookMrr / minRep.bookMrr : 0, max: maxRep.short, min: minRep.short },
    days, activity, outcomes: OUTCOMES,
  })
}
