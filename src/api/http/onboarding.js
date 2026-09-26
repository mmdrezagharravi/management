/* The customer list (+ /definitions for the activation rule) → the shape mock/onboarding.js returns.
   Steps the server cannot see (invites sent, return in week 2) come back with status 'na'; the page greys them. */
import { customersAll, definitions, taskState } from './account'
import { fa } from 'src/lib/format'
import { sourceName } from 'src/lib/refs'

const HP_DEF = 'همکار دعوت کرده یا از لینک دعوت آمده'
const STEPS = {
  call: 'تماس خوشامد',
  tpl: 'ایمیل تمپلیت‌های شروع',
  excel: 'راهنمای ورود داده از Excel',
  back: 'پیام بازگشت',
  invite: 'پیشنهاد دعوت همکار',
  auto: 'معرفی اتوماسیون',
  plan: 'پیشنهاد پلن پایه',
  paid: 'تماس خوشامد مشتری پرداخت‌کننده',
  wait: 'فعلاً صبر',
}
// ponytail: `activated` is null both for accounts younger than the activation window and for signups before dataSince;
// both count as "not activated" here, as in the mock. Split them if old signups start showing as stuck.
const activated = (a) => a.activated === true
const hasBase = (a) => a.firstBaseDays != null
const invited = (a) => a.memberCount > 1
const automated = (a) => a.automations > 0
const highPot = (a) => invited(a) || a.source === 'invite'
const stuck = (a) => a.age >= 3 && !activated(a)
const lost = (a) => a.lastSeenDays >= 7
const status = (a) => (lost(a) ? 'lost' : activated(a) ? 'act' : a.age >= 3 ? 'stuck' : 'path')

function checklist(a, ACT) {
  return [
    { l: 'بیس', s: hasBase(a) ? 'done' : 'open', d: hasBase(a) ? (a.firstBaseDays ? 'روز ' + fa(a.firstBaseDays) : 'همان روز') : 'هنوز نساخته' },
    { l: fa(ACT.records) + ' رکورد', s: activated(a) ? 'done' : a.age < ACT.days ? 'wait' : 'open', d: activated(a) ? 'رسید' : a.age < ACT.days ? 'تا روز ' + fa(ACT.days) + ' فرصت دارد' : 'نرسید' },
    { l: 'دعوت همکار', s: invited(a) ? 'done' : 'open', d: invited(a) ? fa(a.memberCount - 1) + ' همکار' : 'هنوز نه' },
    { l: 'اتوماسیون', s: automated(a) ? 'done' : 'open', d: automated(a) ? 'ساخته' : 'هنوز نه' },
    { l: 'بازگشت در هفتهٔ ۲', s: 'na', d: 'داده‌ای ندارد' },
  ]
}
function nextStep(a) {
  const s = (key, text) => ({ key, text: text || STEPS[key] })
  if (!activated(a) && highPot(a) && a.age >= 1) return s('call')
  if (!hasBase(a)) return a.age >= 2 ? s('tpl') : s('wait', 'فعلاً صبر — روز ۲ بررسی شود')
  if (!activated(a)) return s('excel')
  if (lost(a)) return s('back')
  if (!invited(a)) return s('invite')
  if (!automated(a)) return s('auto', 'معرفی اتوماسیون با یک نمونهٔ آماده')
  return a.paying ? s('paid') : s('plan')
}
const isDone = (a) => (taskState('onb:' + a.id) || {}).status === 'done'
const median = (arr) => { const v = arr.slice().sort((p, q) => p - q); return v.length ? v[Math.floor(v.length / 2)] : null }

export async function onboarding({ range: R = 30 } = {}) {
  const [accounts, def] = await Promise.all([customersAll(), definitions().catch(() => ({}))])
  const ACT = { records: (def.activation && def.activation.recordEvents) || 10, days: (def.activation && def.activation.days) || 7 }
  const cohort = accounts.filter((a) => a.age < R).sort((p, q) => p.age - q.age || p.lastSeenMin - q.lastSeenMin)
  const prev = accounts.filter((a) => a.age >= R && a.age < 2 * R)
  const rate = (list, f) => (list.length ? list.filter(f).length / list.length : null)

  const fbN = cohort.filter(hasBase).length
  const mature = cohort.filter((a) => a.age >= ACT.days), prevMature = prev.filter((a) => a.age >= ACT.days)
  const fbDays = cohort.filter(hasBase).map((a) => a.firstBaseDays)
  const stuckL = cohort.filter(stuck)
  const hp = cohort.filter(highPot)

  const daily = []
  for (let d = R - 1; d >= 0; d--) {
    const c = cohort.filter((a) => a.age === d), x = c.filter(activated).length
    daily.push({ daysAgo: d, activated: x, pending: c.length - x })
  }

  const noBase = cohort.filter((a) => !hasBase(a)).length
  const under = cohort.filter((a) => hasBase(a) && !activated(a)).length
  const buckets = [
    { key: 'noBase', value: noBase },
    { key: 'under', value: under },
    { key: 'onTrack', value: cohort.length - noBase - under }, // no week-2 return data, so that bucket is left out
  ]
  const cnt = {}
  cohort.forEach((a) => { const k = nextStep(a).key; if (k !== 'wait' && !isDone(a)) cnt[k] = (cnt[k] || 0) + 1 })
  const steps = Object.entries(cnt).sort((p, q) => q[1] - p[1]).slice(0, 4).map(([key, n]) => ({ key, n, label: STEPS[key] }))

  return {
    range: R,
    activation: ACT,
    hpDef: HP_DEF,
    stepLabels: STEPS,
    kpis: {
      signups: { now: cohort.length, prev: prev.length, spark: daily.map((x) => x.activated + x.pending) },
      firstBase: { rate: cohort.length ? fbN / cohort.length : 0, prev: rate(prev, hasBase), n: fbN },
      activation: { rate: rate(mature, activated), prev: rate(prevMature, activated), mature: mature.length },
      firstBaseDays: { median: median(fbDays), sameDay: fbDays.length ? fbDays.filter((d) => d === 0).length / fbDays.length : 0 },
      stuck: { n: stuckL.length, lost: stuckL.filter(lost).length },
      highPot: { stuck: hp.filter(stuck).length, total: hp.length },
    },
    daily, buckets, steps,
    rows: cohort.map((a) => ({
      ...a,
      sourceName: sourceName(a.source),
      status: status(a),
      checklist: checklist(a, ACT),
      stuck: stuck(a), highPot: highPot(a), activated: activated(a),
      next: nextStep(a),
      done: isDone(a),
    })),
  }
}
