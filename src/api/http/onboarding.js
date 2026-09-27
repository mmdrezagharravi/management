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

function checklist(a, ACT) {
  const hasBase = a.firstBaseDays != null, activated = a.activated === true, invited = a.memberCount > 1
  return [
    { l: 'بیس', s: hasBase ? 'done' : 'open', d: hasBase ? (a.firstBaseDays ? 'روز ' + fa(a.firstBaseDays) : 'همان روز') : 'هنوز نساخته' },
    { l: fa(ACT.records) + ' رکورد', s: activated ? 'done' : a.age < ACT.days ? 'wait' : 'open', d: activated ? 'رسید' : a.age < ACT.days ? 'تا روز ' + fa(ACT.days) + ' فرصت دارد' : 'نرسید' },
    { l: 'دعوت همکار', s: invited ? 'done' : 'open', d: invited ? fa(a.memberCount - 1) + ' همکار' : 'هنوز نه' },
    { l: 'خودکارسازی', s: a.automations > 0 ? 'done' : 'open', d: a.automations > 0 ? 'ساخته' : 'هنوز نه' },
    { l: 'بازگشت در هفتهٔ ۲', s: 'na', d: 'داده‌ای ندارد' },
  ]
}
const isDone = (id) => (taskState('onb:' + id) || {}).status === 'done'
const doneIds = () => Object.keys(useLocalStore().tasks).filter((k) => k.startsWith('onb:') && isDone(k.slice(4))).map((k) => k.slice(4))

export async function onboarding({ range = 30 } = {}) {
  const done = doneIds()
  const r = await get('/onboarding', { range, done: done.length ? done.join(',') : undefined })
  return { ...r, hpDef: HP_DEF, stepLabels: STEPS, steps: r.steps.map((s) => ({ ...s, label: STEPS[s.key] })) }
}

/** One page of the signup table: view, status/source/next-step filters, search, sort and paging all run on the server. */
export async function onboardingPage(params) {
  const [r, def] = await Promise.all([get('/onboarding/signups', params), definitions().catch(() => ({}))])
  const ACT = { records: def.activation?.recordEvents ?? 10, days: def.activation?.days ?? 7 }
  const rows = r.items.map((s) => {
    const a = toAccount(s)
    return {
      ...a,
      sourceName: sourceName(a.source),
      status: s.status,
      checklist: checklist(a, ACT),
      stuck: s.stuck, highPot: s.highPot, activated: s.activated === true, hasBase: s.hasBase, stepsDone: s.stepsDone,
      next: { key: s.next, text: NEXT_TEXT[s.next] },
      done: isDone(a.id),
    }
  })
  return { rows, total: r.total, counts: r.counts || {} }
}
