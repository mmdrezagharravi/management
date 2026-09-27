/* Reference lists that are stable enough to bundle with the UI (labels, order).
   They mirror src/mock/engine CONFIG; when the backend owns them, load once via api.config(). */
export const PLAN_ORDER = ['basic', 'team', 'business', 'enterprise', 'partner']
export const CYCLE_NAME = { monthly: 'ماهانه', quarterly: 'سه‌ماهه', semiannual: 'شش‌ماهه', yearly: 'سالانه' }
export const SOURCES = [
  { key: 'google', name: 'گوگل (ارگانیک)' }, { key: 'invite', name: 'دعوت همکار' }, { key: 'direct', name: 'مستقیم' },
  { key: 'instagram', name: 'اینستاگرام' }, { key: 'ads', name: 'تبلیغات کلیکی' }, { key: 'telegram', name: 'تلگرام' }, { key: 'other', name: 'سایر' },
]
export const sourceName = (k) => (SOURCES.find((s) => s.key === k) || {}).name || k
export const HEALTH_COMPONENTS = [
  { key: 'activity', label: 'فعالیت', desc: 'روزهای فعال در ۲۸ روز اخیر (۱۶ روز یا بیشتر = کامل)' },
  { key: 'trend', label: 'روند', desc: 'فعالیت ۱۴ روز اخیر نسبت به ۱۴ روز قبل (از −۵۰٪ تا +۵۰٪)' },
  { key: 'depth', label: 'عمق', desc: 'قابلیت‌های کلیدی استفاده‌شده (۴ قابلیت یا بیشتر = کامل)' },
  { key: 'team', label: 'تیم', desc: 'اعضای فعال ۷ روز اخیر نسبت به کل اعضا — حساب تک‌نفره جریمه نمی‌شود' },
  { key: 'commercial', label: 'تجاری', desc: 'پرداخت ناموفق −۱۰ · برخورد مکرر با سقف −۵ · تیکت باز −۵' },
]
export const SEGMENT_LABEL = { new: 'تازه‌وارد', stuck: 'فعال‌نشده', builders: 'سازندگان', automators: 'خودکارساز', teams: 'تیمی', upsell: 'آمادهٔ ارتقا', risk: 'در خطر ریزش', champions: 'وفادار', dormant: 'خاموش' }
export const TASK_TYPES = {
  pastdue: { label: 'پرداخت ناموفق', icon: 'card', prio: 1 },
  renew: { label: 'تمدید پیش رو', icon: 'repeat', prio: 2 },
  drop: { label: 'افت سلامت', icon: 'down', prio: 2 },
  upsell: { label: 'پیشنهاد ارتقا', icon: 'up', prio: 3 },
  seats: { label: 'سقف همکار پر شده', icon: 'users', prio: 3 },
  welcome: { label: 'خوشامد مشتری جدید', icon: 'star', prio: 3 },
  followup: { label: 'پیگیری تماس قبلی', icon: 'phone', prio: 2 },
  ai: { label: 'پیشنهاد هوشمند', icon: 'sparkle', prio: 2 },
}
export const OUTCOME_LABEL = { reached: 'صحبت شد', noanswer: 'پاسخ نداد', callback: 'بعداً تماس', email: 'ایمیل فرستاده شد', demo: 'دمو برگزار شد', won_new: 'خرید اول', won_expansion: 'ارتقا', renewed: 'تمدید شد', lost: 'از دست رفت', won: 'موفق' }
