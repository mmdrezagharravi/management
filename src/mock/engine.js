/* eslint-disable */
// Mock world — generated from a fixed seed. Ported unchanged from the HTML mockup's assets/data.js.
// Only the API layer (src/api/mock) may import this file.


const DAY = 864e5;

/* ---------------------------------------------------------------- config */
const CONFIG = {
  seed: 1405,
  now: Date.UTC(2026, 8, 22, 9, 40),       // سه‌شنبه ۳۱ شهریور ۱۴۰۵، ۱۳:۱۰ تهران — زمان ثابت ماکاپ
  nowMinutes: 13 * 60 + 10,
  accounts: 4200,                           // حساب‌هایی که تا امروز ساخته شده‌اند
  historyDays: 540,
  dailyDays: 120,                           // جزئیات روزانه برای این تعداد روز نگه داشته می‌شود
  currency: 'تومان',

  plans: {
    free:  { key: 'free',  name: 'رایگان', price: 0,       seatsIncluded: 1,  seatPrice: 0,
             limits: { records: 1000,    runs: 0,      sms: 0,     ai: 20000,   storage: 1,   seats: 2 } },
    basic: { key: 'basic', name: 'پایه',   price: 190000,  seatsIncluded: 3,  seatPrice: 0,
             limits: { records: 10000,   runs: 1000,   sms: 300,   ai: 100000,  storage: 5,   seats: 3 } },
    pro:   { key: 'pro',   name: 'پرو',    price: 490000,  seatsIncluded: 5,  seatPrice: 90000,
             limits: { records: 100000,  runs: 20000,  sms: 3000,  ai: 500000,  storage: 50,  seats: null } },
    ent:   { key: 'ent',   name: 'سازمانی', price: 2900000, seatsIncluded: 25, seatPrice: 60000,
             limits: { records: 1000000, runs: 200000, sms: 20000, ai: 3000000, storage: 500, seats: null } },
  },
  planOrder: ['free', 'basic', 'pro', 'ent'],

  cycles: {
    monthly:   { key: 'monthly',   name: 'ماهانه',  days: 30,  months: 1,  discount: 0 },
    quarterly: { key: 'quarterly', name: 'سه‌ماهه', days: 91,  months: 3,  discount: 0.05 },
    yearly:    { key: 'yearly',    name: 'سالانه',  days: 365, months: 12, discount: 0.15 },
  },

  reps: [
    { id: 'r1', name: 'نگار صالحی',  short: 'نگار', weight: 1.2, callTarget: 12 },
    { id: 'r2', name: 'امید رحیمی',  short: 'امید', weight: 1.0, callTarget: 12 },
    { id: 'r3', name: 'سینا کاظمی',  short: 'سینا', weight: 0.9, callTarget: 10 },
    { id: 'r4', name: 'مریم توکلی',  short: 'مریم', weight: 0.7, callTarget: 10 },
  ],

  // share = سهم از ثبت‌نام‌ها ، signupRate = بازدید ← ثبت‌نام ، quality = اثر روی درگیری
  sources: [
    { key: 'google',    name: 'گوگل (ارگانیک)', share: 0.29, signupRate: 0.034, quality: 0.95, spend: 0 },
    { key: 'invite',    name: 'دعوت همکار',     share: 0.16, signupRate: 0.140, quality: 1.35, spend: 0 },
    { key: 'direct',    name: 'مستقیم',         share: 0.15, signupRate: 0.052, quality: 1.05, spend: 0 },
    { key: 'instagram', name: 'اینستاگرام',     share: 0.15, signupRate: 0.027, quality: 0.78, spend: 45000000 },
    { key: 'ads',       name: 'تبلیغات کلیکی',  share: 0.10, signupRate: 0.041, quality: 0.72, spend: 60000000 },
    { key: 'telegram',  name: 'تلگرام',         share: 0.08, signupRate: 0.030, quality: 0.85, spend: 12000000 },
    { key: 'other',     name: 'سایر',           share: 0.07, signupRate: 0.024, quality: 0.90, spend: 0 },
  ],

  // تعریف‌ها — هر صفحه همین‌ها را می‌خواند
  activation: { records: 40, days: 7 },           // فعال‌سازی: ۴۰ رکورد در ۷ روز اول
  habit: { weeks: 3, of: 4 },                     // عادت: فعال در ۳ هفته از ۴ هفتهٔ اول
  activeWindow: 7,                                // حساب فعال: رویداد در ۷ روز اخیر
  dormantDays: 30,

  health: {
    // پنج مؤلفه، هر کدام ۰ تا ۲۰ امتیاز؛ جمع = ۰ تا ۱۰۰
    components: [
      { key: 'activity',   label: 'فعالیت',  desc: 'روزهای فعال در ۲۸ روز اخیر (۱۶ روز یا بیشتر = کامل)' },
      { key: 'trend',      label: 'روند',     desc: 'فعالیت ۱۴ روز اخیر نسبت به ۱۴ روز قبل (از −۵۰٪ تا +۵۰٪)' },
      { key: 'depth',      label: 'عمق',      desc: 'قابلیت‌های کلیدی استفاده‌شده (۴ قابلیت یا بیشتر = کامل)' },
      { key: 'team',       label: 'تیم',      desc: 'اعضای فعال ۷ روز اخیر نسبت به کل اعضا — حساب تک‌نفره جریمه نمی‌شود' },
      { key: 'commercial', label: 'تجاری',    desc: 'پرداخت ناموفق −۱۰ · برخورد مکرر با سقف −۵ · تیکت باز −۵' },
    ],
    bands: [
      { min: 70, key: 'good', label: 'سالم' },
      { min: 50, key: 'warn', label: 'نیاز به توجه' },
      { min: 30, key: 'ser',  label: 'در خطر' },
      { min: 0,  key: 'crit', label: 'بحرانی' },
    ],
  },

  segments: [
    { key: 'new',       label: 'تازه‌وارد',          rule: 'signup_age <= 14',                                   desc: 'در دو هفتهٔ اخیر ثبت‌نام کرده‌اند' },
    { key: 'stuck',     label: 'فعال‌نشده',          rule: 'signup_age 3..30 AND NOT activated',                 desc: 'ثبت‌نام کرده‌اند ولی به ۴۰ رکورد نرسیده‌اند' },
    { key: 'builders',  label: 'سازندگان',           rule: 'bases >= 2 AND last_seen <= 30',                                       desc: 'بیش از یک بیس فعال ساخته‌اند' },
    { key: 'automators',label: 'خودکارساز',          rule: 'automations >= 1 AND last_seen <= 30',                                 desc: 'اتوماسیون فعال دارند — چسبنده‌ترین گروه' },
    { key: 'teams',     label: 'تیمی',               rule: 'active_members_7d >= 2',                             desc: 'بیش از یک نفر در هفتهٔ اخیر کار کرده' },
    { key: 'upsell',    label: 'آمادهٔ ارتقا',        rule: 'plan IN (free, basic) AND limit_hits_30d >= 2 AND pricing_visits_30d >= 1 AND last_seen <= 14', desc: 'به سقف پلن خورده‌اند و صفحهٔ قیمت را دیده‌اند' },
    { key: 'risk',      label: 'در خطر ریزش',        rule: 'paying AND health < 50',                             desc: 'پرداخت‌کننده با امتیاز سلامت زیر ۵۰' },
    { key: 'champions', label: 'وفادار',             rule: 'paying AND tenure >= 180 AND health >= 80',          desc: 'بیش از ۶ ماه پرداخت پیاپی و سالم — مرجع معرفی' },
    { key: 'dormant',   label: 'خاموش',              rule: 'last_seen > 30',                                     desc: 'یک ماه است هیچ فعالیتی نداشته‌اند' },
  ],

  features: [
    { key: 'tables',     label: 'جدول و رکورد',   key_feature: false },
    { key: 'views',      label: 'نما و فیلتر',    key_feature: true },
    { key: 'forms',      label: 'فرم',            key_feature: true },
    { key: 'automation', label: 'اتوماسیون',      key_feature: true },
    { key: 'share',      label: 'نمای اشتراکی',   key_feature: true },
    { key: 'portal',     label: 'درگاه و صفحه',   key_feature: true },
    { key: 'export',     label: 'خروجی Excel',    key_feature: false },
    { key: 'ai',         label: 'هوش مصنوعی',     key_feature: true },
    { key: 'plugin',     label: 'پلاگین',         key_feature: true },
    { key: 'api',        label: 'API',            key_feature: true },
  ],

  churnReasons: ['قیمت بالا', 'نیازش برطرف شد', 'رفتن به رقیب', 'پیچیدگی کار', 'پاسخی نداد', 'بستن کسب‌وکار'],
};

/* ---------------------------------------------------------- seeded random */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
let rnd = mulberry32(CONFIG.seed);
const R = {
  f: () => rnd(),
  int: (a, b) => a + Math.floor(rnd() * (b - a + 1)),
  pick: arr => arr[Math.floor(rnd() * arr.length)],
  chance: p => rnd() < p,
  normal() { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
  logn(sigma) { return Math.exp(R.normal() * sigma - sigma * sigma / 2); },
  weighted(items, key) {
    let total = 0; for (const it of items) total += it[key];
    let x = rnd() * total;
    for (const it of items) { x -= it[key]; if (x <= 0) return it; }
    return items[items.length - 1];
  },
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* ------------------------------------------------------------ vocabulary */
const INDUSTRIES = [
  { key: 'retail',  name: 'خرده‌فروشی',       w: 18, prefixes: ['فروشگاه', 'بازرگانی', 'پخش'],          bases: ['مدیریت سفارش‌ها', 'انبار', 'مشتریان', 'فاکتورها', 'تأمین‌کنندگان'] },
  { key: 'health',  name: 'سلامت',            w: 10, prefixes: ['کلینیک', 'مطب', 'داروخانه', 'آزمایشگاه'], bases: ['نوبت‌دهی', 'پرونده بیماران', 'صورتحساب', 'پرسنل'] },
  { key: 'edu',     name: 'آموزش',            w: 10, prefixes: ['آموزشگاه', 'آکادمی', 'مدرسه'],          bases: ['ثبت‌نام‌ها', 'کلاس‌ها', 'شهریه', 'اساتید'] },
  { key: 'agency',  name: 'بازاریابی و رسانه', w: 12, prefixes: ['آژانس', 'استودیو', 'رسانه'],            bases: ['کمپین‌ها', 'تقویم محتوا', 'مشتریان', 'پروژه‌ها'] },
  { key: 'build',   name: 'ساختمان و پروژه',   w: 8,  prefixes: ['پیمانکاری', 'گروه ساختمانی', 'شرکت'],     bases: ['پروژه‌های عمرانی', 'قراردادها', 'تدارکات', 'گزارش روزانه'] },
  { key: 'service', name: 'خدمات',            w: 12, prefixes: ['دفتر', 'مؤسسه', 'خدمات'],              bases: ['درخواست‌ها', 'CRM', 'قراردادها', 'تیکت‌ها'] },
  { key: 'food',    name: 'رستوران و غذا',     w: 8,  prefixes: ['رستوران', 'کافه', 'آشپزخانه'],          bases: ['سفارش‌ها', 'منو', 'موجودی مواد', 'رزرو'] },
  { key: 'mfg',     name: 'تولید',            w: 7,  prefixes: ['تولیدی', 'صنایع', 'کارگاه'],            bases: ['برنامهٔ تولید', 'کنترل کیفیت', 'انبار مواد', 'سفارش‌ها'] },
  { key: 'tech',    name: 'فناوری',           w: 10, prefixes: ['تیم', 'استارتاپ', 'شرکت'],              bases: ['تسک‌بورد', 'باگ‌ها', 'نقشهٔ راه', 'CRM'] },
  { key: 'hold',    name: 'هلدینگ و مالی',     w: 5,  prefixes: ['هلدینگ', 'گروه', 'سرمایه‌گذاری'],        bases: ['پرونده مشتریان', 'بودجه', 'دارایی‌ها', 'گزارش مدیریت'] },
];
const WORDS = [
  ['آریا','arya'],['پارس','pars'],['نوین','novin'],['سپهر','sepehr'],['آوا','ava'],['مهرگان','mehregan'],['کیان','kian'],
  ['رایان','rayan'],['آفتاب','aftab'],['بهار','bahar'],['سامان','saman'],['تابان','taban'],['پویا','pouya'],['ارغوان','arghavan'],
  ['نیلوفر','niloufar'],['دنا','dena'],['البرز','alborz'],['زاگرس','zagros'],['کوثر','kowsar'],['هامون','hamoun'],['ماهان','mahan'],
  ['آرین','arin'],['ستاره','setareh'],['افق','ofogh'],['پرتو','partow'],['روشا','rosha'],['آتیه','atieh'],['نگین','negin'],
  ['مانا','mana'],['آرمان','arman'],['ایده','ideh'],['فردا','farda'],['نیکان','nikan'],['امید','omid'],['راد','rad'],
  ['سروش','soroush'],['آسمان','aseman'],['باران','baran'],['دریا','darya'],['کاوه','kaveh'],['مهر','mehr'],['نقش','naghsh'],
  ['ترنج','toranj'],['طلوع','tolou'],['یاس','yas'],['سبلان','sabalan'],['آیریک','airik'],['پیشرو','pishro'],['رهنما','rahnama'],['کهکشان','kahkeshan'],
];
const FIRST = ['علی','مریم','رضا','زهرا','محمد','فاطمه','حسین','سارا','مهدی','نرگس','امیر','لیلا','حمید','مینا','سعید','الهام','جواد','نازنین','کاوه','شیما','پیمان','آزاده','بهرام','ترانه','فرهاد','هانیه','مجید','سمیرا','یاسر','پریسا'];
const LAST = ['محمدی','احمدی','رضایی','کریمی','حسینی','موسوی','جعفری','صادقی','نوری','زارع','قاسمی','رحمانی','اکبری','عباسی','طاهری','شریفی','یزدانی','کامرانی','فرهادی','بهرامی','نیک‌نام','امینی','سلطانی','وحیدی','تهرانی'];
const CITIES = [['تهران', 44], ['اصفهان', 9], ['مشهد', 8], ['شیراز', 7], ['تبریز', 6], ['کرج', 6], ['قم', 3], ['اهواز', 3], ['رشت', 3], ['کرمان', 3], ['یزد', 3], ['سایر', 5]]
  .map(([name, w]) => ({ name, w }));

/* ----------------------------------------------------------- time helpers */
const dayDate = d => new Date(CONFIG.now - d * DAY);
const weekday = d => dayDate(d).getUTCDay();          // 4 = پنجشنبه، 5 = جمعه
const weekdayFactor = d => { const w = weekday(d); return w === 5 ? 0.28 : w === 4 ? 0.68 : 1; };

const jFmt = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'Asia/Tehran' });
const jCache = new Map();
function jalali(d) {                                       // d = days ago
  let v = jCache.get(d);
  if (!v) {
    const p = {}; for (const x of jFmt.formatToParts(dayDate(d))) p[x.type] = x.value;
    v = { y: +p.year, m: +p.month, d: +p.day };
    jCache.set(d, v);
  }
  return v;
}
// Jalali months as [startDaysAgo, endDaysAgo] windows, newest last. The current month is month-to-date.
function jalaliMonths(n) {
  const out = []; let d = 0; let cur = jalali(0); let end = 0;
  while (out.length < n && d < 900) {
    const j = jalali(d + 1);
    if (j.m !== cur.m) { out.push({ y: cur.y, m: cur.m, start: d, end }); end = d + 1; cur = j; }
    d++;
  }
  return out.reverse();
}

/* ------------------------------------------------------------- generation */
const plans = CONFIG.plans;
function mrrOf(plan, seats, cycle) {
  const p = plans[plan];
  if (!p || !p.price) return 0;
  const monthly = p.price + Math.max(0, seats - p.seatsIncluded) * p.seatPrice;
  return Math.round(monthly * (1 - CONFIG.cycles[cycle].discount) / 1000) * 1000;
}

const usedNames = new Set();
function makeName(ind) {
  for (let i = 0; i < 20; i++) {
    const prefix = R.pick(ind.prefixes);
    const w1 = R.pick(WORDS);
    const two = R.chance(0.35);
    const w2 = two ? R.pick(WORDS) : null;
    if (w2 && w2 === w1) continue;
    const name = prefix + ' ' + w1[0] + (w2 ? ' ' + w2[0] : '');
    if (usedNames.has(name)) continue;
    usedNames.add(name);
    return { name, slug: w1[1] + (w2 ? '-' + w2[1] : '') };
  }
  const w = R.pick(WORDS); const name = R.pick(ind.prefixes) + ' ' + w[0] + ' ' + usedNames.size;
  usedNames.add(name); return { name, slug: w[1] + usedNames.size };
}
function person() {
  return { first: R.pick(FIRST), last: R.pick(LAST) };
}
function mobile() {
  return '09' + R.pick(['12', '19', '35', '36', '21', '01', '10', '30']) + String(R.int(1000000, 9999999));
}

const repIds = CONFIG.reps.map(r => r.id);
let repCursor = 0;
function nextRep() {                                      // weighted round robin
  const pool = [];
  CONFIG.reps.forEach(r => { for (let i = 0; i < Math.round(r.weight * 10); i++) pool.push(r.id); });
  return pool[(repCursor++ * 7) % pool.length];
}

function genAccount(id) {
  const T = CONFIG.historyDays;
  const lam = Math.log(1.045) / 30;                         // ~4.5% رشد ماهانهٔ ثبت‌نام
  const u = R.f();
  const age = Math.floor(-Math.log(1 - u * (1 - Math.exp(-lam * T))) / lam);
  const src = R.weighted(CONFIG.sources, 'share');
  const ind = R.weighted(INDUSTRIES, 'w');
  const nm = makeName(ind);
  const owner = person();

  let e = Math.pow(R.f(), 1.45) * src.quality * (0.85 + R.f() * 0.3);
  e = clamp(e, 0.01, 0.99);

  const a = {
    id, name: nm.name, slug: nm.slug, industry: ind.key, industryName: ind.name,
    city: R.weighted(CITIES, 'w').name, source: src.key, age, e,
    contact: { first: owner.first, last: owner.last, mobile: mobile(), email: 'info@' + nm.slug + '.ir' },
    milestones: {}, planEvents: [], invoices: [], bases: [], members: [], feat: {}, notes: [],
  };

  // ---- milestones (days after signup)
  const m = a.milestones;
  if (R.chance(0.38 + 0.6 * e)) m.firstBase = Math.min(age, R.int(0, 2));
  if (m.firstBase !== undefined && age >= 1 && R.chance(0.12 + 0.82 * e)) m.activated = Math.min(age, R.int(1, 7));
  if (m.activated !== undefined && R.chance((0.12 + 0.6 * e) * (src.key === 'invite' ? 1.3 : 1))) m.team = Math.min(age, R.int(2, 25));
  if (m.firstBase !== undefined && R.chance(0.1 + 0.25 * e)) m.pricing = Math.min(age, R.int(2, 40));

  // ---- paid lifecycle
  const paidP = m.activated !== undefined ? clamp(0.05 + 0.5 * Math.pow(e, 1.1) + (m.team !== undefined ? 0.08 : 0) + 0.06 * e, 0, 0.85) : 0.01;
  let plan = 'free', seats = 1, cycle = 'monthly';
  if (R.chance(paidP)) {
    const off = R.int(6, 75);
    if (age >= off) {
      m.paid = off;
      if (m.pricing === undefined || m.pricing > off) m.pricing = Math.max(0, off - R.int(0, 3));
      const roll = R.f();
      plan = e > 0.72 && roll < 0.08 ? 'ent' : roll < 0.52 ? 'basic' : 'pro';
      seats = plan === 'basic' ? R.int(1, 3) : plan === 'pro' ? 5 + Math.floor(Math.pow(R.f(), 2) * 8) : R.int(25, 55);
      const cr = R.f(); cycle = cr < 0.6 ? 'monthly' : cr < 0.85 ? 'quarterly' : 'yearly';
      let t = age - off;                                     // days ago of first payment
      let cur = { plan, seats, cycle };
      const push = (tt, kind) => a.planEvents.push({ t: tt, plan: cur.plan, seats: cur.seats, cycle: cur.cycle, mrr: kind === 'churn' ? 0 : mrrOf(cur.plan, cur.seats, cur.cycle), kind });
      push(t, 'new');
      a.invoices.push({ t, amount: mrrOf(cur.plan, cur.seats, cur.cycle) * CONFIG.cycles[cur.cycle].months, status: 'paid', plan: cur.plan, cycle: cur.cycle });
      const h = clamp(0.05 * (1.45 - e), 0.006, 0.075);    // خطر ماهانهٔ ریزش
      let next = t - CONFIG.cycles[cur.cycle].days;
      while (next >= 0) {
        const months = CONFIG.cycles[cur.cycle].months;
        if (R.chance(1 - Math.pow(1 - h, months))) {
          push(next, 'churn'); a.churnedAt = next; a.churnReason = R.pick(CONFIG.churnReasons); break;
        }
        const r = R.f();
        if (r < 0.07 && cur.plan === 'basic' && e > 0.45) { cur.plan = 'pro'; cur.seats = Math.max(5, cur.seats); push(next, 'expansion'); }
        else if (r < 0.13 && cur.plan !== 'basic') { cur.seats += R.int(1, 3); push(next, 'expansion'); }
        else if (r < 0.155 && cur.plan === 'pro' && cur.seats > 5) { cur.seats = Math.max(5, cur.seats - R.int(1, 3)); push(next, 'contraction'); }
        else if (r < 0.165 && cur.plan === 'pro' && e < 0.4) { cur.plan = 'basic'; cur.seats = 3; push(next, 'contraction'); }
        a.invoices.push({ t: next, amount: mrrOf(cur.plan, cur.seats, cur.cycle) * months, status: 'paid', plan: cur.plan, cycle: cur.cycle });
        next -= CONFIG.cycles[cur.cycle].days;
      }
      if (a.churnedAt === undefined) {
        a.renewIn = -next;                                    // روز تا تمدید بعدی
        plan = cur.plan; seats = cur.seats; cycle = cur.cycle;
        const last = a.invoices[a.invoices.length - 1];
        if (last.t <= 12 && last.t > 0 && a.invoices.length > 1 && R.chance(0.09 + (1 - e) * 0.08)) {
          last.status = 'failed'; last.retries = R.int(1, 3); a.pastDue = true;
        }
      } else { plan = 'free'; seats = 1; cycle = 'monthly'; }
    }
  }
  a.plan = plan; a.seats = plan === 'free' ? 1 : seats; a.cycle = cycle;
  a.mrr = mrrOf(plan, a.seats, cycle);
  a.paying = a.mrr > 0;
  a.everPaid = m.paid !== undefined;

  // ---- decline story: some paying accounts start fading 8–45 days ago
  if (a.paying && R.chance(0.07 + (1 - e) * 0.05)) a.decline = { start: R.int(8, 45), floor: 0.05 + R.f() * 0.2 };
  if (!a.paying && m.activated !== undefined && R.chance(0.1)) a.decline = { start: R.int(8, 60), floor: 0.05 };

  // ---- members
  const cap = plans[plan].limits.seats || a.seats;
  let members = plan === 'free' ? (m.team !== undefined ? 2 : 1)
    : plan === 'basic' ? R.int(1, a.seats)
    : Math.max(2, Math.round(a.seats * (0.6 + R.f() * 0.45)));
  members = Math.min(members, plan === 'free' ? 2 : plan === 'basic' ? 3 : a.seats + (R.chance(0.15) ? R.int(1, 2) : 0));
  if (m.team === undefined && plan !== 'ent') members = Math.min(members, plan === 'pro' ? members : 1);
  a.memberCount = Math.max(1, members);
  a.seatCap = cap;

  // ---- activity
  const intensity = (3 + 70 * e * e) * (a.paying ? 1.5 : 1) * (1 + Math.log2(a.memberCount));
  a.intensity = intensity;
  const D = CONFIG.dailyDays;
  const ev = new Int16Array(D), rec = new Int16Array(D), au = new Uint8Array(D);
  const weeks = Math.floor(age / 7) + 1;
  const wk = new Uint8Array(weeks);
  const paidFrom = m.paid !== undefined ? age - m.paid : -1;
  const weekP = (w, t) => {
    if (m.firstBase === undefined) return w === 0 ? 0.55 : 0.03 * Math.exp(-w / 5);
    let plateau = m.activated !== undefined ? 0.18 + 0.74 * e : 0.03 + 0.15 * e;
    if (paidFrom >= 0 && t <= paidFrom && (a.churnedAt === undefined || t > a.churnedAt)) plateau = Math.min(0.96, plateau + 0.22);
    if (a.churnedAt !== undefined && t < a.churnedAt) plateau = Math.min(plateau, 0.04);
    let p = plateau + (0.93 - plateau) * Math.exp(-w / 1.7);
    if (a.decline && t < a.decline.start) p *= a.decline.floor + (1 - a.decline.floor) * (t / a.decline.start);
    return clamp(p, 0, 0.99);
  };
  // Two levels, so weekly retention and daily charts agree: first decide whether
  // the account was active in a week, then which days of that week.
  const dayP = clamp(0.2 + 0.62 * e + (a.paying ? 0.1 : 0), 0.12, 0.92);
  let recOld = 0;
  const setDay = (d, w) => {
    let n = Math.max(1, Math.round(intensity * R.logn(0.55) * (a.decline && d < a.decline.start ? 0.35 + 0.65 * d / a.decline.start : 1)));
    if (w === 0 && m.activated !== undefined) n = Math.max(n, 18);
    ev[d] = Math.min(n, 32000);
    rec[d] = Math.round(n * (0.25 + R.f() * 0.2));
    au[d] = Math.min(a.memberCount, 1 + Math.floor(R.f() * a.memberCount * 0.75));
  };
  for (let w = 0; w < weeks; w++) {
    const t = age - w * 7;                                   // days ago at week start
    if (!R.chance(weekP(w, t))) continue;
    wk[w] = 1;
    if (t - 6 > D - 1) { recOld += intensity * 0.33 * (1 + dayP * 5); continue; }
    const days = [];
    for (let d = Math.min(t, D - 1); d >= Math.max(t - 6, 0); d--) days.push(d);
    if (!days.length) continue;
    let any = false;
    for (const d of days) if (R.chance(dayP * weekdayFactor(d))) { setDay(d, w); any = true; }
    if (!any) setDay(R.pick(days), w);
  }
  a.ev = ev; a.rec = rec; a.au = au; a.wk = wk;
  // habit is observed, not drawn: active in 3 of the first 4 weeks
  if (m.activated !== undefined && age >= 28) {
    let c = 0, at = -1;
    for (let w = 0; w < 4 && w < wk.length; w++) if (wk[w]) { c++; if (c === 3) at = (w + 1) * 7; }
    if (c >= 3) m.habit = at;
  }
  let rec120 = 0; for (let d = 0; d < D; d++) rec120 += rec[d];
  let recordsRaw = Math.round(recOld + rec120);
  if (m.activated !== undefined) recordsRaw = Math.max(recordsRaw, CONFIG.activation.records + R.int(5, 60));

  // last seen
  let ls = -1; for (let d = 0; d < D; d++) if (ev[d] > 0) { ls = d; break; }
  if (ls < 0) { for (let w = weeks - 1; w >= 0; w--) if (wk[w]) { ls = Math.max(D, age - w * 7 - R.int(0, 6)); break; } }
  if (ls < 0) ls = age;
  a.lastSeenDays = ls;
  a.lastSeenMin = ls === 0 ? (R.chance(0.28) ? R.int(0, 14) : R.int(15, 600)) : ls * 1440 + R.int(0, 1200);
  a.online = a.lastSeenMin < 15;

  // ---- features (first/last use, days ago)
  const F = (key, p, minPlan) => {
    if (m.firstBase === undefined) return;
    if (minPlan && CONFIG.planOrder.indexOf(plan) < CONFIG.planOrder.indexOf(minPlan) && !(a.everPaid && R.chance(0.3))) return;
    if (!R.chance(p)) return;
    const first = Math.max(0, age - R.int(1, Math.max(2, Math.min(age, 90))));
    const last = ls <= 30 ? ls + R.int(0, 6) : ls;
    a.feat[key] = { first: Math.max(first, last), last };
  };
  if (m.firstBase !== undefined) a.feat.tables = { first: age - m.firstBase, last: ls };
  F('views', 0.45 + 0.5 * e);
  F('forms', 0.18 + 0.5 * e);
  F('automation', 0.04 + 0.7 * e, 'basic');
  F('share', 0.08 + 0.45 * e);
  F('portal', 0.03 + 0.35 * e, 'pro');
  F('export', 0.12 + 0.25 * e);
  F('ai', 0.05 + 0.3 * e);
  F('plugin', 0.01 + 0.1 * e, 'basic');
  F('api', 0.01 + 0.25 * e, 'pro');

  // ---- bases
  const nb = m.firstBase === undefined ? 0 : 1 + Math.floor(Math.pow(R.f(), 1.6) * (1 + e * 5));
  // bases share the records the plan actually allowed (free/basic are capped at the limit)
  const capLimit = plans[plan].limits.records;
  let left = plan === 'free' || plan === 'basic' ? Math.min(recordsRaw, capLimit) : recordsRaw;
  const baseNames = ind.bases.slice();
  for (let i = 0; i < nb; i++) {
    const name = i < baseNames.length ? baseNames[i] : baseNames[i % baseNames.length] + ' ' + String(i + 1).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
    const created = i === 0 ? age - m.firstBase : Math.max(0, age - R.int(3, Math.max(4, age)));
    const share = i === nb - 1 ? 1 : (0.35 + R.f() * 0.4);
    const recs = Math.round(left * share); left -= recs;
    const autos = a.feat.automation ? (i === 0 ? R.int(1, 3 + Math.round(e * 10)) : (R.chance(0.5) ? R.int(0, 4) : 0)) : 0;
    a.bases.push({
      id: id * 10 + i, accountId: id, name, slug: nm.slug + (i ? '-' + (i + 1) : ''),
      created: Math.min(created, age), tables: R.int(2, 6 + Math.round(e * 12)), records: recs,
      automations: autos, pages: a.feat.portal ? R.int(2, 18) : 0, shares: a.feat.share ? R.int(1, 7) : 0,
      collaborators: Math.max(1, Math.min(a.memberCount, R.int(1, a.memberCount))),
      lastActive: Math.min(Math.min(created, age), i === 0 ? ls : ls + R.int(0, 20)),   // never before it existed
    });
  }
  a.automations = a.bases.reduce((s, b) => s + b.automations, 0);

  // ---- usage vs plan limits (current month / cumulative)
  const L = plans[plan].limits;
  a.recordsDemand = recordsRaw;
  a.records = plan === 'free' || plan === 'basic' ? Math.min(recordsRaw, L.records) : recordsRaw;
  const runsDemand = a.automations * Math.round(intensity * 1.8 * (0.5 + R.f()));
  a.runs30 = L.runs ? Math.min(runsDemand, L.runs) : 0;
  a.sms30 = a.feat.automation && R.chance(0.45) ? Math.min(Math.round(a.runs30 * (0.08 + R.f() * 0.2)), L.sms) : 0;
  a.ai30 = a.feat.ai ? Math.min(Math.round(R.logn(0.7) * (plan === 'free' ? 2500 + 12000 * e : 8000 + 60000 * e)), L.ai) : 0;
  a.storage = Math.round((a.records * (plan === 'free' ? 0.00035 : 0.0009) + R.f() * (a.paying ? 6 : 0.2)) * 10) / 10;
  a.storage = Math.min(a.storage, L.storage);
  const over = Math.max(recordsRaw - L.records * 0.97, runsDemand - (L.runs || Infinity) * 0.97, 0);
  a.limitHits30 = ls <= 30 && over > 0 ? clamp(Math.ceil(over / (plan === 'free' ? 60 : 400)), 1, 40) : 0;
  a.pricingVisits30 = a.limitHits30 > 0 ? (R.chance(0.7) ? R.int(1, 7) : 0) : (ls <= 30 && R.chance(0.06) ? R.int(1, 2) : 0);

  // ---- members list
  const roles = ['مالک', 'مدیر', 'ویرایشگر', 'ویرایشگر', 'ویرایشگر', 'فقط خواندن'];
  for (let i = 0; i < a.memberCount; i++) {
    const p = i === 0 ? owner : person();
    const active7 = i === 0 ? ls <= 6 : R.chance(clamp(e + 0.2, 0, 0.95)) && ls <= 6;
    a.members.push({
      name: p.first + ' ' + p.last, role: i === 0 ? 'مالک' : R.pick(roles.slice(1)),
      joined: Math.max(0, age - (i === 0 ? 0 : R.int(1, Math.max(1, age)))),
      lastSeen: active7 ? R.int(ls, 6) : ls + R.int(3, 40),
    });
  }
  a.activeMembers7 = a.members.filter(x => x.lastSeen <= 6).length;
  a.invitesSent = m.team !== undefined ? a.memberCount - 1 + R.int(0, 3) : (R.chance(0.1) ? R.int(1, 2) : 0);
  a.invitesAccepted = Math.max(0, a.memberCount - 1);

  // ---- support & voice
  a.tickets = a.decline && R.chance(0.55) ? R.int(1, 3) : (R.chance(0.05) ? 1 : 0);
  a.nps = ls <= 60 && R.chance(0.32) ? null : undefined;       // filled after health

  // ---- ownership
  a.owner = null;
  return a;
}

/* ------------------------------------------------------- per-account metrics */
function sumRange(arr, from, to) { let s = 0; for (let d = from; d < to && d < arr.length; d++) s += arr[d]; return s; }
function countRange(arr, from, to) { let s = 0; for (let d = from; d < to && d < arr.length; d++) if (arr[d] > 0) s++; return s; }

function metrics(a, asOf) {
  asOf = asOf || 0;
  const ev = a.ev;
  const x = {};
  x.events7 = sumRange(ev, asOf, asOf + 7);
  x.events30 = sumRange(ev, asOf, asOf + 30);
  x.activeDays7 = countRange(ev, asOf, asOf + 7);
  x.activeDays28 = countRange(ev, asOf, asOf + 28);
  const cur = sumRange(ev, asOf, asOf + 14), prev = sumRange(ev, asOf + 14, asOf + 28);
  x.trendPct = prev > 0 ? Math.round((cur - prev) / prev * 100) : (cur > 0 ? 100 : 0);
  x.records7 = sumRange(a.rec, asOf, asOf + 7);
  x.records30 = sumRange(a.rec, asOf, asOf + 30);

  // health — five components × 20
  const c = {};
  c.activity = Math.round(Math.min(1, x.activeDays28 / 16) * 20);
  const ageAt = a.age - asOf;
  c.trend = ageAt < 28 ? 12 : Math.round(clamp((x.trendPct + 50) / 100, 0, 1) * 20);
  const keys = CONFIG.features.filter(f => f.key_feature && a.feat[f.key] && a.feat[f.key].first >= asOf).length;
  c.depth = Math.round(Math.min(1, keys / 4) * 20);
  const am = asOf === 0 ? a.activeMembers7 : Math.min(a.memberCount, Math.max(x.activeDays7 ? 1 : 0, Math.round(a.activeMembers7 * (x.activeDays7 / Math.max(1, countRange(ev, 0, 7))))));
  c.team = Math.round((a.memberCount <= 1 ? (x.activeDays7 ? 1 : 0) : Math.min(1, am / a.memberCount)) * 20);
  c.commercial = 20 - (a.pastDue && asOf === 0 ? 10 : 0) - (a.limitHits30 >= 3 ? 5 : 0) - (a.tickets ? 5 : 0);
  if (x.activeDays28 === 0) { c.depth = Math.min(c.depth, 4); c.trend = 0; }   // no activity = no trend to reward
  x.health = clamp(c.activity + c.trend + c.depth + c.team + c.commercial, 0, 100);
  x.components = c;
  x.band = CONFIG.health.bands.find(b => x.health >= b.min);
  return x;
}

/* ------------------------------------------------------------- build world */
const accounts = [];
for (let i = 1; i <= CONFIG.accounts; i++) accounts.push(genAccount(i));
const byId = new Map(accounts.map(a => [a.id, a]));

for (const a of accounts) {
  Object.assign(a, metrics(a, 0));
  a.healthHistory = [];
  for (let w = 7; w >= 0; w--) a.healthHistory.push(a.age >= w * 7 ? metrics(a, w * 7).health : null);
  a.health2wAgo = a.healthHistory[5];
  if (a.nps === null) a.nps = clamp(Math.round(a.health / 10 + R.normal() * 1.8), 0, 10);
  a.tenureDays = a.paying && a.milestones.paid !== undefined ? a.age - a.milestones.paid : 0;
  a.maxUsage = maxUsage(a);
  a.segments = CONFIG.segments.filter(s => inSegment(a, s.key)).map(s => s.key);
}

function maxUsage(a) {
  const L = plans[a.plan].limits;
  const u = [
    { key: 'records', label: 'رکورد', used: a.records, limit: L.records },
    { key: 'runs', label: 'اجرای اتوماسیون', used: a.runs30, limit: L.runs },
    { key: 'sms', label: 'پیامک', used: a.sms30, limit: L.sms },
    { key: 'ai', label: 'توکن هوش مصنوعی', used: a.ai30, limit: L.ai },
    { key: 'storage', label: 'فضای ذخیره (گیگ)', used: a.storage, limit: L.storage },
  ];
  if (L.seats) u.push({ key: 'seats', label: 'همکار', used: a.memberCount, limit: L.seats });
  else u.push({ key: 'seats', label: 'همکار', used: a.memberCount, limit: a.seats });
  u.forEach(x => { x.ratio = x.limit ? x.used / x.limit : 0; });
  a.usage = u;
  return u.filter(x => x.limit).sort((p, q) => q.ratio - p.ratio)[0];
}

function inSegment(a, key) {
  switch (key) {
    case 'new': return a.age <= 14;
    case 'stuck': return a.age >= 3 && a.age <= 30 && a.milestones.activated === undefined;
    case 'builders': return a.bases.length >= 2 && a.lastSeenDays <= 30;
    case 'automators': return a.automations >= 1 && a.lastSeenDays <= 30;
    case 'teams': return a.activeMembers7 >= 2;
    case 'upsell': return (a.plan === 'free' || a.plan === 'basic') && a.limitHits30 >= 2 && a.pricingVisits30 >= 1 && a.lastSeenDays <= 14;
    case 'risk': return a.paying && a.health < 50;
    case 'champions': return a.paying && a.tenureDays >= 180 && a.health >= 80;
    case 'dormant': return a.lastSeenDays > CONFIG.dormantDays;
  }
  return false;
}

// ---- assign owners: every paying account, plus upgrade-ready leads (a few left unassigned on purpose)
accounts.filter(a => a.paying).sort((p, q) => p.age - q.age).forEach(a => { a.owner = nextRep(); });
accounts.filter(a => !a.paying && a.segments.includes('upsell')).forEach((a, i) => { if (i % 3 !== 2) a.owner = nextRep(); });
// churned in the last 120 days go back to whoever had them
accounts.filter(a => a.churnedAt !== undefined && a.churnedAt <= 120).forEach(a => { a.owner = nextRep(); });

/* -------------------------------------------------- visits (per source/day) */
const V_DAYS = 400;
const visits = {}; const signupsBySrc = {};
CONFIG.sources.forEach(s => { visits[s.key] = new Int32Array(V_DAYS); signupsBySrc[s.key] = new Int32Array(V_DAYS); });
for (const a of accounts) if (a.age < V_DAYS) signupsBySrc[a.source][a.age]++;
CONFIG.sources.forEach(s => {
  for (let d = 0; d < V_DAYS; d++) {
    const expected = signupsBySrc[s.key][d] / s.signupRate;
    const base = (s.share * 7.5 / s.signupRate) * Math.exp(-Math.log(1.045) / 30 * d);
    visits[s.key][d] = Math.max(signupsBySrc[s.key][d], Math.round((0.55 * expected + 0.45 * base) * weekdayFactor(d) * R.logn(0.12)));
  }
});

/* --------------------------------------------------------- sales activity */
const dealMin = t => t === 0 ? R.int(600, CONFIG.nowMinutes) : R.int(600, 1000);
const FA_D = '۰۱۲۳۴۵۶۷۸۹';
const fa = x => String(x).replace(/[0-9]/g, d => FA_D[+d]);
const OUTCOMES = [
  { key: 'reached',  label: 'صحبت شد',        w: 34 },
  { key: 'noanswer', label: 'پاسخ نداد',      w: 28 },
  { key: 'callback', label: 'بعداً تماس',     w: 14 },
  { key: 'email',    label: 'ایمیل فرستاده شد', w: 10 },
  { key: 'demo',     label: 'دمو برگزار شد',   w: 6 },
];
const activities = [];
(function genActivities() {
  const byRep = {}; repIds.forEach(r => { byRep[r] = accounts.filter(a => a.owner === r); });
  for (let d = 44; d >= 0; d--) {
    if (weekday(d) === 5) continue;
    CONFIG.reps.forEach(rep => {
      const pool = byRep[rep.id]; if (!pool.length) return;
      const n = Math.round(rep.callTarget * (0.55 + R.f() * 0.55) * (weekday(d) === 4 ? 0.5 : 1) * (d === 0 ? 0.45 : 1));
      for (let i = 0; i < n; i++) {
        const acc = pool[Math.floor(Math.pow(R.f(), 1.5) * pool.length)];
        const o = R.weighted(OUTCOMES, 'w');
        activities.push({ t: d, min: R.int(9 * 60, d === 0 ? CONFIG.nowMinutes : 17 * 60), rep: rep.id, accountId: acc.id, type: o.key === 'email' ? 'email' : o.key === 'demo' ? 'meeting' : 'call', outcome: o.key });
      }
    });
  }
  // wins: renewals and upgrades inside the window are credited to the owner
  accounts.forEach(a => {
    if (!a.owner) return;
    // deal value = monthly revenue it changed: full MRR for a first purchase, only the increase for an expansion
    a.planEvents.forEach((pe, k) => {
      const prevMrr = k ? a.planEvents[k - 1].mrr : 0;
      if (pe.t <= 44 && (pe.kind === 'expansion' || pe.kind === 'new')) activities.push({ t: pe.t, min: dealMin(pe.t), rep: a.owner, accountId: a.id, type: 'deal', outcome: pe.kind === 'new' ? 'won_new' : 'won_expansion', mrr: pe.kind === 'new' ? pe.mrr : pe.mrr - prevMrr });
      if (pe.t <= 44 && pe.kind === 'churn') activities.push({ t: pe.t, min: dealMin(pe.t), rep: a.owner, accountId: a.id, type: 'deal', outcome: 'lost', reason: a.churnReason });
    });
    a.invoices.forEach((inv, i) => {
      if (i > 0 && inv.t <= 44 && inv.status === 'paid') activities.push({ t: inv.t, min: dealMin(inv.t), rep: a.owner, accountId: a.id, type: 'deal', outcome: 'renewed', mrr: Math.round(inv.amount / CONFIG.cycles[inv.cycle].months) });   // MRR kept, not the invoice total
    });
  });
  activities.sort((p, q) => p.t - q.t || q.min - p.min);
})();
const OUTCOME_LABEL = Object.fromEntries(OUTCOMES.map(o => [o.key, o.label]));
Object.assign(OUTCOME_LABEL, { won_new: 'خرید اول', won_expansion: 'ارتقا', renewed: 'تمدید شد', lost: 'از دست رفت' });

/* ----------------------------------------------------------- task engine */
// Tasks are derived from rules — the same customer never gets two copies of
// the same task, and every task says why it exists.
const TASK_TYPES = {
  pastdue:   { label: 'پرداخت ناموفق',        icon: 'card',    prio: 1 },
  renew:     { label: 'تمدید پیش رو',          icon: 'repeat',  prio: 2 },
  drop:      { label: 'افت سلامت',            icon: 'down',    prio: 2 },
  upsell:    { label: 'پیشنهاد ارتقا',         icon: 'up',      prio: 3 },
  seats:     { label: 'سقف همکار پر شده',          icon: 'users',   prio: 3 },
  welcome:   { label: 'خوشامد مشتری جدید',     icon: 'star',    prio: 3 },
  followup:  { label: 'پیگیری تماس قبلی',      icon: 'phone',   prio: 2 },
};
function tasksFor(repId) {
  const out = [];
  const mine = accounts.filter(a => a.owner === repId);
  for (const a of mine) {
    if (a.pastDue) {
      const inv = a.invoices[a.invoices.length - 1];
      out.push({ id: 'pastdue:' + a.id, type: 'pastdue', accountId: a.id, due: 0, value: a.mrr,
        why: 'پرداخت تمدید ' + fa(inv.retries) + ' بار ناموفق بوده؛ اشتراک در دورهٔ مهلت است' });
    }
    if (a.paying && a.renewIn <= 14 && (a.health < 60 || a.renewIn <= 3)) {
      out.push({ id: 'renew:' + a.id, type: 'renew', accountId: a.id, due: a.renewIn <= 3 || a.health < 45 ? 0 : Math.max(1, a.renewIn - 6), value: a.mrr,
        why: 'تمدید ' + (a.renewIn === 0 ? 'امروز' : fa(a.renewIn) + ' روز دیگر') + ' · سلامت ' + fa(a.health) });
    }
    if (a.paying && a.health2wAgo !== null && a.health2wAgo - a.health >= 20 && a.health < 60) {
      out.push({ id: 'drop:' + a.id, type: 'drop', accountId: a.id, due: 0, value: a.mrr,
        why: 'امتیاز سلامت از ' + fa(a.health2wAgo) + ' به ' + fa(a.health) + ' در دو هفته' });
    }
    if (a.segments.includes('upsell')) {
      out.push({ id: 'upsell:' + a.id, type: 'upsell', accountId: a.id, due: 1, value: upgradeValue(a), score: a.limitHits30 * (1 + a.pricingVisits30),
        why: fa(a.limitHits30) + ' بار به سقف ' + a.maxUsage.label + ' خورده و ' + fa(a.pricingVisits30) + ' بار صفحهٔ قیمت را دیده' });
    }
    if (a.paying && a.plan !== 'basic' && a.memberCount >= a.seats && a.activeMembers7 >= a.seats) {
      out.push({ id: 'seats:' + a.id, type: 'seats', accountId: a.id, due: 2, value: plans[a.plan].seatPrice * 2,
        why: fa(a.memberCount) + ' عضو از سقف ' + fa(a.seats) + ' همکار · هر ' + fa(a.activeMembers7) + ' نفر این هفته فعال بوده‌اند' });
    }
    if (a.paying && a.tenureDays <= 7) {
      out.push({ id: 'welcome:' + a.id, type: 'welcome', accountId: a.id, due: 0, value: a.mrr,
        why: 'اولین پرداخت ' + (a.tenureDays === 0 ? 'امروز' : fa(a.tenureDays) + ' روز پیش') + ' — تماس خوشامد و تنظیم اولیه' });
    }
  }
  // follow-ups: "call back" outcomes from the last 6 days
  activities.filter(x => x.rep === repId && x.outcome === 'callback' && x.t >= 1 && x.t <= 6).forEach(x => {
    const a = byId.get(x.accountId);
    out.push({ id: 'followup:' + a.id + ':' + x.t, type: 'followup', accountId: a.id, due: -(x.t - 1), value: a.mrr,
      why: 'قرار تماس مجدد از ' + fa(x.t) + ' روز پیش' });
  });
  // upgrade leads are spread over the week — the strongest signals first, four a day
  out.filter(t => t.type === 'upsell').sort((p, q) => q.score - p.score).forEach((t, i) => { t.due = Math.floor(i / 4); if (i >= 20) t.drop = true; });
  out.filter(t => t.type === 'seats').forEach((t, i) => { t.due = 1 + (i % 5); });
  const seen = new Set();
  const list = out.filter(t => { const k = t.type + t.accountId; if (t.drop || seen.has(k)) return false; seen.add(k); return true; })
    .sort((p, q) => TASK_TYPES[p.type].prio - TASK_TYPES[q.type].prio || q.value - p.value);
  // daily capacity: what does not fit today moves to the next working days, lowest value first
  const cap = (CONFIG.reps.find(r => r.id === repId) || { callTarget: 12 }).callTarget + 2;
  let today = 0;
  list.forEach(t => {
    if (t.due > 0) return;
    if (today < cap) { today++; return; }
    t.spilled = true; t.due = 1 + Math.floor((today - cap) / cap); today++;
  });
  return list.sort((p, q) => Math.max(0, p.due) - Math.max(0, q.due) || TASK_TYPES[p.type].prio - TASK_TYPES[q.type].prio || q.value - p.value);
}
function upgradeValue(a) {
  if (a.plan === 'free') return mrrOf('basic', 1, 'monthly');
  if (a.plan === 'basic') return mrrOf('pro', 5, 'monthly') - a.mrr;
  return plans[a.plan].seatPrice * 2;
}

/* ------------------------------------------------------------ aggregates */
const agg = {
  /** accounts active (any event) on day d */
  activeOn(d) { let n = 0; for (const a of accounts) if (a.ev[d] > 0) n++; return n; },
  activeUsersOn(d) { let n = 0; for (const a of accounts) n += a.au[d]; return n; },
  activeInWindow(from, len) { let n = 0; for (const a of accounts) if (countRange(a.ev, from, from + len) > 0) n++; return n; },
  activeUsersInWindow(from, len) {           // distinct users: approximated per account by max daily active users
    let n = 0;
    for (const a of accounts) { let mx = 0; for (let d = from; d < from + len; d++) if (a.au[d] > mx) mx = a.au[d]; n += Math.min(a.memberCount, mx + (mx > 1 ? 1 : 0)); }
    return n;
  },
  totalUsers() { let n = 0; for (const a of accounts) n += a.memberCount; return n; },
  signups(from, len) { let n = 0; for (const a of accounts) if (a.age >= from && a.age < from + len) n++; return n; },
  visits(from, len, src) {
    let n = 0;
    for (const s of CONFIG.sources) if (!src || s.key === src) for (let d = from; d < from + len; d++) n += visits[s.key][d];
    return n;
  },
  visitsDaily(days, src) {
    const out = [];
    for (let d = days - 1; d >= 0; d--) { let n = 0; for (const s of CONFIG.sources) if (!src || s.key === src) n += visits[s.key][d]; out.push(n); }
    return out;
  },
  /** series oldest → newest */
  daily(fn, days) { const out = []; for (let d = days - 1; d >= 0; d--) out.push(fn(d)); return out; },

  mrrAt(t) {                                 // MRR on day t (days ago)
    let s = 0;
    for (const a of accounts) {
      let v = 0;
      for (const pe of a.planEvents) if (pe.t >= t) v = pe.mrr; else break;
      s += v;
    }
    return s;
  },
  payingAt(t) {
    let n = 0;
    for (const a of accounts) { let v = 0; for (const pe of a.planEvents) if (pe.t >= t) v = pe.mrr; else break; if (v > 0) n++; }
    return n;
  },
  /** MRR movements between day `from` (older, days ago) and `to` (newer) — [from > t >= to] */
  movements(from, to) {
    const mv = { new: 0, expansion: 0, contraction: 0, churn: 0, newCount: 0, churnCount: 0, expCount: 0, conCount: 0 };
    for (const a of accounts) {
      let prev = 0;
      for (const pe of a.planEvents) {
        if (pe.t < from && pe.t >= to) {
          const delta = pe.mrr - prev;
          if (pe.kind === 'new') { mv.new += pe.mrr; mv.newCount++; }
          else if (pe.kind === 'churn') { mv.churn -= prev; mv.churnCount++; }
          else if (delta > 0) { mv.expansion += delta; mv.expCount++; }
          else if (delta < 0) { mv.contraction += delta; mv.conCount++; }
        }
        prev = pe.mrr;
      }
    }
    return mv;
  },
  /** last n Jalali months with MRR and movements */
  mrrMonths(n) {
    return jalaliMonths(n).map(mo => {
      const mv = agg.movements(mo.start + 1, mo.end);
      return { ...mo, mrr: agg.mrrAt(mo.end), paying: agg.payingAt(mo.end), ...mv };
    });
  },
  months: jalaliMonths,

  /** ordered funnel for accounts that signed up in [from, from+len) days ago */
  funnel(from, len, src) {
    const cohort = accounts.filter(a => a.age >= from && a.age < from + len && (!src || a.source === src));
    const reached = k => cohort.filter(a => a.milestones[k] !== undefined);
    const steps = [
      { key: 'visit',     label: 'بازدید سایت',  n: agg.visits(from, len, src), def: 'بازدیدکنندهٔ یکتا در بازه (Clarity)' },
      { key: 'signup',    label: 'ثبت‌نام',       n: cohort.length, def: 'حساب ساخته‌شده در بازه' },
      { key: 'firstBase', label: 'اولین بیس',    n: reached('firstBase').length, def: 'حداقل یک بیس ساخته' },
      { key: 'activated', label: 'فعال‌سازی',     n: reached('activated').length, def: CONFIG.activation.records + ' رکورد در ' + CONFIG.activation.days + ' روز اول' },
      { key: 'habit',     label: 'عادت',          n: reached('habit').length, def: 'فعال در ۳ هفته از ۴ هفتهٔ اول' },
      { key: 'paid',      label: 'پرداخت',        n: cohort.filter(a => a.milestones.paid !== undefined && a.milestones.habit !== undefined).length, def: 'اولین پرداخت (پس از رسیدن به عادت)' },
    ];
    const med = k => { const v = (k === 'paid' ? cohort.filter(a => a.milestones.paid !== undefined && a.milestones.habit !== undefined) : reached(k)).map(a => a.milestones[k]).sort((p, q) => p - q); return v.length ? v[Math.floor(v.length / 2)] : null; };
    steps.forEach((s, i) => {
      s.fromPrev = i ? (steps[i - 1].n ? s.n / steps[i - 1].n : 0) : 1;
      s.fromStart = i ? (steps[1].n ? s.n / steps[1].n : 0) : 1;
      s.medianDays = ['firstBase', 'activated', 'habit', 'paid'].includes(s.key) ? med(s.key) : null;
    });
    steps.cohort = cohort;
    return steps;
  },

  /** monthly signup cohorts: share of accounts active in month k after signup */
  cohorts(n, filter) {
    const months = jalaliMonths(n);
    return months.map(mo => {
      const c = accounts.filter(a => a.age <= mo.start && a.age >= mo.end && (!filter || filter(a)));
      const size = c.length;
      const cells = [];
      // month k after signup = days [30.4k, 30.4(k+1)); a cell is shown only once every member has lived through it
      const maxK = Math.floor(mo.end / 30.4) - 1;
      for (let k = 0; k <= Math.max(0, Math.min(maxK, n - 1)); k++) {
        let act = 0;
        const w0 = Math.floor(k * 30.4 / 7), w1 = Math.floor((k + 1) * 30.4 / 7);
        for (const a of c) {
          let hit = false; for (let w = w0; w < w1 && w < a.wk.length; w++) if (a.wk[w]) { hit = true; break; }
          if (hit) act++;
        }
        cells.push(size ? act / size : null);
      }
      return { ...mo, size, cells, partial: maxK < 0, revenueSize: c.filter(a => a.everPaid).length };
    });
  },
  /** weekly retention curve (share active in week w after signup), for accounts old enough */
  retentionCurve(filter, weeks) {
    weeks = weeks || 12;
    const pool = accounts.filter(a => a.age >= weeks * 7 && a.age <= 400 && (!filter || filter(a)));
    const out = [];
    for (let w = 0; w <= weeks; w++) {
      let n = 0; for (const a of pool) if (a.wk[w]) n++;
      out.push(pool.length ? n / pool.length : 0);
    }
    out.n = pool.length;
    return out;
  },

  sources(from, len) {
    return CONFIG.sources.map(s => {
      const c = accounts.filter(a => a.source === s.key && a.age >= from && a.age < from + len);
      const vis = agg.visits(from, len, s.key);
      const act = c.filter(a => a.milestones.activated !== undefined).length;
      const paid = c.filter(a => a.everPaid).length;
      const mrr = c.reduce((t, a) => t + a.mrr, 0);
      const spend = s.spend * len / 30;
      return { ...s, visits: vis, signups: c.length, signupRate: vis ? c.length / vis : 0, activated: act,
        activationRate: c.length ? act / c.length : 0, paid, paidRate: c.length ? paid / c.length : 0, mrr,
        spend, cac: spend && paid ? spend / paid : null };
    });
  },

  features(from, len) {
    const active = accounts.filter(a => countRange(a.ev, from, from + len) > 0);
    const prevActive = accounts.filter(a => countRange(a.ev, from + len, from + 2 * len) > 0);
    return CONFIG.features.map(f => {
      // one rule for both periods: an active account that had adopted the feature by the end of the window
      const has = (a, end) => a.feat[f.key] && a.feat[f.key].first >= end;
      const n = active.filter(a => has(a, from)).length;
      const pn = prevActive.filter(a => has(a, from + len)).length;
      const paidN = active.filter(a => a.paying && has(a, from)).length;
      const paidAll = active.filter(a => a.paying).length;
      const freeN = active.filter(a => !a.paying && has(a, from)).length;
      return { ...f, users: n, rate: active.length ? n / active.length : 0, prevRate: prevActive.length ? pn / prevActive.length : 0,
        paidRate: paidAll ? paidN / paidAll : 0, freeRate: (active.length - paidAll) ? freeN / (active.length - paidAll) : 0 };
    });
  },

  healthDist(list) {
    list = list || accounts.filter(a => a.paying);
    return CONFIG.health.bands.map(b => ({ ...b, n: list.filter(a => a.band.key === b.key).length, mrr: list.filter(a => a.band.key === b.key).reduce((t, a) => t + a.mrr, 0) }));
  },
  segmentCounts() {
    return CONFIG.segments.map(s => {
      const now = accounts.filter(a => a.segments.includes(s.key));
      return { ...s, n: now.length, mrr: now.reduce((t, a) => t + a.mrr, 0) };
    });
  },
};

/* ------------------------------------------------------------ operations */
const ops = (function () {
  const runs30 = accounts.reduce((t, a) => t + a.runs30, 0);
  const hourly = []; for (let h = 23; h >= 0; h--) {
    const hr = (24 + 13 - h) % 24;                           // local hour
    const shape = hr >= 8 && hr <= 20 ? 1 : hr >= 6 && hr <= 22 ? 0.55 : 0.18;
    hourly.push({ hr, runs: Math.round(runs30 / 30 / 14 * shape * R.logn(0.15)), failed: 0 });
  }
  hourly[hourly.length - 3].failed = 41; hourly[hourly.length - 2].failed = 29; hourly[hourly.length - 4].failed = 9; hourly[hourly.length - 5].failed = 8;   // = queue failed24
  return {
    queues: [
      { key: 'automation', name: 'Automation',   waiting: 1284, active: 12, failed24: 87, delay: 18,  throughput: Math.round(runs30 / 30), trend: [310, 290, 420, 380, 510, 760, 1284] },
      { key: 'notify',     name: 'Notification', waiting: 42,   active: 4,  failed24: 2,  delay: 3,   throughput: 18400, trend: [40, 35, 60, 38, 44, 51, 42] },
      { key: 'rag',        name: 'RAG-Index',    waiting: 610,  active: 8,  failed24: 14, delay: 96,  throughput: 3900, trend: [120, 180, 150, 420, 530, 580, 610] },
      { key: 'backup',     name: 'Backup',       waiting: 3,    active: 1,  failed24: 0,  delay: 240, throughput: 2350, trend: [2, 4, 3, 3, 2, 5, 3] },
      { key: 'export',     name: 'Export',       waiting: 6,    active: 2,  failed24: 1,  delay: 12,  throughput: 640,  trend: [4, 8, 3, 6, 9, 7, 6] },
    ],
    hourly,
    crons: [
      { key: 'gc',       name: 'جمع‌آوری زباله',       schedule: 'روزانه ۰۲:۰۰', lastT: 0, lastAt: '۰۲:۰۰', duration: '۴ دقیقه',  status: 'ok' },
      { key: 'stats',    name: 'آمار موتورها',        schedule: 'هر ساعت',      lastT: 0, lastAt: '۱۳:۰۰', duration: '۹ ثانیه',  status: 'ok' },
      { key: 'collab',   name: 'دایرکتوری همکاران',   schedule: 'روزانه ۰۳:۳۰', lastT: 0, lastAt: '۰۳:۳۰', duration: '۲ دقیقه',  status: 'ok' },
      { key: 'backup',   name: 'پشتیبان‌گیری',         schedule: 'روزانه ۰۴:۰۰', lastT: 0, lastAt: '۰۴:۰۰', duration: '۳۱ دقیقه', status: 'ok' },
      { key: 'expire',   name: 'انقضای اشتراک',       schedule: 'روزانه ۱۴:۰۰', lastT: 1, lastAt: '۱۴:۰۰', duration: '—',        status: 'fail', error: 'MongoServerError: cursor id not found (after 1,000 docs)' },
      { key: 'snapshot', name: 'اسنپ‌شات روزانهٔ مشتریان', schedule: 'روزانه ۰۱:۰۰', lastT: 0, lastAt: '۰۱:۰۰', duration: '۶ دقیقه', status: 'ok', isNew: true },
      { key: 'brief',    name: 'تحلیل هوشمند روزانه',  schedule: 'روزانه ۰۸:۰۰', lastT: 0, lastAt: '۰۸:۰۰', duration: '۴۱ ثانیه', status: 'ok', isNew: true },
      { key: 'purge',    name: 'پاک‌سازی طولانی',       schedule: 'ماهانه',        lastT: 26, lastAt: '۰۳:۰۰', duration: '۲ ساعت',  status: 'ok' },
    ],
    ingestion: [
      { key: 'main',     name: 'index=main',     desc: 'رویدادهای رکورد',     lagMin: 3,    rate: 38,  dropped24: 0,     status: 'good' },
      { key: 'behavior', name: 'index=behavior', desc: 'رویدادهای رفتاری',    lagMin: 2460, rate: 1,   dropped24: 18400, status: 'crit' },
      { key: 'clarity',  name: 'Clarity',        desc: 'بازدید سایت (روزانه)', lagMin: 1140, rate: null, dropped24: 0,    status: 'warn' },
      { key: 'wallet',   name: 'WALLET',         desc: 'پرداخت‌ها',           lagMin: 1,    rate: 0.2, dropped24: 0,     status: 'good' },
    ],
    knownIssues: [
      { id: 'LOG-1', title: 'سقف پردازش یک لاگ در ثانیه', impact: 'صف لاگ رفتاری عقب می‌ماند؛ تأخیر فعلی ۴۱ ساعت', status: 'open', owner: 'بک‌اند' },
      { id: 'LOG-2', title: 'بچ ناقص هرگز ارسال نمی‌شود',  impact: 'رویدادهای آخر هر بازه گم می‌شوند (~۱۸ هزار در ۲۴ ساعت)', status: 'open', owner: 'بک‌اند' },
      { id: 'LOG-3', title: 'تابع ردیابی بی‌صدا شکست می‌خورد', impact: 'invite_accepted و pricing_view گاهی ثبت نمی‌شوند', status: 'in_progress', owner: 'بک‌اند' },
      { id: 'EVT-4', title: 'رویداد invite_accepted وجود ندارد', impact: 'پذیرش دعوت فعلاً از Collaborator بازسازی می‌شود', status: 'in_progress', owner: 'محصول' },
      { id: 'EVT-5', title: 'lastSuccessfulLogin ذخیره نمی‌شود', impact: 'آخرین ورود از لاگ رفتاری تخمین زده می‌شود', status: 'open', owner: 'بک‌اند' },
    ],
    eventsHourly: (function () { const o = []; for (let h = 47; h >= 0; h--) { const hr = (48 + 13 - h) % 24; const sh = hr >= 8 && hr <= 20 ? 1 : 0.35; o.push({ h, expected: Math.round(5200 * sh), received: h > 41 ? Math.round(5200 * sh * 0.97) : Math.min(3600, Math.round(5200 * sh * 0.97)) }); } return o; })(),
  };
})();

/* ------------------------------------------------------------ audit trail */
const audit = [
  { t: 0, min: 780, who: 'نگار صالحی', action: 'نمایش شمارهٔ موبایل', target: 1 },
  { t: 0, min: 742, who: 'مدیر سیستم', action: 'خروجی CSV مشتریان (۲۱۸ ردیف)', target: null },
  { t: 0, min: 700, who: 'امید رحیمی', action: 'تغییر مسئول حساب', target: 2 },
  { t: 1, min: 990, who: 'سینا کاظمی', action: 'نمایش ایمیل', target: 3 },
  { t: 1, min: 640, who: 'مدیر سیستم', action: 'تغییر وزن امتیاز سلامت', target: null },
  { t: 2, min: 820, who: 'مریم توکلی', action: 'خروجی CSV میز فروش (۴۴ ردیف)', target: null },
];

export const DB = {
  CONFIG, accounts, byId, agg, activities, OUTCOME_LABEL, TASK_TYPES, tasksFor, upgradeValue, ops, audit,
  metrics, mrrOf, jalali, jalaliMonths, dayDate, plans: CONFIG.plans, visits, countRange, sumRange,
  rep: id => CONFIG.reps.find(r => r.id === id),
  source: key => CONFIG.sources.find(s => s.key === key),
  segment: key => CONFIG.segments.find(s => s.key === key),
  bases: () => { const out = []; for (const a of accounts) for (const b of a.bases) out.push(b); return out; },
  base: id => { const a = byId.get(Math.floor(id / 10)); return a ? a.bases.find(b => b.id === id) : null; },
};
export default DB;
