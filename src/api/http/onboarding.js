/* GET /management/onboarding (cards, chart, open steps) and /management/onboarding/signups (the table, one page per request).
   The server decides status, next step and every view/filter; labels and the per-row checklist are built here.
   Steps the server cannot see (return in week 2) come back with status 'na'; the page greys them. */
import { get } from './client'
import { toAccount, definitions, taskState } from './account'
import { useLocalStore } from 'stores/local'
import { fa } from 'src/lib/format'
import { sourceName } from 'src/lib/refs'

const HP_DEF = 'همکار دعوت کرده یا از لینک دعوت آمده'
const STEPS = {
  call: 'تماس خوشامد',
  tpl: 'ایمیل تمپلیت‌های شروع',
  excel: 'راهنمای ورود داده از Excel',
  back: 'پیام بازگشت',
  invite: 'پیشنهاد دعوت همکار',
  auto: 'معرفی خودکارسازی',
  plan: 'پیشنهاد پلن پایه',
  paid: 'تماس خوشامد مشتری پرداخت‌کننده',
  wait: 'فعلاً صبر',
}
const NEXT_TEXT = { ...STEPS, wait: 'فعلاً صبر — روز ۲ بررسی شود', auto: 'معرفی خودکارسازی با یک نمونهٔ آماده' }
const MEMBER_TEXT = 'اقدامی لازم نیست — عضو بیس همکار است'
const WEEK = 7

/** Any activity in days 7..13 after signup, read from last30 (index 29 = today); 'na' once that week left the 30-day window. */
function weekTwo(a) {
  if (a.age < 2 * WEEK) return { s: 'wait', d: 'تا روز ' + fa(2 * WEEK) + ' فرصت دارد' }
  const start = a.last30.length - 1 - a.age + WEEK
  if (start < 0 || !a.last30.length) return { s: 'na', d: 'بیرون از بازهٔ ۳۰ روزهٔ داده' }
  const back = a.last30.slice(start, start + WEEK).some((x) => x > 0)
  return { s: back ? 'done' : 'open', d: back ? 'برگشت' : 'برنگشت' }
}

function checklist(a, ACT) {
  const hasBase = a.firstBaseDays != null, activated = a.activated === true, invited = a.memberCount > 1
  return [
    { l: 'بیس', s: hasBase ? 'done' : 'open', d: hasBase ? (a.firstBaseDays ? 'روز ' + fa(a.firstBaseDays) : '۲۴ ساعت اول') : 'هنوز نساخته' },
    { l: fa(ACT.records) + ' رویداد رکورد', s: activated ? 'done' : a.age < ACT.days ? 'wait' : 'open', d: activated ? 'رسید' : a.age < ACT.days ? 'تا روز ' + fa(ACT.days) + ' فرصت دارد' : 'نرسید' },
    { l: 'دعوت همکار', s: invited ? 'done' : 'open', d: invited ? fa(a.memberCount - 1) + ' همکار' : 'هنوز نه' },
    { l: 'خودکارسازی', s: a.automations > 0 ? 'done' : 'open', d: a.automations > 0 ? 'ساخته' : 'هنوز نه' },
    { l: 'بازگشت در هفتهٔ ۲', ...weekTwo(a) },
  ]
}
/** A mark counts only for the step it was made on; once the account moves on, its next step is open again. */
const isDone = (id, step) => { const t = taskState('onb:' + id) || {}; return t.status === 'done' && (!t.step || t.step === step) }
/** The most recently marked tasks as id.step, capped at the server's 500-entry limit for `done`. */
const doneMarks = () => Object.entries(useLocalStore().tasks)
  .filter(([k, t]) => k.startsWith('onb:') && t && t.status === 'done')
  .map(([k, t]) => k.slice(4) + (t.step ? '.' + t.step : ''))
  .slice(-500)
const doneParam = () => { const d = doneMarks(); return d.length ? d.join(',') : undefined }

export async function onboarding({ range = 30 } = {}) {
  const r = await get('/onboarding', { range, done: doneParam() })
  return { ...r, hpDef: HP_DEF, stepLabels: STEPS, steps: r.steps.map((s) => ({ ...s, label: STEPS[s.key] })) }
}

/** One page of the signup table: view, status/source/next-step filters, search, sort and paging all run on the server. */
export async function onboardingPage(params) {
  const [r, def] = await Promise.all([get('/onboarding/signups', { ...params, done: params.next ? doneParam() : undefined }), definitions().catch(() => ({}))])
  const ACT = { records: def.activation?.recordEvents ?? 10, days: def.activation?.days ?? 7 }
  const rows = r.items.map((s) => {
    const a = toAccount(s)
    return {
      ...a,
      sourceName: sourceName(a.source),
      status: s.status,
      checklist: checklist(a, ACT),
      stuck: s.stuck, highPot: s.highPot, activated: s.activated === true, hasBase: s.hasBase, stepsDone: s.stepsDone,
      next: { key: s.next, text: s.status === 'member' ? MEMBER_TEXT : NEXT_TEXT[s.next] },
      done: isDone(a.id, s.next),
    }
  })
  return { rows, total: r.total, counts: r.counts || {} }
}
