/* GET /management/funnel?range=30&src=google — the mature-cohort conversion funnel. */
import { DB } from 'src/mock/engine'
import { C, ok } from './shared'

const MATURE = 30 // cohort starts 30 days back so every account had time to move
const rate = (x, y) => (y ? x / y : 0)
const step = (s) => ({ key: s.key, label: s.label, n: s.n, def: s.def, fromPrev: s.fromPrev, fromStart: s.fromStart, medianDays: s.medianDays })
const summary = (f) => {
  const o = {}; f.forEach((x) => { o[x.key] = x })
  return { visits: o.visit.n, signups: o.signup.n, sr: rate(o.signup.n, o.visit.n), fb: o.firstBase.fromStart, act: o.activated.fromStart, habit: o.habit.fromStart, paid: o.paid.fromStart }
}

export function funnel({ range: R = 30, source } = {}) {
  const { agg, accounts } = DB
  const src = source && DB.source(source) ? source : null
  const steps = agg.funnel(MATURE, R, src || undefined).map(step)
  const prev = agg.funnel(MATURE + R, R, src || undefined).map(step)

  // weakest transition after signup (signup → paid; visits sit on a different scale)
  const acc = steps.slice(1)
  let worst = null
  acc.forEach((s, i) => { if (i && acc[i - 1].n && (!worst || s.fromPrev < worst.fromPrev)) worst = s })

  const pool = accounts.filter((a) => a.age >= 3 && a.age <= 14 && (!src || a.source === src))
  const stuck = {
    pool: pool.length,
    noBase: pool.filter((a) => a.milestones.firstBase === undefined).length,
    notAct: pool.filter((a) => a.milestones.firstBase !== undefined && a.milestones.activated === undefined).length,
  }

  const bySource = C.sources.map((s) => ({ key: s.key, name: s.name, ...summary(agg.funnel(MATURE, R, s.key)) }))
  const total = summary(agg.funnel(MATURE, R))

  // weekly activation trend: signup weeks that ended ≥ 7 days ago
  const weekly = []
  for (let w = 15; w >= 0; w--) {
    const from = 7 + 7 * w
    let n = 0, x = 0
    for (const a of accounts) if (a.age >= from && a.age < from + 7 && (!src || a.source === src)) { n++; if (a.milestones.activated !== undefined) x++ }
    weekly.push({ from, n, rate: n ? x / n : null })
  }

  return ok({
    range: R, mature: MATURE, source: src, sourceName: src ? DB.source(src).name : null, activationRecords: C.activation.records,
    steps, prev, worst: worst ? worst.key : null, stuck, bySource, total, weekly,
  })
}
