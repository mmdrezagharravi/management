/* Navigation tree: groups on the rail, items in the sub-menu. `id` = route name. */
export const NAV = [
  { grp: 'کار روزانه', short: 'روزانه', icon: 'inbox', items: [
    { id: 'today', to: '/today', label: 'کارهای امروز', icon: 'inbox' },
    { id: 'overview', to: '/', label: 'نمای کلی', icon: 'grid' },
    { id: 'ai', to: '/ai', label: 'تحلیل هوشمند', icon: 'sparkle' },
  ] },
  { grp: 'مشتریان', short: 'مشتریان', icon: 'users', items: [
    { id: 'customers', to: '/customers', label: 'همهٔ مشتریان', icon: 'users' },
    { id: 'health', to: '/health', label: 'سلامت و ریسک', icon: 'heart' },
    { id: 'segments', to: '/segments', label: 'دسته‌بندی‌ها', icon: 'circles' },
    { id: 'onboarding', to: '/onboarding', label: 'ثبت‌نام‌های تازه', icon: 'flag' },
  ] },
  { grp: 'فروش و درآمد', short: 'فروش', icon: 'coins', items: [
    { id: 'revenue', to: '/revenue', label: 'درآمد', icon: 'coins' },
    { id: 'sales', to: '/sales', label: 'میز فروش', icon: 'handshake' },
    { id: 'team', to: '/team', label: 'عملکرد تیم فروش', icon: 'trophy' },
  ] },
  { grp: 'رشد محصول', short: 'رشد', icon: 'funnel', items: [
    { id: 'funnel', to: '/funnel', label: 'قیف تبدیل', icon: 'funnel' },
    { id: 'retention', to: '/retention', label: 'نگهداشت', icon: 'layers' },
    { id: 'acquisition', to: '/acquisition', label: 'منابع جذب', icon: 'share' },
    { id: 'features', to: '/features', label: 'استفاده از قابلیت‌ها', icon: 'bars' },
    { id: 'journey', to: '/journey', label: 'نقشهٔ مسیر مشتری', icon: 'map' },
  ] },
  { grp: 'زیرساخت', short: 'زیرساخت', icon: 'db', items: [
    { id: 'bases', to: '/bases', label: 'بیس‌ها', icon: 'db' },
    { id: 'quota', to: '/quota', label: 'مصرف و سهمیه', icon: 'gauge' },
    { id: 'jobs', to: '/jobs', label: 'صف‌ها و زمان‌بندی', icon: 'clock' },
    { id: 'data-health', to: '/data-health', label: 'سلامت داده', icon: 'pulse' },
  ] },
  { grp: 'تنظیمات', short: 'تنظیمات', icon: 'gear', end: true, items: [
    { id: 'settings', to: '/settings', label: 'تعریف‌ها و دسترسی', icon: 'gear' },
  ] },
]
export const PAGE_INDEX = NAV.flatMap((g) => g.items.map((it) => ({ ...it, grp: g.grp })))
