/* GET /management/journey?range=30 — customer journey map: live funnel numbers per stage + hand-written stage copy. */
import { DB } from 'src/mock/engine'
import { ok, enrich } from './shared'

const MATURE = 30 // same cohort rule as the funnel page

// eight stages; the manual rows are reviewed every quarter by the owners listed
export const STAGES = [
  { key: 'visit', label: 'آگاهی', src: 'Clarity · بازدید سایت',
    job: 'دنبال راهی است که اکسل‌ها و پیام‌های پراکندهٔ کارش را یک‌جا جمع کند', touch: 'گوگل، اینستاگرام، تلگرام، تبلیغات کلیکی، صفحهٔ قالب‌ها',
    pain: 'فرق «بیس» با یک فایل اکسل روشن نیست؛ مثال صنف خودش را نمی‌بیند', fix: 'صفحهٔ فرود جدا برای هر صنف با قالب آماده و ویدئوی ۶۰ ثانیه‌ای' },
  { key: 'signup', label: 'ثبت‌نام', src: 'حساب‌ها (main)',
    job: 'با موبایل حساب می‌سازد و کد تأیید را وارد می‌کند', touch: 'فرم ثبت‌نام، پیامک تأیید',
    pain: 'پیامک تأیید گاهی دیر می‌رسد و کاربر صفحه را می‌بندد', fix: 'ورود با گوگل و ارسال دوبارهٔ خودکار کد بعد از ۳۰ ثانیه' },
  { key: 'firstBase', label: 'اولین بیس', src: 'بیس‌ها (main)',
    job: 'قالب انتخاب می‌کند یا فایل Excel خودش را وارد می‌کند', touch: 'گالری قالب، ورود از Excel، ویدئوی شروع',
    pain: 'صفحهٔ خالی؛ قالب‌ها با کار واقعی‌اش جور نیستند', fix: 'پرسیدن صنف در ثبت‌نام و باز کردن قالب همان صنف به‌عنوان اولین بیس' },
  { key: 'activated', label: 'فعال‌سازی', src: 'رکوردها (main)',
    job: 'دادهٔ واقعی وارد می‌کند، فیلد و نما می‌سازد', touch: 'راهنمای درون‌برنامه، ایمیل روز دوم، چت پشتیبانی',
    pain: 'ورود Excel با تاریخ شمسی و سلول‌های ادغام‌شده خطا می‌دهد', fix: 'جادوگر ورود با تشخیص تاریخ شمسی؛ تماس کارشناس در روز سوم' },
  { key: 'habit', label: 'عادت', src: 'رفتار کاربر (behavior)',
    job: 'هر هفته برمی‌گردد، همکار دعوت می‌کند، فرم یا اتوماسیون می‌سازد', touch: 'اعلان‌ها، ایمیل خلاصهٔ هفتگی، دعوت همکار',
    pain: 'بدون اتوماسیون و یادآور، دلیلی برای برگشتن ندارد', fix: 'ساخت اولین اتوماسیون در آنبوردینگ و ایمیل «هفتهٔ شما در Airsheet»' },
  { key: 'paid', label: 'پرداخت', src: 'پرداخت‌ها (WALLET)',
    job: 'به سقف رکورد یا همکار می‌خورد، پلن‌ها را مقایسه می‌کند و پرداخت می‌کند', touch: 'پیام سقف پلن، صفحهٔ قیمت، درگاه پرداخت، تماس فروش',
    pain: 'سقف ۱۰۰۰ رکورد ناگهان کار را قفل می‌کند؛ قیمت بر اساس تعداد همکار گیج‌کننده است', fix: 'هشدار در ۸۰٪ سقف با پیشنهاد پلن و تخفیف ماه اول' },
  { key: 'renew', label: 'تمدید و گسترش', src: 'فاکتورها و تغییر پلن (WALLET)',
    job: 'تمدید می‌کند، همکار اضافه می‌کند و تیم‌های دیگر را می‌آورد', touch: 'یادآور تمدید، فاکتور، کارشناس فروش',
    pain: 'پرداخت ناموفق چند روز دیده نمی‌شود؛ ارزش پلن بالاتر روشن نیست', fix: 'یادآور ۷ روز پیش از تمدید و تماس کارشناس با حساب‌های کم‌سلامت' },
  { key: 'refer', label: 'معرفی', src: 'منبع ثبت‌نام (main)',
    job: 'لینک دعوت یا فرم اشتراکی را برای همکار و مشتری خودش می‌فرستد', touch: 'لینک دعوت، نمای اشتراکی، فرم عمومی',
    pain: 'دعوت‌کننده سودی نمی‌برد؛ فرم عمومی نشانی از Airsheet ندارد', fix: 'یک ماه رایگان برای دعوت‌کننده وقتی دعوت‌شده پرداخت کند' },
]

export function journey({ range: R = 30 } = {}) {
  const { agg, accounts } = DB
  const f = agg.funnel(MATURE, R)
  const K = {}; f.forEach((s) => { K[s.key] = s })

  // post-purchase: renewals that fell due in the last 90 days (paid, failed, or churned instead)
  let due = 0, renewed = 0
  for (const a of accounts) {
    a.invoices.forEach((inv, i) => { if (i > 0 && inv.t < 90) { due++; if (inv.status === 'paid') renewed++ } })
    a.planEvents.forEach((pe) => { if (pe.kind === 'churn' && pe.t < 90) due++ })
  }
  const paying = accounts.filter((a) => a.paying)
  const expanded = paying.filter((a) => a.planEvents.some((pe) => pe.kind === 'expansion' && pe.t < 90)).length
  const su = agg.signups(0, R)
  const invited = accounts.filter((a) => a.source === 'invite' && a.age < R).length

  // weakest transition inside the account funnel
  const tr = ['firstBase', 'activated', 'habit', 'paid']
  const weakest = tr.slice().sort((p, q) => K[p].fromPrev - K[q].fromPrev)[0]

  // friction ranking: biggest drops between consecutive account-funnel steps
  const steps = f.slice(1)
  const drops = steps.slice(1).map((s, i) => ({ from: steps[i].label, to: s.label, key: s.key, lost: steps[i].n - s.n, rate: 1 - s.fromPrev }))
    .sort((p, q) => q.lost - p.lost).slice(0, 3)

  // assisted onboarding (proposed): signed up 1–14 days ago, still no base
  const cand = accounts.filter((a) => a.age >= 1 && a.age <= 14 && a.milestones.firstBase === undefined).sort((p, q) => p.age - q.age)
  const b2a = K.activated.fromPrev
  const gain = Math.round((cand.length / 2) * b2a)

  return ok({
    range: R, mature: MATURE,
    stages: STAGES,
    funnel: f.map((s) => ({ key: s.key, label: s.label, n: s.n, fromPrev: s.fromPrev, fromStart: s.fromStart, medianDays: s.medianDays })),
    renew: { due, renewed, rate: due ? renewed / due : 0, expanded, paying: paying.length },
    refer: { invited, signups: su, rate: su ? invited / su : 0 },
    weakest,
    drops,
    assisted: { count: cand.length, b2a, gain, top: cand.slice(0, 3).map(enrich) },
  })
}
