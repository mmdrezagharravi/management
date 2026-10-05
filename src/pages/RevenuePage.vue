<template>
  <PageShell title="درآمد" sub="درآمد ماهانه، جابه‌جایی‌ها و پول دریافتی — هر عدد با بازهٔ هم‌طول قبلی مقایسه شده" range v-model:range="range" :sources="['wallet']" :loading="loading" :error="error">
    <template v-if="d">
      <div class="kpis">
        <KpiTile label="درآمد ماهانه (MRR)" :value="cp(k.mrr.now).num" :unit="cp(k.mrr.now).unit + ' ' + CURRENCY" info="جمع اشتراک‌های فعال به ماه؛ سه‌ماهه و سالانه تقسیم بر تعداد ماه" :delta="{ cur: k.mrr.now, prev: k.mrr.prev }" :cmp="'سالانه (ARR): ' + compact(k.mrr.now * 12)" :spark="{ values: k.mrr.spark, area: true }" />
        <KpiTile label="مشتری پرداخت‌کننده" :value="n(k.paying.now)" to="/customers" :delta="{ cur: k.paying.now, prev: k.paying.prev }" :cmp="'قبل: ' + n(k.paying.prev)" :spark="{ values: k.paying.spark }" />
        <KpiTile label="میانگین درآمد هر مشتری" :value="cp(k.arpa.now).num" :unit="cp(k.arpa.now).unit + ' ' + CURRENCY" info="MRR ÷ مشتریان پرداخت‌کننده" :delta="{ cur: k.arpa.now, prev: k.arpa.prev }" :cmp="'قبل: ' + compact(k.arpa.prev)" />
        <KpiTile label="نگهداشت درآمد (NRR)" :value="pct(k.nrr.now, 1)" info="مشتریانی که ۹۰ روز پیش پرداخت می‌کردند: درآمد امروزشان ÷ درآمد آن روزشان. ارتقا بالا می‌بردش، کاهش و ریزش پایین؛ مشتری جدید حساب نمی‌شود." :delta="{ cur: k.nrr.now, prev: k.nrr.prev, points: true }" :cmp="'۹۰ روز اخیر · قبل: ' + pct(k.nrr.prev, 1)" />
      </div>

      <div class="grid g-main">
        <PanelCard title="جابه‌جایی درآمد ماهانه" hint="۱۲ ماه اخیر · تومان · بالای صفر اضافه شده، پایین صفر از دست رفته">
          <ColumnChart :options="mvChart" />
          <div class="legend" style="margin-top: 8px">
            <span v-for="l in mvLegend" :key="l.label" class="k"><i class="sw" :style="{ background: l.color }" />{{ l.label }} <b style="color: var(--ink)">{{ signed(l.v) }}</b></span>
            <span class="faint">جمع ۱۲ ماه</span>
          </div>
          <template #footer><span>ریزش {{ fa(d.months[d.months.length - 1].churnCount) }} مشتری در ماه جاری</span><router-link class="nowrap" to="/sales?tab=winback">بازگرداندنی‌ها در میز فروش</router-link></template>
        </PanelCard>
        <PanelCard title="روند درآمد ماهانه" hint="MRR در پایان هر ماه · تومان">
          <LineChart :options="mrrChart" />
          <template #footer><span>{{ signedPct(d.months.length > 1 && d.months[0].mrr ? k.mrr.now / d.months[0].mrr - 1 : 0) }} در ۱۲ ماه</span><span>{{ compact(d.months[0].mrr) }} ← {{ compact(k.mrr.now) }}</span></template>
        </PanelCard>
      </div>

      <div class="grid g2">
        <PanelCard title="ترکیب پلن‌ها" hint="سهم هر پلن از MRR">
          <Stack100 :options="{ parts: d.planMix.rows.map((r) => ({ label: PLAN_NAME[r.k], value: r.mrr, color: 'var(--plan-' + r.k + ')' })), format: compact }" />
          <div class="tbl-wrap" style="margin-top: 14px"><table class="tbl compact">
            <thead><tr><th>پلن</th><th class="num">مشتری</th><th class="num">MRR</th><th class="num">هر مشتری</th><th class="num">سهم از MRR</th></tr></thead>
            <tbody>
              <tr v-for="r in d.planMix.rows" :key="r.k"><td><PlanBadge :plan="r.k" /></td><td class="num">{{ n(r.n) }}</td><td class="num"><b>{{ compact(r.mrr) }}</b></td><td class="num">{{ compact(r.arpa) }}</td><td class="num">{{ pct(d.planMix.tm ? r.mrr / d.planMix.tm : 0) }}</td></tr>
              <tr><td class="muted">جمع</td><td class="num muted">{{ n(d.planMix.tn) }}</td><td class="num"><b>{{ compact(d.planMix.tm) }}</b></td><td class="num muted">{{ compact(d.planMix.tn ? d.planMix.tm / d.planMix.tn : 0) }}</td><td class="num muted">۱۰۰٪</td></tr>
            </tbody>
          </table></div>
          <template #footer><span v-if="topPlan">{{ PLAN_NAME[topPlan.k] }} {{ pct(topPlan.mrr / d.planMix.tm) }} درآمد · {{ fa(d.basicUp) }} مشتری پایه آمادهٔ ارتقا</span><span v-else>مشتری پرداخت‌کننده‌ای نیست</span><router-link class="nowrap" to="/sales?tab=upsell">فرصت‌های ارتقا</router-link></template>
        </PanelCard>
        <PanelCard title="دورهٔ پرداخت" hint="ماهانه، سه‌ماهه، سالانه · سهم از MRR">
          <Stack100 :options="{ parts: d.cycMix.rows.map((r) => ({ label: CYCLE_NAME[r.k], value: r.mrr, color: cycColor(r.k) })), format: compact }" />
          <div class="tbl-wrap" style="margin-top: 14px"><table class="tbl compact">
            <thead><tr><th>دوره</th><th class="num">مشتری</th><th class="num">MRR</th><th class="num">هر مشتری</th><th class="num">سهم از MRR</th></tr></thead>
            <tbody>
              <tr v-for="r in d.cycMix.rows" :key="r.k"><td><span class="row" style="gap: 6px"><i class="dot" :style="{ background: cycColor(r.k), borderRadius: '3px' }" /><b>{{ CYCLE_NAME[r.k] }}</b></span></td><td class="num">{{ n(r.n) }}</td><td class="num"><b>{{ compact(r.mrr) }}</b></td><td class="num">{{ compact(r.arpa) }}</td><td class="num">{{ pct(d.cycMix.tm ? r.mrr / d.cycMix.tm : 0) }}</td></tr>
              <tr><td class="muted">جمع</td><td class="num muted">{{ n(d.cycMix.tn) }}</td><td class="num"><b>{{ compact(d.cycMix.tm) }}</b></td><td class="num muted">{{ compact(d.cycMix.tn ? d.cycMix.tm / d.cycMix.tn : 0) }}</td><td class="num muted">۱۰۰٪</td></tr>
            </tbody>
          </table></div>
          <div v-if="d.cycleDiscount" class="note" style="margin-top: 8px">تخفیف: {{ Object.keys(d.cycleDiscount).map((c) => CYCLE_NAME[c] + ' ' + pct(d.cycleDiscount[c])).join(' · ') }} — ARPA دوره‌های بلندتر به همین دلیل پایین‌تر است.</div>
          <template #footer><span>{{ pct(cyc('monthly').n / d.cycMix.tn) }} ماهانه، فقط {{ pct(cyc('yearly').n / d.cycMix.tn) }} سالانه — به وفادارها پیشنهاد سالانه بدهید</span><router-link class="nowrap" to="/sales?tab=champions">مشتریان وفادار</router-link></template>
        </PanelCard>
      </div>

      <div class="grid g2">
        <PanelCard title="پول دریافتی در هر ماه" hint="جمع صورتحساب‌های پرداخت‌شده · تومان">
          <ColumnChart :options="cashChart" />
          <template #footer><span>ماه جاری تا امروز: {{ money(lastCash.amount) }} از {{ n(lastCash.n) }} پرداخت</span><span>سالانه‌ها کل سال را یکجا می‌پردازند</span></template>
        </PanelCard>
        <PanelCard title="تقویم تمدید" hint="۱۳ هفتهٔ آینده · درآمد ماهانه‌ای که سررسید می‌شود · تومان">
          <ColumnChart :options="calChart" />
          <div class="legend" style="margin-top: 8px">
            <span class="k"><i class="sw" style="background: var(--series-1)" />سالم</span>
            <span class="k"><i class="sw" style="background: var(--critical)" />در خطر (سلامت زیر {{ fa(d.risk) }})</span>
          </div>
          <template #footer><span>{{ fa(d.calendar.nRiskTotal) }} سررسید در خطر · {{ money(d.calendar.riskTotal) }}</span><router-link class="nowrap" to="/sales">فهرست تمدیدها در میز فروش</router-link></template>
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
import PlanBadge from 'components/PlanBadge.vue'
import LineChart from 'components/charts/LineChart.vue'
import ColumnChart from 'components/charts/ColumnChart.vue'
import Stack100 from 'components/charts/Stack100.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useRange } from 'src/composables/useRange'
import { n, fa, pct, compact, compactParts as cp, money, signed, signedPct, date, monthLabel, CURRENCY } from 'src/lib/format'
import { CYCLE_NAME } from 'src/lib/refs'
import { PLAN_NAME } from 'src/lib/ui'

const range = useRange()
const { data: d, loading, error } = useAsync(() => api.revenue({ range: range.value }), [range])
const k = computed(() => d.value.kpis)
const cycColor = (c) => 'var(--series-' + (Object.keys(CYCLE_NAME).indexOf(c) + 1) + ')'
const cyc = (c) => d.value.cycMix.rows.find((r) => r.k === c)
const topPlan = computed(() => d.value.planMix.rows.slice().sort((p, q) => q.mrr - p.mrr)[0])
const lastCash = computed(() => d.value.cash[d.value.cash.length - 1])
const mvLegend = computed(() => [
  { color: 'var(--mv-new)', label: 'مشتری جدید', v: d.value.tot12.n }, { color: 'var(--mv-exp)', label: 'ارتقا', v: d.value.tot12.e },
  { color: 'var(--mv-con)', label: 'کاهش', v: d.value.tot12.c }, { color: 'var(--mv-churn)', label: 'ریزش', v: d.value.tot12.ch }])

const mLabels = computed(() => d.value.months.map((m) => monthLabel(m)))
const mTips = computed(() => d.value.months.map((m) => monthLabel(m, true) + (m.end === 0 ? ' (تا امروز)' : '')))
const mvChart = computed(() => ({
  labels: mLabels.value, tipLabels: mTips.value, height: 240, total: 'خالص', hideZero: true, yFormat: (v) => compact(v), tipFormat: (v) => signed(v),
  series: [
    { name: 'مشتری جدید', values: d.value.months.map((m) => m.new), color: 'var(--mv-new)' },
    { name: 'ارتقا', values: d.value.months.map((m) => m.expansion), color: 'var(--mv-exp)' },
    { name: 'کاهش', values: d.value.months.map((m) => m.contraction), color: 'var(--mv-con)' },
    { name: 'ریزش', values: d.value.months.map((m) => m.churn), color: 'var(--mv-churn)' },
  ],
}))
const mrrChart = computed(() => ({
  labels: mLabels.value, tipLabels: mTips.value, height: 240, xTicks: 4,
  series: [{ name: 'MRR', values: d.value.months.map((m) => m.mrr) }], yFormat: (v) => compact(v), endFormat: (v) => compact(v), tipFormat: (v) => money(v),
}))
const cashChart = computed(() => ({
  labels: d.value.cash.map((m) => monthLabel(m)), tipLabels: d.value.cash.map((m) => monthLabel(m, true) + (m.end === 0 ? ' (تا امروز)' : '')),
  height: 220, yFormat: (v) => compact(v), tipFormat: (v) => money(v), valueLabels: 'last', labelFormat: (v) => compact(v),
  series: [{ name: 'دریافتی', values: d.value.cash.map((m) => m.amount), color: 'var(--series-1)' }],
}))

const calChart = computed(() => {
  const c = d.value.calendar, labels = [], tipLabels = []
  for (let w = 0; w < c.weeks; w++) { labels.push(date(-(7 * w + 1))); tipLabels.push('هفتهٔ ' + date(-(7 * w + 1)) + ' تا ' + date(-(7 * w + 7))) }
  return { labels, tipLabels, height: 220, total: 'جمع', yFormat: (v) => compact(v), tipFormat: (v) => money(v),
    series: [{ name: 'سالم', values: c.ok, color: 'var(--series-1)' }, { name: 'در خطر', values: c.risk, color: 'var(--critical)' }] }
})
</script>
