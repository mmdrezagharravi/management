<template>
  <PageShell title="میز فروش" sub="مشتری‌هایی که امروز باید با آن‌ها تماس بگیرید — روی هر ردیف بزنید تا نمای سریع باز شود" :sources="['wallet', 'main']" :loading="loading" :error="error">
    <template v-if="d">
      <div class="kpis">
        <KpiTile v-for="key in KEYS" :key="key" :label="TABS[key].tile" :value="n(k[key].n)" :unit="TABS[key].unit" :info="TABS[key].info" :cmp="TABS[key].cmp()" :to="tabTo(key)" />
      </div>

      <section id="ws" class="card" style="scroll-margin-top: 70px">
        <div class="tabs" role="tablist" style="padding: 4px 12px 0">
          <button v-for="key in KEYS" :key="key" role="tab" :class="{ on: key === cur }" :aria-selected="key === cur" @click="tab = key">{{ TABS[key].label }}<span class="n">{{ fa(d.lists[key].length) }}</span></button>
        </div>
        <div class="note" style="padding: 12px 16px 0">{{ TABS[cur].note() }}</div>
        <DataTable :key="cur" :rows="d.lists[cur]" :columns="TABS[cur].columns" :views="TABS[cur].views" :sort="TABS[cur].sort" :search="search" compact :export-name="'sales-' + cur" unit="مشتری" :on-row="(a) => ui.openAccount(a.id)" empty-title="موردی نیست" empty="فیلتر یا جستجو را تغییر دهید.">
          <template #col-name="{ row }">
            <div style="min-width: 150px">
              <AccountCell :a="row">
                <template v-if="cur === 'upsell'" #sub>آخرین بازدید {{ ago(row.lastSeenMin) }}</template>
                <template v-else-if="cur === 'winback'" #sub>{{ PLAN_NAME[row.lostPlan] }}</template>
                <template v-else-if="cur === 'pastdue'" #sub>{{ PLAN_NAME[row.plan] }} · {{ CYCLE_NAME[row.cycle] }}</template>
              </AccountCell>
            </div>
          </template>
          <template #col-plan="{ row }"><PlanBadge :plan="row.plan" /><span v-if="row.paying" class="s">{{ CYCLE_NAME[row.cycle] }}</span></template>
          <template #col-mrr="{ row }"><b>{{ compact(row.mrr) }}</b></template>
          <template #col-health="{ row }"><HealthScore :score="row.health" /></template>
          <template #col-renew="{ row }"><span class="nowrap">{{ date(-row.renewIn) }}</span><span class="s">{{ inDays(row.renewIn) }}</span></template>
          <template #col-weak="{ row }"><b>{{ row.weakest.label }}</b><span class="s">{{ fa(row.weakest.value) }} از ۲۰</span></template>
          <template #col-usage="{ row }">
            <div style="min-width: 130px">
              <div class="row between" style="font-size: 11.5px"><span class="muted">{{ row.maxUsage.label }}</span><b class="tnum">{{ pct(Math.min(row.maxUsage.ratio, 9.99)) }}</b></div>
              <div style="height: 5px; border-radius: 3px; background: var(--grid); overflow: hidden; margin-top: 3px"><i style="display: block; height: 100%" :style="{ width: Math.min(100, row.maxUsage.ratio * 100) + '%', background: row.maxUsage.ratio >= 0.95 ? 'var(--critical)' : row.maxUsage.ratio >= 0.8 ? 'var(--warning)' : 'var(--series-1)' }" /></div>
            </div>
          </template>
          <template #col-value="{ row }"><b>{{ row.upgradeValue ? '+' + compact(row.upgradeValue) : '—' }}</b><span v-if="row.upgradeValue" class="s">{{ UPGRADE_TO[row.plan] || 'افزایش ظرفیت' }}</span></template>
          <template #col-lost="{ row }"><b>{{ compact(row.lostMrr) }}</b></template>
          <template #col-since="{ row }"><span class="nowrap">{{ agoDays(row.churnedAt) }}</span><span class="s">{{ date(row.churnedAt) }}</span></template>
          <template #col-follow="{ row }"><span v-if="row.lastNote" class="s" style="max-width: 220px; white-space: normal">{{ row.lastNote }}</span><span v-else class="faint">ثبت نشده</span></template>
          <template #col-act="{ row }"><button class="btn small" @click="logCall(row, 'pastdue:' + row.id)"><AppIcon name="phone" />ثبت پیگیری</button></template>
        </DataTable>
      </section>
    </template>
  </PageShell>
</template>

<script setup>
import { computed } from 'vue'
import PageShell from 'components/PageShell.vue'
import KpiTile from 'components/KpiTile.vue'
import DataTable from 'components/DataTable.vue'
import AppIcon from 'components/AppIcon.vue'
import AccountCell from 'components/AccountCell.vue'
import PlanBadge from 'components/PlanBadge.vue'
import HealthScore from 'components/HealthScore.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useQueryParam } from 'src/composables/useUrlState'
import { useDialogs } from 'src/composables/useDialogs'
import { useUiStore } from 'stores/ui'
import { n, fa, pct, compact, money, date, inDays, ago, agoDays, duration } from 'src/lib/format'
import { PLAN_ORDER, CYCLE_NAME } from 'src/lib/refs'
import { PLAN_NAME } from 'src/lib/ui'

const ui = useUiStore()
const { logCall } = useDialogs()
const { data: d, loading, error } = useAsync(() => api.sales(), [])
const k = computed(() => d.value.kpis)

const tab = useQueryParam('tab', 'renew')
const cur = computed(() => (TABS[tab.value] ? tab.value : 'renew'))
const s = computed(() => d.value.stats[cur.value])
const tabTo = (key) => ({ path: '/sales', query: key === 'renew' ? {} : { tab: key }, hash: '#ws' })
const UPGRADE_TO = { basic: 'به تیم', team: 'به کسب و کار' }

const col = {
  acc: { key: 'name', label: 'مشتری', csv: (a) => a.name },
  plan: { key: 'plan', label: 'پلن', sort: (a) => PLAN_ORDER.indexOf(a.plan) * 1e9 + a.mrr, desc: true, csv: (a) => PLAN_NAME[a.plan] },
  mrr: { key: 'mrr', label: 'درآمد ماهانه', num: true, csv: (a) => a.mrr },
  health: { key: 'health', label: 'سلامت', num: true, csv: (a) => a.health },
}
const TABS = {
  renew: {
    label: 'تمدید', tile: 'تمدید در ۳۰ روز آینده', unit: 'مشتری',
    cmp: () => money(k.value.renew.mrr) + ' در ماه · ' + fa(k.value.renew.risk) + ' در خطر',
    get info() { return 'در خطر = سلامت زیر ' + fa(d.value.risk) },
    note: () => fa(s.value.n) + ' مشتری تا ۹۰ روز دیگر تمدید می‌کنند و ' + fa(s.value.risk) + ' نفرشان در خطرند. پیش از سررسید تماس بگیرید.',
    sort: { key: 'renew', dir: 'asc' },
    views: [{ key: 'all', label: 'همه', test: null }, { key: 'risk', label: 'در خطر', test: (a) => a.health < d.value.risk }, { key: 'week', label: 'این هفته', test: (a) => a.renewIn <= 7 }],
    columns: [col.acc, col.plan, col.mrr,
      { key: 'renew', label: 'تمدید', sort: (a) => a.renewIn, csv: (a) => a.renewIn },
      col.health,
      { key: 'weak', label: 'ضعیف‌ترین مؤلفه', sort: (a) => a.weakest.value, csv: (a) => a.weakest.label }],
  },
  upsell: {
    label: 'فرصت ارتقا', tile: 'فرصت ارتقا', unit: 'حساب',
    cmp: () => (k.value.upsell.value ? '+' + money(k.value.upsell.value) + ' در ماه' : 'ارزش ریالی نامشخص'),
    info: 'حساب پلن پایه که به سقف رسیده و در ۱۴ روز اخیر فعال بوده',
    note: () => fa(s.value.n) + ' حساب پلن پایه به سقف رسیده‌اند و هنوز فعال‌اند. پیشنهاد ارتقا بدهید.',
    sort: { key: 'value', dir: 'desc' },
    columns: [col.acc,
      { key: 'usage', label: 'پرمصرف‌ترین سهمیه', num: true, sort: (a) => a.maxUsage.ratio, csv: (a) => a.maxUsage.label + ' ' + Math.round(a.maxUsage.ratio * 100) + '%' },
      { key: 'value', label: 'درآمد بالقوه / ماه', num: true, sort: (a) => a.upgradeValue, csv: (a) => a.upgradeValue }],
  },
  winback: {
    label: 'بازگرداندنی', tile: 'بازگرداندنی', unit: 'مشتری',
    cmp: () => money(k.value.winback.lostMrr) + ' در ماه از دست رفته',
    info: 'تمدید نکرده در ۱۲۰ روز اخیر',
    note: () => fa(s.value.n) + ' مشتری در ۱۲۰ روز اخیر تمدید نکرده‌اند. هرچه زودتر تماس بگیرید، شانس برگشت بیشتر است.',
    sort: { key: 'since', dir: 'asc' },
    columns: [col.acc,
      { key: 'lost', label: 'درآمد ازدست‌رفته', num: true, sort: (a) => a.lostMrr, csv: (a) => a.lostMrr },
      { key: 'tenure', label: 'مدت اشتراک', num: true, sort: (a) => a.tenure, format: (a) => (a.tenure == null ? '—' : duration(a.tenure)), csv: (a) => a.tenure },
      { key: 'since', label: 'از لغو', num: true, sort: (a) => a.churnedAt, csv: (a) => a.churnedAt }],
  },
  pastdue: {
    label: 'پرداخت ناموفق', tile: 'پرداخت ناموفق', unit: 'مشتری',
    cmp: () => money(k.value.pastdue.mrr) + ' در ماه در دورهٔ مهلت',
    info: 'تمدید پرداخت نشده و اشتراک در دورهٔ مهلت است',
    note: () => fa(s.value.n) + ' مشتری تمدید را پرداخت نکرده‌اند. اگر تا پایان مهلت پرداخت نشود، اشتراک لغو می‌شود.',
    sort: { key: 'mrr', dir: 'desc' },
    columns: [col.acc, col.mrr,
      { key: 'follow', label: 'آخرین پیگیری', sort: false, csv: (a) => a.lastNote || '' },
      { key: 'act', label: '', sort: false, csv: false }],
  },
  champions: {
    label: 'وفادار', tile: 'مشتری وفادار', unit: 'مشتری',
    cmp: () => fa(k.value.champions.monthly) + ' نفر هنوز ماهانه می‌پردازند',
    info: 'بیش از ۶ ماه پیاپی پرداخت کرده و سلامت ۸۰ و بالاتر',
    note: () => fa(s.value.n) + ' مشتری بیش از ۶ ماه پیاپی پرداخت کرده‌اند و سالم‌اند. از آن‌ها معرفی بخواهید' + (s.value.monthly ? ' و به ' + fa(s.value.monthly) + ' نفرِ ماهانه پیشنهاد سالانه' + (d.value.yearlyDiscount ? ' (' + pct(d.value.yearlyDiscount) + ' تخفیف)' : '') + ' بدهید.' : '.'),
    sort: { key: 'mrr', dir: 'desc' },
    views: [{ key: 'all', label: 'همه', test: null }, { key: 'monthly', label: 'هنوز ماهانه', test: (a) => a.cycle === 'monthly' }],
    columns: [col.acc, col.plan,
      { key: 'tenure', label: 'پرداخت پیاپی', num: true, sort: (a) => a.tenureDays, format: (a) => duration(a.tenureDays), csv: (a) => a.tenureDays },
      col.mrr, col.health],
  },
}
const KEYS = Object.keys(TABS)
const search = { placeholder: 'نام یا شماره…', text: (a) => a.name + ' ' + a.contact.mobile }
</script>
