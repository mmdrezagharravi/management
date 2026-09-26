/* GET /management/acquisition?range=30 — which channel brings paying customers, not just signups. */
import { DB } from 'src/mock/engine'
import { C, ok } from './shared'

const M_FROM = 30, M_LEN = 90 // mature cohort: signed up 30–120 days ago
const sum = (arr, k) => arr.reduce((t, x) => t + x[k], 0)
const cacOf = (s) => (s.paid ? s.spend / s.paid : Infinity)
const pick = (s) => ({ key: s.key, name: s.name, paidRate: s.paidRate, spend: s.spend, paid: s.paid, mrr: s.mrr, cac: s.paid ? cacOf(s) : null })

export function acquisition({ range: R = 30 } = {}) {
  const { agg, accounts } = DB
  const cur = agg.sources(0, R), mat = agg.sources(M_FROM, M_LEN)
  const vis = agg.visits(0, R), visP = agg.visits(R, R), su = agg.signups(0, R), suP = agg.signups(R, R)
  const spend = (sum(C.sources, 'spend') * R) / 30
  const mSpend = sum(mat, 'spend'), mPaid = sum(mat, 'paid'), mSu = sum(mat, 'signups')
  const solid = mat.filter((s) => s.signups >= 30) // ignore tiny samples when naming a winner
  const best = (solid.length ? solid : mat).slice().sort((p, q) => q.paidRate - p.paidRate)[0]
  const paidCh = mat.filter((s) => s.spend > 0)
  const worst = paidCh.slice().sort((p, q) => cacOf(q) - cacOf(p))[0]
  const bestPaid = paidCh.slice().sort((p, q) => cacOf(p) - cacOf(q))[0]
  const payback = (s) => { const arpa = s.paid ? s.mrr / s.paid : 0; return arpa && s.paid ? cacOf(s) / arpa : null }

  // weekly stacked columns: top 4 sources by 12-week volume keep their own color, the rest fold into one muted series
  const W = 12, cnt = {}
  C.sources.forEach((s) => { cnt[s.key] = new Array(W).fill(0) })
  for (const a of accounts) if (a.age < W * 7) cnt[a.source][W - 1 - Math.floor(a.age / 7)]++
  const ranked = C.sources.slice().sort((p, q) => cnt[q.key].reduce((t, v) => t + v, 0) - cnt[p.key].reduce((t, v) => t + v, 0))
  const top = ranked.slice(0, 4), rest = ranked.slice(4)
  const weekly = {
    weeks: W,
    series: top.map((s, i) => ({ key: s.key, name: s.name, values: cnt[s.key], color: 'var(--series-' + (i + 1) + ')' }))
      .concat([{ key: 'rest', name: 'سایر منابع', values: cnt[top[0].key].map((_, i) => rest.reduce((t, s) => t + cnt[s.key][i], 0)), color: 'var(--deemph)' }]),
    restNames: rest.map((s) => s.name),
  }

  return ok({
    range: R, matureFrom: M_FROM, matureLen: M_LEN,
    kpis: { visits: vis, visitsPrev: visP, signups: su, signupsPrev: suP, spend, cac: mPaid ? mSpend / mPaid : null, maturePaid: mPaid, matureSignups: mSu, avgPaidRate: mSu ? mPaid / mSu : 0, paidNames: C.sources.filter((s) => s.spend).map((s) => s.name) },
    best: pick(best),
    worst: worst && worst !== bestPaid ? { ...pick(worst), payback: payback(worst) } : null,
    bestPaid: bestPaid ? pick(bestPaid) : null,
    rows: C.sources.map((s, i) => ({ id: i, key: s.key, name: s.name, paidCh: !!s.spend, visits: cur[i].visits, signups: cur[i].signups, sr: cur[i].signupRate,
      act: mat[i].activationRate, paid: mat[i].paid, pr: mat[i].paidRate, mrr: mat[i].mrr, spend: mat[i].spend, cac: mat[i].cac, mSu: mat[i].signups })),
    weekly,
    mature: mat.map((s) => ({ key: s.key, name: s.name, activationRate: s.activationRate, paidRate: s.paidRate, signups: s.signups })),
  })
}
