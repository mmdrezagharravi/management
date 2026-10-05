<template>
  <PageShell title="نگهداشت" sub="آیا مشتری‌ها می‌مانند؟ — کوهورت‌های ماهانه، منحنی هفتگی و نگهداشت درآمد" :sources="['main', 'behavior', 'wallet']" :loading="loading" :error="error">
    <template v-if="d">
      <div class="kpis">
        <KpiTile :label="d.weeks ? 'نگهداشت هفتهٔ ۴' : 'نگهداشت ماه ۱'" :value="pct(k.m1.v)" :info="(d.weeks ? 'سهم حساب‌هایی که در هفتهٔ چهارم پس از ثبت‌نام فعال بوده‌اند' : 'سهم حساب‌هایی که در ماه دوم پس از ثبت‌نام دست‌کم یک هفته فعال بوده‌اند') + ' — میانگین ۳ کوهورت آخر'" :delta="{ cur: k.m1.v, prev: k.m1.p, points: true }" :cmp="names(k.m1)" />
        <KpiTile :label="d.weeks ? 'نگهداشت هفتهٔ ۱۲' : 'نگهداشت ماه ۳'" :value="pct(k.m3.v)" :info="'همان تعریف برای ' + (d.weeks ? 'هفتهٔ دوازدهم' : 'ماه چهارم') + ' پس از ثبت‌نام — میانگین ۳ کوهورت آخر'" :delta="{ cur: k.m3.v, prev: k.m3.p, points: true }" :cmp="names(k.m3)" />
        <KpiTile label="ریزش مشتری ۳۰ روز" :value="pct(k.logo.r, 1)" info="مشتریان پرداخت‌کننده‌ای که در ۳۰ روز اخیر لغو کرده‌اند ÷ پرداخت‌کنندگان ۳۰ روز پیش" :to="{ hash: '#churned' }" :delta="{ cur: k.logo.r, prev: k.logoPrev.r, points: true, goodUp: false }" :cmp="n(k.logo.n) + ' از ' + n(k.logo.base) + ' مشتری'" />
        <KpiTile label="نگهداشت خالص درآمد (NRR)" :value="pct(k.rev90.nrr, 1)" info="MRR امروزِ مشتریانی که ۹۰ روز پیش پرداخت‌کننده بودند ÷ MRR همان‌ها در ۹۰ روز پیش — با احتساب ارتقا، کاهش و ریزش" to="/revenue" :delta="{ cur: k.rev90.nrr, prev: k.rev90Prev.nrr, points: true }" :cmp="k.rev90.n == null ? '۹۰ روز' : '۹۰ روز · ' + n(k.rev90.n) + ' مشتری'" />
        <KpiTile v-if="k.grrMonth" label="نگهداشت ناخالص درآمد (GRR)" :value="pct(k.grrMonth.grr, 1)" info="MRR اول ماه منهای کاهش و ریزش ÷ MRR اول ماه؛ ارتقا حساب نمی‌شود" to="/revenue" :cmp="monthLabel(k.grrMonth, true) + ' · ازدست‌رفته: ' + compact(k.grrMonth.lost)" />
        <KpiTile v-else-if="k.rev90.grr != null" label="نگهداشت ناخالص درآمد (GRR)" :value="pct(k.rev90.grr, 1)" info="مثل NRR ولی ارتقا حساب نمی‌شود؛ فقط کاهش و ریزش را نشان می‌دهد" to="/revenue" :delta="{ cur: k.rev90.grr, prev: k.rev90Prev.grr, points: true }" :cmp="'ازدست‌رفته: ' + compact(k.rev90.lost)" />
      </div>

      <PanelCard title="نگهداشت کوهورت‌های ماهانه" :hint="'درصد حساب‌های فعال در هر ' + (d.weeks ? 'هفته' : 'ماه') + ' پس از ثبت‌نام'">
        <template v-if="d.cohortFilters !== false" #actions>
          <div class="seg" role="group" aria-label="گروه">
            <button :class="{ on: d.cohortMode === 'all' }" @click="setCoh(null)">همه</button>
            <button :class="{ on: d.cohortMode === 'paid' }" @click="setCoh('paid')">فقط پرداخت‌کننده‌ها</button>
          </div>
          <select class="select" aria-label="منبع جذب" style="height: 31px" :value="isSource(d.cohortMode) ? d.cohortMode : ''" @change="setCoh($event.target.value)">
            <option value="">منبع: همه</option>
            <option v-for="s in SOURCES" :key="s.key" :value="s.key">{{ s.name }}</option>
          </select>
        </template>
        <div class="tbl-wrap"><div style="min-width: 760px"><HeatMap :options="heat" /></div></div>
        <div class="row wrap between" style="gap: 8px 16px; margin-top: 10px">
          <div class="note">هر ردیف = حساب‌هایی که در آن ماه ثبت‌نام کرده‌اند (عدد کنار ماه = تعداد). <b>رو به چپ</b> بخوانید تا ببینید کجا می‌روند؛ <b>رو به پایین</b> تا ببینید کوهورت‌های تازه بهترند یا نه.</div>
          <div class="legend"><span class="muted">کم‌تر</span><i v-for="v in ['--seq-100', '--seq-250', '--seq-400', '--seq-500', '--seq-700']" :key="v" class="sw" :style="{ background: 'var(' + v + ')' }" /><span class="muted">بیش‌تر</span></div>
        </div>
      </PanelCard>

      <PanelCard cls="tint-accent">
        <template #title><AppIcon name="zap" />خودکارسازی، قوی‌ترین نشانهٔ ماندن</template>
        <div v-if="cv.small || cv.liftWeek == null" class="prose">هنوز حساب کافی در دو گروه «با خودکارسازی» ({{ n(cv.automation.n) }}) و «بدون خودکارسازی» ({{ n(cv.noAutomation.n) }}) نیست که مقایسه قابل اتکا باشد. تنها {{ pct(cv.autoShare) }} از حساب‌های فعال خودکارسازی دارند و {{ n(cv.payNoAuto) }} مشتری پرداخت‌کننده هنوز یکی هم نساخته‌اند.</div>
        <div v-else class="prose">در هفتهٔ {{ fa(d.weeks ? lastWeek + 1 : lastWeek) }} پس از ثبت‌نام، <b>{{ pct(cv.automation.values[lastWeek]) }}</b> از حساب‌های دارای خودکارسازی هنوز فعال‌اند؛ بقیه فقط <b>{{ pct(cv.noAutomation.values[lastWeek]) }}</b> — یعنی <b>{{ n(cv.lift, 1) }} برابر</b>. اما تنها {{ pct(cv.autoShare) }} از حساب‌های فعال خودکارسازی دارند و {{ n(cv.payNoAuto) }} مشتری پرداخت‌کننده هنوز یکی هم نساخته‌اند. برایشان قالب خودکارسازی آماده بفرستید و در دموی فروش به حساب‌های رایگان، خودکارسازی را اول نشان دهید.</div>
        <template #footer><span>همبستگی است، نه اثبات علت</span><router-link to="/features">اثر قابلیت‌ها بر نگهداشت</router-link></template>
      </PanelCard>

      <div class="grid g2">
        <PanelCard title="منحنی نگهداشت هفتگی" hint="سهم فعال در هر هفته پس از ثبت‌نام">
          <LineChart :options="curveChart" />
          <div class="legend" style="margin-top: 8px">
            <span class="k"><i class="ln" style="background: var(--series-1)" />با خودکارسازی <span class="faint">({{ n(cv.automation.n) }} حساب)</span></span>
            <span class="k"><i class="ln" style="background: var(--series-2)" />بدون خودکارسازی <span class="faint">({{ n(cv.noAutomation.n) }})</span></span>
            <span class="k"><i class="ln" style="background: var(--series-3)" />تیمی — همکار دعوت کرده <span class="faint">({{ n(cv.team.n) }})</span></span>
          </div>
          <template #footer><span>هر نقطه فقط حساب‌هایی را می‌شمارد که آن هفته را کامل گذرانده‌اند؛ عدد کنار هر گروه = اعضای هفتهٔ اول</span><router-link to="/segments">دسته‌بندی‌ها</router-link></template>
        </PanelCard>
        <PanelCard title="نگهداشت درآمد ماهانه" hint="۶ ماه اخیر · تومان" flush>
          <div v-if="!d.revMonths.length" class="note" style="margin: 12px 16px">این بخش هنوز از بک‌اند داده نمی‌گیرد.</div>
          <div v-else class="tbl-wrap"><table class="tbl compact">
            <thead><tr><th>ماه</th><th class="num">MRR ابتدای ماه</th><th class="num">ارتقا</th><th class="num">کاهش و ریزش</th><th class="num">NRR</th><th class="num">GRR</th></tr></thead>
            <tbody><tr v-for="r in d.revMonths" :key="r.y + '-' + r.m">
              <td class="nowrap"><b>{{ monthLabel(r, true) }}</b><span v-if="r.end === 0" class="faint"> تا امروز</span></td>
              <td class="num">{{ compact(r.S) }}</td><td class="num">+{{ compact(r.exp) }}</td><td class="num">−{{ compact(r.lost) }}</td>
              <td class="num"><b>{{ pct(r.nrr, 1) }}</b></td><td class="num">{{ pct(r.grr, 1) }}</td>
            </tr></tbody>
          </table></div>
          <template #footer><span>NRR = MRR پایان ماهِ مشتریان اول ماه ÷ MRR اول ماهشان</span><router-link to="/revenue">درآمد</router-link></template>
        </PanelCard>
      </div>

      <div class="grid g-main">
        <PanelCard id="churned" style="scroll-margin-top: 70px" title="آخرین مشتریان ازدست‌رفته" hint="۱۸۰ روز اخیر · روی ردیف بزنید" flush cls="t-churn">
          <DataTable :rows="ch.rows" :columns="columns" :page-size="10" export-name="churned" unit="مشتری" compact :sort="{ key: 'when', dir: 'asc' }" :filters="filters" :on-row="(a) => ui.openAccount(a.id)">
            <template #col-name="{ row }"><AccountCell :a="row"><template #sub>{{ [row.industryName, row.city].filter(Boolean).join(' · ') }}</template></AccountCell></template>
            <template #col-when="{ row }"><span class="nowrap">{{ date(row.churnedAt) }}</span><span class="s">{{ agoDays(row.churnedAt) }}</span></template>
            <template #col-lost="{ row }"><b>{{ compact(row.lastMrr) }}</b></template>
            <template #col-reason="{ row }">{{ row.churnReason }}</template>
            <template #col-tenure="{ row }">{{ months(row.tenure) }}</template>
          </DataTable>
        </PanelCard>
        <PanelCard :title="ch.reasons.length ? 'دلیل لغو اشتراک' : 'خلاصهٔ ریزش'" :hint="n(ch.total) + ' مشتری در ۱۸۰ روز'">
          <HBars v-if="ch.reasons.length" :items="ch.reasons.map((r) => ({ label: r.reason, sub: compact(r.mrr) + ' MRR', value: r.n, note: pct(ch.total ? r.n / ch.total : 0) }))" :label-width="108" :format="(v) => n(v)" />
          <div style="margin-top: 12px; border-top: 1px solid var(--grid); padding-top: 6px">
            <div class="kv"><span class="k">MRR ازدست‌رفته در ۱۸۰ روز</span><span class="v">{{ money(ch.lostMrr) }}</span></div>
            <div class="kv"><span class="k">میانهٔ مدت اشتراک پیش از لغو</span><span class="v">{{ months(ch.medianTenure) }}</span></div>
            <div class="kv"><span class="k">لغو در سه ماه اول</span><span class="v">{{ n(ch.early) }} مشتری · {{ pct(ch.total ? ch.early / ch.total : 0) }}</span></div>
          </div>
          <template #footer><span>دلیلی که مشتری هنگام لغو انتخاب کرده</span><router-link to="/health">مشتریان در خطر</router-link></template>
        </PanelCard>
      </div>
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
import AccountCell from 'components/AccountCell.vue'
import HeatMap from 'components/charts/HeatMap.vue'
import LineChart from 'components/charts/LineChart.vue'
import HBars from 'components/charts/HBars.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useQueryParam } from 'src/composables/useUrlState'
import { useUiStore } from 'stores/ui'
import { n, fa, pct, compact, money, date, daysAgo, agoDays, monthLabel } from 'src/lib/format'
import { SOURCES } from 'src/lib/refs'

const ui = useUiStore()
const coh = useQueryParam('coh')
const { data: d, loading, error } = useAsync(() => api.retention({ cohort: coh.value || undefined }), [coh])
const setCoh = (v) => { coh.value = v || null }
const isSource = (k) => SOURCES.some((s) => s.key === k)

const k = computed(() => d.value.kpis), cv = computed(() => d.value.curves), ch = computed(() => d.value.churn)
const names = (m) => m.months.map((r) => monthLabel(r)).join('، ')
const months = (v) => (v < 30 ? fa(v) + ' روز' : fa(Math.round(v / 30.4)) + ' ماه')

const lastWeek = computed(() => cv.value.liftWeek ?? cv.value.automation.values.length - 1)
const heat = computed(() => {
  const cols = []; for (let x = 0; x < (d.value.weeks || 12); x++) cols.push(d.value.weeks ? 'هفتهٔ ' + fa(x + 1) : 'ماه ' + fa(x))
  return {
    rowHead: 'ماه ثبت‌نام', cols, tipLabel: 'فعال', domain: d.value.domain,
    rows: d.value.cohorts.map((r) => ({
      label: monthLabel(r, true) + ' ', sub: n(r.size) + ' حساب' + (r.partial ? ' · ناتمام' : '') + (r.startsAt ? ' · از ' + date(daysAgo(r.startsAt)) : ''), cells: r.cells,
      tips: r.cells.map((v, i) => { const of = (r.eligible && r.eligible[i]) ?? r.size; return v == null ? '' : n(Math.round(v * of)) + ' از ' + n(of) + ' حساب' }),
    })),
  }
})
const curveChart = computed(() => {
  const wl = []; for (let w = 0; w < cv.value.automation.values.length; w++) wl.push('هفتهٔ ' + fa(d.value.weeks ? w + 1 : w))
  return { labels: wl, height: 250, yFormat: (v) => pct(v), area: false,
    series: [{ name: 'با خودکارسازی', values: cv.value.automation.values }, { name: 'بدون خودکارسازی', values: cv.value.noAutomation.values }, { name: 'تیمی', values: cv.value.team.values }] }
})

const filters = computed(() => !ch.value.reasonList.length ? [] : [{ key: 'reason', label: 'دلیل', options: ch.value.reasonList.map((r) => ({ v: r, l: r })), test: (a, v) => a.churnReason === v }])
const columns = [
  { key: 'name', label: 'مشتری', csv: (a) => a.name },
  { key: 'when', label: 'لغو', sort: (a) => a.churnedAt, csv: (a) => a.churnedAt },
  { key: 'lost', label: 'MRR ازدست‌رفته', num: true, sort: (a) => a.lastMrr, csv: (a) => a.lastMrr },
  { key: 'reason', label: 'دلیل', sort: (a) => a.churnReason, csv: (a) => a.churnReason },
  { key: 'tenure', label: 'مدت اشتراک', num: true, sort: (a) => a.tenure, csv: (a) => a.tenure },
]
</script>

<style scoped>
.t-churn :deep(table.tbl) { min-width: 640px; }
</style>
