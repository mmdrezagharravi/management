/* GET /management/quota — accounts near their plan limits, plus our own supplier budgets. */
import { DB } from 'src/mock/engine'
import { C, ok, enrich, local, notesOf } from './shared'

// Our own supplier budgets (what Airsheet buys each month) — not customer plan limits.
const SMS_BUDGET = 60000 // بستهٔ ماهانهٔ پیامک نزد اپراتور
const AI_BUDGET = 12000000 // سقف ماهانهٔ توکن نزد سرویس هوش مصنوعی

const low = (a) => a.plan === 'basic' || a.plan === 'team'
const usageOf = (a, k) => a.usage.find((u) => u.key === k)
const ratioOf = (a, k) => { const u = usageOf(a, k); return u && u.limit ? u.ratio : 0 }
// days until the limit at the last 30 days' pace: null = already there, 'na' = only records are predictable, 'flat' = nothing added
function forecast(a, u) {
  if (u.ratio >= 1) return null
  if (u.key !== 'records') return 'na'
  const rate = a.records30 / 30
  return rate > 0 ? Math.ceil((u.limit - u.used) / rate) : 'flat'
}

export function quota() {
  const { accounts } = DB
  const RES = accounts[0].usage.map((u) => ({ key: u.key, label: u.label }))
  const resLabel = (k) => (RES.find((r) => r.key === k) || {}).label || k
  const rows = accounts.filter((a) => a.maxUsage && a.maxUsage.ratio >= 0.8)
  const full = rows.filter((a) => a.maxUsage.ratio >= 1)
  const fullBy = {}
  full.forEach((a) => a.usage.forEach((u) => { if (u.limit && u.ratio >= 1) fullBy[u.key] = (fullBy[u.key] || 0) + 1 }))
  const perRes = RES.map((r) => ({ ...r, n: accounts.filter((a) => ratioOf(a, r.key) >= 0.8).length })).filter((r) => r.n).sort((p, q) => q.n - p.n)
  const seen14 = (a) => a.lastSeenDays <= 14
  const r80 = (a) => a.maxUsage && a.maxUsage.ratio >= 0.8 && a.maxUsage.ratio < 1
  const r100 = (a) => a.maxUsage && a.maxUsage.ratio >= 1
  return ok({
    budgets: { sms: SMS_BUDGET, ai: AI_BUDGET },
    resources: RES,
    kpis: {
      near: rows.length, seen30: rows.filter((a) => a.lastSeenDays <= 30).length,
      full: full.length, fullTop: Object.entries(fullBy).sort((p, q) => q[1] - p[1]).slice(0, 2).map(([k, n]) => ({ key: k, label: resLabel(k), n })),
      hits: accounts.reduce((t, a) => t + a.limitHits30, 0), hitAccounts: accounts.filter((a) => a.limitHits30 > 0).length,
      sms: accounts.reduce((t, a) => t + a.sms30, 0), ai: accounts.reduce((t, a) => t + a.ai30, 0),
    },
    perRes,
    rules: [
      { at: 'warn', atL: '۸۰٪', who: 'رایگان و پایه', what: 'نوار داخل بیس: «۸۰٪ سقف … پر شده» با دکمهٔ مقایسهٔ پلن‌ها', n: accounts.filter((a) => low(a) && r80(a) && seen14(a)).length },
      { at: 'crit', atL: '۱۰۰٪', who: 'رایگان و پایه', what: 'پنجرهٔ ارتقای یک‌کلیکی هنگام برخورد + ایمیل به مالک حساب', n: accounts.filter((a) => low(a) && r100(a) && seen14(a)).length },
      { at: 'warn', atL: '۸۰٪', who: 'پرو و سازمانی', what: 'اعلان به مدیر حساب + پیشنهاد افزایش سهمیه', n: accounts.filter((a) => !low(a) && r80(a) && seen14(a)).length },
      { at: 'crit', atL: '۱۰۰٪', who: 'پرو و سازمانی', what: '۱۰٪ مازاد موقت تا تماس کارشناس — کار مشتری متوقف نمی‌شود', n: accounts.filter((a) => !low(a) && r100(a) && seen14(a)).length },
    ],
    upsellN: accounts.filter((a) => a.segments.includes('upsell')).length,
    rows: rows.map((a) => {
      const usage = a.usage.map((u) => ({ key: u.key, label: u.label, used: u.used, limit: u.limit, ratio: u.ratio, forecast: forecast(a, u) }))
      const offer = notesOf(a.id).find((x) => x.kind === 'offer')
      return {
        ...enrich(a), usage, maxUsage: usage.find((u) => u.key === a.maxUsage.key),
        low: low(a), nextPlan: C.plans[a.plan === 'basic' ? 'team' : 'business'].name,
        action: offer ? { kind: offer.offer || (offer.text.startsWith('پیشنهاد ارتقا') ? 'upgrade' : 'quota') } : null,
      }
    }),
  })
}

/** Undo an offer / quota request: drop the note that recorded it. */
export function undoQuotaOffer(id, text) {
  local().removeNote(id, text)
  return ok(true)
}
