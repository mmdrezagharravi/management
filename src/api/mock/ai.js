/* GET /management/ai-brief — the daily AI brief: hero paragraphs, three findings,
   ranked actions, the data-used card and the 7-day history.
   Rich text is a list of parts: a plain string, { b: text }, { cls, t } (highlight),
   { acc: id, name, cls? } (customer link) or { to, t } (page link). No HTML. */
import { DB } from 'src/mock/engine'
import { ok, taskState, local } from './shared'
import { fa, n, compact, money, pct, signedPct, date, inDays, lagText } from 'src/lib/format'

const { accounts, agg, CONFIG: C } = DB

// run settings of the daily brief job (not data): model and token pricing used to estimate the cost line
const RUN = { model: 'gpt-5.5', promptTokens: 1800, tokensPerAccount: 24, outputTokens: 1400, usdPerMIn: 1.25, usdPerMOut: 10 }

const sum = (list, f) => list.reduce((t, a) => t + f(a), 0)
const median = (arr) => { const v = arr.slice().sort((p, q) => p - q); return v.length ? v[Math.floor(v.length / 2)] : 0 }
const mrrAtFor = (a, t) => { let v = 0; for (const pe of a.planEvents) if (pe.t >= t) v = pe.mrr; else break; return v }
const sgn = (x) => (x > 0 ? '+' : x < 0 ? '−' : '')
const cm = (x) => sgn(x) + compact(Math.abs(x))
const times = (x) => n(x, 1)
// The model only ever sees account IDs. Names are joined back here.
const acc = (a, cls) => ({ acc: a.id, name: a.name, cls: cls === undefined ? 'ai-link' : cls })
// "at risk" = below the lowest band that is not a risk band (same line the health page and the risk segment use)
const RISK = C.health.bands.find((b) => b.key === 'warn').min
const dayKey = () => { const j = DB.jalali(0); return j.y + '-' + j.m + '-' + j.d }

export function aiBrief() {
  /* ------------------------------------------------------------ facts */
  const paying = accounts.filter((a) => a.paying)
  const mrrNow = agg.mrrAt(0), mrr30 = agg.mrrAt(30)
  const mv = agg.movements(30, 0)
  const net = mv.new + mv.expansion + mv.contraction + mv.churn
  const risky = paying.filter((a) => a.health < RISK).sort((p, q) => q.mrr - p.mrr)
  const riskTop = risky[0]
  const ups = accounts.filter((a) => a.segments.includes('upsell'))
  const upScore = (a) => DB.upgradeValue(a) * 1e4 + a.limitHits30 * (1 + a.pricingVisits30)
  const upsSorted = ups.slice().sort((p, q) => upScore(q) - upScore(p))
  const oppTop = upsSorted[0]
  const src = agg.sources(30, 90)
  const srcN = sum(src, (s) => s.signups), srcPaid = sum(src, (s) => s.paid)
  const avgPaid = srcN ? srcPaid / srcN : 0
  const minN = Math.max(20, Math.round(srcN / src.length / 2)) // ignore channels too small to compare
  const best = src.filter((s) => s.signups >= minN).sort((p, q) => q.paidRate - p.paidRate)[0]
  const beh = DB.ops.ingestion.find((s) => s.key === 'behavior')
  const cron = DB.ops.crons.find((c) => c.key === 'brief') || { lastAt: '', duration: '' }
  const lagDays = Math.ceil(beh.lagMin / 1440)
  const analysed = accounts.filter((a) => a.paying || a.lastSeenDays <= 30)
  const tokensIn = RUN.promptTokens + analysed.length * RUN.tokensPerAccount
  const cost = (tokensIn / 1e6) * RUN.usdPerMIn + (RUN.outputTokens / 1e6) * RUN.usdPerMOut

  /* ------------------------------------------------------------ hero */
  const chg = mrr30 ? (mrrNow - mrr30) / mrr30 : 0
  const p = []
  p.push(['درآمد ماهانهٔ تکرارشونده امروز ', { b: money(mrrNow) }, ' است؛ ',
    { cls: chg >= 0 ? 'hl-good' : 'hl-bad', t: signedPct(chg, 1) }, ' نسبت به ۳۰ روز پیش (' + compact(mrr30) + '). ',
    'خالص درآمد جدید این ۳۰ روز ', { b: cm(net) }, ' بود: ' + fa(mv.newCount) + ' مشتری جدید (' + cm(mv.new) + ') و ' + fa(mv.expCount) + ' ارتقا (' + cm(mv.expansion) + ')، ' +
    'منهای ' + fa(mv.churnCount) + ' ریزش (' + cm(mv.churn) + ')' + (mv.conCount ? ' و ' + fa(mv.conCount) + ' کاهش پلن (' + cm(mv.contraction) + ')' : '') + '.'])
  if (riskTop) p.push([{ b: 'بزرگ‌ترین ریسک:' }, ' ', acc(riskTop, ''), ' با ' + money(riskTop.mrr) + ' در ماه و سلامت ', { cls: 'hl-bad', t: n(riskTop.health) },
    (riskTop.pastDue ? '؛ پرداخت تمدیدش هم ناموفق مانده' : '') + '. تمدید بعدی ' + date(-riskTop.renewIn) + ' (' + inDays(riskTop.renewIn) + ')' + '.'])
  if (oppTop) p.push([{ b: 'بزرگ‌ترین فرصت:' }, ' ', acc(oppTop, ''), ' — ' + fa(oppTop.limitHits30) + ' بار به سقف ' + oppTop.maxUsage.label + ' خورده و ' + fa(oppTop.pricingVisits30) + ' بار صفحهٔ قیمت را دیده؛ ارتقا یعنی ',
    { cls: 'hl-good', t: '+' + money(DB.upgradeValue(oppTop)) }, ' در ماه.'])
  if (best) p.push([{ b: 'بهترین کانال جذب:' }, ' ' + best.name + ' — ' + pct(best.paidRate) + ' از ثبت‌نام‌های ۳۰ تا ۱۲۰ روز پیشش پرداخت کرده‌اند (' + fa(best.paid) + ' از ' + fa(best.signups) + ')، ' + times(avgPaid ? best.paidRate / avgPaid : 0) + ' برابر میانگین ' + pct(avgPaid) + '.'])
  p.push([{ b: 'احتیاط:' }, ' لاگ رفتاری ' + lagText(beh.lagMin) + ' عقب است و در ۲۴ ساعت گذشته ' + n(beh.dropped24) + ' رویداد نرسیده؛ فعالیت ' + fa(lagDays) + ' روز اخیر کمتر از واقع دیده می‌شود و ممکن است چند حساب بی‌دلیل «در خطر» به نظر برسند.'])

  /* ------------------------------------------------------------ findings */
  const fb = local().aiFeedback, dk = dayKey()
  // anomaly: the automation queue against its own recent median
  const q = DB.ops.queues.find((x) => x.key === 'automation')
  const qPrev = q.trend.slice(0, -1), qBase = median(qPrev)
  const autos = accounts.filter((a) => a.segments.includes('automators'))
  const autosPaying = autos.filter((a) => a.paying).sort((x, y) => y.mrr - x.mrr)
  // risk: renewals in the next 30 days with a failing score
  const ren = paying.filter((a) => a.renewIn <= 30 && a.health < RISK).sort((x, y) => y.mrr - x.mrr)
  const renMrr = sum(ren, (a) => a.mrr)
  // opportunity: upgrade-ready accounts
  const upVal = sum(ups, (a) => DB.upgradeValue(a))

  const renTop = []
  ren.slice(0, 2).forEach((a, i) => { if (i) renTop.push(' و '); renTop.push(acc(a), ' (' + inDays(a.renewIn) + ')') })
  const findings = [
    { key: 'queue-automation', kind: 'ناهنجاری', cls: 'warn',
      title: 'صف خودکارسازی ' + times(qBase ? q.waiting / qBase : 0) + ' برابر حالت عادی',
      text: [n(q.waiting) + ' اجرا در صف مانده و ' + n(q.failed24) + ' اجرا در ۲۴ ساعت ناموفق بوده؛ خودکارسازی‌های ' + n(autos.length) + ' حساب خودکارساز دیر اجرا می‌شود',
        ...(autosPaying[0] ? ['، از جمله ', acc(autosPaying[0]), '.'] : ['.']), ' پیش از رسیدن شکایت، به تیم فنی خبر دهید.'],
      ev: ['در انتظار ', { b: n(q.waiting) }, ' · میانهٔ ' + fa(qPrev.length) + ' روز قبل ', { b: n(qBase) }, ' · ناموفق ۲۴ ساعت ', { b: n(q.failed24) }, ' · درآمد ماهانهٔ خودکارسازها ', { b: money(sum(autos, (a) => a.mrr)) }],
      link: { to: '/jobs', label: 'صف‌ها و زمان‌بندی' } },
    { key: 'renewals-at-risk', kind: 'ریسک', cls: 'crit',
      title: fa(ren.length) + ' تمدید پرریسک در ۳۰ روز آینده',
      text: ['مجموع ' + money(renMrr) + ' در ماه با سلامت زیر ' + fa(RISK) + ' به تمدید می‌رسد', ...(ren.length ? ['؛ بزرگ‌ترین‌ها ', ...renTop] : []), '. پیش از تاریخ تمدید تماس بگیرید، نه بعد از آن.'],
      ev: [{ b: fa(ren.length) }, ' حساب · ', { b: compact(renMrr) }, ' در ماه · ', { b: pct(mrrNow ? renMrr / mrrNow : 0, 1) }, ' از کل درآمد ماهانه · میانگین سلامت ', { b: n(ren.length ? sum(ren, (a) => a.health) / ren.length : 0) }, ' · پرداخت ناموفق ', { b: fa(ren.filter((a) => a.pastDue).length) }],
      link: { to: '/health', label: 'سلامت و ریسک' } },
    { key: 'upsell', kind: 'فرصت', cls: 'good',
      title: fa(ups.length) + ' حساب آمادهٔ ارتقا',
      text: ['به سقف پلن خورده‌اند و صفحهٔ قیمت را دیده‌اند. ارتقای همه‌شان ' + money(upVal) + ' به درآمد ماهانه اضافه می‌کند', ...(oppTop ? ['؛ قوی‌ترین سیگنال از ', acc(oppTop), ' است'] : []), '.'],
      ev: [{ b: fa(ups.length) }, ' حساب · ارزش ', { b: '+' + compact(upVal) }, ' در ماه (' + pct(mrrNow ? upVal / mrrNow : 0, 1) + ' از درآمد ماهانه)'],
      link: { to: '/segments?seg=upsell', label: 'فهرست آمادهٔ ارتقا' } },
  ].map((f) => ({ ...f, taskId: 'ai:' + f.key, taskOpen: (taskState('ai:' + f.key) || {}).status === 'open', fbKey: dk + ':' + f.key, feedback: fb[dk + ':' + f.key] || null }))

  /* ------------------------------------------------------------ ranked actions */
  const cand = []
  paying.filter((a) => a.pastDue).forEach((a) => {
    const inv = a.invoices[a.invoices.length - 1]
    cand.push({ key: 'pastdue:' + a.id, a, risk: true, value: a.mrr, title: [acc(a), ' — پرداخت ناموفق را پیگیری کنید'], why: 'تمدید ' + fa(inv.retries || 1) + ' بار ناموفق · اشتراک در دورهٔ مهلت · سلامت ' + fa(a.health) })
  })
  paying.filter((a) => a.health < RISK && a.renewIn <= 30 && !a.pastDue).forEach((a) => cand.push({ key: 'renew:' + a.id, a, risk: true, value: a.mrr,
    title: [acc(a), ' — پیش از تمدید تماس بگیرید'], why: 'سلامت ' + fa(a.health) + ' · تمدید ' + date(-a.renewIn) + ' (' + inDays(a.renewIn) + ')' }))
  paying.filter((a) => a.health2wAgo != null && a.health2wAgo - a.health >= 20 && a.health < 60).forEach((a) => cand.push({ key: 'drop:' + a.id, a, risk: true, value: a.mrr,
    title: [acc(a), ' — علت افت را بپرسید'], why: 'سلامت از ' + fa(a.health2wAgo) + ' به ' + fa(a.health) + ' در دو هفته' }))
  upsSorted.slice(0, 5).forEach((a) => cand.push({ key: 'upsell:' + a.id, a, risk: false, value: DB.upgradeValue(a),
    title: [acc(a), ' — پیشنهاد ارتقا'], why: fa(a.limitHits30) + ' بار سقف ' + a.maxUsage.label + ' · ' + fa(a.pricingVisits30) + ' بار صفحهٔ قیمت · پلن ' + C.plans[a.plan].name }))
  paying.filter((a) => a.plan !== 'team' && a.memberCount >= a.seats && a.activeMembers7 >= a.seats).forEach((a) => cand.push({ key: 'seats:' + a.id, a, risk: false, value: C.plans[a.plan].seatPrice * 2,
    title: [acc(a), ' — پیشنهاد همکار بیشتر'], why: fa(a.memberCount) + ' عضو از سقف ' + fa(a.seats) + ' همکار، همه این هفته فعال' }))
  // one line per customer: keep its biggest reason
  const byAcc = new Map()
  cand.forEach((c) => { const o = byAcc.get(c.a.id); if (!o || c.value > o.value) byAcc.set(c.a.id, c) })
  const actions = [...byAcc.values()]
  actions.sort((x, y) => y.value - x.value)
  const top = actions.slice(0, 9).map((x) => {
    return {
      key: x.key, taskId: 'ai:today:' + x.key, risk: x.risk, value: x.value, seg: !!x.seg, accountId: x.a ? x.a.id : null,
      title: x.title, why: x.why,
      inToday: (taskState('ai:today:' + x.key) || {}).status === 'open',
    }
  })

  /* ------------------------------------------------------------ data used + history */
  const ev30 = sum(analysed, (a) => a.events30)
  let inv30 = 0; accounts.forEach((a) => a.invoices.forEach((iv) => { if (iv.t < 30) inv30++ }))
  const riskAt = (d) => { let k = 0; for (const a of accounts) if (mrrAtFor(a, d) > 0 && DB.metrics(a, d).health < RISK) k++; return k }
  const riskSeries = []; for (let d = 0; d <= 7; d++) riskSeries.push(riskAt(d))
  const hist = []
  for (let d = 0; d < 7; d++) {
    const su = accounts.filter((a) => a.age === d).length
    const news = [], churns = []
    accounts.forEach((a) => a.planEvents.forEach((pe, k) => {
      if (pe.t !== d) return
      if (pe.kind === 'new') news.push({ a, v: pe.mrr })
      else if (pe.kind === 'churn') churns.push({ a, v: k ? a.planEvents[k - 1].mrr : 0 })
    }))
    news.sort((x, y) => y.v - x.v); churns.sort((x, y) => y.v - x.v)
    const r = riskSeries[d], dr = r - riskSeries[d + 1]
    const drTxt = dr ? ' (' + (dr > 0 ? '+' : '−') + fa(Math.abs(dr)) + ')' : ''
    let hl
    if (churns.length) hl = ['ریزش ', acc(churns[0].a), ' (−' + compact(churns[0].v) + ' در ماه)' + (churns.length > 1 ? ' و ' + fa(churns.length - 1) + ' ریزش دیگر' : '')]
    else if (news.length) hl = [fa(news.length) + ' مشتری جدید پرداخت کرد؛ بزرگ‌ترین ', acc(news[0].a), ' (+' + compact(news[0].v) + ')']
    else hl = ['مشتریان در خطر: ' + fa(r) + drTxt]
    hist.push({ d, hl, sub: fa(su) + ' ثبت‌نام · در خطر ' + fa(r) + drTxt + ' · ' + fa(news.length) + ' خرید اول · ' + fa(churns.length) + ' ریزش' })
  }

  return ok({
    paragraphs: p,
    stamp: { lastAt: cron.lastAt, duration: cron.duration, model: RUN.model, analysed: analysed.length, tokens: tokensIn + RUN.outputTokens, cost },
    findings,
    actions: { top, total: actions.length },
    dataUsed: { analysed: analysed.length, total: accounts.length, events30: ev30, invoices30: inv30, signups: srcN, historyDays: riskSeries.length - 1, behaviorLagMin: beh.lagMin },
    history: hist,
  })
}
