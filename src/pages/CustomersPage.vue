<template>
  <PageShell title="همهٔ مشتریان" :sub="d ? n(d.rows.length) + ' حساب · ' + n(d.rows.filter((a) => a.paying).length) + ' پرداخت‌کننده — روی هر ردیف بزنید تا نمای سریع باز شود' : ''" :sources="['main', 'behavior']" :banner="false" :loading="loading" :error="error">
    <template v-if="d">
      <PanelCard flush>
        <DataTable :rows="d.rows" :columns="columns" :views="views" :default-view="mineKey ? 'mine' : 'paying'" :filters="filters" :search="search" :sort="{ key: 'mrr', dir: 'desc' }" select url export-name="customers" unit="مشتری" :on-row="(a) => ui.openAccount(a.id)">
          <template #col-name="{ row }"><AccountCell :a="row" /></template>
          <template #col-plan="{ row }"><PlanBadge :plan="row.plan" /></template>
          <template #col-mrr="{ row }"><template v-if="row.mrr">{{ compact(row.mrr) }}</template><span v-else class="faint">—</span></template>
          <template #col-health="{ row }"><HealthScore :score="row.health" /></template>
          <template #col-trend="{ row }"><SparkLine :values="row.last30" :w="76" :h="22" bars /></template>
          <template #col-lastSeen="{ row }"><LastSeen :a="row" /></template>
          <template #col-members="{ row }">{{ n(row.activeMembers7) }}<span class="faint"> / {{ n(row.memberCount) }}</span></template>
          <template #col-signal="{ row }"><SignalChips :a="row" /></template>
          <template #col-renew="{ row }">
            <template v-if="row.paying"><span class="nowrap">{{ date(-row.renewIn) }}</span><span class="s">{{ inDays(row.renewIn) }}</span></template>
            <StatusBadge v-else-if="row.churnedAt !== undefined" status="crit" label="لغو شده" /><span v-else class="faint">—</span>
          </template>
          <template #col-owner="{ row }"><RepName :id="row.owner" short /></template>
          <template #bulk="{ rows, done }">
            <select class="select" style="height: 27px; font-size: 12px" @change="assign(rows, $event.target.value, done); $event.target.value = ''">
              <option value="">تعیین مسئول…</option><option v-for="r in REPS" :key="r.id" :value="r.id">{{ r.name }}</option><option value="__none">بدون مسئول</option>
            </select>
          </template>
        </DataTable>
      </PanelCard>
      <div class="note">«روند ۳۰ روز» تعداد ویرایش‌های روزانه است؛ «سیگنال» یعنی برخورد با سقف پلن یا بازدید صفحهٔ قیمت در ۳۰ روز اخیر. ستون‌ها قابل مرتب‌سازی‌اند و فیلترها در نشانی صفحه ذخیره می‌شوند تا بتوانید لینکش را برای همکار بفرستید.</div>
    </template>
  </PageShell>
</template>

<script setup>
import { computed } from 'vue'
import PageShell from 'components/PageShell.vue'
import PanelCard from 'components/PanelCard.vue'
import DataTable from 'components/DataTable.vue'
import AccountCell from 'components/AccountCell.vue'
import PlanBadge from 'components/PlanBadge.vue'
import HealthScore from 'components/HealthScore.vue'
import StatusBadge from 'components/StatusBadge.vue'
import LastSeen from 'components/LastSeen.vue'
import SignalChips from 'components/SignalChips.vue'
import RepName from 'components/RepName.vue'
import SparkLine from 'components/charts/SparkLine.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useUiStore } from 'stores/ui'
import { useSessionStore } from 'stores/session'
import { n, fa, compact, date, inDays } from 'src/lib/format'
import { REPS, PLAN_ORDER, SOURCES } from 'src/lib/refs'
import { PLAN_NAME, BANDS, toast } from 'src/lib/ui'

const ui = useUiStore(), session = useSessionStore()
const mineKey = computed(() => session.repId)
const { data: d, loading, error } = useAsync(() => api.customers(), [])

const views = computed(() => [
  { key: 'paying', label: 'پرداخت‌کننده', test: (a) => a.paying },
  ...(mineKey.value ? [{ key: 'mine', label: 'مشتریان من', test: (a) => a.owner === mineKey.value }] : []),
  { key: 'risk', label: 'در خطر', test: (a) => a.paying && a.health < 50 },
  { key: 'upsell', label: 'آمادهٔ ارتقا', test: (a) => a.segments.includes('upsell') },
  { key: 'pastdue', label: 'پرداخت ناموفق', test: (a) => a.pastDue },
  { key: 'new', label: 'تازه‌وارد (۱۴ روز)', test: (a) => a.age <= 14 },
  { key: 'unassigned', label: 'سرنخ بدون مسئول', test: (a) => (a.paying || a.segments.includes('upsell')) && !a.owner },
  { key: 'active', label: 'فعال در ۳۰ روز', test: (a) => a.lastSeenDays <= 30 },
  { key: 'all', label: 'همه', test: null },
])
const filters = computed(() => [
  { key: 'plan', label: 'پلن', options: PLAN_ORDER.map((k) => ({ v: k, l: PLAN_NAME[k] })), test: (a, v) => a.plan === v },
  { key: 'health', label: 'سلامت', options: BANDS.map((b) => ({ v: b.key, l: b.label })), test: (a, v) => a.band === v },
  { key: 'owner', label: 'مسئول', options: [{ v: 'none', l: 'بدون مسئول' }].concat(REPS.map((r) => ({ v: r.id, l: r.name }))), test: (a, v) => (v === 'none' ? !a.owner : a.owner === v) },
  { key: 'source', label: 'منبع', options: SOURCES.map((s) => ({ v: s.key, l: s.name })), test: (a, v) => a.source === v },
  ...(d.value?.cities?.length ? [{ key: 'city', label: 'شهر', options: d.value.cities.map((c) => ({ v: c, l: c })), test: (a, v) => a.city === v }] : []),
])
const search = { placeholder: 'نام، شخص، شماره یا ایمیل…', text: (a) => a.name + ' ' + a.contact.first + ' ' + a.contact.last + ' ' + a.contact.mobile + ' ' + a.contact.email + ' ' + a.slug }
const repName = (id) => (REPS.find((r) => r.id === id) || {}).name || ''
const columns = [
  { key: 'name', label: 'مشتری', csv: (a) => a.name },
  { key: 'plan', label: 'پلن', sort: (a) => PLAN_ORDER.indexOf(a.plan) * 1e9 + a.mrr, desc: true, csv: (a) => PLAN_NAME[a.plan] },
  { key: 'mrr', label: 'درآمد ماهانه', num: true, csv: (a) => a.mrr },
  { key: 'health', label: 'سلامت', num: true, csv: (a) => a.health },
  { key: 'trend', label: 'روند ۳۰ روز', sort: false, csv: (a) => a.events30 },
  { key: 'lastSeen', label: 'آخرین فعالیت', sort: (a) => -a.lastSeenMin, desc: true, csv: (a) => a.lastSeenDays },
  { key: 'members', label: 'اعضای فعال', num: true, sort: (a) => a.activeMembers7, csv: (a) => a.activeMembers7 + '/' + a.memberCount },
  { key: 'signal', label: 'سیگنال', sort: (a) => (a.pastDue ? 100 : 0) + a.limitHits30 + a.pricingVisits30 * 2, desc: true, csv: (a) => (a.pastDue ? 'پرداخت ناموفق ' : '') + a.limitHits30 + ' سقف / ' + a.pricingVisits30 + ' قیمت' },
  { key: 'renew', label: 'تمدید', sort: (a) => (a.paying ? -a.renewIn : -9999), desc: true, csv: (a) => (a.paying ? a.renewIn : '') },
  { key: 'owner', label: 'مسئول', sort: (a) => a.owner || 'zz', csv: (a) => repName(a.owner) },
]
async function assign(rows, v, done) {
  if (!v) return
  await api.setOwner(rows.map((a) => a.id), v === '__none' ? null : v)
  ui.bump(); toast(fa(rows.length) + ' مشتری به ' + (v === '__none' ? 'بدون مسئول' : repName(v)) + ' داده شد'); done()
}
</script>
