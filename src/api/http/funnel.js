/* GET /management/funnel?range — mature-cohort conversion funnel. Same shape as mock/funnel.js.
   Gaps: no site visits (visit step n = null), no previous cohort (prev = []), sources are only invite/direct. */
import { get } from './client'
import { customersAll } from './account'

const ACTIVATION_RECORDS = 10 // cloud-back metrics.ts ACTIVATION.recordEvents
const STEP = {
  visit: ['بازدید سایت', 'بازدیدکنندهٔ یکتا در بازه (هنوز متصل نیست)'],
  signup: ['ثبت‌نام', 'حساب ساخته‌شده در بازه'],
  firstBase: ['اولین بیس', 'حداقل یک بیس ساخته'],
  activated: ['فعال‌سازی', ACTIVATION_RECORDS + ' رویداد رکورد در ۷ روز اول'],
  habit: ['عادت', 'فعال در ۳ هفته از ۴ هفتهٔ اول'],
  paid: ['پرداخت', 'اولین پرداخت'],
}
export const FUNNEL_SOURCES = [{ key: 'invite', name: 'دعوت همکار', server: 'referral' }, { key: 'direct', name: 'مستقیم', server: 'direct' }]

const step = (s) => ({ key: s.key, label: STEP[s.key] ? STEP[s.key][0] : s.key, n: s.n, def: STEP[s.key] ? STEP[s.key][1] : '', fromPrev: s.fromPrev ?? 0, fromStart: s.fromStart ?? 0, medianDays: null })
/** Panel steps: a leading `visit` row with n = null so pages that skip the first step keep working. */
const steps = (serverSteps) => [{ key: 'visit', label: STEP.visit[0], n: null, def: STEP.visit[1], fromPrev: 1, fromStart: 1, medianDays: null }, ...serverSteps.map(step)]
const summary = (f) => {
  const o = {}; f.forEach((x) => { o[x.key] = x })
  return { visits: 0, signups: o.signup.n, sr: null, fb: o.firstBase.fromStart, act: o.activated.fromStart, habit: o.habit.fromStart, paid: o.paid.fromStart }
}

export async function funnel({ range: R = 30, source } = {}) {
  const src = FUNNEL_SOURCES.find((s) => s.key === source) || null
  const [f, accounts] = await Promise.all([get('/funnel', { range: R }), customersAll()])
  const mine = (a) => !src || a.source === src.key

  const all = steps(f.steps)
  const bySource = FUNNEL_SOURCES.map((s) => ({ key: s.key, name: s.name, ...summary(steps(f.bySource[s.server])) }))
  const total = summary(all)
  const own = src ? steps(f.bySource[src.server]) : all

  const pool = accounts.filter((a) => a.age >= 3 && a.age <= 14 && mine(a))
  const stuck = { pool: pool.length, noBase: pool.filter((a) => a.firstBaseDays == null).length, notAct: pool.filter((a) => a.firstBaseDays != null && !a.activated).length }

  // weekly activation trend: signup weeks that ended ≥ 7 days ago (activated is null for younger accounts)
  const weekly = []
  for (let w = 15; w >= 0; w--) {
    const from = 7 + 7 * w
    let n = 0, x = 0
    for (const a of accounts) if (a.age >= from && a.age < from + 7 && mine(a)) { n++; if (a.activated === true) x++ }
    weekly.push({ from, n, rate: n ? x / n : null })
  }

  // weakest transition after signup, recomputed for the selected source
  let worst = null
  own.slice(1).forEach((s, i, acc) => { if (i && acc[i - 1].n && (!worst || s.fromPrev < worst.fromPrev)) worst = s })

  return {
    range: R, mature: f.matureDays, source: src ? src.key : null, sourceName: src ? src.name : null, activationRecords: ACTIVATION_RECORDS, dataSince: f.dataSince || null,
    steps: own, prev: [], worst: worst ? worst.key : null, stuck, bySource, total, weekly,
  }
}
