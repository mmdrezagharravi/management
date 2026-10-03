<template>
  <PageShell title="بیس‌ها" sub="همهٔ بیس‌های ساخته‌شده روی Airsheet — روی هر ردیف بزنید تا جزئیات بیس باز شود" :sources="['main']" :loading="loading" :error="error">
    <template v-if="d">
      <div class="kpis">
        <KpiTile label="کل بیس‌ها" :value="n(k.total)" :cmp="'در ' + n(k.withBases) + ' حساب · میانگین ' + n(k.total / k.withBases, 1) + ' بیس'" />
        <KpiTile label="فعال در ۷ روز" :value="n(k.active7)" info="بیسی که در ۷ روز اخیر دست‌کم یک ویرایش داشته" to="/bases?view=active" :cmp="pct(k.active7 / k.total) + ' از کل بیس‌ها'" />
        <KpiTile label="بیس تازه در ۳۰ روز" :value="n(k.new30)" :delta="{ cur: k.new30, prev: k.new30prev }" :cmp="'۳۰ روز قبل: ' + n(k.new30prev)" />
        <KpiTile label="میانگین رکورد هر بیس فعال" :value="n(k.avgRec)" unit="رکورد" info="فقط بیس‌های فعال در ۷ روز اخیر" :cmp="'میانه: ' + n(k.medRec) + ' — چند بیس بزرگ میانگین را بالا برده‌اند'" />
        <KpiTile label="بیس روی پلنِ نزدیک سقف" :value="n(k.nearBases)" to="/quota?view=records" info="بیس‌هایی که حسابشان ۹۰٪ یا بیشتر از سقف رکورد پلن را پر کرده" :cmp="n(k.nearAcc) + ' حساب به ۹۰٪ سقف رکورد رسیده‌اند — فرصت ارتقا'" />
      </div>

      <div class="grid g2">
        <PanelCard title="پرکارترین بیس‌ها" hint="فعالیت در ۳۰ روز اخیر">
          <HBars :items="d.top.map((r) => ({ label: r.name, sub: r.accountName + ' · ' + compact(r.records) + ' رکورد', value: r.est30, to: '/bases/' + r.id }))" :format="(v) => n(v)" :label-width="150" />
          <template #footer><span>رویدادهای ۳۰ روز اخیر که به این بیس نسبت داده شده</span><router-link to="/bases?view=active">بیس‌های فعال</router-link></template>
        </PanelCard>
        <PanelCard title="توزیع رکورد در هر بیس" hint="تعداد بیس در هر بازه">
          <ColumnChart :options="histChart" />
          <div class="section-title" style="margin: 18px 0 8px">بیس‌ها بر اساس پلن حساب</div>
          <Stack100 :options="planStack" />
          <div class="section-title" style="margin: 18px 0 8px">بیس‌ها بر اساس آخرین فعالیت</div>
          <Stack100 :options="stateStack" />
          <template #footer><span>{{ pct(d.small / k.total) }} بیس‌ها زیر ۱۰۰ رکوردند (بیشتر آزمایشی) · {{ n(d.big) }} بیس بالای ۱۰ هزار</span><router-link to="/bases?sort=records">بزرگ‌ترین‌ها</router-link></template>
        </PanelCard>
      </div>

      <PanelCard flush>
        <DataTable :key="route.query.view + '|' + route.query.sort" :remote="api.basesPage" :columns="columns" :views="views" :filters="filters" :search="search" :sort="{ key: 'records', dir: 'desc' }" url export-name="bases" unit="بیس" :on-row="(r) => router.push('/bases/' + r.id)">
          <template #col-name="{ row }"><router-link class="nm" :to="'/bases/' + row.id">{{ row.name }}</router-link></template>
          <template #col-acc="{ row }"><AccountLink v-if="row.accountId" :id="row.accountId" :name="row.accountName" style="font-weight: 600" /><span v-else class="faint">{{ row.accountName }}</span></template>
          <template #col-plan="{ row }"><PlanBadge :plan="row.plan" /></template>
          <template #col-tables="{ row }">{{ n(row.tables) }}</template>
          <template #col-records="{ row }"><b>{{ n(row.records) }}</b></template>
          <template #col-automations="{ row }"><template v-if="row.automations">{{ n(row.automations) }}</template><span v-else class="faint">—</span></template>
          <template #col-collaborators="{ row }">{{ n(row.collaborators) }}</template>
          <template #col-created="{ row }"><span class="nowrap">{{ date(row.created) }}</span><span class="s">{{ agoDays(row.created) }}</span></template>
          <template #col-la="{ row }"><span class="nowrap" :class="{ faint: row.la > 30 }">{{ agoDays(row.la) }}</span></template>
        </DataTable>
      </PanelCard>
    </template>
  </PageShell>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageShell from 'components/PageShell.vue'
import PanelCard from 'components/PanelCard.vue'
import KpiTile from 'components/KpiTile.vue'
import DataTable from 'components/DataTable.vue'
import AccountLink from 'components/AccountLink.vue'
import PlanBadge from 'components/PlanBadge.vue'
import ColumnChart from 'components/charts/ColumnChart.vue'
import Stack100 from 'components/charts/Stack100.vue'
import HBars from 'components/charts/HBars.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { n, pct, compact, date, agoDays } from 'src/lib/format'
import { PLAN_ORDER } from 'src/lib/refs'
import { PLAN_NAME } from 'src/lib/ui'

const route = useRoute(), router = useRouter()
const { data: d, loading, error } = useAsync(() => api.bases(), [])
const k = computed(() => d.value.kpis)

const histChart = computed(() => ({
  labels: d.value.hist.labels, tipLabels: d.value.hist.tips, xEvery: 1, valueLabels: 'all',
  series: [{ name: 'تعداد بیس', values: d.value.hist.counts }], height: 236,
}))
const planStack = computed(() => ({ parts: d.value.byPlan.map((p) => ({ label: PLAN_NAME[p.plan], value: p.n, color: 'var(--plan-' + p.plan + ')' })), format: (v) => n(v) }))
const stateStack = computed(() => ({
  parts: [
    { label: 'فعال در ۷ روز', value: d.value.byState.active7, color: 'var(--series-1)' },
    { label: '۸ تا ۳۰ روز پیش', value: d.value.byState.mid, color: 'var(--seq-250)' },
    { label: 'بیش از ۳۰ روز', value: d.value.byState.idle, color: 'var(--deemph)' },
  ],
  format: (v) => n(v),
}))

const views = [
  { key: 'all', label: 'همه' },
  { key: 'active', label: 'فعال ۷ روز' },
  { key: 'idle', label: 'بدون فعالیت ۳۰ روز' },
  { key: 'auto', label: 'با خودکارسازی' },
]
const filters = [{ key: 'plan', label: 'پلن', options: PLAN_ORDER.map((k) => ({ v: k, l: PLAN_NAME[k] })) }]
const search = { placeholder: 'نام بیس یا نام حساب…' }
const columns = [
  { key: 'name', sortKey: 'name', label: 'بیس', csv: (r) => r.name },
  { key: 'acc', sortKey: 'creatorName', label: 'حساب', sort: (r) => r.accountName, csv: (r) => r.accountName },
  { key: 'plan', sortKey: 'planRank', label: 'پلن', sort: (r) => PLAN_ORDER.indexOf(r.plan), desc: true, csv: (r) => PLAN_NAME[r.plan] },
  { key: 'tables', sortKey: 'tables', label: 'جدول', num: true },
  { key: 'records', sortKey: 'records', label: 'رکورد', num: true },
  { key: 'automations', sortKey: 'automations', label: 'خودکارسازی', num: true },
  { key: 'collaborators', sortKey: 'collaborators', label: 'همکار', num: true },
  { key: 'created', sortKey: 'createdAt', label: 'ساخته‌شده', sort: (r) => -r.created, desc: true, csv: (r) => r.created },
  { key: 'la', sortKey: 'recent', label: 'آخرین فعالیت', sort: (r) => -r.la, desc: true, csv: (r) => r.la },
]
</script>
