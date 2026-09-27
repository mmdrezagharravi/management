<template>
  <PageShell title="استفاده از قابلیت‌ها" sub="مشتری‌ها از چه چیزی استفاده می‌کنند و کدام قابلیت آن‌ها را نگه می‌دارد" range v-model:range="range" :sources="['behavior']" :loading="loading" :error="error">
    <template v-if="d">
      <div class="kpis">
        <KpiTile :label="'حساب فعال در ' + fa(range) + ' روز'" :value="n(d.active)" info="حسابی که در بازه دست‌کم یک رویداد داشته" :delta="{ cur: d.active, prev: d.activePrev }" :cmp="'قبل: ' + n(d.activePrev)" />
        <KpiTile label="پرکاربردترین قابلیت کلیدی">
          <template #value><span style="font-size: 19px">{{ top.label }}</span></template>
          <template #cmp><b style="color: var(--ink)">{{ pct(top.rate) }}</b> از حساب‌های فعال</template>
        </KpiTile>
        <KpiTile label="بیشترین رشد" info="بیشترین افزایش نفوذ نسبت به بازهٔ هم‌طول قبلی" :delta="{ cur: grow.rate, prev: grow.prevRate, points: true }" :cmp="'اکنون ' + pct(grow.rate)">
          <template #value><span style="font-size: 19px">{{ grow.label }}</span></template>
        </KpiTile>
        <KpiTile label="خودکارسازی" :value="pct(au.rate)" :delta="{ cur: au.rate, prev: au.prevRate, points: true }" :cmp="n(au.users) + ' حساب'" />
        <KpiTile label="هوش مصنوعی" :value="pct(ai.rate)" :delta="{ cur: ai.rate, prev: ai.prevRate, points: true }" :cmp="n(ai.users) + ' حساب'" />
      </div>

      <div class="grid g-main">
        <PanelCard title="نفوذ قابلیت‌ها" :hint="'سهم حساب‌های فعال در ' + fa(range) + ' روز'" flush cls="t-feat">
          <DataTable :rows="d.rows" :columns="columns" export-name="features" unit="قابلیت" :page-sizes="false" compact :sort="{ key: 'rate', dir: 'desc' }">
            <template #col-label="{ row }"><span class="nm">{{ row.label }}</span><span class="s">{{ row.keyFeature ? 'کلیدی' : 'پایه' }}{{ row.gated ? ' · فقط پلن پولی' : '' }}</span></template>
            <template #col-users="{ row }">{{ n(row.users) }}</template>
            <template #col-rate="{ row }"><div class="hb"><span class="tr"><i :style="{ width: (row.rate * 100).toFixed(1) + '%' }" /></span><b>{{ pct(row.rate) }}</b></div></template>
            <template #col-ch="{ row }"><DeltaChip :cur="row.rate" :prev="row.prevRate" points /></template>
            <template #col-pay="{ row }">{{ pct(row.pay) }}</template>
            <template #col-free="{ row }"><span v-if="row.gated" class="faint">—</span><template v-else>{{ pct(row.free) }}</template></template>
          </DataTable>
          <template #footer><span>«تغییر» به واحد درصد، نسبت به {{ fa(range) }} روز قبل</span><router-link to="/segments">دسته‌بندی‌ها</router-link></template>
        </PanelCard>
        <PanelCard title="نفوذ به تفکیک پلن" hint="سهم حساب‌های فعالِ هر پلن">
          <div v-if="!d.planHeat" class="note">این بخش هنوز از بک‌اند داده نمی‌گیرد.</div>
          <div v-else class="tbl-wrap"><div style="min-width: 340px"><HeatMap :options="planHeat" /></div></div>
          <template v-if="opp.length">
            <div class="section-title" style="margin: 16px 0 2px">پرو و سازمانیِ فعالی که هنوز سراغش نرفته‌اند — آموزش دهید</div>
            <div class="list">
              <router-link v-for="g in d.gaps" :key="g.key" class="li" to="/customers?view=paying&plan=business"><span class="main"><span class="t">{{ g.label }}</span><span class="d">کاربرانش {{ n(g.lift, 1) }} برابر بیشتر می‌مانند</span></span><span class="end"><b>{{ n(g.n) }}</b> <span class="muted">از {{ n(d.top2) }}</span></span></router-link>
            </div>
          </template>
          <template #footer><span>خانهٔ کم‌رنگ در پلن پولی = فرصت آموزش</span><router-link to="/customers">همهٔ مشتریان</router-link></template>
        </PanelCard>
      </div>

      <PanelCard title="کدام قابلیت مشتری را نگه می‌دارد؟" hint="نگهداشت هفتهٔ ۱۲ · کاربران در برابر غیرکاربران">
        <div v-if="opp.length" class="banner info" style="margin-bottom: 14px"><AppIcon name="target" /><div>
          <b>{{ names(opp) }}:</b> کاربرانشان در هفتهٔ ۱۲ {{ liftRange(opp) }} برابر بیشتر می‌مانند، ولی هر کدام کمتر از {{ pct(d.medRate) }} حساب‌های فعال را پوشش می‌دهند.
          <template v-if="oppOpen.length">ساخت {{ names(oppOpen) }} را به قدم‌های آنبوردینگ اضافه کنید. </template>
          <template v-if="oppPaid.length">{{ oppPaid.length === opp.length ? 'همه' : names(oppPaid) }} فقط در پلن‌های پولی باز است: به پرداخت‌کننده‌هایی که هنوز سراغشان نرفته‌اند آموزش دهید و در دموی فروش نشانشان دهید.</template>
        </div></div>
        <div v-if="!d.imp.length" class="note">این بخش هنوز از بک‌اند داده نمی‌گیرد.</div>
        <div v-else class="grid g2" style="gap: 24px">
          <div>
            <div class="section-title" style="margin-bottom: 8px">ضریب ماندن (کاربران ÷ غیرکاربران)</div>
            <HBars :items="d.imp.map((x) => ({ label: x.label, sub: pct(x.ad) + ' در برابر ' + pct(x.no), value: x.lift, color: x.opp ? 'var(--series-1)' : 'var(--deemph)' }))" :label-width="100" :value-width="70" :format="(v) => n(v, 1) + ' برابر'" />
            <div class="legend" style="margin-top: 8px"><span class="k"><i class="sw" style="background: var(--series-1)" />اثر زیاد، نفوذ کم — فرصت</span><span class="k"><i class="sw" style="background: var(--deemph)" />سایر قابلیت‌های کلیدی</span></div>
          </div>
          <div>
            <div class="tbl-wrap"><table class="tbl compact">
              <thead><tr><th>قابلیت</th><th class="num">کاربران</th><th class="num">غیرکاربران</th><th class="num">ضریب</th><th class="num">نفوذ فعلی</th></tr></thead>
              <tbody><tr v-for="x in d.imp" :key="x.key">
                <td class="nowrap"><b>{{ x.label }}</b> <span v-if="x.opp" class="badge st-info" style="height: 19px">فرصت</span></td>
                <td class="num"><b>{{ pct(x.ad) }}</b><span class="s">{{ n(x.adN) }} حساب</span></td>
                <td class="num">{{ pct(x.no) }}<span class="s">{{ n(x.noN) }} حساب</span></td>
                <td class="num"><b>{{ n(x.lift, 1) }} برابر</b></td><td class="num">{{ pct(x.rate) }}</td>
              </tr></tbody>
            </table></div>
          </div>
        </div>
        <template #footer><span>غیرکاربران = حساب‌هایی که بیس ساخته‌اند ولی از آن قابلیت استفاده نکرده‌اند؛ همبستگی است، نه اثبات علت</span><router-link to="/onboarding">ثبت‌نام‌های تازه</router-link></template>
      </PanelCard>
    </template>
  </PageShell>
</template>

<script setup>
import { computed } from 'vue'
import PageShell from 'components/PageShell.vue'
import PanelCard from 'components/PanelCard.vue'
import KpiTile from 'components/KpiTile.vue'
import AppIcon from 'components/AppIcon.vue'
import DataTable from 'components/DataTable.vue'
import DeltaChip from 'components/DeltaChip.vue'
import HeatMap from 'components/charts/HeatMap.vue'
import HBars from 'components/charts/HBars.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useRange } from 'src/composables/useRange'
import { n, fa, pct } from 'src/lib/format'

const range = useRange()
const { data: d, loading, error } = useAsync(() => api.features({ range: range.value }), [range])
const NONE = { label: '—', rate: null, prevRate: null, users: null }
const byKey = (k) => (k && d.value.rows.find((f) => f.key.toLowerCase() === k.toLowerCase())) || NONE
const top = computed(() => byKey(d.value.top)), grow = computed(() => byKey(d.value.grow))
const au = computed(() => byKey('automation')), ai = computed(() => byKey('ai'))

const opp = computed(() => d.value.imp.filter((x) => x.opp))
const oppOpen = computed(() => opp.value.filter((x) => !x.gated)), oppPaid = computed(() => opp.value.filter((x) => x.gated))
const names = (list) => list.map((x) => '«' + x.label + '»').join('، ')
const liftRange = (list) => { const l = list.map((x) => x.lift); return n(Math.min(...l), 1) + (l.length > 1 ? ' تا ' + n(Math.max(...l), 1) : '') }

const columns = [
  { key: 'label', label: 'قابلیت', csv: (f) => f.label },
  { key: 'users', label: 'حساب', num: true },
  { key: 'rate', label: 'نفوذ', num: true, csv: (f) => (f.rate * 100).toFixed(1) },
  { key: 'ch', label: 'تغییر', num: true, csv: (f) => (f.ch * 100).toFixed(1) },
  { key: 'pay', label: 'پرداخت‌کننده', num: true, csv: (f) => (f.pay * 100).toFixed(1) },
  { key: 'free', label: 'رایگان', num: true, csv: (f) => (f.free * 100).toFixed(1) },
]

const planHeat = computed(() => ({
  rowHead: 'قابلیت', tipLabel: 'نفوذ', domain: [0, 1],
  cols: d.value.planHeat.plans.map((p) => p.name + ' (' + n(p.n) + ')'),
  rows: d.value.planHeat.rows.map((f) => ({ label: f.label, cells: f.cells, tips: f.counts.map((c, i) => n(c) + ' از ' + n(d.value.planHeat.plans[i].n) + ' حساب') })),
}))
</script>

<style scoped>
.t-feat :deep(table.tbl) { min-width: 620px; }
</style>
