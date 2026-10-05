/* GET /management/onboarding (cards, chart) and /management/onboarding/signups (the table, one page per request).
   The server decides status and every view/filter; labels and the per-row checklist are built here.
   Steps the server cannot see (return in week 2) come back with status 'na'; the page leaves them out. */
import { get } from './client'
import { toAccount, definitions } from './account'
import { fa } from 'src/lib/format'
import { sourceName } from 'src/lib/refs'

const HP_DEF = 'همکار دعوت کرده یا از لینک دعوت آمده'
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

export async function onboarding({ range = 30 } = {}) {
  const r = await get('/onboarding', { range })
  return { ...r, hpDef: HP_DEF }
}

/** One page of the signup table: view, status/source filters, search, sort and paging all run on the server. */
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
    }
  })
  return { rows, total: r.total, counts: r.counts || {} }
}
