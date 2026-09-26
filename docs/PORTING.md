# راهنمای پورت صفحه‌ها (HTML ماکاپ → Vue/Quasar)

> همهٔ ۲۲ صفحه پورت شده‌اند. فایل‌های HTML قدیمی (`*.html`، `assets/`، `shell.css`) حذف شده‌اند و در تاریخچهٔ git (کامیت `04de1ec`) موجودند: `git show 04de1ec:health.html`.

هدف: هر صفحهٔ `*.html` قدیمی به دو فایل تبدیل می‌شود، **با همان محتوا، همان عددها و همان منطق**:

1. `src/api/mock/<page>.js` — یک تابع async که **همهٔ محاسبات** صفحه را انجام می‌دهد و **دادهٔ ساده** (plain object) برمی‌گرداند. هیچ HTML/Vue اینجا نیست. این فایل قرارداد API بک‌اند است.
2. `src/pages/<Page>Page.vue` — فقط نمایش. داده را از `api.<page>()` می‌گیرد و با کامپوننت‌های مشترک رندر می‌کند.

نمونهٔ کامل: `src/api/mock/overview.js` + `src/pages/OverviewPage.vue` و `src/api/mock/customers.js` + `src/pages/CustomersPage.vue`. اول این‌ها را بخوانید.

## قاعده‌ها
- **منطق را عوض نکنید.** فرمول‌ها، آستانه‌ها، ترتیب‌ها و متن‌های فارسی را از فایل HTML قدیمی عیناً بیاورید. متن‌ها را کوتاه نکنید.
- **دادهٔ خام موتور از mock بیرون نمی‌رود.** حساب‌ها را با `enrich(a)` از `./shared` بدهید (شکل استاندارد حساب). اگر فیلد بیشتری لازم است، در خروجی تابع همان صفحه کنار آن بگذارید، نه با تغییر `enrich`.
- فقط `src/api/mock/*.js` اجازه دارد `src/mock/engine` را import کند. صفحه‌ها فقط `import { api } from 'src/api'`.
- ورودی توابع API یک شیء است: `api.revenue({ range })`. خروجی `Promise`. (در mock: `return ok({...})` یا `async function`.)
- کلیدهای خروجی انگلیسی و پایدار (`good`, `warn`, `pro`, `upsell` …)؛ برچسب فارسی در صفحه از `src/lib/refs.js` یا `src/lib/ui.js`.
- **مسئول حساب** همیشه از `ownerOf(a)` (تغییرهای محلی را می‌بیند). وضعیت کار از `taskState(id)`، یادداشت‌ها از `notesOf(id)`.
- تغییرها (مسئول، یادداشت، کار، آستانه، اجرای کران) از `api.setOwner / addNote / setTask / logAudit / setThresholds / runCron` و بعدش `ui.bump()` تا صفحه‌ها تازه شوند. دیالوگ ثبت تماس/یادداشت: `useDialogs().logCall(account, taskId?)` و `.addNote(account)` (Promise<boolean>).
- لینک به مشتری: `<AccountCell :a="row" />` در جدول، `<AccountLink :id :name cls="t" />` در متن. لینک به صفحه‌ها: `<router-link to="/health">`. مسیرها: `/`, `/today`, `/ai`, `/customers`, `/customers/:id`, `/health`, `/segments`, `/onboarding`, `/revenue`, `/sales`, `/team`, `/funnel`, `/retention`, `/acquisition`, `/features`, `/journey`, `/bases`, `/bases/:id`, `/quota`, `/jobs`, `/data-health`, `/settings`. کوئری قدیمی `?tab=`, `?seg=`, `?view=`, `?rep=` را با `useQueryParam('tab', 'default')` نگه دارید.
- **بدون `v-html` برای متن**؛ فقط برای SVG نمودار (که کامپوننت‌ها خودشان انجام می‌دهند). استایل inline در قالب اشکالی ندارد؛ برای CSS scoped فقط از ویژگی‌های منطقی (`inset-inline-start`, `margin-inline-start`, `text-align: start/end`) استفاده کنید چون `postcss-rtlcss` مقدارهای فیزیکی را برعکس می‌کند. کلاس‌های سراسری (`card`, `kpis`, `grid g2/g3/g4/g-main/g-side`, `stack`, `row`, `li`, `kv`, `tabs`, `tl`, `badge`, `sig`, `tag`, `note`, `banner`, `seg`, `chip`, `task`, `fn`, `hb`, `meter`, `legend`, `progress` …) همان‌هایی‌اند که در `shell.css` قدیمی بودند و در `src/css/app.scss` هستند.
- اعداد/تاریخ: `src/lib/format.js` → `n, fa, compact, compactParts, money, pct, signedPct, signed, date(daysAgo,{year}), monthLabel, ago, agoDays, inDays, clock, duration, lagText, initials, maskMobile, todayLabel, weekdayName, jalali, CURRENCY`.
- ثابت‌ها: `src/lib/refs.js` → `REPS, PLAN_ORDER, CYCLE_NAME, SOURCES, sourceName, HEALTH_COMPONENTS, SEGMENT_LABEL, TASK_TYPES, OUTCOME_LABEL`. `src/lib/ui.js` → `BANDS, band(score), BAND_COLOR, STATUS_COLOR, PLAN_NAME, delta(cur, prev, o), toast(msg, undo?)`.

## کامپوننت‌ها (src/components)
- `PageShell` props: `title, sub, range (bool) + v-model:range, sources (array), banner (bool), loading, error`؛ اسلات‌ها: `title, sub, crumbs, actions, default, skeleton`.
- `PanelCard` props: `title, hint, flush, cls, id`؛ اسلات‌ها: `title, actions, default, footer`.
- `KpiTile` props: `label, value, unit, info, cmp, to, delta ({cur, prev, abs?, points?, goodUp?, fmt?}), spark ({values, area?, bars?, color?, w?, h?})`؛ اسلات‌ها: `value, cmp, spark`.
- `DataTable` props: `rows, columns [{key,label,num,sort:(r)=>v|false,desc,format:(r)=>text,csv:(r)=>text|false,cls,title}], views [{key,label,test}], defaultView, filters [{key,label,options:[{v,l}],test:(r,v)=>bool}], search {placeholder,text:(r)=>string}, sort {key,dir}, pageSize, select, onRow, exportName, unit, emptyTitle, empty, compact, rowClass, url`؛ سلول سفارشی: `<template #col-KEY="{ row }">`؛ اسلات `toolbar` و `bulk="{ rows, done }"`. هر ردیف باید `id` یکتا داشته باشد.
- نشان‌ها: `StatusBadge (status, label)`, `HealthBadge (score)`, `HealthScore (score)`, `PlanBadge (plan)`, `DeltaChip (cur, prev, abs, points, goodUp, fmt)`, `UsageMeter (label, used, limit, fmt)`, `SignalChips (a, tickets)`, `LastSeen (a)`, `RepName (id, short, badge)`, `AppIcon (name, size)`.
- نمودار: `charts/LineChart :options`, `charts/ColumnChart :options` (همان option object تابع‌های `line`/`columns` در `src/lib/charts.js`)، `charts/SparkLine (values, w, h, bars, area, color)`, `charts/HeatMap :options`, `charts/Stack100 :options`, `charts/HBars (items [{label,sub,value,to,color,note}], format, max, labelWidth)`. options را با `computed` بسازید تا با تغییر بازه دوباره رسم شود.
- Composables: `useAsync(loader, [deps])` → `{data, loading, error, reload}`؛ `useRange()` (بازهٔ ۷/۳۰/۹۰ با URL)؛ `useQueryParam(key, default)`؛ `useDialogs()`؛ استور `useUiStore()` → `openAccount(id), bump(), setListNav({move, open, act})`؛ `useSessionStore()` → `me, isRep, repId, todayRep, setTodayRep`.

## الگوی صفحه
```vue
<template>
  <PageShell title="…" sub="…" :sources="['main']" :loading="loading" :error="error" range v-model:range="range">
    <template #actions>…</template>
    <template v-if="d"> … کارت‌ها و جدول‌ها … </template>
  </PageShell>
</template>
<script setup>
import { computed } from 'vue'
import PageShell from 'components/PageShell.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useRange } from 'src/composables/useRange'
const range = useRange()
const { data: d, loading, error } = useAsync(() => api.xxx({ range: range.value }), [range])
</script>
```

## بررسی
- بعد از نوشتن mock: `node --check src/api/mock/<page>.js` (خطای سینتکس در یک فایل mock همهٔ صفحه‌ها را می‌شکند).
- سرور dev روی `http://localhost:9100` بالاست (HMR). صفحه را در مرورگر باز کنید، کنسول بدون خطا باشد، همهٔ بخش‌های صفحهٔ قدیمی دیده شود.
