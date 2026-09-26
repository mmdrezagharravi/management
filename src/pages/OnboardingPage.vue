<template>
  <PageShell title="ثبت‌نام‌های تازه" sub="هر حساب تازه، قدم‌هایی که برداشته و قدم بعدی پیشنهادی — روی هر ردیف بزنید تا نمای سریع باز شود" range v-model:range="range" :sources="['main', 'behavior']" :loading="loading" :error="error">
    <template v-if="d">
      <div class="kpis">
        <KpiTile :label="'ثبت‌نام در ' + fa(range) + ' روز'" :value="n(k.signups.now)" :delta="{ cur: k.signups.now, prev: k.signups.prev }" :cmp="'قبل: ' + n(k.signups.prev)" :spark="{ values: k.signups.spark, bars: true, w: 76 }" />
        <KpiTile label="ساختن اولین بیس" :value="pct(k.firstBase.rate)" info="سهم ثبت‌نام‌های این بازه که دست‌کم یک بیس ساخته‌اند" :delta="{ cur: k.firstBase.rate, prev: k.firstBase.prev, points: true }" :cmp="fa(k.firstBase.n) + ' حساب'" />
        <KpiTile label="فعال‌سازی" :value="k.activation.rate == null ? '—' : pct(k.activation.rate)"
          :info="'رسیدن به ' + fa(ACT.records) + ' رکورد در ' + fa(ACT.days) + ' روز اول. فقط حساب‌هایی در مخرج‌اند که دست‌کم ' + fa(ACT.days) + ' روز از ثبت‌نامشان گذشته'"
          :delta="k.activation.rate == null ? null : { cur: k.activation.rate, prev: k.activation.prev, points: true }"
          :cmp="k.activation.rate == null ? 'هنوز هیچ ثبت‌نامی ' + fa(ACT.days) + ' روزه نشده' : 'فقط ' + fa(k.activation.mature) + ' حساب ' + fa(ACT.days) + ' روزه به بالا'" />
        <KpiTile label="میانهٔ زمان تا اولین بیس" :value="k.firstBaseDays.median == null ? '—' : k.firstBaseDays.median === 0 ? 'همان روز' : n(k.firstBaseDays.median)" :unit="k.firstBaseDays.median ? 'روز' : ''"
          info="روزهای بین ثبت‌نام و ساختن اولین بیس، برای حساب‌هایی که بیس ساخته‌اند" :cmp="pct(k.firstBaseDays.sameDay) + ' همان روز ثبت‌نام'" />
        <KpiTile label="گیر کرده" :value="n(k.stuck.n)" :to="viewTo('stuck')" :info="'دست‌کم ۳ روز از ثبت‌نام گذشته و هنوز فعال نشده (بیس ندارد یا به ' + fa(ACT.records) + ' رکورد نرسیده)'"
          :cmp="fa(k.stuck.n - k.stuck.lost) + ' هنوز سر می‌زنند · ' + fa(k.stuck.lost) + ' ازدست‌رفته'" />
        <KpiTile label="پرپتانسیل ولی گیر کرده" :value="n(k.highPot.stuck)" :to="viewTo('hp')" :info="'پرپتانسیل: ' + d.hpDef" :cmp="'از ' + fa(k.highPot.total) + ' حساب پرپتانسیل · تماس خوشامد'" />
      </div>

      <div class="grid g-main">
        <PanelCard title="ثبت‌نام روزانه" :hint="'فعال‌سازی تا ' + fa(ACT.days) + ' روز طول می‌کشد؛ ستون‌های هفتهٔ اخیر هنوز کامل نیستند'">
          <ColumnChart :options="signupChart" />
          <div class="legend" style="margin-top: 8px"><span class="k"><i class="sw" style="background: var(--series-1)" />فعال شد</span><span class="k"><i class="sw" style="background: var(--deemph)" />هنوز فعال نشده</span></div>
        </PanelCard>
        <PanelCard title="کجا می‌ایستند" :hint="fa(d.rows.length) + ' ثبت‌نام این بازه'">
          <HBars :items="d.buckets.map((b) => ({ label: BUCKET_LABEL[b.key], value: b.value, note: pct(d.rows.length ? b.value / d.rows.length : 0) }))" :label-width="150" :format="(v) => n(v)" />
          <template v-if="d.steps.length">
            <div class="muted" style="font-size: 11.5px; font-weight: 700; margin: 14px 0 2px">کارهای باز، به ترتیب تعداد</div>
            <div class="list">
              <router-link v-for="s in d.steps" :key="s.key" class="li" :to="nxTo(s.key)"><span class="main"><span class="t">{{ s.label }}</span></span><span class="end"><b>{{ fa(s.n) }}</b> حساب</span><AppIcon name="chevronL" cls="faint" /></router-link>
            </div>
          </template>
          <div v-else class="note" style="margin-top: 12px">کار بازی برای این بازه نمانده.</div>
        </PanelCard>
      </div>

      <PanelCard id="list" flush style="scroll-margin-top: 70px">
        <DataTable ref="tbl" :rows="d.rows" :columns="columns" :views="views" default-view="all" :filters="filters" :search="search" :sort="{ key: 'signup', dir: 'asc' }" url select :export-name="'onboarding-' + range + 'd'" unit="ثبت‌نام" :row-class="(a) => (a.done ? 'onb-done' : '')" :on-row="(a) => ui.openAccount(a.id)">
          <template #col-name="{ row }"><AccountCell :a="row"><template #sub>{{ row.sourceName }}<template v-if="row.city"> · {{ row.city }}</template></template></AccountCell></template>
          <template #col-signup="{ row }"><span class="nowrap">{{ date(row.age) }}</span><span class="s">{{ agoDays(row.age) }}</span></template>
          <template #col-check="{ row }">
            <span class="ck" :title="tip(row)"><i v-for="(x, i) in row.checklist" :key="i" :class="x.s" :title="x.l + ' — ' + x.d" /><b>{{ fa(doneCount(row)) }}/{{ fa(row.checklist.filter((x) => x.s !== 'na').length) }}</b><span class="sr">{{ tip(row) }}</span></span>
          </template>
          <template #col-status="{ row }"><StatusBadge :status="ST[row.status].cls" :label="ST[row.status].label" /></template>
          <template #col-lastSeen="{ row }"><LastSeen :a="row" /></template>
          <template #col-next="{ row }">
            <span :style="{ fontWeight: row.next.key === 'wait' ? 400 : 600, color: row.next.key === 'wait' ? 'var(--muted)' : undefined, textDecoration: row.done ? 'line-through' : undefined }">{{ row.next.text }}</span>
            <span v-if="row.highPot" class="s">پرپتانسیل</span>
          </template>
          <template #col-owner="{ row }"><RepName :id="row.owner" short /></template>
          <template #col-done="{ row }">
            <button v-if="row.done" class="btn sm ghost good" title="برگرداندن به کارهای باز" @click="setDone(row, false)"><AppIcon name="check" />انجام شد</button>
            <button v-else-if="row.next.key !== 'wait'" class="btn sm" @click="setDone(row, true)"><AppIcon name="check" />انجام شد</button>
          </template>
          <template #bulk="{ rows, done }">
            <select class="select" style="height: 27px; font-size: 12px" @change="assign(rows, $event.target.value, done); $event.target.value = ''">
              <option value="">تعیین مسئول…</option><option v-for="r in REPS" :key="r.id" :value="r.id">{{ r.name }}</option><option value="__none">بدون مسئول</option>
            </select>
          </template>
        </DataTable>
      </PanelCard>
      <div class="note">«پرپتانسیل» یعنی {{ d.hpDef }}. نقطه‌ها به ترتیب: بیس، {{ fa(ACT.records) }} رکورد، دعوت همکار، اتوماسیون، بازگشت در هفتهٔ ۲ — نقطهٔ خط‌چین یعنی هنوز وقتش نرسیده، نقطهٔ کم‌رنگ یعنی داده‌ای برایش نداریم. «انجام شد» فقط در همین مرورگر ذخیره می‌شود.</div>
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
import AppIcon from 'components/AppIcon.vue'
import AccountCell from 'components/AccountCell.vue'
import StatusBadge from 'components/StatusBadge.vue'
import LastSeen from 'components/LastSeen.vue'
import RepName from 'components/RepName.vue'
import ColumnChart from 'components/charts/ColumnChart.vue'
import HBars from 'components/charts/HBars.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useRange } from 'src/composables/useRange'
import { useQueryParam } from 'src/composables/useUrlState'
import { useUiStore } from 'stores/ui'
import { n, fa, pct, date, agoDays, weekdayName } from 'src/lib/format'
import { REPS, SOURCES } from 'src/lib/refs'
import { toast } from 'src/lib/ui'

const ui = useUiStore(), route = useRoute()
const range = useRange()
const viewQ = useQueryParam('view'), nxQ = useQueryParam('nx')
const { data: d, loading, error } = useAsync(() => api.onboarding({ range: range.value }), [range])
const k = computed(() => d.value.kpis)
const ACT = computed(() => d.value.activation)

const ST = {
  path: { label: 'در مسیر', cls: 'info', o: 1 },
  stuck: { label: 'گیر کرده', cls: 'warn', o: 0 },
  act: { label: 'فعال شده', cls: 'good', o: 2 },
  lost: { label: 'ازدست‌رفته', cls: 'crit', o: 3 },
}
const BUCKET_LABEL = computed(() => ({ noBase: 'بیس نساخته', under: 'بیس دارد، زیر ' + fa(ACT.value.records) + ' رکورد', noW2: 'فعال شد، هفتهٔ ۲ برنگشت', onTrack: 'در مسیر درست' }))

const signupChart = computed(() => ({
  labels: d.value.daily.map((x) => date(x.daysAgo)), tipLabels: d.value.daily.map((x) => weekdayName(x.daysAgo) + ' ' + date(x.daysAgo)), total: 'ثبت‌نام', height: 210,
  series: [{ name: 'فعال شد', values: d.value.daily.map((x) => x.activated), color: 'var(--series-1)' }, { name: 'هنوز فعال نشده', values: d.value.daily.map((x) => x.pending), color: 'var(--deemph)' }],
}))

/* KPI tiles and the step list filter the table in place: they only change the URL, the watcher below applies it */
const viewTo = (v) => ({ query: { ...route.query, view: v }, hash: '#list' })
const nxTo = (k) => ({ query: { ...route.query, nx: k }, hash: '#list' })
const tbl = ref(null)
watch([viewQ, nxQ, () => route.hash], ([v, nx, hash]) => {
  const st = tbl.value?.st; if (!st) return
  st.view = v || 'all'; st.f.nx = nx || ''; st.page = 0; st.focus = -1
  if (hash === '#list') nextTick(() => document.getElementById('list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
})

const doneCount = (a) => a.checklist.filter((x) => x.s === 'done').length
const tip = (a) => a.checklist.map((x) => (x.s === 'done' ? '✓ ' : x.s === 'wait' ? '… ' : x.s === 'na' ? '? ' : '○ ') + x.l + ' — ' + x.d).join('\n')
const repName = (id) => (REPS.find((r) => r.id === id) || {}).name || ''

const views = [
  { key: 'all', label: 'همه', test: null },
  { key: 'stuck', label: 'گیر کرده', test: (a) => a.stuck },
  { key: 'hp', label: 'پرپتانسیل', test: (a) => a.highPot },
  { key: 'act', label: 'فعال شده', test: (a) => a.activated },
]
const search = { placeholder: 'نام، شخص، شماره یا شهر…', text: (a) => a.name + ' ' + a.contact.first + ' ' + a.contact.last + ' ' + a.contact.mobile + ' ' + a.city + ' ' + a.industryName }
const filters = computed(() => [
  { key: 'st', label: 'وضعیت', options: Object.keys(ST).map((k) => ({ v: k, l: ST[k].label })), test: (a, v) => a.status === v },
  { key: 'src', label: 'منبع', options: SOURCES.map((s) => ({ v: s.key, l: s.name })), test: (a, v) => a.source === v },
  { key: 'nx', label: 'قدم بعدی', options: Object.keys(d.value.stepLabels).map((k) => ({ v: k, l: d.value.stepLabels[k] })), test: (a, v) => a.next.key === v },
])
const columns = [
  { key: 'name', label: 'حساب', cls: 'nmcol', csv: (a) => a.name },
  { key: 'signup', label: 'ثبت‌نام', sort: (a) => a.age, csv: (a) => date(a.age) },
  { key: 'check', label: 'قدم‌ها', sort: doneCount, desc: true, csv: (a) => a.checklist.filter((x) => x.s === 'done').map((x) => x.l).join(' / ') },
  { key: 'status', label: 'وضعیت', sort: (a) => ST[a.status].o, csv: (a) => ST[a.status].label },
  { key: 'lastSeen', label: 'آخرین فعالیت', sort: (a) => -a.lastSeenMin, desc: true, csv: (a) => a.lastSeenDays },
  { key: 'next', label: 'قدم بعدی پیشنهادی', sort: (a) => a.next.key, csv: (a) => a.next.text },
  { key: 'owner', label: 'مسئول', sort: (a) => a.owner || 'zz', csv: (a) => repName(a.owner) },
  { key: 'done', label: '', sort: false, csv: false },
]

async function setDone(a, on) {
  await api.setTask('onb:' + a.id, { status: on ? 'done' : null, step: a.next.key })
  ui.bump()
  if (on) toast('«' + a.next.text + '» برای ' + a.name + ' انجام شد', async () => { await api.setTask('onb:' + a.id, { status: null }); ui.bump() })
  else toast('دوباره در کارهای باز: ' + a.name)
}
async function assign(rows, v, done) {
  if (!v) return
  await api.setOwner(rows.map((a) => a.id), v === '__none' ? null : v)
  ui.bump(); toast(fa(rows.length) + ' حساب به ' + (v === '__none' ? 'بدون مسئول' : repName(v)) + ' داده شد'); done()
}
</script>

<style scoped>
.ck { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.ck i { width: 11px; height: 11px; border-radius: 50%; flex: none; box-sizing: border-box; border: 1.5px solid var(--axis); }
.ck i.done { background: var(--series-1); border-color: var(--series-1); }
.ck i.wait { border-style: dashed; border-color: var(--faint); }
.ck i.na { border-style: dotted; opacity: .35; }
.ck b { font-size: 11.3px; color: var(--muted); font-weight: 600; margin-inline-start: 4px; font-variant-numeric: tabular-nums; }
:deep(td.nmcol) { min-width: 170px; }
:deep(tr.onb-done td:not(:last-child)) { opacity: .5; }
</style>
