<template>
  <PageShell title="میز فروش" sub="تمدیدها، فرصت‌های ارتقا، بازگرداندنی‌ها و پرداخت‌های ناموفق — روی هر ردیف بزنید تا نمای سریع باز شود" :sources="['wallet', 'main']" :loading="loading" :error="error">
    <template v-if="d">
      <div class="kpis">
        <KpiTile label="تمدید در ۳۰ روز آینده" :value="n(k.r30.n)" unit="مشتری" :to="tabTo('renew')" :cmp="money(k.r30.mrr) + ' در ماه'" />
        <KpiTile label="تمدید در خطر · ۳۰ روز" :value="n(k.r30risk.n)" unit="مشتری" :to="tabTo('renew')" :info="'تمدید در ۳۰ روز آینده با امتیاز سلامت زیر ' + d.risk" :cmp="money(k.r30risk.mrr) + ' · ' + pct(k.r30risk.share) + ' تمدیدها'" />
        <KpiTile label="ارزش فرصت‌های ارتقا" :value="k.upsell.value == null ? n(k.upsell.n) : '+' + cp(k.upsell.value).num" :unit="k.upsell.value == null ? 'حساب' : cp(k.upsell.value).unit + ' ' + CURRENCY" :to="tabTo('upsell')" info="اگر همهٔ حساب‌های آمادهٔ ارتقا یک پله بالا بروند، در ماه" :cmp="(k.upsell.value == null ? 'ارزش ریالی نامشخص' : fa(k.upsell.n) + ' حساب')" />
        <KpiTile label="بازگرداندنی" :value="n(k.winback.n)" unit="مشتری" :to="tabTo('winback')" info="لغو در ۱۲۰ روز اخیر" :cmp="k.winback.lostMrr == null ? 'درآمد ازدست‌رفته نامشخص' : money(k.winback.lostMrr) + ' در ماه از دست رفته'" />
        <KpiTile label="پرداخت ناموفق" :value="n(k.pastdue.n)" unit="مشتری" :to="tabTo('pastdue')" :cmp="money(k.pastdue.mrr) + ' در دورهٔ مهلت'" />
      </div>

      <div class="grid g-main">
        <PanelCard title="تقویم تمدید" hint="۱۳ هفتهٔ آینده · درآمد ماهانه‌ای که سررسید می‌شود · تومان">
          <ColumnChart :options="calChart" />
          <div class="legend" style="margin-top: 8px">
            <span class="k"><i class="sw" style="background: var(--series-1)" />سالم (سلامت {{ fa(d.risk) }} و بالاتر)</span>
            <span class="k"><i class="sw" style="background: var(--critical)" />در خطر (سلامت زیر {{ fa(d.risk) }})</span>
            <span class="faint">اشتراک ماهانه هر ماه یک بار حساب شده</span>
          </div>
          <template #footer><span>{{ fa(d.calendar.nRiskTotal) }} سررسید در خطر · {{ money(d.calendar.riskTotal) }}</span><router-link class="nowrap" :to="tabTo('renew')">فهرست تمدیدها</router-link></template>
        </PanelCard>
        <PanelCard title="این هفته زنگ بزنید" :hint="'تمدید تا ۷ روز دیگر، سلامت زیر ' + fa(d.risk)" flush>
          <div v-if="d.week.rows.length" class="list" style="padding: 0 16px">
            <div v-for="a in d.week.rows.slice(0, 6)" :key="a.id" class="li">
              <span class="main"><AccountLink :id="a.id" :name="a.name" cls="t" /><span class="d">تمدید {{ inDays(a.renewIn) }} · ضعیف در «{{ a.weakest.label }}»</span></span>
              <span class="end"><HealthScore :score="a.health" /><div class="muted" style="font-size: 11.5px; margin-top: 2px">{{ compact(a.mrr) }}</div></span>
            </div>
          </div>
          <div v-else class="empty"><b>تمدید پرخطری در این هفته نیست</b>تقویم را برای هفته‌های بعد ببینید.</div>
          <template #footer><span>{{ fa(d.week.n) }} مشتری · {{ money(d.week.mrr) }}</span><router-link class="nowrap" :to="tabTo('renew')">همه در فهرست</router-link></template>
        </PanelCard>
      </div>

      <!-- old #renew/#pastdue… anchors: land here and switch the tab -->
      <i v-for="key in KEYS" :key="key" :id="key" style="scroll-margin-top: 70px" />
      <section class="card" id="ws" style="scroll-margin-top: 70px">
        <div class="tabs" role="tablist" style="padding: 4px 12px 0">
          <button v-for="key in KEYS" :key="key" role="tab" :class="{ on: key === cur }" :aria-selected="key === cur" @click="tab = key">{{ TABS[key].label }}<span class="n">{{ fa(d.lists[key].length) }}</span></button>
        </div>
        <div class="note" style="padding: 12px 16px 0">
          <template v-if="cur === 'renew'"><b>{{ fa(s.n) }}</b> مشتری تا ۹۰ روز دیگر تمدید می‌کنند؛ <b>{{ fa(s.risk) }}</b> نفرشان سلامت زیر {{ fa(d.risk) }} دارند ({{ money(s.riskMrr) }}). پیش از سررسید تماس بگیرید و دلیل ضعیف‌ترین مؤلفه را بپرسید.</template>
          <template v-else-if="cur === 'upsell'"><b>{{ fa(s.n) }}</b> حساب فعال اکنون به سقف رکورد پلن پایه رسیده‌اند<template v-if="s.value != null"> — ارزش بالقوه {{ money(s.value) }} در ماه</template>. </template>
          <template v-else-if="cur === 'winback'"><b>{{ fa(s.n) }}</b> مشتری در ۱۲۰ روز اخیر لغو کرده‌اند<template v-if="s.lostMrr != null"> ({{ money(s.lostMrr) }} در ماه)</template>. آن‌هایی که به‌خاطر «قیمت بالا» یا «پاسخی نداد» رفته‌اند، بهترین شانس بازگشت را دارند.</template>
          <template v-else-if="cur === 'pastdue'"><b>{{ fa(s.n) }}</b> تمدید پرداخت نشده و اشتراک در دورهٔ مهلت است ({{ money(s.mrr) }} در ماه). امروز تماس بگیرید و نتیجه را ثبت کنید.</template>
          <template v-else-if="cur === 'champions'"><b>{{ fa(s.n) }}</b> مشتری بیش از ۶ ماه پیاپی پرداخت کرده‌اند و سالم‌اند — برای معرفی و نمونهٔ موردی سراغشان بروید. <b>{{ fa(s.monthly) }}</b> نفر هنوز ماهانه می‌پردازند؛ پیشنهاد سالانه<template v-if="d.yearlyDiscount"> ({{ pct(d.yearlyDiscount) }} تخفیف)</template> بدهید.</template>
        </div>
        <DataTable :key="cur" :rows="d.lists[cur]" :columns="TABS[cur].columns" :views="TABS[cur].views" :sort="TABS[cur].sort" :filters="filters" :search="search" select compact :export-name="'sales-' + cur" unit="مشتری" :on-row="(a) => ui.openAccount(a.id)" empty-title="موردی نیست" empty="فیلتر یا جستجو را تغییر دهید.">
          <template #col-name="{ row }">
            <div style="min-width: 150px">
              <AccountCell :a="row">
                <template v-if="cur === 'upsell'" #sub>{{ PLAN_NAME[row.plan] }} · {{ ago(row.lastSeenMin) }}</template>
                <template v-else-if="cur === 'winback'" #sub>{{ PLAN_NAME[row.lostPlan] }} · {{ row.industryName }}</template>
              </AccountCell>
            </div>
          </template>
          <template #col-plan="{ row }"><PlanBadge :plan="row.plan" /><span v-if="row.paying" class="s">{{ CYCLE_NAME[row.cycle] }}</span></template>
          <template #col-mrr="{ row }"><b>{{ compact(row.mrr) }}</b></template>
          <template #col-health="{ row }"><HealthScore :score="row.health" /></template>
          <template #col-renew="{ row }"><span class="nowrap">{{ date(-row.renewIn) }}</span><span class="s">{{ inDays(row.renewIn) }}</span></template>
          <template #col-weak="{ row }"><b>{{ row.weakest.label }}</b><span class="s">{{ fa(row.weakest.value) }} از ۲۰</span></template>
          <template #col-signal="{ row }"><SignalChips :a="row" /></template>
          <template #col-usage="{ row }">
            <div style="min-width: 130px">
              <div class="row between" style="font-size: 11.5px"><span class="muted">{{ row.maxUsage.label }}</span><b class="tnum">{{ pct(Math.min(row.maxUsage.ratio, 9.99)) }}</b></div>
              <div style="height: 5px; border-radius: 3px; background: var(--grid); overflow: hidden; margin-top: 3px"><i style="display: block; height: 100%" :style="{ width: Math.min(100, row.maxUsage.ratio * 100) + '%', background: row.maxUsage.ratio >= 0.95 ? 'var(--critical)' : row.maxUsage.ratio >= 0.8 ? 'var(--warning)' : 'var(--series-1)' }" /></div>
            </div>
          </template>
          <template #col-value="{ row }"><b>{{ row.upgradeValue ? '+' + compact(row.upgradeValue) : '—' }}</b><span v-if="row.upgradeValue" class="s">{{ row.plan === 'basic' ? 'به تیم' : row.plan === 'team' ? 'به کسب و کار' : 'افزایش ظرفیت' }}</span></template>
          <template #col-lost="{ row }"><b>{{ compact(row.lostMrr) }}</b></template>
          <template #col-reason="{ row }"><span class="tag">{{ row.churnReason }}</span></template>
          <template #col-since="{ row }"><span class="nowrap">{{ agoDays(row.churnedAt) }}</span><span class="s">{{ date(row.churnedAt) }}</span></template>
          <template #col-inv="{ row }"><template v-if="row.invT != null"><span class="nowrap">{{ date(row.invT) }}</span><span class="s">{{ agoDays(row.invT) }} · {{ money(row.invAmount) }}</span></template><span v-else class="faint">—</span></template>
          <template #col-follow="{ row }"><span v-if="row.lastNote" class="s" style="max-width: 220px; white-space: normal">{{ row.lastNote }}</span><span v-else class="faint">ثبت نشده</span></template>
          <template #col-act="{ row }"><button class="btn sm" @click="logCall(row, 'pastdue:' + row.id)"><AppIcon name="phone" />ثبت پیگیری</button></template>
        </DataTable>
      </section>
    </template>
  </PageShell>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageShell from 'components/PageShell.vue'
import PanelCard from 'components/PanelCard.vue'
import KpiTile from 'components/KpiTile.vue'
import DataTable from 'components/DataTable.vue'
import AppIcon from 'components/AppIcon.vue'
import AccountCell from 'components/AccountCell.vue'
import AccountLink from 'components/AccountLink.vue'
import PlanBadge from 'components/PlanBadge.vue'
import HealthScore from 'components/HealthScore.vue'
import SignalChips from 'components/SignalChips.vue'
import ColumnChart from 'components/charts/ColumnChart.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useQueryParam } from 'src/composables/useUrlState'
import { useDialogs } from 'src/composables/useDialogs'
import { useUiStore } from 'stores/ui'
import { n, fa, pct, compact, compactParts as cp, money, date, inDays, ago, agoDays, duration, CURRENCY } from 'src/lib/format'
import { PLAN_ORDER, CYCLE_NAME } from 'src/lib/refs'
import { PLAN_NAME, toast } from 'src/lib/ui'

const ui = useUiStore()
const { logCall } = useDialogs()
const { data: d, loading, error } = useAsync(() => api.sales(), [])
const k = computed(() => d.value.kpis)

const tab = useQueryParam('tab', 'renew')
const route = useRoute()
const cur = computed(() => (TABS[tab.value] ? tab.value : 'renew'))
const s = computed(() => d.value.stats[cur.value])
const tabTo = (key) => ({ path: '/sales', query: key === 'renew' ? {} : { tab: key }, hash: '#ws' })

const col = {
  acc: { key: 'name', label: 'مشتری', csv: (a) => a.name },
  plan: { key: 'plan', label: 'پلن', sort: (a) => PLAN_ORDER.indexOf(a.plan) * 1e9 + a.mrr, desc: true, csv: (a) => PLAN_NAME[a.plan] },
  mrr: { key: 'mrr', label: 'درآمد ماهانه', num: true, csv: (a) => a.mrr },
  health: { key: 'health', label: 'سلامت', num: true, csv: (a) => a.health },
}
const TABS = {
  renew: {
    label: 'تمدیدهای ۹۰ روز', sort: { key: 'renew', dir: 'asc' },
    views: [{ key: 'all', label: 'همه', test: null }, { key: 'risk', label: 'سلامت زیر ' + fa(60), test: (a) => a.health < 60 }, { key: 'soon', label: '۱۴ روز آینده', test: (a) => a.renewIn <= 14 }],
    columns: [col.acc, col.plan, col.mrr,
      { key: 'renew', label: 'تمدید', sort: (a) => a.renewIn, csv: (a) => a.renewIn },
      col.health,
      { key: 'weak', label: 'ضعیف‌ترین مؤلفه', sort: (a) => a.weakest.value, csv: (a) => a.weakest.label }],
  },
  upsell: {
    label: 'فرصت ارتقا', sort: { key: 'value', dir: 'desc' },
    views: [{ key: 'all', label: 'همه', test: null }, { key: 'paying', label: 'مشتری پایه', test: (a) => a.paying }],
    columns: [
      { key: 'name', label: 'مشتری', csv: (a) => a.name },
      { key: 'signal', label: 'سیگنال', sort: (a) => (a.atLimit ? 2 : 0) + (a.nearLimit ? 1 : 0), desc: true, csv: (a) => a.atLimit ? 'سقف پر شده' : a.nearLimit ? 'نزدیک سقف' : '' },
      { key: 'usage', label: 'پرمصرف‌ترین سهمیه', num: true, sort: (a) => a.maxUsage.ratio, csv: (a) => a.maxUsage.label + ' ' + Math.round(a.maxUsage.ratio * 100) + '%' },
      { key: 'value', label: 'درآمد بالقوه / ماه', num: true, sort: (a) => a.upgradeValue * 1000 + (a.atLimit ? 1 : 0), csv: (a) => a.upgradeValue }],
  },
  winback: {
    label: 'بازگرداندنی', sort: { key: 'lost', dir: 'desc' },
    columns: [
      { key: 'name', label: 'مشتری', csv: (a) => a.name },
      { key: 'lost', label: 'درآمد ازدست‌رفته', num: true, sort: (a) => a.lostMrr, csv: (a) => a.lostMrr },
      { key: 'reason', label: 'دلیل', csv: (a) => a.churnReason },
      { key: 'tenure', label: 'مدت اشتراک', num: true, sort: (a) => a.tenure, format: (a) => (a.tenure == null ? '—' : duration(a.tenure)), csv: (a) => a.tenure },
      { key: 'since', label: 'از لغو', num: true, sort: (a) => -a.churnedAt, desc: true, csv: (a) => a.churnedAt }],
  },
  pastdue: {
    label: 'پرداخت ناموفق', sort: { key: 'mrr', dir: 'desc' },
    columns: [col.acc, col.mrr,
      { key: 'retries', label: 'تلاش ناموفق', num: true, sort: (a) => a.retries, format: (a) => (a.retries ? fa(a.retries) + ' بار' : '—'), csv: (a) => a.retries },
      { key: 'inv', label: 'صورتحساب ناموفق', sort: (a) => -a.invT, csv: (a) => (a.invT == null ? '' : date(a.invT)) },
      { key: 'follow', label: 'آخرین پیگیری', sort: false, csv: (a) => a.lastNote || '' },
      { key: 'act', label: '', sort: false, csv: false }],
  },
  champions: {
    label: 'وفادار', sort: { key: 'mrr', dir: 'desc' },
    views: [{ key: 'all', label: 'همه', test: null }, { key: 'monthly', label: 'هنوز ماهانه', test: (a) => a.cycle === 'monthly' }],
    columns: [col.acc, col.plan,
      { key: 'tenure', label: 'پرداخت پیاپی', num: true, sort: (a) => a.tenureDays, format: (a) => duration(a.tenureDays), csv: (a) => a.tenureDays },
      col.mrr, col.health],
  },
}
const KEYS = Object.keys(TABS)
// old #renew/#pastdue… hashes still select the tab (TABS must be declared first)
watch(() => route.hash, (h) => { const key = h.slice(1); if (TABS[key]) tab.value = key }, { immediate: true })
const search = { placeholder: 'نام، شخص یا شماره…', text: (a) => a.name + ' ' + a.contact.first + ' ' + a.contact.last + ' ' + a.contact.mobile }
const filters = []

const calChart = computed(() => {
  const c = d.value.calendar, labels = [], tipLabels = []
  for (let k2 = 0; k2 < c.weeks; k2++) { labels.push(date(-(7 * k2 + 1))); tipLabels.push('هفتهٔ ' + date(-(7 * k2 + 1)) + ' تا ' + date(-(7 * k2 + 7))) }
  return { labels, tipLabels, height: 290, total: 'جمع', yFormat: (v) => compact(v), tipFormat: (v) => money(v),
    series: [{ name: 'سالم', values: c.ok, color: 'var(--series-1)' }, { name: 'در خطر', values: c.risk, color: 'var(--critical)' }] }
})

</script>
