<template>
  <PageShell title="ثبت‌نام‌های تازه" sub="هر حساب تازه و قدم‌هایی که برداشته — روی هر ردیف بزنید تا نمای سریع باز شود" range v-model:range="range" :sources="['main', 'behavior']" :loading="loading" :error="error">
    <template v-if="d">
      <div class="kpis six">
        <KpiTile :label="'ثبت‌نام در ' + fa(range) + ' روز'" :to="viewTo('all')" :value="n(k.signups.now)" :delta="{ cur: k.signups.now, prev: k.signups.prev }" :cmp="'قبل: ' + n(k.signups.prev) + (k.signups.joinedAsCollaborator ? ' · ' + fa(k.signups.joinedAsCollaborator) + ' حساب همکار جدا شد' : '')" info="فقط کسانی که خودشان ثبت‌نام کرده‌اند؛ حساب‌هایی که با افزودن همکار به بیس ساخته شده‌اند در هیچ عدد این صفحه نیستند" :spark="{ values: k.signups.spark, bars: true, w: 76 }" />
        <KpiTile label="ساختن اولین بیس" :to="viewTo('base')" :value="pct(k.firstBase.rate)" :info="'سهم ثبت‌نام‌هایی که دست‌کم ' + fa(ACT.days) + ' روز از ثبت‌نامشان گذشته و در همان ' + fa(ACT.days) + ' روز اول بیس ساخته‌اند'" :delta="{ cur: k.firstBase.rate, prev: k.firstBase.prev, points: true }" :cmp="fa(k.firstBase.n) + ' حساب'" />
        <KpiTile label="فعال‌سازی" :to="viewTo('act')" :value="k.activation.rate == null ? '—' : pct(k.activation.rate)"
          :info="'ساختن بیس و ' + fa(ACT.records) + ' رویداد رکورد (ساخت یا ویرایش) در ' + fa(ACT.days) + ' روز اول. فقط حساب‌هایی در مخرج‌اند که دست‌کم ' + fa(ACT.days) + ' روز از ثبت‌نامشان گذشته'"
          :delta="k.activation.rate == null ? null : { cur: k.activation.rate, prev: k.activation.prev, points: true }"
          :cmp="k.activation.rate == null ? 'هنوز هیچ ثبت‌نامی ' + fa(ACT.days) + ' روزه نشده' : 'فقط ' + fa(k.activation.mature) + ' حساب ' + fa(ACT.days) + ' روزه به بالا'" />
        <KpiTile label="میانهٔ زمان تا اولین بیس" :to="viewTo('base')" :value="k.firstBaseDays.median == null ? '—' : k.firstBaseDays.median === 0 ? 'زیر ۱' : n(k.firstBaseDays.median)" :unit="k.firstBaseDays.median == null ? '' : 'روز'"
          info="روزهای بین ثبت‌نام و ساختن اولین بیس، برای حساب‌هایی که بیس ساخته‌اند" :cmp="pct(k.firstBaseDays.sameDay) + ' در ۲۴ ساعت اول'" />
        <KpiTile label="گیر کرده" :value="n(k.stuck.n)" :to="viewTo('stuck')" :info="'دست‌کم ۳ روز از ثبت‌نام گذشته و هنوز فعال نشده (بیس ندارد یا به ' + fa(ACT.records) + ' رویداد رکورد نرسیده)'"
          :cmp="fa(k.stuck.n - k.stuck.lost) + ' هنوز سر می‌زنند · ' + fa(k.stuck.lost) + ' ازدست‌رفته'" />
        <KpiTile label="پرپتانسیل ولی گیر کرده" :value="n(k.highPot.stuck)" :to="viewTo('hpStuck')" :info="'پرپتانسیل: ' + d.hpDef" :cmp="'از ' + fa(k.highPot.total) + ' حساب پرپتانسیل'" />
      </div>

      <div class="grid g-main">
        <PanelCard title="ثبت‌نام روزانه" :hint="'فعال‌سازی تا ' + fa(ACT.days) + ' روز طول می‌کشد؛ ستون‌های هفتهٔ اخیر هنوز کامل نیستند'">
          <ColumnChart :options="signupChart" />
          <div class="legend" style="margin-top: 8px"><span class="k"><i class="sw" style="background: var(--series-1)" />فعال شد</span><span class="k"><i class="sw" style="background: var(--deemph)" />هنوز فعال نشده</span></div>
        </PanelCard>
        <PanelCard title="کجا می‌ایستند" :hint="fa(k.signups.now) + ' ثبت‌نام این بازه'">
          <HBars :items="d.buckets.map((b) => ({ label: BUCKET_LABEL[b.key], value: b.value, note: pct(k.signups.now ? b.value / k.signups.now : 0) }))" :label-width="150" :format="(v) => n(v)" />
        </PanelCard>
      </div>

      <PanelCard id="list" flush style="scroll-margin-top: 70px">
        <DataTable ref="tbl" :remote="signupsPage" :columns="columns" :views="views" default-view="all" :filters="filters" :search="search" :sort="{ key: 'signup', dir: 'asc' }" url :export-name="'onboarding-' + range + 'd'" unit="ثبت‌نام" :on-row="(a) => ui.openAccount(a.id)">
          <template #col-name="{ row }"><AccountCell :a="row"><template #sub>{{ row.sourceName }}<template v-if="row.city"> · {{ row.city }}</template></template></AccountCell></template>
          <template #col-signup="{ row }"><span class="nowrap">{{ date(signupDaysAgo(row)) }}</span><span class="s">{{ agoDays(signupDaysAgo(row)) }}</span></template>
          <template #col-check="{ row }">
            <span class="ck"><template v-for="(x, i) in row.checklist" :key="i"><span v-if="x.s !== 'na'" class="st" :class="x.s" :title="x.l + ' — ' + x.d">{{ x.s === 'done' ? '✓ ' : '' }}{{ STEP_SHORT[i] }}</span></template><span class="sr">{{ tip(row) }}</span></span>
          </template>
          <template #col-status="{ row }"><StatusBadge :status="ST[row.status].cls" :label="ST[row.status].label" /></template>
          <template #col-lastSeen="{ row }"><LastSeen :a="row" /></template>
        </DataTable>
      </PanelCard>
      <div class="note">«پرپتانسیل» یعنی {{ d.hpDef }}. در ستون «قدم‌ها» آبیِ تیک‌دار یعنی انجام شده، خاکستری یعنی انجام نشده و خط‌چین یعنی هنوز وقتش نرسیده. «فعال‌سازی» یعنی در ۷ روز اول بیس ساخته و دست‌کم {{ fa(ACT.records) }} بار رکورد ساخته یا ویرایش کرده؛ «هفتهٔ ۲» یعنی در روزهای ۷ تا ۱۳ بعد از ثبت‌نام دوباره سر زده. نشانگر را روی هر قدم نگه دارید تا جزئیاتش را ببینید.</div>
    </template>
  </PageShell>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import PageShell from 'components/PageShell.vue'
import PanelCard from 'components/PanelCard.vue'
import KpiTile from 'components/KpiTile.vue'
import DataTable from 'components/DataTable.vue'
import AccountCell from 'components/AccountCell.vue'
import StatusBadge from 'components/StatusBadge.vue'
import LastSeen from 'components/LastSeen.vue'
import ColumnChart from 'components/charts/ColumnChart.vue'
import HBars from 'components/charts/HBars.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useRange } from 'src/composables/useRange'
import { useQueryParam } from 'src/composables/useUrlState'
import { useUiStore } from 'stores/ui'
import { n, fa, pct, date, agoDays, weekdayName, signupDaysAgo } from 'src/lib/format'

const ui = useUiStore(), route = useRoute()
const range = useRange()
const viewQ = useQueryParam('view')
const { data: d, loading, error } = useAsync(() => api.onboarding({ range: range.value }), [range])
const k = computed(() => d.value.kpis)
const ACT = computed(() => d.value.activation)

const ST = {
  path: { label: 'در مسیر', cls: 'info', o: 1 },
  stuck: { label: 'گیر کرده', cls: 'warn', o: 0 },
  act: { label: 'فعال شده', cls: 'good', o: 2 },
  lost: { label: 'ازدست‌رفته', cls: 'crit', o: 3 },
  member: { label: 'عضو بیس همکار', cls: 'none', o: 4 },
}
const BUCKET_LABEL = computed(() => ({ noBase: 'بیس نساخته', under: 'بیس دارد، زیر ' + fa(ACT.value.records) + ' رویداد رکورد', noW2: 'فعال شد، هفتهٔ ۲ برنگشت', onTrack: 'در مسیر درست' }))

const signupChart = computed(() => ({
  labels: d.value.daily.map((x) => date(x.daysAgo)), tipLabels: d.value.daily.map((x) => weekdayName(x.daysAgo) + ' ' + date(x.daysAgo)), total: 'ثبت‌نام', height: 210,
  series: [{ name: 'فعال شد', values: d.value.daily.map((x) => x.activated), color: 'var(--series-1)' }, { name: 'هنوز فعال نشده', values: d.value.daily.map((x) => x.pending), color: 'var(--deemph)' }],
}))

/* KPI tiles filter the table in place: they only change the URL, the watcher below applies it */
const viewTo = (v) => ({ query: { ...(route.query.r ? { r: route.query.r } : {}), view: v }, hash: '#list' })
const tbl = ref(null)
const signupsPage = (p) => api.onboardingPage({ ...p, range: range.value })
watch([viewQ, () => route.hash], ([v, hash]) => {
  const st = tbl.value?.st; if (!st) return
  st.view = v || 'all'; st.page = 0; st.focus = -1
  if (hash === '#list') nextTick(() => document.getElementById('list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
})

const STEP_SHORT = ['بیس', 'فعال‌سازی', 'همکار', 'خودکارسازی', 'هفتهٔ ۲']
const tip = (a) => a.checklist.map((x) => (x.s === 'done' ? '✓ ' : x.s === 'wait' ? '… ' : x.s === 'na' ? '? ' : '○ ') + x.l + ' — ' + x.d).join('\n')

const views = [
  { key: 'all', label: 'همه' },
  { key: 'base', label: 'بیس ساخته' },
  { key: 'act', label: 'فعال شده' },
  { key: 'stuck', label: 'گیر کرده' },
  { key: 'hp', label: 'پرپتانسیل' },
  { key: 'hpStuck', label: 'پرپتانسیل گیر کرده' },
]
const search = { placeholder: 'نام یا شمارهٔ موبایل…' }
const filters = computed(() => [
  { key: 'st', param: 'status', label: 'وضعیت', options: Object.keys(ST).map((k) => ({ v: k, l: ST[k].label })) },
  { key: 'src', param: 'source', label: 'منبع', options: [{ v: 'invite', l: 'دعوت همکار' }, { v: 'direct', l: 'مستقیم' }] },
])
const columns = [
  { key: 'name', label: 'حساب', cls: 'nmcol', csv: (a) => a.name },
  { key: 'signup', sortKey: 'signup', label: 'ثبت‌نام', csv: (a) => date(signupDaysAgo(a), { year: true }) },
  { key: 'check', sortKey: 'steps', label: 'قدم‌ها', desc: true, csv: (a) => a.checklist.filter((x) => x.s === 'done').map((x) => x.l).join(' / ') },
  { key: 'status', sortKey: 'status', label: 'وضعیت', csv: (a) => ST[a.status].label },
  { key: 'lastSeen', sortKey: 'lastSeen', label: 'آخرین فعالیت', desc: true, csv: (a) => a.lastSeenDays },
]
</script>

<style scoped>
.ck { display: flex; flex-wrap: wrap; gap: 4px; max-width: 230px; }
.ck .st { font-size: 11px; line-height: 18px; padding: 0 7px; border-radius: 9px; border: 1px solid var(--border-strong); color: var(--muted); white-space: nowrap; }
.ck .st.done { background: var(--accent-wash); border-color: color-mix(in srgb, var(--accent) 45%, transparent); color: var(--accent-ink); font-weight: 700; }
.ck .st.wait { border-style: dashed; color: var(--faint); }
:deep(td.nmcol) { min-width: 170px; }
</style>
