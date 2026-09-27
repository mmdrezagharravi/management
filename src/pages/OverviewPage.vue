<template>
  <PageShell title="نمای کلی" sub="خلاصهٔ وضعیت کسب‌وکار — هر عدد با بازهٔ هم‌طول قبلی مقایسه شده است" range v-model:range="range" :sources="['main', 'wallet']" :banner="false" :loading="loading" :error="error">
    <template v-if="d">
      <PanelCard v-if="d.inventory" title="آمار دقیق سامانه" :hint="d.inventory.recordsSyncedAt ? 'شمارش رکورد: ' + dateTime(d.inventory.recordsSyncedAt) : 'شمارش رکورد هنوز همگام نشده'">
        <div class="kpis inventory-kpis">
          <KpiTile label="کل کاربران ثبت‌شده" :value="n(d.inventory.users)" unit="کاربر" info="شمارش مستقیم کالکشن User؛ شامل همه پلن‌ها" />
          <KpiTile label="بیس‌های فعال" :value="n(d.inventory.bases.active)" unit="بیس" :cmp="n(d.inventory.bases.deleted) + ' حذف‌شده · ' + n(d.inventory.bases.total) + ' کل'" info="بیس فعال یعنی deletedBy ندارد" to="/bases" />
          <KpiTile label="رکورد بیس‌های فعال" :value="n(d.inventory.records.active)" unit="رکورد" :cmp="n(d.inventory.records.deleted) + ' رکورد در بیس‌های حذف‌شده'" info="شمارش از موتور داده پس از dedup و حذف رکوردهای deleted" to="/bases" />
        </div>
      </PanelCard>
      <div class="kpis">
        <KpiTile label="درآمد ماهانهٔ تکرارشونده" :value="cp(k.mrr.now).num" :unit="cp(k.mrr.now).unit + ' ' + CURRENCY" to="/revenue" info="MRR: جمع اشتراک‌های فعال به ماه (سالانه‌ها تقسیم بر ۱۲)" :delta="{ cur: k.mrr.now, prev: k.mrr.prev }" :cmp="'قبل: ' + compact(k.mrr.prev)" :spark="{ values: k.mrr.spark, area: true }" />
        <KpiTile label="مشتری پرداخت‌کننده" :value="n(k.paying.now)" to="/customers" :delta="{ cur: k.paying.now, prev: k.paying.prev }" :cmp="'قبل: ' + n(k.paying.prev)" :spark="{ values: k.paying.spark }" />
        <KpiTile label="حساب فعال در ۷ روز" :value="n(k.wau.now)" info="حسابی که در ۷ روز اخیر دست‌کم یک رویداد داشته" :delta="{ cur: k.wau.now, prev: k.wau.prev }" :cmp="k.wau.users == null ? null : n(k.wau.users) + ' کاربر فعال'" :spark="{ values: k.wau.spark }" />
        <KpiTile :label="'ثبت‌نام در ' + fa(range) + ' روز'" :value="n(k.signups.now)" to="/onboarding" :delta="{ cur: k.signups.now, prev: k.signups.prev }" :cmp="'قبل: ' + n(k.signups.prev)" :spark="{ values: k.signups.spark }" />
        <KpiTile label="نرخ فعال‌سازی" :value="pct(k.activation.now)" to="/funnel" :info="'سهم ثبت‌نام‌هایی که در ۷ روز اول به ' + k.activation.records + ' رکورد رسیده‌اند (کوهورت‌های بالغ)'" :delta="{ cur: k.activation.now, prev: k.activation.prev, points: true }" :cmp="'قبل: ' + pct(k.activation.prev)" />
        <KpiTile label="درآمد در خطر" :value="cp(k.riskMrr.now).num" :unit="cp(k.riskMrr.now).unit + ' ' + CURRENCY" to="/health" info="MRR مشتریانی که امتیاز سلامت زیر ۵۰ یا پرداخت ناموفق دارند" :delta="{ cur: k.riskMrr.now, prev: k.riskMrr.prev, goodUp: false }" :cmp="fa(k.riskMrr.count) + ' مشتری · ' + pct(k.riskMrr.share) + ' از کل'" />
      </div>

      <div class="grid g-main">
        <PanelCard title="درآمد ماهانه (MRR)" hint="۱۲ ماه اخیر · تومان">
          <template #actions><router-link class="btn sm ghost" to="/revenue">جزئیات درآمد<AppIcon name="chevronL" /></router-link></template>
          <LineChart v-if="d.months.length" :options="mrrChart" />
          <div v-else class="note">این بخش هنوز از بک‌اند داده نمی‌گیرد.</div>
          <div class="row wrap" style="gap: 8px; margin-top: 12px">
            <div v-for="c in moveChips" :key="c.label" class="mvchip"><div class="muted" style="font-size: 11.5px">{{ c.label }}</div><div style="font-weight: 800; font-size: 15px">{{ signed(c.v) }}</div><div class="faint" style="font-size: 11px">{{ fa(c.count) }} حساب</div></div>
            <div class="mvchip" style="background: var(--surface-3); border-color: transparent"><div class="muted" style="font-size: 11.5px">خالص در {{ fa(range) }} روز</div><div style="font-weight: 800; font-size: 15px">{{ signed(net) }}</div><div class="faint" style="font-size: 11px">{{ d.mrrPrev ? signedPct(net / d.mrrPrev, 1) : '—' }}</div></div>
          </div>
          <div class="section-title" style="margin: 18px 0 8px">ترکیب درآمد ماهانه بر اساس پلن</div>
          <Stack100 :options="{ parts: d.planMix.map((p) => ({ label: PLAN_NAME[p.plan], value: p.mrr, color: 'var(--plan-' + p.plan + ')' })), format: compact }" />
        </PanelCard>
        <div class="stack">
          <PanelCard title="نیازمند توجه" :hint="fa(d.attention.length) + ' مورد'" flush>
            <div class="list" style="padding: 0 16px">
              <router-link v-for="(x, i) in d.attention" :key="i" class="li" :to="x.to"><i class="dot" :style="{ background: STATUS_COLOR[x.lvl] }" /><span class="main"><span class="t">{{ x.t }}</span><span class="d">{{ x.mrr ? money(x.mrr) + ' ' : '' }}{{ x.d }}</span></span><AppIcon name="chevronL" cls="faint" /></router-link>
            </div>
          </PanelCard>
          <PanelCard title="بیشترین درآمد در خطر" hint="روی نام بزنید" flush>
            <div class="list" style="padding: 0 16px">
              <div v-for="a in d.topRisk" :key="a.id" class="li"><span class="main"><AccountLink :id="a.id" :name="a.name" cls="t" /><span class="d">{{ a.pastDue ? 'پرداخت ناموفق · ' : '' }}تمدید {{ inDays(a.renewIn) }}</span></span><span class="end"><HealthScore :score="a.health" /><div class="muted" style="font-size: 11.5px; margin-top: 2px">{{ compact(a.mrr) }}</div></span></div>
            </div>
            <template #footer><span>{{ fa(k.riskMrr.count) }} مشتری در خطر</span><router-link to="/health">همه را ببینید</router-link></template>
          </PanelCard>
        </div>
      </div>

      <div class="grid g3">
        <PanelCard title="حساب‌های فعال روزانه" hint="۹۰ روز">
          <LineChart :options="dauChart" />
          <div class="legend" style="margin-top: 8px"><span class="k"><i class="ln" style="background: var(--series-1)" />میانگین ۷ روزه</span><span class="k"><i class="ln" style="background: var(--deemph)" />روزانه (جمعه‌ها افت دارد)</span></div>
        </PanelCard>
        <PanelCard title="ثبت‌نام و فعال‌سازی" hint="۱۲ هفته">
          <ColumnChart :options="signupChart" />
          <div class="legend" style="margin-top: 8px"><span class="k"><i class="sw" style="background: var(--series-1)" />فعال شد</span><span class="k"><i class="sw" style="background: var(--deemph)" />هنوز فعال نشده</span></div>
        </PanelCard>
        <PanelCard title="قیف ۹۰ روز" hint="ثبت‌نام‌های ۹۰ تا ۳۰ روز پیش">
          <HBars :items="d.funnel.map((s) => ({ label: s.label, value: s.n, note: pct(s.fromStart) }))" :label-width="78" />
          <template #footer><span>کوهورت بالغ؛ هر پله نسبت به ثبت‌نام</span><router-link to="/funnel">قیف کامل</router-link></template>
        </PanelCard>
      </div>

      <div class="grid g2">
        <PanelCard title="بزرگ‌ترین فرصت‌های ارتقا" hint="به سقف خورده‌اند و قیمت را دیده‌اند" flush>
          <div class="tbl-wrap"><table class="tbl compact">
            <thead><tr><th>مشتری</th><th>سیگنال</th><th class="num">ارزش ارتقا / ماه</th></tr></thead>
            <tbody><tr v-for="a in d.upsell.top" :key="a.id">
              <td><AccountCell :a="a"><template #sub>{{ PLAN_NAME[a.plan] }} · {{ a.maxUsage.label }} {{ pct(a.maxUsage.ratio) }}</template></AccountCell></td>
              <td><SignalChips :a="a" /></td><td class="num"><b>+{{ compact(a.upgradeValue) }}</b></td>
            </tr></tbody>
          </table></div>
          <template #footer><span>{{ fa(d.upsell.total) }} حساب آمادهٔ ارتقا</span><router-link to="/customers?view=upsell">فهرست کامل</router-link></template>
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
import AccountCell from 'components/AccountCell.vue'
import AccountLink from 'components/AccountLink.vue'
import HealthScore from 'components/HealthScore.vue'
import SignalChips from 'components/SignalChips.vue'
import LineChart from 'components/charts/LineChart.vue'
import ColumnChart from 'components/charts/ColumnChart.vue'
import Stack100 from 'components/charts/Stack100.vue'
import HBars from 'components/charts/HBars.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useRange } from 'src/composables/useRange'
import { n, fa, pct, compact, compactParts as cp, money, signed, signedPct, inDays, initials, date, dateTime, monthLabel, CURRENCY } from 'src/lib/format'
import { PLAN_NAME, STATUS_COLOR } from 'src/lib/ui'

const range = useRange()
const { data: d, loading, error } = useAsync(() => api.overview({ range: range.value }), [range])
const k = computed(() => d.value.kpis)
const net = computed(() => { const m = d.value.movements; return m.new + m.expansion + m.contraction + m.churn })
const moveChips = computed(() => { const m = d.value.movements; return [
  { label: 'مشتری جدید', v: m.new, count: m.newCount }, { label: 'افزایش پلن/همکار', v: m.expansion, count: m.expCount },
  { label: 'کاهش', v: m.contraction, count: m.conCount }, { label: 'ریزش', v: m.churn, count: m.churnCount }] })
const mrrChart = computed(() => ({
  labels: d.value.months.map((m) => monthLabel(m)), tipLabels: d.value.months.map((m) => monthLabel(m, true) + (m.end === 0 ? ' (تا امروز)' : '')),
  series: [{ name: 'MRR', values: d.value.months.map((m) => m.mrr) }], height: 230, yFormat: compact, endFormat: compact, tipFormat: money,
}))
const dauChart = computed(() => {
  const { daily, lastDay = 0 } = d.value.dailyActive
  const labels = []; for (let i = daily.length - 1; i >= 0; i--) labels.push(date(i + lastDay))
  return { labels, xTicks: 4, series: [{ name: 'روزانه', values: d.value.dailyActive.daily, muted: true }, { name: 'میانگین ۷ روزه', values: d.value.dailyActive.ma, color: 'var(--series-1)' }], area: false, height: 200 }
})
const signupChart = computed(() => {
  const wl = d.value.signupWeeks.map((w) => date(w.daysAgo))
  return { labels: wl, xEvery: 3, tipLabels: wl.map((l) => 'هفتهٔ ' + l), total: 'ثبت‌نام', height: 200,
    series: [{ name: 'فعال شد', values: d.value.signupWeeks.map((w) => w.activated), color: 'var(--series-1)' }, { name: 'هنوز فعال نشده', values: d.value.signupWeeks.map((w) => w.pending), color: 'var(--deemph)' }] }
})
</script>

<style scoped>
.inventory-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.mvchip { flex: 1; min-width: 110px; border: 1px solid var(--border); border-radius: 9px; padding: 8px 11px; }
@media (max-width: 800px) { .inventory-kpis { grid-template-columns: 1fr; } }
</style>
