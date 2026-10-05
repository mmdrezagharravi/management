/* GET /management/features?range=30 — feature adoption and which features keep customers. */
import { DB } from 'src/mock/engine'
import { C, ok } from './shared'

const median = (arr) => { const v = arr.slice().sort((p, q) => p - q); return v.length ? (v[(v.length - 1) >> 1] + v[v.length >> 1]) / 2 : 0 }

export function features({ range: R = 30 } = {}) {
  const { agg, accounts } = DB
  const F = agg.features(0, R)
  const active = accounts.filter((a) => DB.countRange(a.ev, 0, R) > 0)
  const prevActive = accounts.filter((a) => DB.countRange(a.ev, R, 2 * R) > 0)
  // Adoption = share of active accounts that have used the feature (by the end of the window).
  // agg.features measures "now" as last-use-inside-the-window but "before" as adopted-by-then, so its
  // change column shows false drops on short ranges; both periods are recomputed here with one rule.
  const uses = (a, k) => !!a.feat[k]
  const pay = active.filter((a) => a.paying), free = active.filter((a) => !a.paying)
  const rows = F.map((f, i) => {
    const users = active.filter((a) => uses(a, f.key)).length
    const rate = active.length ? users / active.length : 0
    const prevRate = prevActive.length ? prevActive.filter((a) => a.feat[f.key] && a.feat[f.key].first >= R).length / prevActive.length : 0
    return {
      id: i, key: f.key, label: f.label, keyFeature: !!f.key_feature, users, rate, prevRate, ch: rate - prevRate,
      pay: pay.length ? pay.filter((a) => uses(a, f.key)).length / pay.length : 0,
      free: free.length ? free.filter((a) => uses(a, f.key)).length / free.length : 0,
      gated: !accounts.some((a) => !a.everPaid && a.feat[f.key]), // never used by an account that never paid → paid-plan feature
    }
  })
  const keyF = rows.filter((f) => f.keyFeature)
  const top = keyF.slice().sort((p, q) => q.rate - p.rate)[0]
  const grow = rows.slice().sort((p, q) => q.ch - p.ch)[0]

  // retention impact: week-12 retention of users vs base builders who never used it
  const imp = keyF.map((f) => {
    const ad = agg.retentionCurve((a) => !!a.feat[f.key], 12)
    const no = agg.retentionCurve((a) => !!a.feat.tables && !a.feat[f.key], 12)
    return { key: f.key, label: f.label, rate: f.rate, gated: f.gated, ad: ad[12], adN: ad.n, no: no[12], noN: no.n, lift: no[12] ? ad[12] / no[12] : 0 }
  }).sort((p, q) => q.lift - p.lift)
  const medLift = median(imp.map((x) => x.lift)), medRate = median(imp.map((x) => x.rate))
  imp.forEach((x) => { x.opp = x.lift >= medLift && x.rate <= medRate })

  // active pro/enterprise customers (every feature is open to them) who have not touched a sticky feature yet
  const top2 = pay.filter((a) => a.plan === 'business' || a.plan === 'enterprise')
  const gaps = imp.filter((x) => x.opp).map((x) => ({ key: x.key, label: x.label, lift: x.lift, n: top2.filter((a) => !a.feat[x.key]).length }))

  const plans = C.planOrder.map((k) => ({ k, list: active.filter((a) => a.plan === k) }))
  const planHeat = {
    plans: plans.map((p) => ({ key: p.k, name: C.plans[p.k].name, n: p.list.length })),
    rows: rows.slice().sort((p, q) => q.rate - p.rate).map((f) => ({
      label: f.label,
      cells: plans.map((p) => (p.list.length ? p.list.filter((a) => uses(a, f.key)).length / p.list.length : null)),
      counts: plans.map((p) => p.list.filter((a) => uses(a, f.key)).length),
    })),
  }

  return ok({ range: R, active: active.length, activePrev: prevActive.length, rows, top: top.key, grow: grow.key, imp, medRate, gaps, top2: top2.length, planHeat })
}
