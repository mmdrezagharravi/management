<template>
  <PageShell title="نقشهٔ مسیر مشتری" :sub="'از آگاهی تا معرفی — عددها زنده‌اند و با «قیف تبدیل» یکی‌اند (ثبت‌نام‌های ' + fa(MATURE) + ' تا ' + fa(MATURE + range) + ' روز پیش)؛ متن‌ها هر فصل بازبینی می‌شوند'" range v-model:range="range" :sources="['clarity', 'main', 'behavior', 'wallet']" :loading="loading" :error="error">
    <template v-if="d">
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
                  <span v-if="s.key === 'renew'" class="cap" style="margin-top: 4px"><b style="color: var(--ink)">{{ n(d.renew.expanded) }}</b> حساب ارتقا گرفته (۹۰ روز)</span>
                </td>
              </tr>
              <tr class="lvrow"><td class="rh"><b>نرخ عبور</b><span class="tag lv">زنده</span></td>
                <td v-for="s in d.stages" :key="s.key">
                  <b style="color: var(--ink)">{{ live[s.key].rate }}<template v-if="live[s.key].rateOf"> <span class="faint">{{ live[s.key].rateOf }}</span></template></b>
                  <template v-if="s.key === d.weakest"><br /><span class="badge st-crit" style="height: 19px; margin-top: 3px"><i class="dot" />ضعیف‌ترین پله</span></template>
                </td>
              </tr>
              <tr class="lvrow"><td class="rh"><b>زمان میانه</b><span class="tag lv">زنده</span></td>
                <td v-for="s in d.stages" :key="s.key">{{ live[s.key].med }}<template v-if="TR.includes(s.key)"> <span class="faint">پس از ثبت‌نام</span></template></td>
              </tr>
              <tr><td class="rh"><b>نقطهٔ درد</b><span class="tag">دستی · بازبینی فصلی</span></td><td v-for="s in d.stages" :key="s.key">{{ s.pain }}</td></tr>
              <tr><td class="rh"><b>فرصت بهبود</b><span class="tag">دستی · بازبینی فصلی</span></td><td v-for="s in d.stages" :key="s.key">{{ s.fix }}</td></tr>
              <tr><td class="rh"><b>منبع داده</b></td><td v-for="s in d.stages" :key="s.key"><span class="faint">{{ s.src }}</span></td></tr>
            </tbody>
          </table>
        </div>
        <template #footer><span>تمدید: فاکتورهای سررسیدشده در ۹۰ روز اخیر · ارتقا: {{ n(d.renew.expanded) }} از {{ n(d.renew.paying) }} مشتری پرداخت‌کننده</span><router-link to="/funnel">قیف تبدیل</router-link></template>
      </PanelCard>

      <div class="grid g2">
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

        <PanelCard title="مرحلهٔ پیشنهادی: راه‌اندازی همراه">
          <template #actions><span class="badge st-info"><i class="dot" />پیشنهاد</span></template>
          <div class="prose">بین «ثبت‌نام» و «اولین بیس»: کارشناس توسعهٔ کسب‌وکار در یک تماس ۳۰ دقیقه‌ای، اولین بیس را با دادهٔ خود مشتری می‌سازد. الان <b>{{ n(d.assisted.count) }} حساب</b> در دو هفتهٔ اخیر ثبت‌نام کرده‌اند و هنوز بیسی ندارند. با نرخ فعلی «بیس ← فعال‌سازی» ({{ pct(d.assisted.b2a) }})، اگر برای نیمی از آن‌ها بیس ساخته شود، حدود <b>{{ n(d.assisted.gain) }} حساب فعال</b> اضافه می‌شود.</div>
          <div class="section-title" style="margin: 12px 0 2px">تازه‌ترین نامزدها</div>
          <div class="list">
            <div v-for="a in d.assisted.top" :key="a.id" class="li"><span class="main"><AccountLink :id="a.id" :name="a.name" cls="t" /><span class="d">{{ [a.industryName, sourceName(a.source)].filter(Boolean).join(' · ') }}</span></span><span class="end muted">{{ agoDays(a.age) }}</span></div>
          </div>
          <div class="note" style="margin-top: 8px">برای اینکه این مرحله ستون خودش را در نقشه بگیرد، بیسی که کارشناس می‌سازد باید برچسب «ساخت همراه» بخورد تا نرخ فعال‌سازی این مسیر با مسیر معمولی مقایسه شود.</div>
          <template #footer><span></span><router-link to="/onboarding">فهرست کامل در «ثبت‌نام‌های تازه»</router-link></template>
        </PanelCard>
      </div>
    </template>
  </PageShell>
</template>

<script setup>
import { computed } from 'vue'
import PageShell from 'components/PageShell.vue'
import PanelCard from 'components/PanelCard.vue'
import AccountLink from 'components/AccountLink.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useRange } from 'src/composables/useRange'
import { n, fa, pct, agoDays } from 'src/lib/format'
import { sourceName } from 'src/lib/refs'

const MATURE = 30
const TR = ['firstBase', 'activated', 'habit', 'paid']
const range = useRange()
const { data: d, loading, error } = useAsync(() => api.journey({ range: range.value }), [range])
const K = computed(() => { const o = {}; d.value.funnel.forEach((s) => { o[s.key] = s }); return o })
const stage = (key) => d.value.stages.find((s) => s.key === key)
const md = (x) => (x == null ? '—' : fa(x) + ' روز')
const live = computed(() => {
  const k = K.value, R = d.value.range, rn = d.value.renew, rf = d.value.refer
  return {
    visit: { n: n(k.visit.n), cap: 'بازدید در بازهٔ کوهورت', rate: '—', med: '—' },
    signup: { n: n(k.signup.n), cap: 'ثبت‌نام', rate: pct(k.signup.fromPrev, 1), rateOf: 'از بازدید', med: 'همان روز' },
    firstBase: { n: n(k.firstBase.n), cap: 'بیس ساخته‌اند', rate: pct(k.firstBase.fromPrev), med: md(k.firstBase.medianDays) },
    activated: { n: n(k.activated.n), cap: 'فعال شده‌اند', rate: pct(k.activated.fromPrev), med: md(k.activated.medianDays) },
    habit: { n: n(k.habit.n), cap: 'به عادت رسیده‌اند', rate: pct(k.habit.fromPrev), med: md(k.habit.medianDays) },
    paid: { n: n(k.paid.n), cap: 'پرداخت کرده‌اند', rate: pct(k.paid.fromPrev), med: md(k.paid.medianDays) },
    renew: { n: pct(rn.rate), cap: 'تمدید موفق · ' + n(rn.renewed) + ' از ' + n(rn.due), rate: pct(rn.rate), rateOf: 'تمدید', med: '—' },
    refer: { n: n(rf.invited), cap: 'ثبت‌نام با دعوت · ' + fa(R) + ' روز', rate: pct(rf.rate), rateOf: 'از ثبت‌نام‌ها', med: '—' },
  }
})
</script>

<style scoped>
.jm { table-layout: fixed; min-width: 1120px; }
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
