<template>
  <PageShell title="منابع جذب" sub="بازدید سایت از کجا می‌آید و چند نفرش ثبت‌نام می‌کنند — بازدید از Google Analytics 4، تا دیروز" range v-model:range="range" :loading="loading" :error="error">
    <template v-if="d">
      <PanelCard v-if="!d.configured" title="Google Analytics وصل نیست">
        <div class="prose">بک‌اند به Google Analytics 4 وصل نیست. <code>GA4_PROPERTY_ID</code>، <code>GA4_CLIENT_EMAIL</code> و <code>GA4_PRIVATE_KEY</code> را در تنظیمات سرور بگذارید تا بازدیدها این‌جا بیایند.</div>
      </PanelCard>

      <template v-else>
        <div v-if="d.covered === false" class="banner warn"><AppIcon name="alert" /><div>از Google Analytics برای این بازه بازدیدی نرسیده<template v-if="d.lastDataDay"> — آخرین روز با داده: <b>{{ date(daysAgo(d.lastDataDay), { year: true }) }}</b></template>. همگام‌سازی کار می‌کند ولی GA خالی برمی‌گرداند؛ احتمالاً تگ GA روی سایت غیرفعال شده. تا وقتی برنگردد، بازدید و نرخ ثبت‌نام «—» می‌مانند.</div></div>
        <div class="kpis">
          <KpiTile label="بازدید سایت" :value="n(k.visits)" :delta="{ cur: k.visits, prev: k.visitsPrev }" :cmp="'قبل: ' + n(k.visitsPrev)" :info="'جلسه‌های سایت در ' + fa(range) + ' روز تا دیروز'" />
          <KpiTile label="بازدیدکنندهٔ تازه" :value="n(k.newUsers)" :delta="{ cur: k.newUsers, prev: k.newUsersPrev }" :cmp="'قبل: ' + n(k.newUsersPrev)" info="کسانی که اولین بار به سایت آمده‌اند" />
          <KpiTile label="ثبت‌نام" :value="n(k.signups)" to="/onboarding" :delta="{ cur: k.signups, prev: k.signupsPrev }" :cmp="'از لینک دعوت: ' + n(k.inviteSignups) + (k.joinedAsCollaborator ? ' · ' + n(k.joinedAsCollaborator) + ' حساب همکار جدا شد' : '')" info="فقط کسانی که خودشان ثبت‌نام کرده‌اند؛ حساب‌هایی که با افزودن همکار به بیس ساخته شده‌اند از سایت نیامده‌اند و شمرده نمی‌شوند" />
          <KpiTile label="نرخ ثبت‌نام" :value="pct(sr, 1)" info="ثبت‌نام ÷ بازدید" :delta="{ cur: sr, prev: srP, points: true }" :cmp="'قبل: ' + pct(srP, 1)" />
        </div>

        <PanelCard title="بازدید به تفکیک کانال" :hint="HINT[grain]">
          <template #actions>
            <div class="seg" role="group" aria-label="بازهٔ نمودار">
              <button v-for="g in GRAINS" :key="g.key" :class="{ on: grain === g.key }" @click="grain = g.key">{{ g.label }}</button>
            </div>
          </template>
          <template v-if="chart.series.length">
            <ColumnChart :options="chart" />
            <div class="legend" style="margin-top: 8px">
              <span v-for="s in chart.series" :key="s.key" class="k"><i class="sw" :style="{ background: s.color }" />{{ s.name }}</span>
              <span v-if="chart.restNames.length" class="k faint">({{ chart.restNames.join('، ') }})</span>
            </div>
          </template>
          <div v-else class="muted" style="padding: 24px 0; text-align: center">در این بازه هنوز بازدیدی از Google Analytics نرسیده است.</div>
          <template #footer><span>{{ syncText }}</span></template>
        </PanelCard>

        <PanelCard title="کانال‌ها" :hint="'بازدید ' + fa(range) + ' روز تا دیروز، در برابر ' + fa(range) + ' روز پیش از آن'" flush>
          <DataTable :rows="rows" :columns="columns" export-name="acquisition" unit="کانال" :page-sizes="false" compact :sort="{ key: 'sessions', dir: 'desc' }">
            <template #col-sessions="{ row }"><b>{{ n(row.sessions) }}</b></template>
            <template #col-share="{ row }">{{ pct(row.share, 1) }}</template>
            <template #col-newUsers="{ row }">{{ n(row.newUsers) }}</template>
            <template #col-prev="{ row }">{{ n(row.prev) }}</template>
            <template #col-change="{ row }"><span v-if="row.change == null" class="faint">تازه</span><template v-else>{{ signedPct(row.change) }}</template></template>
          </DataTable>
          <template #footer><span>بازدید از Google Analytics؛ ثبت‌نام و درآمد هر کانال در کارت پایین</span><router-link to="/funnel">قیف تبدیل</router-link></template>
        </PanelCard>
      </template>

      <template v-if="att">
        <PanelCard title="ثبت‌نام و درآمد بر اساس کانال" :hint="'منبع ' + n(att.tracked) + ' از ' + n(att.selfSignups) + ' ثبت‌نام ثبت شده'" flush>
          <DataTable :rows="channelRows" :columns="channelColumns" export-name="signup-channels" unit="کانال" :page-sizes="false" compact :sort="{ key: 'mrr', dir: 'desc' }">
            <template #col-mrr="{ row }"><b>{{ money(row.mrr) }}</b></template>
            <template #col-conv="{ row }">{{ row.accounts ? pct(row.paying / row.accounts, 1) : '—' }}</template>
          </DataTable>
          <template #footer><span>«ثبت‌نام» و «فعال‌شده» برای {{ fa(range) }} روز اخیر؛ «پرداخت‌کننده» و درآمد برای همهٔ ثبت‌نام‌های آن کانال. منبع از اولین بازدید (utm، لینک دعوت یا سایت ارجاع‌دهنده) هنگام ثبت‌نام ذخیره می‌شود.</span></template>
        </PanelCard>

        <PanelCard v-if="att.campaigns.length" title="کمپین‌ها" hint="بر اساس utm_campaign · همهٔ زمان‌ها" flush>
          <DataTable :rows="campaignRows" :columns="campaignColumns" export-name="campaigns" unit="کمپین" :page-sizes="false" compact :sort="{ key: 'mrr', dir: 'desc' }">
            <template #col-name="{ row }"><span class="ltr">{{ row.name }}</span></template>
            <template #col-mrr="{ row }"><b>{{ money(row.mrr) }}</b></template>
            <template #col-conv="{ row }">{{ row.accounts ? pct(row.paying / row.accounts, 1) : '—' }}</template>
          </DataTable>
        </PanelCard>
      </template>
    </template>
  </PageShell>
</template>

<script setup>
import { ref, computed } from 'vue'
import PageShell from 'components/PageShell.vue'
import PanelCard from 'components/PanelCard.vue'
import KpiTile from 'components/KpiTile.vue'
import DataTable from 'components/DataTable.vue'
import ColumnChart from 'components/charts/ColumnChart.vue'
import AppIcon from 'components/AppIcon.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useRange } from 'src/composables/useRange'
import { n, fa, pct, signedPct, money, date, daysAgo, dateTime, monthLabel } from 'src/lib/format'
import { GA_CHANNEL_NAME, SIGNUP_CHANNEL_NAME } from 'src/lib/refs'

const TOP_CHANNELS = 4
const GRAINS = [{ key: 'day', label: 'روزانه' }, { key: 'week', label: 'هفتگی' }, { key: 'month', label: 'ماهانه' }]
const HINT = { day: 'هر ستون یک روز', week: '۱۲ هفتهٔ اخیر', month: '۱۲ ماه اخیر' }

const range = useRange()
const grain = ref('day')
const { data: d, loading, error } = useAsync(() => api.acquisition({ range: range.value }), [range])
const k = computed(() => d.value.kpis)
const sr = computed(() => (k.value.visits ? k.value.signups / k.value.visits : null))
const srP = computed(() => (k.value.visitsPrev ? k.value.signupsPrev / k.value.visitsPrev : null))
const channelName = (c) => GA_CHANNEL_NAME[c] || c

const buckets = computed(() => {
  if (grain.value === 'week') return d.value.weekly.map((w) => ({ label: date(daysAgo(w.to)), tip: 'هفتهٔ ' + date(daysAgo(w.from)) + ' تا ' + date(daysAgo(w.to)), sessions: w.sessions }))
  if (grain.value === 'month') return d.value.monthly.map((mo) => ({ label: monthLabel(mo), tip: monthLabel(mo, true), sessions: mo.sessions }))
  return d.value.daily.map((x) => ({ label: date(daysAgo(x.day)), tip: date(daysAgo(x.day), { year: true }), sessions: x.sessions }))
})

const chart = computed(() => {
  const B = buckets.value, totals = {}
  B.forEach((b) => Object.entries(b.sessions).forEach(([c, v]) => { totals[c] = (totals[c] || 0) + v }))
  const ranked = Object.keys(totals).filter((c) => totals[c] > 0).sort((p, q) => totals[q] - totals[p])
  const top = ranked.slice(0, TOP_CHANNELS), rest = ranked.slice(TOP_CHANNELS)
  const series = top.map((c, i) => ({ key: c, name: channelName(c), color: 'var(--series-' + (i + 1) + ')', values: B.map((b) => b.sessions[c] || 0) }))
  if (rest.length) series.push({ key: 'rest', name: 'سایر کانال‌ها', color: 'var(--deemph)', values: B.map((b) => rest.reduce((t, c) => t + (b.sessions[c] || 0), 0)) })
  return { labels: B.map((b) => b.label), tipLabels: B.map((b) => b.tip), series, total: 'بازدید', height: 240, restNames: rest.map(channelName) }
})

const syncText = computed(() => {
  const s = d.value.sync
  return 'Google Analytics 4 · ' + (s && s.lastSuccessAt ? 'آخرین همگام‌سازی ' + dateTime(s.lastSuccessAt) : 'هنوز همگام نشده') + (s && s.ok === false ? ' · آخرین تلاش ناموفق: ' + s.error : '')
})

const rows = computed(() => {
  const total = k.value.visits || 0
  return d.value.channels.map((c, i) => ({
    id: i, key: c.channel, name: channelName(c.channel), sessions: c.sessions, share: total ? c.sessions / total : 0,
    newUsers: c.newUsers, prev: c.prevSessions, change: c.prevSessions ? c.sessions / c.prevSessions - 1 : null,
  }))
})
const columns = [
  { key: 'name', label: 'کانال', csv: (r) => r.name },
  { key: 'sessions', label: 'بازدید', num: true },
  { key: 'share', label: 'سهم', num: true, csv: (r) => (r.share * 100).toFixed(1) },
  { key: 'newUsers', label: 'بازدیدکنندهٔ تازه', num: true },
  { key: 'prev', label: 'بازهٔ قبل', num: true },
  { key: 'change', label: 'تغییر', num: true, sort: (r) => (r.change == null ? Infinity : r.change), csv: (r) => (r.change == null ? '' : (r.change * 100).toFixed(1)) },
]

const att = computed(() => d.value.attribution || null)
const channelRows = computed(() => {
  const recent = new Map(att.value.signupsByChannel.map((r) => [r.channel, r]))
  const keys = new Set([...att.value.revenueByChannel.map((r) => r.channel), ...recent.keys()])
  return [...keys].map((c) => {
    const all = att.value.revenueByChannel.find((r) => r.channel === c) || { accounts: 0, paying: 0, mrr: 0 }
    const r = recent.get(c) || { accounts: 0, activated: 0 }
    return { id: c, name: SIGNUP_CHANNEL_NAME[c] || c, signups: r.accounts, activated: r.activated, accounts: all.accounts, paying: all.paying, mrr: all.mrr }
  })
})
const conversionColumns = [
  { key: 'accounts', label: 'کل ثبت‌نام', num: true, format: (r) => n(r.accounts) },
  { key: 'paying', label: 'پرداخت‌کننده', num: true, format: (r) => n(r.paying) },
  { key: 'conv', label: 'نرخ پرداخت', num: true, sort: (r) => (r.accounts ? r.paying / r.accounts : 0), csv: (r) => (r.accounts ? ((r.paying / r.accounts) * 100).toFixed(1) : '') },
  { key: 'mrr', label: 'درآمد ماهانه', num: true },
]
const channelColumns = [
  { key: 'name', label: 'کانال', csv: (r) => r.name },
  { key: 'signups', label: 'ثبت‌نام در بازه', num: true, format: (r) => n(r.signups) },
  { key: 'activated', label: 'فعال‌شده در بازه', num: true, format: (r) => n(r.activated) },
  ...conversionColumns,
]
const campaignRows = computed(() => att.value.campaigns.map((c) => ({ id: c.key, name: c.key, accounts: c.accounts, paying: c.paying, mrr: c.mrr })))
const campaignColumns = [{ key: 'name', label: 'کمپین', csv: (r) => r.name }, ...conversionColumns]
</script>
