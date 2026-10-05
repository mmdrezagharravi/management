<template>
  <PageShell title="سلامت و ریسک" sub="کدام مشتری پرداخت‌کننده در خطر است، چرا، و قدم بعدی چیست" :sources="['main', 'behavior', 'wallet']" :loading="loading" :error="error">
    <template v-if="d">
      <div class="kpis">
        <KpiTile label="درآمد در خطر" :value="cp(k.riskMrr).num" :unit="cp(k.riskMrr).unit + ' ' + CURRENCY" :to="{ hash: '#risk' }" info="درآمد ماهانهٔ مشتریانی که امتیاز سلامت زیر ۵۰ یا پرداخت ناموفق دارند" :cmp="fa(k.riskCount) + ' مشتری · ' + pct(k.riskMrr / d.totalMrr) + ' کل MRR'" />
        <KpiTile label="میانگین سلامت" info="میانگین امتیاز سلامت مشتریان پرداخت‌کننده" :value="n(k.avg, 1)" unit="از ۱۰۰" :delta="{ cur: k.avg, prev: k.avg2w, abs: true, fmt: (v) => n(v, 1) }" :cmp="'۲ هفته پیش: ' + n(k.avg2w, 1)" />
        <KpiTile label="افت ۱۵+ امتیاز در ۲ هفته" :value="n(k.dropsCount)" unit="مشتری" :to="{ hash: '#movers' }" info="مشتری پرداخت‌کننده‌ای که امتیازش در دو هفته دست‌کم ۱۵ واحد پایین آمده" :cmp="d.hasHistory ? money(k.dropsMrr) + ' در ماه' : 'هنوز سابقهٔ دو هفته‌ای نیست'" />
      </div>

      <div class="kpis">
        <router-link v-for="b in d.bands" :key="b.key" class="kpi" :to="'/customers?health=' + b.key">
          <div class="lab"><StatusBadge :status="b.key" :label="b.label + ' · ' + b.range" /><q-tooltip>امتیاز {{ b.range }}</q-tooltip></div>
          <div class="val">{{ n(b.n) }}<small>مشتری</small></div>
          <div class="foot"><div class="cmp"><DeltaChip :cur="b.n" :prev="b.prev" abs :good-up="b.key === 'good'" /> <span>در ۲ هفته</span><div>{{ money(b.mrr) }} · {{ pct(b.mrr / d.totalMrr) }} MRR</div></div></div>
        </router-link>
      </div>

      <div class="grid g-main">
        <div class="stack">
          <PanelCard title="توزیع سلامت" :hint="fa(d.payingCount) + ' مشتری پرداخت‌کننده'">
            <div class="muted" style="font-size: 11.5px; font-weight: 700; margin-bottom: 6px">بر اساس تعداد مشتری</div>
            <Stack100 :options="distN" />
            <div class="muted" style="font-size: 11.5px; font-weight: 700; margin: 16px 0 6px">بر اساس درآمد ماهانه</div>
            <Stack100 :options="distM" />
            <template #footer><span>{{ pct(k.riskMrr / d.totalMrr) }} درآمد ماهانه زیر ۵۰ یا با پرداخت ناموفق است</span><router-link class="nowrap" :to="{ hash: '#risk' }">فهرست در خطر</router-link></template>
          </PanelCard>
          <PanelCard title="تعداد مشتریان زیر ۵۰" hint="۸ هفتهٔ اخیر · پرداخت‌کننده در همان هفته">
            <LineChart v-if="d.riskN.filter((x) => x != null).length > 1" :options="trend" />
            <div v-else class="note">{{ historyNote }}</div>
            <template #footer><span>{{ trendFoot }}</span><router-link class="nowrap" :to="{ hash: '#movers' }">چه کسانی افت کردند</router-link></template>
          </PanelCard>
        </div>
        <PanelCard title="امتیاز سلامت چطور حساب می‌شود" hint="پنج مؤلفه × ۲۰ = ۱۰۰">
          <div class="muted" style="font-size: 11.5px; margin-bottom: 6px">میانگین هر مؤلفه در مشتریان پرداخت‌کننده</div>
          <div v-for="x in d.compAvg" :key="x.key" style="padding: 5px 0; border-bottom: 1px solid var(--grid)">
            <div class="comp" style="padding: 0"><b style="text-align: start">{{ x.label }}</b><span class="tr"><i :style="{ width: (x.v / 20) * 100 + '%' }" /></span><b>{{ n(x.v, 1) }}</b></div>
            <div class="note" style="line-height: 1.6">{{ x.desc }}</div>
          </div>
          <div class="muted" style="font-size: 11.5px; font-weight: 700; margin: 12px 0 6px">محدوده‌ها</div>
          <div class="row wrap" style="gap: 6px"><span v-for="b in d.bands" :key="b.key" class="row" style="gap: 4px"><StatusBadge :status="b.key" :label="b.label" /><span class="muted" style="font-size: 11.5px">{{ b.range }}</span></span></div>
          <template #footer><span>ضعیف‌ترین مؤلفه در کل: «{{ d.weakAvg.label }}» ({{ n(d.weakAvg.v, 1) }} از ۲۰)</span><router-link class="nowrap" to="/settings">تعریف‌ها</router-link></template>
        </PanelCard>
      </div>

      <PanelCard id="risk" title="مشتریان در خطر" hint="سلامت زیر ۵۰ یا پرداخت ناموفق · بیشترین درآمد بالا" flush style="scroll-margin-top: 70px">
        <DataTable :rows="d.atRisk" :columns="columns" :views="views" :filters="filters" :search="search" :sort="{ key: 'mrr', dir: 'desc' }" url compact export-name="at-risk" unit="مشتری" empty-title="مشتری در خطری با این فیلتر نیست" :on-row="(a) => ui.openAccount(a.id)">
          <template #col-name="{ row }"><div style="min-width: 150px"><AccountCell :a="row" /></div></template>
          <template #col-plan="{ row }"><PlanBadge :plan="row.plan" /></template>
          <template #col-mrr="{ row }"><b>{{ compact(row.mrr) }}</b></template>
          <template #col-health="{ row }"><span class="nowrap"><HealthScore :score="row.health" /> <DeltaChip :cur="row.health" :prev="row.health2wAgo" abs /></span><span v-if="row.pastDue" class="s"><span class="sig due">پرداخت ناموفق</span></span></template>
          <template #col-weak="{ row }"><b>{{ row.weak.label }}</b><span class="s">{{ fa(row.weak.value) }} از ۲۰</span></template>
          <template #col-action="{ row }"><span style="display: block; min-width: 170px; max-width: 240px; font-size: 12px; line-height: 1.6">{{ row.action }}</span></template>
          <template #col-renew="{ row }"><span class="nowrap">{{ inDays(row.renewIn) }}</span><span class="s">{{ date(-row.renewIn) }}</span></template>
        </DataTable>
        <template #footer><span>اقدام پیشنهادی از ضعیف‌ترین مؤلفهٔ هر مشتری می‌آید</span><router-link class="nowrap" to="/sales">تمدیدها در میز فروش</router-link></template>
      </PanelCard>

      <div class="grid g2" id="movers" style="scroll-margin-top: 70px">
        <PanelCard title="بیشترین افت" hint="دو هفتهٔ اخیر" flush>
          <div v-if="d.down.length" class="list" style="padding: 0 16px">
            <div v-for="x in d.down" :key="x.id" class="li"><span class="main"><AccountLink :id="x.id" :name="x.name" cls="t" /><span class="d">{{ n(x.health2wAgo) }} ← {{ n(x.health) }} · {{ PLAN_NAME[x.plan] }} · {{ compact(x.mrr) }}</span></span><span class="end"><DeltaChip :cur="x.health" :prev="x.health2wAgo" abs /><div class="muted" style="font-size: 11px">ضعیف: {{ x.weakLabel }}</div></span></div>
          </div>
          <div v-else class="empty"><b>{{ d.hasHistory ? 'موردی نیست' : historyNote }}</b></div>
          <template #footer><span v-if="d.hasHistory">{{ fa(k.dropsCount) }} مشتری ۱۵ امتیاز یا بیشتر افت کرده‌اند — پیش از رسیدن به زیر ۵۰ تماس بگیرید</span></template>
        </PanelCard>
        <PanelCard title="بیشترین بهبود" hint="دو هفتهٔ اخیر" flush>
          <div v-if="d.up.length" class="list" style="padding: 0 16px">
            <div v-for="x in d.up" :key="x.id" class="li"><span class="main"><AccountLink :id="x.id" :name="x.name" cls="t" /><span class="d">{{ n(x.health2wAgo) }} ← {{ n(x.health) }} · {{ PLAN_NAME[x.plan] }} · {{ compact(x.mrr) }}</span></span><span class="end"><DeltaChip :cur="x.health" :prev="x.health2wAgo" abs /><div class="muted" style="font-size: 11px">{{ x.bandLabel }}</div></span></div>
          </div>
          <div v-else class="empty"><b>{{ d.hasHistory ? 'موردی نیست' : historyNote }}</b></div>
          <template #footer><span>بپرسید چه چیزی کمک کرد؛ همان را به مشتریان مشابه پیشنهاد دهید</span></template>
        </PanelCard>
      </div>
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
import AccountCell from 'components/AccountCell.vue'
import AccountLink from 'components/AccountLink.vue'
import PlanBadge from 'components/PlanBadge.vue'
import StatusBadge from 'components/StatusBadge.vue'
import HealthScore from 'components/HealthScore.vue'
import DeltaChip from 'components/DeltaChip.vue'
import LineChart from 'components/charts/LineChart.vue'
import Stack100 from 'components/charts/Stack100.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useUiStore } from 'stores/ui'
import { n, fa, pct, compact, compactParts as cp, money, date, daysAgo, inDays, CURRENCY } from 'src/lib/format'
import { PLAN_ORDER } from 'src/lib/refs'
import { PLAN_NAME, BAND_COLOR } from 'src/lib/ui'

const ui = useUiStore(), route = useRoute()
const { data: d, loading, error } = useAsync(() => api.health(), [])
const k = computed(() => d.value.kpis)

const parts = (key) => d.value.bands.map((b) => ({ label: b.label, value: key === 'n' ? b.n : b.mrr, color: BAND_COLOR[b.key] }))
const distN = computed(() => ({ parts: parts('n'), format: (v) => n(v) }))
const distM = computed(() => ({ parts: parts('m'), format: (v) => compact(v) }))
const trend = computed(() => {
  const wl = []; for (let w = 7; w >= 0; w--) wl.push(w === 0 ? 'امروز' : date(w * 7))
  return { labels: wl, tipLabels: wl.map((l, i) => (i === 7 ? 'امروز' : 'هفتهٔ ' + l)), height: 190, xTicks: 4, series: [{ name: 'مشتری زیر ۵۰', values: d.value.riskN }], yFormat: (v) => n(v) }
})
const historyNote = computed(() => (d.value.historyFrom ? 'سابقهٔ سلامت از ' + date(daysAgo(d.value.historyFrom)) + ' ذخیره می‌شود؛ مقایسهٔ دوهفته‌ای از دو هفته بعد از آن ممکن است' : 'سابقهٔ سلامت هنوز ذخیره نشده است'))
const trendFoot = computed(() => { const r = d.value.riskN; return r.length < 8 || r[5] == null ? '' : r[7] > r[5] ? fa(r[7] - r[5]) + ' مشتری بیشتر از دو هفته پیش' : r[7] < r[5] ? fa(r[5] - r[7]) + ' مشتری کمتر از دو هفته پیش' : 'بدون تغییر در دو هفته' })

const views = [
  { key: 'all', label: 'همه', test: null },
  { key: 'crit', label: 'بحرانی', test: (a) => a.band === 'crit' },
  { key: 'pastdue', label: 'پرداخت ناموفق', test: (a) => a.pastDue },
  { key: 'renew30', label: 'تمدید ≤۳۰ روز', test: (a) => a.renewIn <= 30 },
]
const search = { placeholder: 'نام مشتری…', text: (a) => a.name + ' ' + a.contact.first + ' ' + a.contact.last }
const filters = []
const columns = [
  { key: 'name', label: 'مشتری', csv: (a) => a.name },
  { key: 'plan', label: 'پلن', sort: (a) => PLAN_ORDER.indexOf(a.plan) * 1e9 + a.mrr, desc: true, csv: (a) => PLAN_NAME[a.plan] },
  { key: 'mrr', label: 'درآمد ماهانه', num: true, csv: (a) => a.mrr },
  { key: 'health', label: 'سلامت', num: true, csv: (a) => a.health },
  { key: 'weak', label: 'ضعیف‌ترین مؤلفه', sort: (a) => a.weak.value, csv: (a) => a.weak.label },
  { key: 'action', label: 'اقدام پیشنهادی', sort: false, csv: (a) => a.action },
  { key: 'renew', label: 'تمدید', num: true, sort: (a) => a.renewIn, csv: (a) => a.renewIn },
]


// #risk / #movers deep links: scroll once the data has rendered
watch(d, async (v) => { if (v && ['#risk', '#movers'].includes(route.hash)) { await nextTick(); const t = document.querySelector(route.hash); if (t) t.scrollIntoView({ block: 'start' }) } })
</script>
