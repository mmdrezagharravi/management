<template>
  <PageShell title="درآمد" sub="درآمد ماهانهٔ تکرارشونده، جابه‌جایی‌ها و پول دریافتی — هر عدد با بازهٔ هم‌طول قبلی مقایسه شده" range v-model:range="range" :sources="['wallet']" :loading="loading" :error="error">
    <template v-if="d">
      <div class="kpis">
        <KpiTile label="درآمد ماهانه (MRR)" :value="cp(k.mrr.now).num" :unit="cp(k.mrr.now).unit + ' ' + CURRENCY" info="جمع اشتراک‌های فعال به ماه؛ سه‌ماهه و سالانه تقسیم بر تعداد ماه" :delta="{ cur: k.mrr.now, prev: k.mrr.prev }" :cmp="'قبل: ' + compact(k.mrr.prev)" :spark="{ values: k.mrr.spark, area: true }" />
        <KpiTile label="درآمد سالانه (ARR)" :value="cp(k.mrr.now * 12).num" :unit="cp(k.mrr.now * 12).unit + ' ' + CURRENCY" info="MRR × ۱۲" :delta="{ cur: k.mrr.now * 12, prev: k.mrr.prev == null ? null : k.mrr.prev * 12 }" :cmp="'قبل: ' + (k.mrr.prev == null ? '—' : compact(k.mrr.prev * 12))" />
        <KpiTile :label="'رشد خالص در ' + fa(range) + ' روز'" :value="(k.net.now < 0 ? '−' : '+') + cp(Math.abs(k.net.now)).num" :unit="cp(Math.abs(k.net.now)).unit + ' ' + CURRENCY" info="تغییر MRR در بازه: مشتری جدید + ارتقا − کاهش − ریزش" :delta="{ cur: k.net.now, prev: k.net.prev }" :cmp="k.net.prev == null ? 'بازهٔ قبل در دسترس نیست' : 'بازهٔ قبل: ' + signed(k.net.prev)" />
        <KpiTile label="نگهداشت درآمد (NRR)" :value="pct(k.nrr.now, 1)" info="مشتریانی که ۹۰ روز پیش پرداخت می‌کردند: درآمد امروزشان ÷ درآمد آن روزشان. ارتقا بالا می‌بردش، کاهش و ریزش پایین؛ مشتری جدید حساب نمی‌شود." :delta="{ cur: k.nrr.now, prev: k.nrr.prev, points: true }" :cmp="'۹۰ روز اخیر · قبل: ' + pct(k.nrr.prev, 1)" />
        <KpiTile label="میانگین درآمد هر مشتری" :value="cp(k.arpa.now).num" :unit="cp(k.arpa.now).unit + ' ' + CURRENCY" info="ARPA: MRR ÷ مشتریان پرداخت‌کننده" :delta="{ cur: k.arpa.now, prev: k.arpa.prev }" :cmp="'قبل: ' + compact(k.arpa.prev)" />
        <KpiTile label="مشتری پرداخت‌کننده" :value="n(k.paying.now)" to="/customers" :delta="{ cur: k.paying.now, prev: k.paying.prev }" :cmp="'قبل: ' + n(k.paying.prev)" :spark="{ values: k.paying.spark }" />
      </div>

      <div class="grid g-main">
        <PanelCard title="جابه‌جایی درآمد ماهانه" hint="۱۲ ماه اخیر · تومان · بالای صفر اضافه شده، پایین صفر از دست رفته">
          <ColumnChart :options="mvChart" />
          <div class="legend" style="margin-top: 8px">
            <span v-for="l in mvLegend" :key="l.label" class="k"><i class="sw" :style="{ background: l.color }" />{{ l.label }} <b style="color: var(--ink)">{{ signed(l.v) }}</b></span>
            <span class="faint">جمع ۱۲ ماه</span>
          </div>
          <template #footer><span>ریزش {{ fa(d.months[d.months.length - 1].churnCount) }} مشتری در ماه جاری</span><a class="nowrap" href="#churn">مشتریان ریزش‌کرده</a></template>
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
          <div v-if="d.cycleDiscount" class="note" style="margin-top: 8px">تخفیف: {{ ['quarterly', 'yearly'].map((c) => CYCLE_NAME[c] + ' ' + pct(d.cycleDiscount[c])).join(' · ') }} — ARPA دوره‌های بلندتر به همین دلیل پایین‌تر است.</div>
          <template #footer><span>{{ pct(cyc('monthly').n / d.cycMix.tn) }} ماهانه، فقط {{ pct(cyc('yearly').n / d.cycMix.tn) }} سالانه — به وفادارها پیشنهاد سالانه بدهید</span><router-link class="nowrap" to="/sales?tab=champions">مشتریان وفادار</router-link></template>
        </PanelCard>
      </div>

      <div class="grid g-main">
        <PanelCard title="پول دریافتی در هر ماه" hint="جمع صورتحساب‌های پرداخت‌شده · تومان">
          <ColumnChart :options="cashChart" />
          <template #footer><span>ماه جاری تا امروز: {{ money(lastCash.amount) }} از {{ n(lastCash.n) }} پرداخت</span><span>سالانه‌ها کل سال را یکجا می‌پردازند</span></template>
        </PanelCard>
        <PanelCard title="تمدیدهای پیش رو" hint="درآمد ماهانه‌ای که سررسید می‌شود">
          <div v-for="(b, bi) in d.buckets" :key="b.lo" :style="{ padding: (bi ? '10px' : '2px') + ' 0 10px', borderBottom: bi < d.buckets.length - 1 ? '1px solid var(--grid)' : undefined }">
            <div class="row between"><b style="font-size: 12.8px">{{ BUCKET_LABEL[bi] }}</b><span class="nowrap"><b style="font-size: 16px" class="tnum">{{ compact(b.ok + b.risk) }}</b> <span class="muted" style="font-size: 11.5px">{{ CURRENCY }}</span></span></div>
            <div style="display: flex; gap: 2px; height: 10px; border-radius: 4px; overflow: hidden; margin: 6px 0 4px; background: var(--grid)">
              <i v-if="b.ok" title="سلامت ۵۰ و بالاتر" :style="{ flex: b.ok + ' 1 0', background: 'var(--series-1)' }" />
              <i v-if="b.risk" title="سلامت زیر ۵۰" :style="{ flex: b.risk + ' 1 0', background: 'var(--critical)', minWidth: '3px' }" />
            </div>
            <div class="note">{{ n(b.nOk + b.nRisk) }} سررسید · <b>{{ n(b.nRisk) }}</b> با سلامت زیر ۵۰ ({{ compact(b.risk) }} {{ CURRENCY }})</div>
          </div>
          <div class="legend" style="margin-top: 10px"><span class="k"><i class="sw" style="background: var(--series-1)" />سلامت ۵۰ و بالاتر</span><span class="k"><i class="sw" style="background: var(--critical)" />سلامت زیر ۵۰</span></div>
          <div class="note" style="margin-top: 6px">اشتراک ماهانه در هر بازه یک بار سررسید می‌شود.</div>
          <template #footer><span>{{ compact(d.riskDue) }} {{ CURRENCY }} سررسید در خطر</span><router-link class="nowrap" to="/sales">برنامهٔ تمدید در میز فروش</router-link></template>
        </PanelCard>
      </div>

      <PanelCard id="pastdue" title="پرداخت‌های ناموفق" :hint="fa(d.pastDue.length) + ' مشتری در دورهٔ مهلت · ' + money(sum(d.pastDue, (a) => a.mrr)) + ' در ماه'" flush style="scroll-margin-top: 70px">
        <DataTable :rows="d.pastDue" :columns="pdColumns" export-name="failed-payments" unit="مشتری" :page-sizes="false" compact :sort="{ key: 'mrr', dir: 'desc' }" :on-row="(a) => ui.openAccount(a.id)" empty-title="پرداخت ناموفقی نیست" empty="همهٔ تمدیدها با موفقیت پرداخت شده‌اند.">
          <template #col-name="{ row }"><div style="min-width: 150px"><AccountCell :a="row"><template #sub>{{ PLAN_NAME[row.plan] }} · {{ CYCLE_NAME[row.cycle] }}</template></AccountCell></div></template>
          <template #col-mrr="{ row }"><b>{{ compact(row.mrr) }}</b></template>
          <template #col-retries="{ row }">{{ row.retries ? fa(row.retries) + ' بار' : '—' }}</template>
          <template #col-inv="{ row }"><template v-if="row.invT != null"><span class="nowrap">{{ date(row.invT) }}</span><span class="s">{{ agoDays(row.invT) }} · {{ money(row.invAmount) }}</span></template><span v-else class="faint">—</span></template>
          <template #col-owner="{ row }"><RepName :id="row.owner" short /></template>
          <template #col-follow="{ row }"><span v-if="row.lastNote" class="s" style="max-width: 220px; white-space: normal">{{ row.lastNote }}</span><span v-else class="faint">ثبت نشده</span></template>
          <template #col-act="{ row }"><button class="btn sm" @click="logFollow(row)"><AppIcon name="phone" />ثبت پیگیری</button></template>
        </DataTable>
        <template #footer><span>اگر تا پایان مهلت پرداخت نشود، اشتراک لغو می‌شود — امروز تماس بگیرید</span><router-link class="nowrap" to="/sales?tab=pastdue">در میز فروش</router-link></template>
      </PanelCard>

      <PanelCard id="churn" :title="'ریزش در ' + fa(range) + ' روز اخیر'" :hint="fa(d.churned.length) + ' مشتری' + (d.churned.some((a) => a.lostMrr != null) ? ' · ' + money(sum(d.churned, (a) => a.lostMrr)) + ' درآمد ماهانه از دست رفت' : '')" flush style="scroll-margin-top: 70px">
        <DataTable :rows="d.churned" :columns="chColumns" export-name="churn" unit="مشتری" :page-size="10" :page-sizes="false" compact :sort="{ key: 'when', dir: 'asc' }" :on-row="(a) => ui.openAccount(a.id)" empty-title="در این بازه ریزشی نبوده" empty="بازهٔ بلندتری انتخاب کنید.">
          <template #col-name="{ row }"><div style="min-width: 150px"><AccountCell :a="row"><template #sub>{{ PLAN_NAME[row.lostPlan] }} · {{ row.industryName }}</template></AccountCell></div></template>
          <template #col-when="{ row }"><span class="nowrap">{{ date(row.churnedAt) }}</span><span class="s">{{ agoDays(row.churnedAt) }}</span></template>
          <template #col-lost="{ row }"><b>{{ compact(row.lostMrr) }}</b></template>
          <template #col-reason="{ row }"><span class="tag">{{ row.churnReason }}</span></template>
          <template #col-tenure="{ row }">{{ row.tenure == null ? '—' : duration(row.tenure) }}</template>
          <template #col-owner="{ row }"><RepName :id="row.owner" short /></template>
        </DataTable>
        <template #footer><span>{{ d.topReason ? 'بیشترین دلیل: «' + d.topReason.reason + '» (' + fa(d.topReason.n) + ' مشتری)' : 'در این بازه ریزشی نبوده' }}</span><router-link class="nowrap" to="/sales?tab=winback">فهرست بازگرداندنی‌ها</router-link></template>
      </PanelCard>
    </template>
  </PageShell>
</template>

<script setup>
import { computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import PageShell from 'components/PageShell.vue'
import PanelCard from 'components/PanelCard.vue'
import KpiTile from 'components/KpiTile.vue'
import DataTable from 'components/DataTable.vue'
import AppIcon from 'components/AppIcon.vue'
import AccountCell from 'components/AccountCell.vue'
import PlanBadge from 'components/PlanBadge.vue'
import RepName from 'components/RepName.vue'
import LineChart from 'components/charts/LineChart.vue'
import ColumnChart from 'components/charts/ColumnChart.vue'
import Stack100 from 'components/charts/Stack100.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useRange } from 'src/composables/useRange'
import { useDialogs } from 'src/composables/useDialogs'
import { useUiStore } from 'stores/ui'
import { n, fa, pct, compact, compactParts as cp, money, signed, signedPct, date, agoDays, duration, monthLabel, CURRENCY } from 'src/lib/format'
import { REPS, CYCLE_NAME } from 'src/lib/refs'
import { PLAN_NAME } from 'src/lib/ui'

const ui = useUiStore(), route = useRoute(), dialogs = useDialogs()
const range = useRange()
const { data: d, loading, error } = useAsync(() => api.revenue({ range: range.value }), [range])
const k = computed(() => d.value.kpis)
const sum = (list, f) => list.reduce((t, a) => t + f(a), 0)
const cycColor = (c) => 'var(--series-' + (['monthly', 'quarterly', 'yearly'].indexOf(c) + 1) + ')'
const cyc = (c) => d.value.cycMix.rows.find((r) => r.k === c)
const topPlan = computed(() => d.value.planMix.rows.slice().sort((p, q) => q.mrr - p.mrr)[0])
const lastCash = computed(() => d.value.cash[d.value.cash.length - 1])
const BUCKET_LABEL = ['۳۰ روز آینده', '۳۱ تا ۶۰ روز', '۶۱ تا ۹۰ روز']
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

const repName = (id) => (REPS.find((r) => r.id === id) || {}).name || ''
const pdColumns = [
  { key: 'name', label: 'مشتری', csv: (a) => a.name },
  { key: 'mrr', label: 'درآمد ماهانه', num: true, csv: (a) => a.mrr },
  { key: 'retries', label: 'تلاش ناموفق', num: true, csv: (a) => a.retries },
  { key: 'inv', label: 'آخرین صورتحساب', sort: (a) => -a.invT, csv: (a) => (a.invT == null ? '' : date(a.invT)) },
  { key: 'owner', label: 'مسئول', sort: (a) => a.owner || 'zz', csv: (a) => repName(a.owner) },
  { key: 'follow', label: 'آخرین پیگیری', sort: false, csv: (a) => a.lastNote || '' },
  { key: 'act', label: '', sort: false, csv: false },
]
const chColumns = [
  { key: 'name', label: 'مشتری', csv: (a) => a.name },
  { key: 'when', label: 'تاریخ لغو', sort: (a) => a.churnedAt, csv: (a) => date(a.churnedAt) },
  { key: 'lost', label: 'درآمد ازدست‌رفته', num: true, sort: (a) => a.lostMrr, csv: (a) => a.lostMrr },
  { key: 'reason', label: 'دلیل', sort: (a) => a.churnReason, csv: (a) => a.churnReason },
  { key: 'tenure', label: 'مدت اشتراک', num: true, csv: (a) => a.tenure },
  { key: 'owner', label: 'مسئول', sort: (a) => a.owner || 'zz', csv: (a) => repName(a.owner) },
]
async function logFollow(a) { if (await dialogs.logCall(a, 'pastdue:' + a.id)) ui.bump() }

/* deep links revenue#pastdue / #churn scroll to their card once the data is in */
const stop = watch(d, (v) => { if (!v) return; stop(); if (['#pastdue', '#churn'].includes(route.hash)) nextTick(() => document.querySelector(route.hash)?.scrollIntoView({ block: 'start' })) })
</script>
