/* GET /management/onboarding?range=30 — signups of the range, their checklist, status and suggested next step. */
import { DB } from 'src/mock/engine'
import { C, enrich, taskState } from './shared'
import { fa } from 'src/lib/format'

const ACT = C.activation
const { accounts } = DB

// industries with the most paying customers — a signup from these is worth a call
const payByInd = {}
accounts.forEach((a) => { if (a.paying) payByInd[a.industry] = (payByInd[a.industry] || 0) + 1 })
const topInd = Object.entries(payByInd).sort((p, q) => q[1] - p[1]).slice(0, 2).map((x) => x[0])
const topIndNames = topInd.map((k) => accounts.find((a) => a.industry === k).industryName)
const HP_DEF = 'همکار دعوت کرده، از لینک دعوت آمده، یا در صنعت ' + topIndNames.join(' / ') + ' است (بیشترین مشتری پرداخت‌کننده)'

const activated = (a) => a.milestones.activated !== undefined
const hasBase = (a) => a.milestones.firstBase !== undefined
const invited = (a) => a.invitesSent > 0 || a.milestones.team !== undefined
const automated = (a) => !!a.feat.automation || a.automations > 0
const week2 = (a) => a.wk.length > 1 && a.wk[1] === 1
const highPot = (a) => invited(a) || a.source === 'invite' || topInd.includes(a.industry)
const stuck = (a) => a.age >= 3 && !activated(a)
const lost = (a) => a.lastSeenDays >= 7
const status = (a) => (lost(a) ? 'lost' : activated(a) ? 'act' : a.age >= 3 ? 'stuck' : 'path')

function checklist(a) {
  const m = a.milestones
  return [
    { l: 'بیس', s: hasBase(a) ? 'done' : 'open', d: hasBase(a) ? (m.firstBase ? 'روز ' + fa(m.firstBase) : 'همان روز') : 'هنوز نساخته' },
    { l: fa(ACT.records) + ' رکورد', s: activated(a) ? 'done' : a.age < ACT.days ? 'wait' : 'open', d: activated(a) ? 'روز ' + fa(m.activated) : a.age < ACT.days ? 'تا روز ' + fa(ACT.days) + ' فرصت دارد' : 'نرسید' },
    { l: 'دعوت همکار', s: invited(a) ? 'done' : 'open', d: invited(a) ? fa(Math.max(1, a.invitesSent)) + ' دعوت' : 'هنوز نه' },
    { l: 'اتوماسیون', s: automated(a) ? 'done' : 'open', d: automated(a) ? 'ساخته' : 'هنوز نه' },
    { l: 'بازگشت در هفتهٔ ۲', s: week2(a) ? 'done' : a.age < 14 ? 'wait' : 'open', d: week2(a) ? 'برگشت' : a.age < 7 ? 'هنوز زود است' : a.age < 14 ? 'هفتهٔ ۲ در جریان است' : 'برنگشت' },
  ]
}
// suggested next step; `key` groups the steps so the list can be filtered by them
const STEPS = {
  call: 'تماس خوشامد',
  tpl: 'ایمیل تمپلیت‌های صنعت',
  excel: 'راهنمای ورود داده از Excel',
  back: 'پیام بازگشت',
  invite: 'پیشنهاد دعوت همکار',
  auto: 'معرفی اتوماسیون',
  plan: 'پیشنهاد پلن پایه',
  paid: 'تماس خوشامد مشتری پرداخت‌کننده',
  wait: 'فعلاً صبر',
}
function nextStep(a) {
  const s = (key, text) => ({ key, text: text || STEPS[key] })
  if (!activated(a) && highPot(a) && a.age >= 1) return s('call')
  if (!hasBase(a)) return a.age >= 2 ? s('tpl', STEPS.tpl + ' ' + a.industryName) : s('wait', 'فعلاً صبر — روز ۲ بررسی شود')
  if (!activated(a)) return s('excel')
  if (lost(a)) return s('back', 'پیام بازگشت با نمونهٔ ' + a.industryName)
  if (!invited(a)) return s('invite')
  if (!automated(a)) return s('auto', 'معرفی اتوماسیون با یک نمونهٔ آماده')
  return a.paying ? s('paid') : s('plan')
}
const isDone = (a) => (taskState('onb:' + a.id) || {}).status === 'done'
const median = (arr) => { const v = arr.slice().sort((p, q) => p - q); return v.length ? v[Math.floor(v.length / 2)] : null }

export async function onboarding({ range: R = 30 } = {}) {
  const cohort = accounts.filter((a) => a.age < R).sort((p, q) => p.age - q.age || p.lastSeenMin - q.lastSeenMin)
  const prev = accounts.filter((a) => a.age >= R && a.age < 2 * R)
  const rate = (list, f) => (list.length ? list.filter(f).length / list.length : null)

  const fbN = cohort.filter(hasBase).length
  const mature = cohort.filter((a) => a.age >= ACT.days), prevMature = prev.filter((a) => a.age >= ACT.days)
  const fbDays = cohort.filter(hasBase).map((a) => a.milestones.firstBase)
  const med = median(fbDays)
  const stuckL = cohort.filter(stuck)
  const hp = cohort.filter(highPot)

  const daily = []
  for (let d = R - 1; d >= 0; d--) {
    const c = cohort.filter((a) => a.age === d), x = c.filter(activated).length
    daily.push({ daysAgo: d, activated: x, pending: c.length - x })
  }

  // where they stop
  const noBase = cohort.filter((a) => !hasBase(a)).length
  const under = cohort.filter((a) => hasBase(a) && !activated(a)).length
  const noW2 = cohort.filter((a) => activated(a) && a.age >= 14 && !week2(a)).length
  const buckets = [
    { key: 'noBase', value: noBase },
    { key: 'under', value: under },
    { key: 'noW2', value: noW2 },
    { key: 'onTrack', value: cohort.length - noBase - under - noW2 },
  ]
  // open work by suggested step (done and "wait" rows excluded)
  const cnt = {}
  cohort.forEach((a) => { const k = nextStep(a).key; if (k !== 'wait' && !isDone(a)) cnt[k] = (cnt[k] || 0) + 1 })
  const steps = Object.entries(cnt).sort((p, q) => q[1] - p[1]).slice(0, 4).map(([key, n]) => ({ key, n, label: STEPS[key] }))

  return {
    range: R,
    activation: { records: ACT.records, days: ACT.days },
    hpDef: HP_DEF,
    stepLabels: STEPS,
    kpis: {
      signups: { now: cohort.length, prev: prev.length, spark: daily.map((x) => x.activated + x.pending) },
      firstBase: { rate: cohort.length ? fbN / cohort.length : 0, prev: rate(prev, hasBase), n: fbN },
      activation: { rate: rate(mature, activated), prev: rate(prevMature, activated), mature: mature.length },
      firstBaseDays: { median: med, sameDay: fbDays.length ? fbDays.filter((d) => d === 0).length / fbDays.length : 0 },
      stuck: { n: stuckL.length, lost: stuckL.filter(lost).length },
      highPot: { stuck: hp.filter(stuck).length, total: hp.length },
    },
    daily, buckets, steps,
    rows: cohort.map((a) => ({
      ...enrich(a),
      sourceName: DB.source(a.source).name,
      status: status(a),
      checklist: checklist(a),
      stuck: stuck(a), highPot: highPot(a), activated: activated(a),
      next: nextStep(a),
      done: isDone(a),
    })),
  }
}
