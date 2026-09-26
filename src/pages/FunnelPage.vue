<template>
  <PageShell title="قیف تبدیل" :sub="sub" range v-model:range="range" :sources="['clarity', 'main', 'behavior']" :loading="loading" :error="error">
    <template #actions>
      <select class="select" aria-label="منبع جذب" :value="src || ''" @change="setSrc($event.target.value)">
        <option value="">همهٔ منابع</option>
        <option v-for="s in (d && d.bySource) || SOURCES" :key="s.key" :value="s.key">{{ s.name }}</option>
      </select>
    </template>
    <template v-if="d">
      <div v-if="d.source" class="banner info"><AppIcon name="filter" /><div>فقط ثبت‌نام‌های منبع <b>{{ d.sourceName }}</b> — <a href="#" @click.prevent="setSrc(null)">نمایش همهٔ منابع</a></div></div>

      <div class="kpis">
        <KpiTile v-if="V.n != null" label="بازدید سایت" :value="n(V.n)" :info="fa(V.def)" to="/acquisition" :delta="{ cur: V.n, prev: KP.visit.n }" :cmp="prevCmp(n(KP.visit.n))" />
        <KpiTile label="ثبت‌نام" :value="n(S.n)" :info="S.def" to="/onboarding" :delta="{ cur: S.n, prev: KP.signup.n }" :cmp="prevCmp(n(KP.signup.n))" />
        <KpiTile v-if="V.n != null" label="نرخ ثبت‌نام" :value="pct(rate(S.n, V.n), 1)" info="ثبت‌نام ÷ بازدید سایت" :delta="{ cur: rate(S.n, V.n), prev: rate(KP.signup.n, KP.visit.n), points: true }" :cmp="prevCmp(pct(rate(KP.signup.n, KP.visit.n), 1))" />
        <KpiTile label="نرخ فعال‌سازی" :value="pct(A.fromStart)" :info="fa(A.def) + ' — سهم از ثبت‌نام‌ها'" :delta="{ cur: A.fromStart, prev: KP.activated.fromStart, points: true }" :cmp="prevCmp(pct(KP.activated.fromStart))" />
        <KpiTile label="نرخ پرداخت" :value="pct(P.fromStart, 1)" info="پرداخت‌کننده ÷ ثبت‌نام. کوهورت قبلی زمان بیشتری برای پرداخت داشته، پس مقایسهٔ مستقیم منصفانه نیست" :cmp="prevCmp(pct(KP.paid.fromStart, 1))" />
        <KpiTile label="زمان میانه تا فعال‌سازی" :value="A.medianDays == null ? '—' : fa(A.medianDays)" unit="روز" info="روز پس از ثبت‌نام، میانهٔ حساب‌هایی که به پله رسیده‌اند">
          <template #cmp>تا پرداخت: <b style="color: var(--ink)">{{ days(P.medianDays) }}</b></template>
        </KpiTile>
      </div>

      <div class="grid g-main">
        <PanelCard :title="'قیف' + (d.source ? ' · ' + d.sourceName : '')" hint="پهنای هر میله = سهم از ثبت‌نام‌های کوهورت">
          <div v-if="V.n != null" class="row wrap" style="gap: 4px 12px; padding: 8px 12px; border-radius: 8px; background: var(--surface-2); border: 1px solid var(--border); font-size: 12.5px; margin-bottom: 8px">
            <span><b>{{ n(V.n) }}</b> بازدید سایت</span><span class="muted">←</span><span><b>{{ n(S.n) }}</b> ثبت‌نام</span>
            <span class="muted">نرخ ثبت‌نام <b style="color: var(--ink)">{{ pct(rate(S.n, V.n), 1) }}</b> · {{ n(V.n - S.n) }} بازدیدکننده حساب نساختند</span>
          </div>
          <div class="fn">
            <template v-for="(s, i) in steps" :key="s.key">
              <div v-if="i" class="drop"><span></span><span><span v-if="s.key === d.worst" class="badge st-crit" style="height: 19px; margin-inline-end: 6px"><i class="dot" />بزرگ‌ترین ریزش</span>− {{ n(steps[i - 1].n - s.n) }} حساب ({{ pct(1 - s.fromPrev) }}) به این پله نرسیدند</span><span></span></div>
              <div class="st">
                <div class="l">{{ s.label }}<small>{{ fa(s.def) }}</small></div>
                <div class="b"><i :style="{ width: barW(s) + '%' }" /><span :class="{ out: barW(s) < 16 }" :style="barW(s) < 16 ? { right: 'calc(' + barW(s) + '% + 8px)' } : null">{{ n(s.n) }}</span></div>
                <div class="r">
                  <template v-if="i === 0">پایهٔ درصدها<template v-if="V.n != null"><br />از بازدید <b>{{ pct(rate(S.n, V.n), 1) }}</b></template></template>
                  <template v-else>از قبلی <b>{{ pct(s.fromPrev) }}</b> · از ثبت‌نام <b>{{ pct(s.fromStart, s.fromStart < 0.1 ? 1 : 0) }}</b><template v-if="s.medianDays != null"><br />میانه <b>{{ days(s.medianDays) }}</b> پس از ثبت‌نام</template></template>
                </div>
              </div>
            </template>
          </div>
          <template #footer><span>هر حساب فقط یک بار شمرده می‌شود؛ «پرداخت» یعنی پس از رسیدن به عادت</span><router-link to="/journey">نقشهٔ مسیر مشتری</router-link></template>
        </PanelCard>
        <div class="stack">
          <PanelCard v-if="worst" title="بزرگ‌ترین ریزش پس از ثبت‌نام">
            <template #actions><span class="badge st-crit"><i class="dot" />{{ pct(1 - worst.fromPrev) }} ریزش</span></template>
            <div class="prose"><b>«{{ worstPrev.label }}» ← «{{ worst.label }}»:</b> {{ n(worstPrev.n - worst.n) }} حساب از {{ n(worstPrev.n) }} {{ play.what }}.<br />{{ play.todo }}</div>
            <template #footer><router-link to="/onboarding">ثبت‌نام‌های تازه</router-link><router-link v-if="play.to !== '/onboarding'" :to="play.to">{{ play.cta }}</router-link></template>
          </PanelCard>
          <PanelCard title="گیرکرده، همین حالا" :hint="'ثبت‌نام ۳ تا ۱۴ روز پیش' + (d.source ? ' · ' + d.sourceName : '')" flush>
            <div class="list" style="padding: 0 16px">
              <router-link class="li" to="/onboarding"><span class="hero" style="font-size: 26px; min-width: 48px">{{ n(d.stuck.noBase) }}</span><span class="main"><span class="t">هنوز بیسی نساخته‌اند</span><span class="d">ایمیل راهنمای ساخت اولین بیس بفرستید</span></span><AppIcon name="chevronL" cls="faint" /></router-link>
              <router-link class="li" to="/onboarding"><span class="hero" style="font-size: 26px; min-width: 48px">{{ n(d.stuck.notAct) }}</span><span class="main"><span class="t">بیس دارند، فعال نشده‌اند</span><span class="d">تماس کوتاه برای ورود داده از Excel</span></span><AppIcon name="chevronL" cls="faint" /></router-link>
            </div>
            <template #footer><span>از {{ n(d.stuck.pool) }} ثبت‌نام این دو هفته</span><router-link to="/onboarding">پیگیری در «ثبت‌نام‌های تازه»</router-link></template>
          </PanelCard>
        </div>
      </div>

      <div class="grid g-main">
        <PanelCard title="قیف به تفکیک منبع" hint="درصدها از ثبت‌نام · پررنگ = بهترین در ستون" flush>
          <div class="tbl-wrap"><table class="tbl compact">
            <thead><tr><th>منبع</th><th v-for="c in cols" :key="c.k" class="num">{{ c.label }}</th></tr></thead>
            <tbody>
              <tr v-for="r in d.bySource" :key="r.key" class="click" :class="{ sel: r.key === d.source }" title="نمایش قیف فقط برای این منبع" @click="setSrc(r.key === d.source ? null : r.key)">
                <td class="nowrap"><b>{{ r.name }}</b></td>
                <td v-for="c in cols" :key="c.k" class="num"><b v-if="r[c.k] === best[c.k] && r[c.k] > 0" style="color: var(--ink)">{{ c.fm(r[c.k]) }}</b><span v-else class="muted">{{ c.fm(r[c.k]) }}</span></td>
              </tr>
              <tr style="background: var(--surface-2)"><td><b>همه</b></td><td v-for="c in cols" :key="c.k" class="num"><b>{{ c.fm(d.total[c.k]) }}</b></td></tr>
            </tbody>
          </table></div>
          <template #footer><span>روی یک منبع بزنید تا کل صفحه برای همان منبع حساب شود</span><router-link to="/acquisition">هزینه و CAC منابع</router-link></template>
        </PanelCard>
        <PanelCard title="نرخ فعال‌سازی هفتگی" :hint="'۱۶ هفتهٔ اخیر ثبت‌نام' + (d.source ? ' · ' + d.sourceName : '')">
          <LineChart :options="actChart" />
          <template #footer><span>هر نقطه = ثبت‌نام‌های یک هفتهٔ کامل و بالغ</span><router-link to="/onboarding">ثبت‌نام‌های تازه</router-link></template>
        </PanelCard>
      </div>
    </template>
  </PageShell>
</template>

<script setup>
import { computed } from 'vue'
import PageShell from 'components/PageShell.vue'
import PanelCard from 'components/PanelCard.vue'
import KpiTile from 'components/KpiTile.vue'
import AppIcon from 'components/AppIcon.vue'
import LineChart from 'components/charts/LineChart.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useRange } from 'src/composables/useRange'
import { useQueryParam } from 'src/composables/useUrlState'
import { n, fa, pct, date } from 'src/lib/format'
import { SOURCES } from 'src/lib/refs'

const range = useRange()
const src = useQueryParam('src')
const { data: d, loading, error } = useAsync(() => api.funnel({ range: range.value, source: src.value || undefined }), [range, src])
const setSrc = (v) => { src.value = v || null }

const rate = (x, y) => (y ? x / y : 0)
const days = (v) => (v == null ? '—' : fa(v) + ' روز')
const prevCmp = (v) => (d.value.prev.length ? 'کوهورت قبلی: ' + v : undefined)
const MATURE = computed(() => (d.value ? d.value.mature : 30))
const sub = computed(() => { const R = range.value, M = MATURE.value; return 'کوهورت بالغ: حساب‌هایی که ' + fa(M) + ' تا ' + fa(M + R) + ' روز پیش ثبت‌نام کرده‌اند (' + date(M + R - 1) + ' تا ' + date(M) + ') — همه دست‌کم یک ماه فرصت داشته‌اند به هر پله برسند' })

const byKey = (list) => { const o = {}; list.forEach((s) => { o[s.key] = s }); return o }
const K = computed(() => byKey(d.value.steps))
const KP = computed(() => { const o = byKey(d.value.prev); ['visit', 'signup', 'activated', 'paid'].forEach((k) => { o[k] = o[k] || {} }); return o })
const V = computed(() => K.value.visit), S = computed(() => K.value.signup), A = computed(() => K.value.activated), P = computed(() => K.value.paid)
const steps = computed(() => d.value.steps.slice(1)) // signup → paid; visits sit in the header line (different scale)
const barW = (s) => +(S.value.n ? (s.n / S.value.n) * 100 : 0).toFixed(1)
const worst = computed(() => steps.value.find((s) => s.key === d.value.worst) || null)
const worstPrev = computed(() => steps.value[steps.value.indexOf(worst.value) - 1])

// what to do when a step is the weakest — copy only; numbers are interpolated
const PLAY = computed(() => ({
  firstBase: { what: 'ثبت‌نام کرده‌اند ولی هیچ بیسی نساخته‌اند', todo: 'در اولین ورود قالبِ هم‌صنف را پیشنهاد دهید و برای حساب‌های بی‌بیس ایمیل «اولین بیس در ۵ دقیقه» بفرستید.', to: '/onboarding', cta: 'حساب‌های بی‌بیس' },
  activated: { what: 'بیس ساخته‌اند ولی در هفتهٔ اول به ' + fa(d.value.activationRecords) + ' رکورد نرسیده‌اند', todo: 'ورود از Excel را در صفحهٔ اول بیس پیشنهاد دهید و روز سوم با این حساب‌ها تماس کوتاه بگیرید.', to: '/onboarding', cta: 'حساب‌های فعال‌نشده' },
  habit: { what: 'فعال شده‌اند ولی در هفته‌های دوم تا چهارم برنگشته‌اند', todo: 'در هفتهٔ اول یک اتوماسیون یا یادآور برایشان بسازید تا دلیلی برای برگشتن داشته باشند.', to: '/onboarding', cta: 'ثبت‌نام‌های تازه' },
  paid: { what: 'به عادت رسیده‌اند ولی هنوز پرداخت نکرده‌اند', todo: 'این‌ها گرم‌ترین سرنخ‌ها هستند: به‌محض برخورد با سقف پلن، پیشنهاد ارتقا بدهید.', to: '/customers?view=upsell', cta: 'سرنخ‌های آمادهٔ ارتقا' },
}))
const play = computed(() => PLAY.value[worst.value.key])

const ALL_COLS = [
  { k: 'visits', label: 'بازدید', fm: n }, { k: 'signups', label: 'ثبت‌نام', fm: n }, { k: 'sr', label: 'نرخ ثبت‌نام', fm: (v) => pct(v, 1) },
  { k: 'fb', label: 'اولین بیس', fm: (v) => pct(v) }, { k: 'act', label: 'فعال‌سازی', fm: (v) => pct(v) }, { k: 'habit', label: 'عادت', fm: (v) => pct(v) }, { k: 'paid', label: 'پرداخت', fm: (v) => pct(v, 1) },
]
const cols = computed(() => (V.value.n == null ? ALL_COLS.filter((c) => c.k !== 'visits' && c.k !== 'sr') : ALL_COLS))
const best = computed(() => { const b = {}; cols.value.forEach((c) => { b[c.k] = Math.max(...d.value.bySource.map((r) => r[c.k])) }); return b })

const actChart = computed(() => ({
  labels: d.value.weekly.map((w) => date(w.from + 6)),
  tipLabels: d.value.weekly.map((w) => 'ثبت‌نام ' + date(w.from + 6) + ' تا ' + date(w.from) + ' · ' + n(w.n) + ' حساب'),
  series: [{ name: 'نرخ فعال‌سازی', values: d.value.weekly.map((w) => w.rate) }], height: 230, yFormat: (v) => pct(v), xTicks: 4,
}))
</script>
