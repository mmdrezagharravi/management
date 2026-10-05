<template>
  <PageShell title="نقشهٔ مسیر مشتری" :sub="'از آگاهی تا تمدید — عددها زنده‌اند و با «قیف تبدیل» یکی‌اند (ثبت‌نام‌های ' + fa(MATURE) + ' تا ' + fa(MATURE + range) + ' روز پیش)؛ متن‌ها هر فصل بازبینی می‌شوند'" range v-model:range="range" :sources="['clarity', 'main', 'behavior', 'wallet']" :loading="loading" :error="error">
    <template #actions><button class="btn small" :class="{ primary: sample }" :aria-pressed="String(!!sample)" @click="sample = sample ? '' : '1'"><AppIcon name="sparkle" />{{ sample ? 'بازگشت به دادهٔ واقعی' : 'نمایش نمونه' }}</button></template>
    <template v-if="d">
      <div v-if="sample" class="banner info"><AppIcon name="sparkle" /><div><b>دادهٔ نمونه:</b> عددهای این صفحه ساختگی‌اند و فقط برای فهمیدن صفحه آمده‌اند. برای دیدن دادهٔ واقعی دکمهٔ «بازگشت به دادهٔ واقعی» را بزنید.</div></div>
      <PanelCard title="نقشهٔ مسیر" hint="ردیف‌های «زنده» از داده پر می‌شوند · روی موبایل افقی بکشید" flush>
        <div class="tbl-wrap">
          <table class="tbl jm">
            <thead><tr><th class="rh">مرحله</th><th v-for="(s, i) in d.stages" :key="s.key"><span class="n">{{ fa(i + 1) }}</span>{{ s.label }}</th></tr></thead>
            <tbody>
              <tr><td class="rh"><b>کار مشتری</b><span class="tag">دستی · بازبینی فصلی</span></td><td v-for="s in d.stages" :key="s.key">{{ s.job }}</td></tr>
              <tr><td class="rh"><b>نقاط تماس</b><span class="tag">دستی · بازبینی فصلی</span></td><td v-for="s in d.stages" :key="s.key">{{ s.touch }}</td></tr>
              <tr class="lvrow"><td class="rh"><b>عدد واقعی</b><span class="tag lv">زنده</span></td>
                <td v-for="s in d.stages" :key="s.key">
                  <span class="big">{{ live[s.key].n }}</span><span class="cap">{{ live[s.key].cap }}</span>
                  <template v-if="s.key === 'visit' && d.visits">
                    <span class="cap">{{ n(d.visits.newUsers) }} بازدیدکنندهٔ تازه</span>
                    <span v-if="d.visits.channels.length" class="cap" style="margin-top: 4px">{{ d.visits.channels.slice(0, 4).map((c) => (GA_CHANNEL_NAME[c.channel] || c.channel) + ' ' + n(c.sessions)).join(' · ') }}</span>
                  </template>
                </td>
              </tr>
              <tr class="lvrow"><td class="rh"><b>نرخ عبور</b><span class="tag lv">زنده</span></td>
                <td v-for="s in d.stages" :key="s.key">
                  <b style="color: var(--ink)">{{ live[s.key].rate }}<template v-if="live[s.key].rateOf"> <span class="faint">{{ live[s.key].rateOf }}</span></template></b>
                  <template v-if="s.key === d.weakest"><br /><span class="badge st-crit" style="height: 19px; margin-top: 3px"><i class="dot" />ضعیف‌ترین پله</span></template>
                </td>
              </tr>
              <tr><td class="rh"><b>نقطهٔ درد</b><span class="tag">دستی · بازبینی فصلی</span></td><td v-for="s in d.stages" :key="s.key">{{ s.pain }}</td></tr>
              <tr><td class="rh"><b>فرصت بهبود</b><span class="tag">دستی · بازبینی فصلی</span></td><td v-for="s in d.stages" :key="s.key">{{ s.fix }}</td></tr>
              <tr><td class="rh"><b>منبع داده</b></td><td v-for="s in d.stages" :key="s.key"><span class="faint">{{ s.src }}</span></td></tr>
            </tbody>
          </table>
        </div>
        <template #footer><span>تمدید: اشتراک‌هایی که در {{ fa(d.range) }} روز اخیر سررسید شده‌اند</span><router-link to="/funnel">قیف تبدیل</router-link></template>
      </PanelCard>

      <PanelCard title="اولین بیس — پنج راه ساخت" hint="همان پنج گزینهٔ «ایجاد فضای کاری جدید» · راه ساخت روی بیس ذخیره نمی‌شود، پس سهم هر راه هنوز شمردنی نیست" flush>
        <div class="tbl-wrap">
          <table class="tbl jm ways">
            <thead><tr><th class="rh">راه</th><th>کار مشتری</th><th>نقاط تماس</th><th>نقطهٔ درد</th><th>فرصت بهبود</th></tr></thead>
            <tbody>
              <tr v-for="w in stage('firstBase').ways" :key="w.key"><td class="rh"><b>«{{ w.label }}»</b></td><td>{{ w.job }}</td><td>{{ w.touch }}</td><td>{{ w.pain }}</td><td>{{ w.fix }}</td></tr>
            </tbody>
          </table>
        </div>
      </PanelCard>

      <PanelCard title="سه اصطکاک بزرگ" hint="به ترتیب حساب‌های ازدست‌رفته در همین کوهورت" flush>
        <div class="list" style="padding: 0 16px">
          <div v-for="(x, i) in d.drops" :key="x.key" class="li" style="align-items: flex-start">
            <span class="hero" style="font-size: 22px; min-width: 26px; color: var(--faint)">{{ fa(i + 1) }}</span>
            <span class="main" style="white-space: normal">
              <span class="t">«{{ x.from }}» ← «{{ x.to }}»</span>
              <span class="d" style="white-space: normal">{{ stage(x.key).pain }}</span>
              <span class="d" style="white-space: normal; color: var(--ink-2)"><b>اقدام:</b> {{ stage(x.key).fix }}</span>
            </span>
            <span class="end"><b style="font-size: 15px">{{ n(x.lost) }}</b><div class="muted" style="font-size: 11.5px">حساب · {{ pct(x.rate) }} ریزش</div></span>
          </div>
        </div>
        <template #footer><span>از {{ n(K.signup.n) }} ثبت‌نام کوهورت</span><router-link to="/funnel">قیف کامل</router-link></template>
      </PanelCard>
    </template>
  </PageShell>
</template>

<script setup>
import { computed } from 'vue'
import PageShell from 'components/PageShell.vue'
import PanelCard from 'components/PanelCard.vue'
import AppIcon from 'components/AppIcon.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useRange } from 'src/composables/useRange'
import { useQueryParam } from 'src/composables/useUrlState'
import { n, fa, pct } from 'src/lib/format'
import { GA_CHANNEL_NAME } from 'src/lib/refs'

const MATURE = 30
const range = useRange()
const sample = useQueryParam('sample', '')
const load = () => (sample.value ? import('src/api/mock/journey').then((m) => m.journey({ range: range.value })) : api.journey({ range: range.value }))
const { data: d, loading, error } = useAsync(load, [range, sample])
const K = computed(() => { const o = {}; d.value.funnel.forEach((s) => { o[s.key] = s }); return o })
const stage = (key) => d.value.stages.find((s) => s.key === key)
const live = computed(() => {
  const k = K.value, rn = d.value.renew
  return {
    visit: { n: k.visit.n == null ? '—' : n(k.visit.n), cap: k.visit.n == null ? 'هنوز متصل نیست' : 'بازدید در بازهٔ کوهورت', rate: '—' },
    signup: { n: n(k.signup.n), cap: 'ثبت‌نام', rate: pct(k.signup.fromPrev, 1), rateOf: 'از بازدید' },
    firstBase: { n: n(k.firstBase.n), cap: 'بیس ساخته‌اند', rate: pct(k.firstBase.fromPrev) },
    activated: { n: n(k.activated.n), cap: 'فعال شده‌اند', rate: pct(k.activated.fromPrev) },
    habit: { n: n(k.habit.n), cap: 'به عادت رسیده‌اند', rate: pct(k.habit.fromPrev) },
    paid: { n: n(k.paid.n), cap: 'پرداخت کرده‌اند', rate: pct(k.paid.fromPrev) },
    renew: { n: pct(rn.rate), cap: 'تمدید موفق · ' + n(rn.renewed) + ' از ' + n(rn.due), rate: pct(rn.rate), rateOf: 'تمدید' },
  }
})
</script>

<style scoped>
.jm { table-layout: fixed; min-width: 1040px; }
.jm.ways { min-width: 900px; }
.jm th.rh, .jm td.rh { width: 118px; position: sticky; inset-inline-start: 0; background: var(--surface); z-index: 2; border-inline-end: 1px solid var(--grid); }
.jm thead th { white-space: normal; color: var(--ink); font-size: 12.5px; }
.jm thead th .n { display: block; font-size: 10.5px; color: var(--faint); font-weight: 600; }
.jm tbody td { vertical-align: top; font-size: 12px; line-height: 1.75; color: var(--ink-2); }
.jm td.rh b { display: block; color: var(--ink); font-size: 12.3px; }
.jm td.rh .tag { margin-top: 4px; height: auto; padding: 2px 6px; font-size: 10.5px; white-space: normal; line-height: 1.45; }
.jm .tag.lv { background: var(--accent-wash); color: var(--accent-ink); }
.jm tr.lvrow td:not(.rh) { background: var(--surface-2); }
.jm .big { display: block; font-size: 17px; font-weight: 800; color: var(--ink); font-variant-numeric: tabular-nums; line-height: 1.35; }
.jm .cap { display: block; font-size: 11px; color: var(--muted); }
</style>
