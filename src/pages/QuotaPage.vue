<template>
  <PageShell title="مصرف و سهمیه" :sub="'چه کسی به سقف پلن خورده یا نزدیک است' + (d && d.budgets ? ' — و بودجهٔ پیامک و هوش مصنوعی خودمان' : '')" :sources="['main', 'wallet']" :loading="loading" :error="error">
    <template v-if="d">
      <div class="kpis">
        <KpiTile label="نزدیک سقف پلن" :value="n(k.near)" unit="حساب" info="حسابی که دست‌کم در یک منبع ۸۰٪ سقف پلن یا بیشتر را مصرف کرده" :cmp="n(k.seen30) + ' حساب در ۳۰ روز اخیر فعال بوده‌اند'" />
        <KpiTile label="در سقف (۱۰۰٪)" :value="n(k.full)" unit="حساب" info="دیگر نمی‌توانند در آن منبع چیزی اضافه کنند" to="/quota?sort=usage" :cmp="k.fullTop.map((x) => x.label + ' ' + n(x.n)).join(' · ')" />
        <KpiTile label="بیس در سقف رکورد" :value="n(k.hits)" unit="بیس" :cmp="'در ' + n(k.hitAccounts) + ' حساب'" />
        <KpiTile v-if="d.budgets" label="پیامک این ماه از بودجهٔ ما" :value="pct(k.sms / d.budgets.sms)" info="بستهٔ پیامکی که Airsheet از اپراتور خریده — نه سقف پلن مشتری">
          <template #cmp><UsageMeter label="" :used="k.sms" :limit="d.budgets.sms" :fmt="compact" /></template>
        </KpiTile>
        <KpiTile v-if="d.budgets" label="توکن هوش مصنوعی از بودجهٔ ما" :value="pct(k.ai / d.budgets.ai)" info="سقف ماهانه‌ای که با سرویس‌دهندهٔ هوش مصنوعی داریم — نه سقف پلن مشتری">
          <template #cmp><UsageMeter label="" :used="k.ai" :limit="d.budgets.ai" :fmt="compact" /></template>
        </KpiTile>
      </div>

      <div class="grid g2">
        <PanelCard title="حساب‌های نزدیک سقف در هر منبع" hint="۸۰٪ یا بیشتر · روی هر ردیف بزنید">
          <HBars :items="d.perRes.map((r) => ({ label: r.label, value: r.n, to: '/quota?view=' + r.key }))" :label-width="120" :format="(v) => n(v)" />
          <template #footer><span>یک حساب ممکن است در چند منبع هم‌زمان نزدیک سقف باشد</span><router-link to="/customers?view=upsell">{{ n(d.upsellN) }} حساب آمادهٔ ارتقا</router-link></template>
        </PanelCard>
        <PanelCard title="پیام خودکار داخل محصول" hint="پیشنهاد · حساب‌هایی که در ۱۴ روز اخیر وارد شده‌اند" flush>
          <div class="list" style="padding: 0 16px">
            <div v-for="(r, i) in d.rules" :key="i" class="li" style="align-items: flex-start">
              <StatusBadge :status="r.at" :label="r.atL" />
              <span class="main"><span class="t">{{ r.who }}</span><span class="d" style="white-space: normal">{{ r.what }}</span></span>
              <span class="end"><b style="font-size: 15px">{{ n(r.n) }}</b><div class="muted" style="font-size: 11px">حساب امروز</div></span>
            </div>
          </div>
          <template #footer><span>امروز این پیام‌ها وجود ندارند؛ فقط کارشناس فروش از برخورد با سقف خبردار می‌شود</span></template>
        </PanelCard>
      </div>

      <PanelCard flush>
        <DataTable :rows="d.rows" :columns="columns" :views="views" default-view="all" :filters="filters" :search="search" :sort="{ key: 'hits', dir: 'desc' }" url export-name="quota" unit="حساب" :on-row="(a) => ui.openAccount(a.id)">
          <template #col-name="{ row }"><AccountCell :a="row" /></template>
          <template #col-plan="{ row }"><PlanBadge :plan="row.plan" /></template>
          <template #col-res="{ row }"><span class="nowrap">{{ resOf(row).label }}</span></template>
          <template #col-usage="{ row }"><div style="min-width: 170px; text-align: end"><UsageMeter label="" :used="resOf(row).used" :limit="resOf(row).limit" :fmt="fmtUse(resOf(row).key)" /></div></template>
          <template #col-fc="{ row }">
            <span v-if="resOf(row).forecast === null" class="sig due">رسیده</span>
            <span v-else-if="resOf(row).forecast === 'na' || resOf(row).forecast === 'flat'" class="faint">—<q-tooltip>{{ resOf(row).forecast === 'flat' ? 'در ۳۰ روز اخیر رکوردی اضافه نشده' : 'فقط برای رکورد پیش‌بینی می‌شود' }}</q-tooltip></span>
            <b v-else>{{ inDays(resOf(row).forecast) }}</b>
          </template>
          <template #col-hits="{ row }"><span v-if="row.atLimit" class="sig limit">سقف پر شده</span><span v-else class="sig price">نزدیک سقف</span></template>
          <template #col-act="{ row }">
            <span v-if="row.action" class="badge st-good"><i class="dot" />{{ row.action.kind === 'upgrade' ? 'پیشنهاد ثبت شد' : 'درخواست ثبت شد' }}</span>
            <button v-else-if="row.low" class="btn sm primary" @click.stop="offer(row)"><AppIcon name="up" />پیشنهاد ارتقا</button>
            <button v-else class="btn sm" @click.stop="offer(row)"><AppIcon name="plus" />افزایش سهمیه</button>
          </template>
        </DataTable>
      </PanelCard>
    </template>
  </PageShell>
</template>

<script setup>
import { computed } from 'vue'
import PageShell from 'components/PageShell.vue'
import PanelCard from 'components/PanelCard.vue'
import KpiTile from 'components/KpiTile.vue'
import DataTable from 'components/DataTable.vue'
import UsageMeter from 'components/UsageMeter.vue'
import StatusBadge from 'components/StatusBadge.vue'
import AccountCell from 'components/AccountCell.vue'
import PlanBadge from 'components/PlanBadge.vue'
import AppIcon from 'components/AppIcon.vue'
import HBars from 'components/charts/HBars.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useQueryParam } from 'src/composables/useUrlState'
import { useUiStore } from 'stores/ui'
import { n, fa, pct, compact, money, inDays } from 'src/lib/format'
import { PLAN_ORDER } from 'src/lib/refs'
import { PLAN_NAME, toast } from 'src/lib/ui'

const ui = useUiStore()
const { data: d, loading, error } = useAsync(() => api.quota(), [])
const k = computed(() => d.value.kpis)

// which resource the list is looking at (DataTable keeps `?view=` in the URL)
const view = useQueryParam('view', 'all')
const viewRes = computed(() => (d.value && d.value.resources.some((r) => r.key === view.value) ? view.value : null))
const usageOf = (a, key) => a.usage.find((u) => u.key === key)
const ratioOf = (a, key) => { const u = usageOf(a, key); return u && u.limit ? u.ratio : 0 }
const resOf = (a) => (viewRes.value ? usageOf(a, viewRes.value) : a.maxUsage)
const fmtUse = (key) => (key === 'storage' ? (v) => n(v, 1) : compact)
const fcSort = (a) => { const f = resOf(a).forecast; return f === null ? -1 : f === 'na' || f === 'flat' ? 1e9 : f }
const fcCsv = (a) => { const f = resOf(a).forecast; return f === null ? 0 : f === 'na' || f === 'flat' ? '' : f }

const views = computed(() => [{ key: 'all', label: 'همه', test: null }].concat(d.value.perRes.map((r) => ({ key: r.key, label: r.label, test: (a) => ratioOf(a, r.key) >= 0.8 }))))
const filters = [
  { key: 'plan', label: 'پلن', options: PLAN_ORDER.map((p) => ({ v: p, l: PLAN_NAME[p] })), test: (a, v) => a.plan === v },
  { key: 'seen', label: 'فعالیت', options: [{ v: '14', l: 'فعال در ۱۴ روز' }, { v: '30', l: 'فعال در ۳۰ روز' }], test: (a, v) => a.lastSeenDays <= +v },
]
const search = { placeholder: 'نام حساب یا شخص…', text: (a) => a.name + ' ' + a.contact.first + ' ' + a.contact.last + ' ' + a.slug }
const columns = [
  { key: 'name', label: 'حساب', csv: (a) => a.name },
  { key: 'plan', label: 'پلن', sort: (a) => PLAN_ORDER.indexOf(a.plan), desc: true, csv: (a) => PLAN_NAME[a.plan] },
  { key: 'res', label: 'منبع', sort: (a) => resOf(a).label, csv: (a) => resOf(a).label },
  { key: 'usage', label: 'مصرف', num: true, sort: (a) => resOf(a).ratio, csv: (a) => Math.round(resOf(a).ratio * 100) + '%' },
  { key: 'fc', label: 'رسیدن به ۱۰۰٪', num: true, title: 'با سرعت ۳۰ روز اخیر — فقط برای رکورد قابل پیش‌بینی است', desc: false, sort: fcSort, csv: fcCsv },
  { key: 'hits', label: 'وضعیت سقف', title: 'وضعیت فعلی سهمیهٔ رکورد در پرمصرف‌ترین بیس', sort: (a) => a.atLimit ? 2 : a.nearLimit ? 1 : 0, desc: true, csv: (a) => a.atLimit ? 'سقف پر شده' : 'نزدیک سقف' },
  { key: 'act', label: 'اقدام', sort: false, csv: false },
]

async function offer(a) {
  const u = resOf(a), kind = a.low ? 'upgrade' : 'quota'
  const text = kind === 'upgrade'
    ? 'پیشنهاد ارتقا به ' + a.nextPlan + (a.upgradeValue ? ' (+' + money(a.upgradeValue) + ' در ماه)' : '') + ' — ' + pct(u.ratio) + ' سقف ' + u.label + ' پر شده'
    : 'درخواست افزایش سهمیهٔ ' + u.label + ' — ' + pct(u.ratio) + ' مصرف شده'
  await api.addNote(a.id, { kind: 'offer', offer: kind, key: u.key, text })
  ui.bump()
  toast((kind === 'upgrade' ? 'پیشنهاد ارتقا برای «' : 'درخواست افزایش سهمیه برای «') + a.name + '» ثبت شد', async () => { await api.undoQuotaOffer(a.id, text); ui.bump() })
}
</script>
