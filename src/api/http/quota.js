/* GET /management/quota + the customer list → accounts near their plan limits.
   Only two resources exist on the server (records, automation runs); no supplier budgets. */
import { get } from './client'
import { customersAll, notesOf } from './account'
import { PLAN_NAME } from 'src/lib/ui'

const RES_KEYS = ['records', 'runs']
const low = (a) => a.plan === 'free' || a.plan === 'basic'
const usageOf = (a, k) => a.usage.find((u) => u.key === k)
const ratioOf = (a, k) => { const u = usageOf(a, k); return u && u.limit ? u.ratio : 0 }
const maxOf = (a) => RES_KEYS.map((k) => usageOf(a, k)).filter(Boolean).sort((p, q) => q.ratio - p.ratio)[0]

export async function quota() {
  const [q, accounts] = await Promise.all([get('/quota').catch(() => ({ bases: [] })), customersAll()])
  const RES = RES_KEYS.map((k) => { const u = usageOf(accounts[0] || { usage: [] }, k); return { key: k, label: u ? u.label : k } })
  const resLabel = (k) => (RES.find((r) => r.key === k) || {}).label || k
  const rows = accounts.filter((a) => RES_KEYS.some((k) => ratioOf(a, k) >= 0.8))
  const full = rows.filter((a) => RES_KEYS.some((k) => ratioOf(a, k) >= 1))
  const fullBy = {}
  full.forEach((a) => RES_KEYS.forEach((k) => { if (ratioOf(a, k) >= 1) fullBy[k] = (fullBy[k] || 0) + 1 }))
  const perRes = RES.map((r) => ({ ...r, n: accounts.filter((a) => ratioOf(a, r.key) >= 0.8).length })).filter((r) => r.n).sort((p, q) => q.n - p.n)
  const seen14 = (a) => a.lastSeenDays <= 14
  const r80 = (a) => { const m = maxOf(a); return m && m.ratio >= 0.8 && m.ratio < 1 }
  const r100 = (a) => { const m = maxOf(a); return m && m.ratio >= 1 }
  const atLimitBases = (q.bases || []).filter((b) => b.atLimit)
  return {
    budgets: null, // Airsheet buys no SMS/AI packages the panel can see
    resources: RES,
    kpis: {
      near: rows.length, seen30: rows.filter((a) => a.lastSeenDays <= 30).length,
      full: full.length, fullTop: Object.entries(fullBy).sort((p, q) => q[1] - p[1]).slice(0, 2).map(([k, n]) => ({ key: k, label: resLabel(k), n })),
      // the server only knows *which bases are at their record limit today*, not how many times anyone hit it
      hits: atLimitBases.length, hitAccounts: new Set(atLimitBases.map((b) => b.creator && b.creator.id)).size, hitsKind: 'bases',
      sms: 0, ai: 0,
    },
    perRes,
    rules: [
      { at: 'warn', atL: '۸۰٪', who: 'رایگان', what: 'نوار داخل بیس: «۸۰٪ سقف … پر شده» با دکمهٔ مقایسهٔ پلن‌ها', n: accounts.filter((a) => low(a) && r80(a) && seen14(a)).length },
      { at: 'crit', atL: '۱۰۰٪', who: 'رایگان', what: 'پنجرهٔ ارتقای یک‌کلیکی هنگام برخورد + ایمیل به مالک حساب', n: accounts.filter((a) => low(a) && r100(a) && seen14(a)).length },
      { at: 'warn', atL: '۸۰٪', who: 'تیمی و بالاتر', what: 'اعلان به مدیر حساب + کار «افزایش سهمیه» برای کارشناس مسئول', n: accounts.filter((a) => !low(a) && r80(a) && seen14(a)).length },
      { at: 'crit', atL: '۱۰۰٪', who: 'تیمی و بالاتر', what: '۱۰٪ مازاد موقت تا تماس کارشناس — کار مشتری متوقف نمی‌شود', n: accounts.filter((a) => !low(a) && r100(a) && seen14(a)).length },
    ],
    upsellN: accounts.filter((a) => a.segments.includes('upsell')).length,
    rows: rows.map((a) => {
      // forecast: null = already there; 'na' = the server has no 30-day record pace
      const usage = RES_KEYS.map((k) => usageOf(a, k)).filter(Boolean).map((u) => ({ key: u.key, label: u.label, used: u.used, limit: u.limit, ratio: u.ratio, forecast: u.ratio >= 1 ? null : 'na' }))
      const mx = usage.slice().sort((p, q) => q.ratio - p.ratio)[0]
      const offer = notesOf(a.id).find((x) => x.kind === 'offer')
      return {
        ...a, usage, maxUsage: mx,
        low: low(a), nextPlan: PLAN_NAME[low(a) ? 'team' : 'business'],
        action: offer ? { kind: offer.offer || (offer.text.startsWith('پیشنهاد ارتقا') ? 'upgrade' : 'quota') } : null,
      }
    }),
  }
}
