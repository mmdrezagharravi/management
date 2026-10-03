<template>
  <PageShell title="همهٔ مشتریان" :sub="meta ? n(meta.totals.all) + ' حساب · ' + n(meta.totals.paying) + ' پرداخت‌کننده — روی هر ردیف بزنید تا پروفایل کامل باز شود' : ''" :sources="['main', 'behavior']" :banner="false">
    <template v-if="true">
      <PanelCard flush>
        <DataTable :remote="api.customersPage" :columns="columns" :views="views" default-view="paying" :filters="filters" :search="search" :sort="{ key: 'mrr', dir: 'desc' }" url export-name="customers" unit="مشتری" :on-row="(a) => router.push('/customers/' + a.id)" @loaded="(r) => (meta = r)">
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
        </DataTable>
      </PanelCard>
      <div class="note">«روند ۳۰ روز» تعداد کارهای انجام‌شده (ساخت، ویرایش، حذف) در هر روز است؛ «سیگنال» فقط وضعیت قابل‌اثبات فعلی سقف رکورد و خطای پرداخت را نشان می‌دهد. ستون‌ها قابل مرتب‌سازی‌اند و فیلترها در نشانی صفحه ذخیره می‌شوند تا بتوانید لینکش را برای همکار بفرستید.</div>
    </template>
  </PageShell>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PageShell from 'components/PageShell.vue'
import PanelCard from 'components/PanelCard.vue'
import DataTable from 'components/DataTable.vue'
import AccountCell from 'components/AccountCell.vue'
import PlanBadge from 'components/PlanBadge.vue'
import HealthScore from 'components/HealthScore.vue'
import StatusBadge from 'components/StatusBadge.vue'
import LastSeen from 'components/LastSeen.vue'
import SignalChips from 'components/SignalChips.vue'
import SparkLine from 'components/charts/SparkLine.vue'
import { api } from 'src/api'
import { n, compact, date, inDays } from 'src/lib/format'
import { PLAN_ORDER } from 'src/lib/refs'
import { PLAN_NAME, BANDS } from 'src/lib/ui'

const router = useRouter()
const meta = ref(null)

const views = [
  { key: 'paying', label: 'پرداخت‌کننده' },
  { key: 'risk', label: 'در خطر' },
  { key: 'upsell', label: 'آمادهٔ ارتقا' },
  { key: 'pastdue', label: 'پرداخت ناموفق' },
  { key: 'new', label: 'تازه‌وارد (۱۴ روز)' },
  { key: 'active', label: 'فعال در ۳۰ روز' },
  { key: 'online', label: 'آنلاین' },
  { key: 'all', label: 'همه' },
]
const filters = [
  { key: 'plan', label: 'پلن', options: PLAN_ORDER.map((k) => ({ v: k, l: PLAN_NAME[k] })) },
  { key: 'health', param: 'band', label: 'سلامت', options: BANDS.map((b) => ({ v: b.key, l: b.label })) },
  { key: 'source', label: 'منبع', options: [{ v: 'invite', l: 'دعوت همکار' }, { v: 'direct', l: 'مستقیم' }] },
]
const search = { placeholder: 'نام یا شمارهٔ موبایل…' }
const columns = [
  { key: 'name', sortKey: 'name', label: 'مشتری', csv: (a) => a.name },
  { key: 'plan', sortKey: 'planRank', label: 'پلن', sort: (a) => PLAN_ORDER.indexOf(a.plan) * 1e9 + a.mrr, desc: true, csv: (a) => PLAN_NAME[a.plan] },
  { key: 'mrr', sortKey: 'mrr', label: 'درآمد ماهانه', num: true, csv: (a) => a.mrr },
  { key: 'health', sortKey: 'health', label: 'سلامت', num: true, csv: (a) => a.health },
  { key: 'trend', label: 'روند ۳۰ روز', sort: false, csv: (a) => a.events30 },
  { key: 'lastSeen', sortKey: 'lastSeen', label: 'آخرین فعالیت', sort: (a) => -a.lastSeenMin, desc: true, csv: (a) => a.lastSeenDays },
  { key: 'members', sortKey: 'activeMembers', label: 'اعضای فعال', num: true, sort: (a) => a.activeMembers7, csv: (a) => a.activeMembers7 + '/' + a.memberCount },
  { key: 'signal', sortKey: 'signal', label: 'سیگنال', sort: (a) => (a.pastDue ? 4 : 0) + (a.atLimit ? 2 : 0) + (a.nearLimit ? 1 : 0), desc: true, csv: (a) => [a.pastDue && 'پرداخت ناموفق', a.atLimit ? 'سقف پر شده' : a.nearLimit ? 'نزدیک سقف' : ''].filter(Boolean).join('، ') },
  { key: 'renew', sortKey: 'renew', label: 'تمدید', sort: (a) => (a.paying ? -a.renewIn : -9999), desc: true, csv: (a) => (a.paying ? a.renewIn : '') },
]
</script>
