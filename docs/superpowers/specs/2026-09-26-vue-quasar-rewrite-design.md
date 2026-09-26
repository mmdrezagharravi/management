# پنل مدیریت مشتری Airsheet — بازنویسی با Vue 3 + Quasar

تاریخ: ۴ مهر ۱۴۰۵ (2026-09-26)

## هدف
ماکاپ ۲۲ صفحه‌ای HTML به یک اپ واقعی Vue 3 + Quasar تبدیل شود، تمیز و یک‌دست، بدون هیچ فایل HTML صفحه‌ای، و طوری که اتصال به بک‌اند `cloud-back` (REST زیر `/management`) بدون دست زدن به صفحه‌ها انجام شود.

## تصمیم‌ها
| موضوع | انتخاب | چرا |
|---|---|---|
| جای پروژه | همین مخزن `management/`؛ فایل‌های قدیمی حذف (تاریخچهٔ git نگه می‌دارد) | یک مخزن، یک منبع |
| ابزار | Quasar CLI (Vite) v2 · Vue 3 `<script setup>` · Pinia · vue-router (history) · JavaScript | هم‌خوان با `cloud-front` |
| RTL | `postcss-rtlcss` + `lang: fa-IR` | همان راه `cloud-front` |
| تم | توکن‌های رنگ CSS (روشن/تیره) + پلاگین Dark کوازار | تم تیره بدون JS اضافه |
| فونت | `@fontsource/vazirmatn` | بدون وابستگی به اینترنت |
| نمودار | موتور SVG بدون وابستگی ماکاپ، به‌صورت کامپوننت Vue | راست‌چین و از قبل طراحی‌شده؛ وابستگی جدید نمی‌خواهد |
| داده | موتور دادهٔ ساختگی (بذر ثابت) در `src/mock/`؛ صفحه‌ها فقط `src/api/` را می‌بینند | تعویض به HTTP در یک فایل |

## ساختار
```
src/
  api/            index.js (نمای واحد) · mock/*.js (پیاده‌سازی فعلی) · http.js (بعداً)
  mock/engine.js  دنیای ساختگی: ۴۲۰۰ حساب، معیارها، کارها، عملیات
  lib/            format.js (اعداد، تاریخ جلالی، زمان) · charts.js · csv.js
  stores/         session (نقش، تم، بازه، منوی جمع‌شده) · local (مسئول، کار، یادداشت، ممیزی — localStorage)
  components/     پوستهٔ صفحه، KPI، کارت، نشان‌ها، جدول داده، نمای سریع مشتری، دیالوگ‌ها، نمودارها
  layouts/        MainLayout.vue (ریل + زیرمنو + نوار بالا + پالت جستجو)
  pages/          ۲۲ صفحه
  router/         routes.js
```

## قرارداد API (آنچه بک‌اند باید بدهد)
هر تابع `Promise` برمی‌گرداند و ورودی/خروجی‌اش شیء ساده است. کلیدها انگلیسیِ پایدارند (`good`, `warn`, `pro`…)؛ برچسب فارسی در فرانت.
- خواندنی: `overview({range})`, `today({rep})`, `aiBrief()`, `customers()`, `customer(id)`, `health()`, `segments()`, `onboarding()`, `revenue({range})`, `sales()`, `team({range})`, `funnel({range})`, `retention()`, `acquisition({range})`, `features({range})`, `journey({range})`, `bases()`, `base(id)`, `quota()`, `jobs()`, `dataHealth()`, `settings()`, `search(q)`, `alerts()`
- نوشتنی: `setOwner(ids, rep)`, `addNote(accountId, note)`, `setTask(id, patch)`, `logAudit(action)`, `setThresholds(v)`, `runCron(key)`

## قاعده‌های ثابت (از README ماکاپ)
یک تعریف برای هر معیار؛ امتیاز سلامت ۰–۱۰۰ با پنج مؤلفهٔ ۲۰تایی؛ قیف کوهورتی؛ تغییر خوب سبز است؛ دادهٔ شخصی پوشیده و نمایشش در ممیزی ثبت می‌شود؛ تازگی داده روی هر صفحه.

## آزمون
- `npm run build` بدون خطا.
- هر ۲۲ مسیر در مرورگر باز شود و بدون خطای کنسول رندر شود.
- یک تست واحد کوچک برای `lib/format.js` و منطق جدول.
