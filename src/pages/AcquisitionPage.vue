<template>
  <PageShell title="منابع جذب" sub="کدام کانال مشتری پرداخت‌کننده می‌آورد، نه فقط ثبت‌نام" range v-model:range="range" :sources="['clarity', 'main']" :loading="loading" :error="error">
    <template v-if="d">
      <div class="kpis">
        <KpiTile label="بازدید سایت" :value="n(k.visits)" :delta="{ cur: k.visits, prev: k.visitsPrev }" :cmp="'قبل: ' + n(k.visitsPrev)" :info="'بازدیدکنندهٔ یکتا در ' + fa(range) + ' روز'" />
        <KpiTile label="ثبت‌نام" :value="n(k.signups)" to="/onboarding" :delta="{ cur: k.signups, prev: k.signupsPrev }" :cmp="'قبل: ' + n(k.signupsPrev)" />
        <KpiTile label="نرخ ثبت‌نام" :value="pct(sr, 1)" info="ثبت‌نام ÷ بازدید" :delta="{ cur: sr, prev: srP, points: true }" :cmp="'قبل: ' + pct(srP, 1)" />
        <KpiTile :label="'هزینهٔ جذب در ' + fa(range) + ' روز'" :value="cp(k.spend).num" :unit="cp(k.spend).unit + ' ' + CURRENCY" info="بودجهٔ ماهانهٔ کانال‌های پولی به نسبت بازه" :cmp="k.paidNames.join('، ')" />
        <KpiTile label="هزینهٔ جذب هر مشتری" :value="k.cac == null ? '—' : cp(k.cac).num" :unit="k.cac == null ? '' : cp(k.cac).unit + ' ' + CURRENCY" info="CAC ترکیبی: کل هزینهٔ ۹۰ روز ÷ همهٔ پرداخت‌کنندگانِ کوهورت بالغ (ثبت‌نام ۳۰ تا ۱۲۰ روز پیش)، از هر منبع" :cmp="n(k.maturePaid) + ' پرداخت‌کننده از ' + n(k.matureSignups) + ' ثبت‌نام'" />
        <KpiTile label="بهترین کانال (نرخ پرداخت)">
          <template #value><span style="font-size: 19px">{{ d.best.name }}</span></template>
          <template #cmp><b style="color: var(--ink)">{{ pct(d.best.paidRate, 1) }}</b> در برابر میانگین {{ pct(k.avgPaidRate, 1) }}</template>
        </KpiTile>
      </div>

      <PanelCard cls="tint-accent">
        <template #title><AppIcon name="target" />پیشنهاد این هفته</template>
        <div class="prose">
          <b>روی «{{ d.best.name }}» بیشتر سرمایه بگذارید:</b> {{ pct(d.best.paidRate, 1) }} از ثبت‌نام‌هایش پرداخت‌کننده شده‌اند، {{ n(ratio, 1) }} برابر میانگین<template v-if="d.best.spend"> و CAC آن {{ money(d.best.cac) }} است.</template><template v-else>، بدون هیچ هزینهٔ تبلیغاتی.</template>
          {{ bestTip }}
          <template v-if="d.worst"><br /><b>«{{ d.worst.name }}» گران‌ترین کانال پولی است:</b> <template v-if="d.worst.paid">هر مشتری پرداخت‌کننده {{ money(d.worst.cac) }} خرج برداشته<template v-if="d.worst.payback"> و {{ n(d.worst.payback, 0) }} ماه طول می‌کشد تا برگردد</template></template><template v-else>در کوهورت بالغ هیچ مشتری پرداخت‌کننده‌ای نیاورده</template>؛ در برابر «{{ d.bestPaid.name }}» با CAC {{ money(d.bestPaid.cac) }}. بودجه‌اش را کم کنید یا هدف‌گیری و صفحهٔ فرود را بازبینی کنید.</template>
        </div>
        <template #footer><span>بر پایهٔ کوهورت بالغ ۹۰ روزه · {{ n(k.matureSignups) }} ثبت‌نام</span><router-link to="/funnel">قیف هر منبع</router-link></template>
      </PanelCard>

      <PanelCard title="کانال‌ها" :hint="'بازدید و ثبت‌نام: ' + fa(range) + ' روز اخیر'" flush cls="t-src">
        <DataTable :rows="d.rows" :columns="columns" export-name="acquisition" unit="کانال" :page-sizes="false" compact :sort="{ key: 'signups', dir: 'desc' }" :on-row="(r) => router.push('/customers?view=all&source=' + r.key)">
          <template #col-name="{ row }"><span class="nm">{{ row.name }}</span><span class="s">{{ row.paidCh ? 'پولی' : 'رایگان' }}</span></template>
          <template #col-visits="{ row }">{{ n(row.visits) }}</template>
          <template #col-signups="{ row }"><b v-if="isBest(row, 'signups')">{{ n(row.signups) }}</b><template v-else>{{ n(row.signups) }}</template></template>
          <template #col-sr="{ row }"><b v-if="isBest(row, 'sr')">{{ pct(row.sr, 1) }}</b><template v-else>{{ pct(row.sr, 1) }}</template></template>
          <template #col-act="{ row }"><b v-if="isBest(row, 'act')">{{ pct(row.act) }}</b><template v-else>{{ pct(row.act) }}</template></template>
          <template #col-paid="{ row }">{{ n(row.paid) }}<span class="faint"> / {{ n(row.mSu) }}</span></template>
          <template #col-pr="{ row }"><b v-if="isBest(row, 'pr')">{{ pct(row.pr, 1) }}</b><template v-else>{{ pct(row.pr, 1) }}</template></template>
          <template #col-mrr="{ row }"><b v-if="isBest(row, 'mrr')">{{ compact(row.mrr) }}</b><template v-else>{{ compact(row.mrr) }}</template></template>
          <template #col-spend="{ row }"><template v-if="row.spend">{{ compact(row.spend) }}</template><span v-else class="faint">—</span></template>
          <template #col-cac="{ row }"><span v-if="row.cac == null" class="faint">—</span><template v-else>{{ compact(row.cac) }}</template></template>
        </DataTable>
        <template #footer><span>✱ کوهورت بالغ: ثبت‌نام‌های ۳۰ تا ۱۲۰ روز پیش؛ پرداخت و MRR به منبعِ ثبت‌نام نسبت داده می‌شود</span><span>روی ردیف بزنید: مشتریان همان منبع</span></template>
      </PanelCard>

      <PanelCard title="ثبت‌نام هفتگی به تفکیک منبع" hint="۱۲ هفتهٔ اخیر">
        <ColumnChart :options="weeklyChart" />
        <div class="legend" style="margin-top: 8px">
          <span v-for="s in d.weekly.series" :key="s.key" class="k"><i class="sw" :style="{ background: s.color }" />{{ s.name }}</span>
          <span class="k faint">({{ d.weekly.restNames.join('، ') }})</span>
        </div>
        <template #footer><span>ستون آخر = هفتهٔ جاری تا امروز</span><router-link to="/onboarding">ثبت‌نام‌های تازه</router-link></template>
      </PanelCard>
      <div class="grid g2">
        <PanelCard title="کیفیت: نرخ فعال‌سازی هر منبع" hint="کوهورت بالغ">
          <HBars :items="bars('activationRate')" :label-width="110" :format="(v) => pct(v, 0)" />
          <template #footer><span>عدد کنار هر میله = حجم ثبت‌نام</span><router-link to="/funnel">قیف تبدیل</router-link></template>
        </PanelCard>
        <PanelCard title="ارزش: نرخ پرداخت هر منبع" hint="کوهورت بالغ">
          <HBars :items="bars('paidRate')" :label-width="110" :format="(v) => pct(v, 1)" />
          <template #footer><span>روی هر منبع بزنید تا قیفش را ببینید</span><router-link to="/retention">نگهداشت</router-link></template>
        </PanelCard>
      </div>
    </template>
  </PageShell>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PageShell from 'components/PageShell.vue'
import PanelCard from 'components/PanelCard.vue'
import KpiTile from 'components/KpiTile.vue'
import AppIcon from 'components/AppIcon.vue'
import DataTable from 'components/DataTable.vue'
import ColumnChart from 'components/charts/ColumnChart.vue'
import HBars from 'components/charts/HBars.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useRange } from 'src/composables/useRange'
import { n, fa, pct, compact, compactParts as cp, money, date, CURRENCY } from 'src/lib/format'

const router = useRouter()
const range = useRange()
const { data: d, loading, error } = useAsync(() => api.acquisition({ range: range.value }), [range])
const k = computed(() => d.value.kpis)
const sr = computed(() => (k.value.visits ? k.value.signups / k.value.visits : 0))
const srP = computed(() => (k.value.visitsPrev ? k.value.signupsPrev / k.value.visitsPrev : 0))
const ratio = computed(() => (k.value.avgPaidRate ? d.value.best.paidRate / k.value.avgPaidRate : 0))
const TIPS = {
  invite: 'دکمهٔ «دعوت همکار» را بعد از ساخت اولین بیس نشان دهید و برای دعوت‌کننده پاداش بگذارید.',
  direct: 'این‌ها Airsheet را از قبل می‌شناسند؛ برنامهٔ معرفی و نمونه‌های موفق مشتریان را تقویت کنید تا این گروه بزرگ‌تر شود.',
  google: 'برای جست‌وجوهای بیشتر، صفحهٔ قالب و محتوای آموزشی صنف‌به‌صنف بسازید.',
}
const bestTip = computed(() => TIPS[d.value.best.key] || (d.value.best.spend ? 'بودجهٔ این کانال را بالا ببرید.' : 'سهم این کانال از محتوا و پیگیری را بالا ببرید.'))

const bestOf = (key) => Math.max(...d.value.rows.map((r) => r[key]))
const isBest = (r, key) => r[key] === bestOf(key) && r[key] > 0
const columns = [
  { key: 'name', label: 'منبع', csv: (r) => r.name },
  { key: 'visits', label: 'بازدید', num: true },
  { key: 'signups', label: 'ثبت‌نام', num: true },
  { key: 'sr', label: 'نرخ ثبت‌نام', num: true, csv: (r) => (r.sr * 100).toFixed(1) },
  { key: 'act', label: 'فعال‌سازی ✱', num: true, csv: (r) => (r.act * 100).toFixed(1) },
  { key: 'paid', label: 'پرداخت‌کننده ✱', num: true, csv: (r) => r.paid },
  { key: 'pr', label: 'نرخ پرداخت ✱', num: true, csv: (r) => (r.pr * 100).toFixed(1) },
  { key: 'mrr', label: 'MRR امروز ✱', num: true },
  { key: 'spend', label: 'هزینه ۹۰ روز ✱', num: true },
  { key: 'cac', label: 'CAC ✱', num: true, sort: (r) => (r.cac == null ? -1 : r.cac), csv: (r) => (r.cac == null ? '' : Math.round(r.cac)) },
]

const weeklyChart = computed(() => {
  const W = d.value.weekly.weeks, wl = []
  for (let w = W - 1; w >= 0; w--) wl.push(date(w * 7 + 6))
  return { labels: wl, tipLabels: wl.map((l, i) => 'هفتهٔ ' + l + (i === W - 1 ? ' (تا امروز)' : '')), series: d.value.weekly.series.map((s) => ({ name: s.name, values: s.values, color: s.color })), total: 'ثبت‌نام', height: 240 }
})
const bars = (key) => d.value.mature.slice().sort((p, q) => q[key] - p[key]).map((s) => ({ label: s.name, value: s[key], note: n(s.signups) + ' ثبت‌نام', to: '/funnel?src=' + s.key }))
</script>

<style scoped>
.t-src :deep(table.tbl) { min-width: 860px; }
</style>
