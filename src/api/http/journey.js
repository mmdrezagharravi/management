/* GET /management/funnel + /renewals + customers — customer journey map. Same shape as mock/journey.js.
   Gaps: no site visits (visit n = null, signup fromPrev = null), no plan-change history (renew.expanded = null). */
import { get } from './client'
import { customersAll } from './account'
import { funnel } from './funnel'
import { CYCLE_DAYS } from './revenue'

// eight stages; the manual rows are reviewed every quarter (copy of mock/journey.js STAGES)
export const STAGES = [
  { key: 'visit', label: 'آگاهی', src: 'بازدید سایت · هنوز متصل نیست',
    job: 'دنبال راهی است که اکسل‌ها و پیام‌های پراکندهٔ کارش را یک‌جا جمع کند', touch: 'گوگل، اینستاگرام، تلگرام، تبلیغات کلیکی، صفحهٔ قالب‌ها',
    pain: 'فرق «بیس» با یک فایل اکسل روشن نیست؛ مثال صنف خودش را نمی‌بیند', fix: 'صفحهٔ فرود جدا برای هر صنف با قالب آماده و ویدئوی ۶۰ ثانیه‌ای' },
  { key: 'signup', label: 'ثبت‌نام', src: 'حساب‌ها (main)',
    job: 'با موبایل حساب می‌سازد و کد تأیید را وارد می‌کند', touch: 'فرم ثبت‌نام، پیامک تأیید',
    pain: 'پیامک تأیید گاهی دیر می‌رسد و کاربر صفحه را می‌بندد', fix: 'ورود با گوگل و ارسال دوبارهٔ خودکار کد بعد از ۳۰ ثانیه' },
  { key: 'firstBase', label: 'اولین بیس', src: 'بیس‌ها (main)',
    job: 'قالب انتخاب می‌کند یا فایل Excel خودش را وارد می‌کند', touch: 'گالری قالب، ورود از Excel، ویدئوی شروع',
    pain: 'صفحهٔ خالی؛ قالب‌ها با کار واقعی‌اش جور نیستند', fix: 'پرسیدن صنف در ثبت‌نام و باز کردن قالب همان صنف به‌عنوان اولین بیس' },
  { key: 'activated', label: 'فعال‌سازی', src: 'رویدادهای رکورد (behavior)',
    job: 'دادهٔ واقعی وارد می‌کند، فیلد و نما می‌سازد', touch: 'راهنمای درون‌برنامه، ایمیل روز دوم، چت پشتیبانی',
    pain: 'ورود Excel با تاریخ شمسی و سلول‌های ادغام‌شده خطا می‌دهد', fix: 'جادوگر ورود با تشخیص تاریخ شمسی؛ تماس کارشناس در روز سوم' },
  { key: 'habit', label: 'عادت', src: 'رفتار کاربر (behavior)',
    job: 'هر هفته برمی‌گردد، همکار دعوت می‌کند، فرم یا اتوماسیون می‌سازد', touch: 'اعلان‌ها، ایمیل خلاصهٔ هفتگی، دعوت همکار',
    pain: 'بدون اتوماسیون و یادآور، دلیلی برای برگشتن ندارد', fix: 'ساخت اولین اتوماسیون در آنبوردینگ و ایمیل «هفتهٔ شما در Airsheet»' },
  { key: 'paid', label: 'پرداخت', src: 'پرداخت‌ها (WALLET)',
    job: 'به سقف رکورد یا همکار می‌خورد، پلن‌ها را مقایسه می‌کند و پرداخت می‌کند', touch: 'پیام سقف پلن، صفحهٔ قیمت، درگاه پرداخت، تماس فروش',
    pain: 'سقف ۱۰۰۰ رکورد ناگهان کار را قفل می‌کند؛ قیمت بر اساس تعداد همکار گیج‌کننده است', fix: 'هشدار در ۸۰٪ سقف با پیشنهاد پلن و تخفیف ماه اول' },
  { key: 'renew', label: 'تمدید و گسترش', src: 'اشتراک‌ها (WALLET)',
    job: 'تمدید می‌کند، همکار اضافه می‌کند و تیم‌های دیگر را می‌آورد', touch: 'یادآور تمدید، فاکتور، کارشناس فروش',
    pain: 'پرداخت ناموفق چند روز دیده نمی‌شود؛ ارزش پلن بالاتر روشن نیست', fix: 'یادآور ۷ روز پیش از تمدید و تماس کارشناس با حساب‌های کم‌سلامت' },
  { key: 'refer', label: 'معرفی', src: 'معرف ثبت‌نام (main)',
    job: 'لینک دعوت یا فرم اشتراکی را برای همکار و مشتری خودش می‌فرستد', touch: 'لینک دعوت، نمای اشتراکی، فرم عمومی',
    pain: 'دعوت‌کننده سودی نمی‌برد؛ فرم عمومی نشانی از Airsheet ندارد', fix: 'یک ماه رایگان برای دعوت‌کننده وقتی دعوت‌شده پرداخت کند' },
]

const TR = ['firstBase', 'activated', 'habit', 'paid']

export async function journey({ range: R = 30 } = {}) {
  const [fn, ren, accounts] = await Promise.all([funnel({ range: R }), get('/renewals', { days: R, lapsedDays: R }), customersAll()])
  const f = fn.steps.map((s) => ({ key: s.key, label: s.label, n: s.n, fromPrev: s.key === 'signup' ? null : s.fromPrev, fromStart: s.fromStart, medianDays: s.medianDays }))
  const K = {}; f.forEach((s) => { K[s.key] = s })

  // post-purchase: renewals that fell due in the last R days — renewed (paying, last payment inside the window, not their first)
  // vs lapsed (server: not renewed within R days). ponytail: renewal date inferred from cycle length; exact once invoices are exposed
  const paying = accounts.filter((a) => a.paying)
  const renewed = paying.filter((a) => { const cd = CYCLE_DAYS[a.cycle]; return cd && a.renewIn <= cd && a.renewIn > cd - R && a.tenureDays > cd }).length
  const due = renewed + (ren.lapsed || []).length
  const su = accounts.filter((a) => a.age < R).length
  const invited = accounts.filter((a) => a.referredBy && a.age < R).length

  const weakest = TR.slice().sort((p, q) => (K[p].fromPrev ?? Infinity) - (K[q].fromPrev ?? Infinity))[0]
  const steps = f.slice(1)
  const drops = steps.slice(1).map((s, i) => ({ from: steps[i].label, to: s.label, key: s.key, lost: steps[i].n - s.n, rate: 1 - (s.fromPrev ?? 0) }))
    .sort((p, q) => q.lost - p.lost).slice(0, 3)

  const cand = accounts.filter((a) => a.age >= 1 && a.age <= 14 && a.firstBaseDays == null).sort((p, q) => p.age - q.age)
  const b2a = K.activated.fromPrev ?? 0
  return {
    range: R, mature: fn.mature, dataSince: fn.dataSince,
    stages: STAGES, funnel: f,
    renew: { due, renewed, rate: due ? renewed / due : 0, expanded: null, paying: paying.length },
    refer: { invited, signups: su, rate: su ? invited / su : 0 },
    weakest, drops,
    assisted: { count: cand.length, b2a, gain: Math.round((cand.length / 2) * b2a), top: cand.slice(0, 3) },
  }
}
