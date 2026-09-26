<template>
  <PageShell title="عملکرد تیم فروش" sub="تماس، ارتباط، قرارداد و دفتر مشتریان هر کارشناس — روی هر ردیف بزنید تا مشتریانش را ببینید" range v-model:range="range" :sources="['main', 'wallet']" :loading="loading" :error="error">
    <template v-if="d">
      <div v-if="d.capped" class="banner info"><AppIcon name="info" /><div>بازهٔ {{ fa(d.range) }} روز انتخاب شده، ولی تاریخچهٔ تماس‌ها فقط {{ fa(d.history) }} روز نگه داشته می‌شود؛ عددهای فعالیت و قرارداد، {{ fa(d.since) }} روز اخیر را نشان می‌دهند.</div></div>

      <PanelCard title="جدول تیم" :hint="fa(d.since) + ' روز اخیر · ' + fa(d.workdays) + ' روز کاری'" flush>
        <DataTable :rows="d.reps" :columns="columns" :sort="{ key: 'wonMrr', dir: 'desc' }" :page-sizes="false" export-name="team" unit="کارشناس" :on-row="(s) => router.push('/customers?owner=' + s.id)">
          <template #col-name="{ row }"><span class="row" style="min-width: 150px"><span class="avatar" :style="{ background: wash(row.i) }">{{ initials(row.name) }}</span><span><b class="nm">{{ row.name }}</b><span class="s">هدف روزانه {{ fa(row.callTarget) }} تماس</span></span></span></template>
          <template #col-calls="{ row }"><b>{{ n(row.calls) }}</b><span class="s">{{ n(row.perDay, 1) }} در روز</span></template>
          <template #col-connRate="{ row }"><b>{{ pct(row.connRate) }}</b><span class="s">{{ n(row.conn) }} ارتباط</span></template>
          <template #col-wonMrr="{ row }"><b>{{ compact(row.wonMrr) }}</b><span class="s">{{ n(row.won) }} قرارداد</span></template>
          <template #col-lost="{ row }"><template v-if="row.lost">{{ n(row.lost) }}</template><span v-else class="faint">—</span></template>
          <template #col-bookMrr="{ row }"><b>{{ compact(row.bookMrr) }}</b><span class="s">{{ n(row.book) }} پرداخت‌کننده</span></template>
          <template #col-avgHealth="{ row }"><HealthScore :score="Math.round(row.avgHealth)" /></template>
          <template #col-risk="{ row }"><router-link v-if="row.risk" class="sig due" :to="'/customers?view=risk&owner=' + row.id">{{ fa(row.risk) }} مشتری</router-link><span v-else class="faint">—</span></template>
          <template #col-open="{ row }"><b>{{ n(row.open) }}</b> <span class="muted">باز از {{ n(row.due) }}</span></template>
        </DataTable>
        <template #footer><span>قرارداد موفق = خرید اول + ارتقا + تمدید · دفتر و کارهای امروز همین حالا</span><router-link class="nowrap" to="/customers?view=unassigned">سرنخ‌های بدون مسئول</router-link></template>
      </PanelCard>

      <div class="grid g-main">
        <PanelCard title="فعالیت در هر روز کاری" hint="۳۰ روز اخیر · تماس، جلسه و ایمیل">
          <ColumnChart :options="actChart" />
          <div class="legend" style="margin-top: 8px"><span v-for="s in d.reps" :key="s.id" class="k"><i class="sw" :style="{ background: repColor(s.i) }" />{{ s.name }}</span></div>
          <template #footer><span>جمعه‌ها تعطیل؛ پنجشنبه‌ها نیمه‌وقت</span><router-link class="nowrap" to="/today">کارهای امروز</router-link></template>
        </PanelCard>
        <PanelCard title="توازن بار کاری" hint="حساب‌ها و درآمد ماهانهٔ هر نفر">
          <div class="muted" style="font-size: 11.5px; font-weight: 700; margin-bottom: 2px">حساب‌های تحت مسئولیت</div>
          <HBars :items="d.reps.map((s) => ({ label: s.name, sub: n(s.book) + ' مشتری · ' + n(s.leads) + ' سرنخ', value: s.owned, color: repColor(s.i), to: '/customers?view=all&owner=' + s.id }))" :label-width="110" :format="(v) => n(v)" />
          <div class="muted" style="font-size: 11.5px; font-weight: 700; margin: 12px 0 2px">درآمد ماهانهٔ دفتر</div>
          <HBars :items="d.reps.map((s) => ({ label: s.name, value: s.bookMrr, color: repColor(s.i), note: pct(d.team.mrr ? s.bookMrr / d.team.mrr : 0), to: '/customers?owner=' + s.id }))" :label-width="110" :format="(v) => compact(v)" />
          <div class="note" style="margin-top: 6px">سرنخ = حساب رایگانِ آمادهٔ ارتقا یا مشتری لغوشده در ۱۲۰ روز اخیر.</div>
          <div class="banner" :class="{ info: !d.unassigned }" style="margin-top: 12px; align-items: center">
            <AppIcon :name="d.unassigned ? 'alert' : 'check'" />
            <div style="flex: 1"><template v-if="d.unassigned"><b>{{ fa(d.unassigned) }} سرنخ بدون مسئول</b> — {{ d.balance.ratio > 1.4 ? 'به ' + d.balance.min + ' بدهید که دفتر سبک‌تری دارد.' : 'بین تیم پخش کنید.' }}</template><template v-else>همهٔ سرنخ‌ها مسئول دارند.</template></div>
            <router-link v-if="d.unassigned" class="btn sm" style="text-decoration: none" to="/customers?view=unassigned">تعیین مسئول</router-link>
          </div>
          <template #footer><span v-if="d.balance.ratio > 1.4">دفتر {{ d.balance.max }} {{ n(d.balance.ratio, 1) }} برابر {{ d.balance.min }} است</span><span v-else>بار کاری متوازن است</span></template>
        </PanelCard>
      </div>

      <div class="grid g2">
        <PanelCard title="نتیجهٔ تماس‌ها" :hint="fa(d.since) + ' روز اخیر · از دمو تا بی‌پاسخ'">
          <div v-for="s in d.reps" :key="s.id" style="padding: 8px 0; border-bottom: 1px solid var(--grid)">
            <div class="row between" style="margin-bottom: 6px"><span class="row"><i class="dot" :style="{ background: repColor(s.i), borderRadius: '3px' }" /><b>{{ s.name }}</b></span><span class="muted" style="font-size: 11.5px">{{ n(d.outcomes.reduce((t, o) => t + s.outc[o.key], 0)) }} تماس و پیام · ارتباط {{ pct(s.connRate) }}</span></div>
            <Stack100 :options="{ height: 12, format: (v) => n(v), parts: d.outcomes.map((o) => ({ label: o.label, value: s.outc[o.key], color: o.color })) }" />
          </div>
          <template #footer><span>میانگین تیم: ارتباط در {{ pct(d.team.connRate) }} تماس‌ها</span></template>
        </PanelCard>
        <PanelCard title="نکتهٔ مربیگری" hint="از روی عددهای همین صفحه" flush>
          <div class="list" style="padding: 0 16px">
            <div v-for="s in d.reps" :key="s.id" class="li" style="align-items: flex-start">
              <span class="avatar" style="margin-top: 2px" :style="{ background: wash(s.i) }">{{ initials(s.name) }}</span>
              <span class="main"><span class="t">{{ s.name }}</span>
                <div v-for="(c, i) in s.coach" :key="i" style="font-size: 12px; color: var(--ink-2); line-height: 1.8; margin-top: 2px">{{ c.t }} <router-link v-if="c.to" :to="c.to" style="color: var(--accent-ink); font-weight: 600; white-space: nowrap">باز کردن</router-link></div>
              </span>
            </div>
          </div>
        </PanelCard>
      </div>
    </template>
  </PageShell>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PageShell from 'components/PageShell.vue'
import PanelCard from 'components/PanelCard.vue'
import DataTable from 'components/DataTable.vue'
import AppIcon from 'components/AppIcon.vue'
import HealthScore from 'components/HealthScore.vue'
import ColumnChart from 'components/charts/ColumnChart.vue'
import HBars from 'components/charts/HBars.vue'
import Stack100 from 'components/charts/Stack100.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useRange } from 'src/composables/useRange'
import { n, fa, pct, compact, date, weekdayName, initials } from 'src/lib/format'

const router = useRouter()
const range = useRange()
const { data: d, loading, error } = useAsync(() => api.team({ range: range.value }), [range])

const repColor = (i) => 'var(--series-' + (i + 1) + ')'
const wash = (i) => 'color-mix(in srgb,' + repColor(i) + ' 18%,transparent)'

const columns = [
  { key: 'name', label: 'کارشناس', sort: (s) => s.name, csv: (s) => s.name },
  { key: 'calls', label: 'تماس و جلسه', num: true, csv: (s) => s.calls },
  { key: 'connRate', label: 'نرخ ارتباط', num: true, title: 'صحبت شد یا دمو ÷ تماس و جلسه', csv: (s) => Math.round(s.connRate * 100) + '%' },
  { key: 'wonMrr', label: 'قرارداد موفق', num: true, title: 'خرید اول: MRR کامل · ارتقا: افزایش MRR · تمدید: MRR تمدیدشده', csv: (s) => s.won + ' / ' + s.wonMrr },
  { key: 'lost', label: 'ازدست‌رفته', num: true, csv: (s) => s.lost },
  { key: 'bookMrr', label: 'دفتر مشتریان', num: true, csv: (s) => s.book + ' / ' + s.bookMrr },
  { key: 'avgHealth', label: 'میانگین سلامت', num: true, csv: (s) => Math.round(s.avgHealth) },
  { key: 'risk', label: 'در خطر', num: true, csv: (s) => s.risk },
  { key: 'open', label: 'کارهای امروز', num: true, title: 'کارهای سررسید امروز که هنوز انجام یا تعویق نشده‌اند', csv: (s) => s.open + '/' + s.due },
]

const actChart = computed(() => ({
  labels: d.value.days.map((x) => date(x)), tipLabels: d.value.days.map((x) => weekdayName(x) + ' ' + date(x)), height: 330, total: 'جمع',
  series: d.value.reps.map((s, i) => ({ name: s.name, color: repColor(s.i), values: d.value.activity[i] })),
}))
</script>
