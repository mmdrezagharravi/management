<template>
  <PageShell title="سلامت داده" sub="هر منبع داده چقدر تازه و کامل است و کدام صفحه‌ها از تأخیرش اثر می‌گیرند" :loading="loading" :error="error">
    <template v-if="d">
      <div class="kpis">
        <KpiTile label="منابع سالم" :value="n(good.length)" :unit="'از ' + n(d.sources.length)" :cmp="d.sources.filter((s) => s.status !== 'good').map((s) => s.desc + ' ' + ST_LABEL[s.status]).join(' · ') || 'همه به‌روزند'" />
        <KpiTile label="بیشترین تأخیر" :value="lagText(d.worst.lagMin)"><template #cmp>{{ d.worst.desc }} · <span class="mono">{{ d.worst.name }}</span></template></KpiTile>
        <KpiTile label="رویداد گم‌شده در ۲۴ ساعت" :value="n(d.dropped)" :cmp="d.dropSources.length ? 'همه از ' + d.dropSources.join('، ') : 'چیزی گم نشده'" />
        <KpiTile label="مشکل شناخته‌شدهٔ باز" :value="n(d.issuesOpen + d.issuesInProgress)" :cmp="n(d.issuesOpen) + ' باز · ' + n(d.issuesInProgress) + ' در حال رفع'" :to="{ hash: '#issues' }" />
      </div>

      <PanelCard title="منبع‌های داده" hint="تأخیر = فاصلهٔ تازه‌ترین رکورد رسیده تا الان" flush>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>منبع</th><th>وضعیت</th><th class="num">تأخیر</th><th class="num">گم‌شده در ۲۴ ساعت</th><th>تازه‌ترین داده</th><th class="num">نرخ دریافت</th></tr></thead>
          <tbody>
            <tr v-for="s in d.sources" :key="s.key">
              <td><b class="mono">{{ s.name }}</b><span class="s">{{ s.desc }}</span></td>
              <td><StatusBadge :status="s.status" :label="ST_LABEL[s.status]" /></td>
              <td class="num"><b>{{ lagText(s.lagMin) }}</b></td>
              <td class="num"><b v-if="s.dropped24" style="color: var(--crit-ink)">{{ n(s.dropped24) }}</b><span v-else class="faint">۰</span></td>
              <td class="nowrap">{{ agoDays(s.lastData.daysAgo) }} {{ clock(s.lastData.min) }}</td>
              <td class="num"><span v-if="s.rate == null" class="muted">یک‌بار در روز</span><template v-else>{{ n(s.rate, 1) }} <span class="muted">در ثانیه</span></template></td>
            </tr>
          </tbody>
        </table></div>
      </PanelCard>

      <div class="grid g-main">
        <PanelCard title="رویدادهای رفتاری: مورد انتظار و دریافتی" :hint="daily ? 'روزانه · ' + fa(d.events.length) + ' روز · مورد انتظار = میانهٔ ۷ روز قبل' : 'ساعتی · ۴۸ ساعت'">
          <LineChart :options="evChart" />
          <div class="legend" style="margin-top: 8px"><span class="k"><i class="ln" style="background: var(--deemph)" />مورد انتظار</span><span class="k"><i class="ln" style="background: var(--series-1)" />دریافتی</span></div>
          <template #footer>
            <template v-if="d.gap && d.gap.missing != null">
              <span>{{ n(d.gap.missing) }} روز همگام نشده<template v-if="d.gap.lastMissing != null"> (آخرین: {{ agoDays(d.gap.lastMissing) }})</template> · {{ n(d.gap.low) }} روز با حجم کمتر از نصف انتظار</span>
            </template>
            <template v-else-if="d.gap">
              <span>از {{ fa(d.gap.sinceHours) }} ساعت پیش دریافت روی {{ n(d.gap.cap) }} رویداد در ساعت ({{ n(d.gap.cap / 3600, 1) }} در ثانیه) سقف خورده · کسری ۲۴ ساعت: {{ n(d.gap.miss24) }} — {{ n(d.gap.dropped24) }} گم‌شده، {{ n(d.gap.queued) }} هنوز در صف</span>
              <a href="#issues" class="nowrap">علت‌ها</a>
            </template>
            <span v-else>دریافت با انتظار هم‌خوان است</span>
          </template>
        </PanelCard>
        <PanelCard title="سیاست تازگی داده" hint="برچسب بالای هر صفحه" flush>
          <div class="note" style="padding: 0 16px 4px">برچسب تازگی در نوار بالا، بدترین تأخیرِ منبع‌هایی را نشان می‌دهد که همان صفحه از آن‌ها عدد می‌گیرد. روی آن بزنید تا به همین صفحه برسید.</div>
          <div class="list" style="padding: 0 16px">
            <div v-for="p in policy" :key="p.key" class="li" style="align-items: flex-start">
              <StatusBadge :status="p.key" :label="ST_LABEL[p.key]" />
              <span class="main"><span class="t">{{ p.rule }}</span><span class="d" style="white-space: normal">{{ p.effect }}</span></span>
              <span v-if="p.ex" class="end">
                <span class="fresh" :class="{ bad: p.ex.status === 'crit' }"><i class="dot" :style="{ background: STATUS_COLOR[p.ex.status] }" />{{ p.ex.status === 'crit' ? 'داده با ' + lagText(p.ex.lagMin) + ' تأخیر' : 'به‌روز · ' + lagText(p.ex.lagMin) + ' پیش' }}</span>
              </span>
            </div>
          </div>
        </PanelCard>
      </div>

      <div class="grid g2">
        <PanelCard id="issues" title="مشکل‌های شناخته‌شده" :hint="n(d.issues.length) + ' مورد'" flush style="scroll-margin-top: 70px">
          <div v-if="!d.issues.length" class="note" style="padding: 0 16px 14px">این بخش هنوز از بک‌اند داده نمی‌گیرد.</div>
          <div v-else class="list" style="padding: 0 16px">
            <div v-for="i in d.issues" :key="i.id" class="li" style="align-items: flex-start">
              <span class="tag mono">{{ i.id }}</span>
              <span class="main"><span class="t" style="white-space: normal">{{ i.title }}</span><span class="d" style="white-space: normal">{{ i.impact }}</span></span>
              <span class="end"><StatusBadge :status="i.level" :label="ISSUE_LABEL[i.status] || i.status" /></span>
            </div>
          </div>
        </PanelCard>
        <PanelCard title="کدام صفحه‌ها تحت تأثیرند" hint="تا رفع تأخیر با احتیاط بخوانید" flush>
          <div class="list" style="padding: 0 16px">
            <router-link v-for="p in d.affected" :key="p.to" class="li" :to="p.to" style="align-items: flex-start">
              <span class="main"><span class="t">{{ p.label }}</span><span class="d" style="white-space: normal">{{ p.what }}</span><span class="d">{{ p.desc }} · {{ lagText(p.lagMin) }} عقب</span></span>
              <span class="end"><StatusBadge :status="p.status" :label="ST_LABEL[p.status]" /></span>
              <AppIcon name="chevronL" cls="faint" />
            </router-link>
          </div>
          <template #footer><span>عددهای درآمد و پرداخت از {{ d.unaffected.join(' و ') }} می‌آیند و تحت تأثیر نیستند</span></template>
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
import StatusBadge from 'components/StatusBadge.vue'
import AppIcon from 'components/AppIcon.vue'
import LineChart from 'components/charts/LineChart.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { n, fa, compact, clock, date, agoDays, lagText } from 'src/lib/format'
import { STATUS_COLOR } from 'src/lib/ui'

const { data: d, loading, error } = useAsync(() => api.dataHealth(), [])
const ST_LABEL = { good: 'سالم', warn: 'با تأخیر', crit: 'بحرانی' }
const ISSUE_LABEL = { open: 'باز', in_progress: 'در حال رفع', done: 'رفع شد' }
const DAY = { today: 'امروز', yesterday: 'دیروز', before: 'پریروز' }
const good = computed(() => d.value.sources.filter((s) => s.status === 'good'))
const policy = computed(() => [
  { key: 'good', rule: 'کمتر از ' + lagText(d.value.fresh.good), effect: 'عددها قابل اتکا هستند.', ex: d.value.policyExamples.good },
  { key: 'warn', rule: 'کمتر از ' + lagText(d.value.fresh.warn), effect: 'روندها درست است ولی عدد امروز هنوز کامل نیست.', ex: d.value.policyExamples.warn },
  { key: 'crit', rule: lagText(d.value.fresh.warn) + ' یا بیشتر', effect: 'برچسب قرمز می‌شود و روی صفحه نوار هشدار می‌آید؛ برای تصمیم امروز به این عددها تکیه نکنید.', ex: d.value.policyExamples.crit },
])
const daily = computed(() => d.value.events.length > 0 && d.value.events[0].daysAgo != null)
const evChart = computed(() => {
  const E = d.value.events
  const labels = daily.value ? E.map((x) => date(x.daysAgo)) : E.map((x) => clock(x.hr * 60))
  return {
    labels, tipLabels: daily.value ? labels : E.map((x) => DAY[x.day] + ' ' + clock(x.hr * 60)), xTicks: 5, height: 230,
    series: [
      { name: 'مورد انتظار', values: E.map((x) => x.expected), muted: true },
      { name: 'دریافتی', values: E.map((x) => x.received), color: 'var(--series-1)' },
    ],
    yFormat: (v) => compact(v),
  }
})
</script>
