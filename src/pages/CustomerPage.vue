<template>
  <PageShell :title="d ? a.name : 'پروفایل مشتری'" :sources="['main', 'behavior', 'wallet']" :banner="false" :loading="loading" :error="error">
    <template #crumbs><router-link to="/customers">مشتریان</router-link> › <span v-if="d && d.fallback" class="faint">نمونه: بیشترین درآمد در خطر</span></template>
    <template v-if="d" #sub><PlanBadge :plan="a.plan" /><template v-if="a.industryName"> · {{ a.industryName }}</template><template v-if="a.city"> · {{ a.city }}</template> · عضو از {{ date(a.age, { year: true }) }} ({{ sourceName(a.source) }})</template>
    <template v-if="d" #actions>
      <select class="select" aria-label="مسئول" :value="a.owner || ''" @change="changeOwner($event.target.value)">
        <option value="">بدون مسئول</option><option v-for="r in REPS" :key="r.id" :value="r.id">مسئول: {{ r.name }}</option>
      </select>
      <button class="btn" @click="dialogs.addNote(a)"><AppIcon name="note" />یادداشت</button>
      <button class="btn primary" @click="dialogs.logCall(a)"><AppIcon name="phone" />ثبت تماس</button>
    </template>

    <template v-if="d">
      <div v-if="a.pastDue" class="banner crit"><AppIcon name="card" /><div><b>پرداخت تمدید ناموفق.</b> آخرین فاکتور<template v-if="d.lastInvoiceRetries"> {{ fa(d.lastInvoiceRetries) }} بار تلاش شده و</template> پرداخت نشده و اشتراک در دورهٔ مهلت است — پیش از هر کار دیگر پیگیری کنید.</div></div>
      <div v-if="a.churnedAt != null" class="banner"><AppIcon name="alert" /><div><b>این مشتری {{ agoDays(a.churnedAt) }} اشتراکش را لغو کرد</b> ({{ a.churnReason }}). اگر کمتر از ۱۲۰ روز گذشته، در فهرست «بازگرداندنی» میز فروش است.</div></div>

      <div class="kpis">
        <KpiTile label="درآمد ماهانه" :value="a.mrr ? cp(a.mrr).num : '—'" :unit="a.mrr ? cp(a.mrr).unit + ' ' + CURRENCY : ''" :cmp="a.paying ? 'پلن ' + PLAN_NAME[a.plan] + ' · ' + CYCLE_NAME[a.cycle] + (a.plan !== 'basic' ? ' · ' + fa(a.seats) + ' صندلی' : '') : 'پلن رایگان'" />
        <KpiTile label="امتیاز سلامت" :value="n(a.health)" :unit="bandLabel" :delta="a.health2wAgo != null ? { cur: a.health, prev: a.health2wAgo, abs: true } : null" cmp="نسبت به دو هفته پیش" :spark="{ values: a.healthHistory.filter((x) => x != null), color: 'var(--ink-2)' }" />
        <KpiTile label="آخرین فعالیت" :cmp="fa(a.activeDays28) + ' روز فعال از ۲۸ روز'">
          <template #value><span v-if="a.online" class="live" style="font-size: 20px"><i />آنلاین</span><template v-else>{{ ago(a.lastSeenMin) }}</template></template>
        </KpiTile>
        <KpiTile label="اعضای فعال این هفته" :value="n(a.activeMembers7)" :unit="'از ' + n(a.memberCount)">
          <template #cmp>
            <template v-if="a.paying && a.plan !== 'basic'"><b v-if="a.memberCount >= a.seats" style="color: var(--warn-ink)">همهٔ {{ fa(a.seats) }} صندلی پر است</b><template v-else>{{ fa(a.seats - a.memberCount) }} صندلی خالی</template></template>
            <template v-else>سقف پلن: {{ fa(d.limits.seats) }} نفر</template>
          </template>
        </KpiTile>
        <KpiTile v-if="a.paying" label="تمدید بعدی" :value="inDays(a.renewIn)">
          <template #cmp>{{ date(-a.renewIn, { year: true }) }}<template v-if="a.renewIn <= 14 && a.health < 60"> · <b style="color: var(--crit-ink)">در خطر</b></template></template>
        </KpiTile>
        <KpiTile v-else label="ارزش ارتقا" :value="'+' + compact(a.upgradeValue)" unit="در ماه">
          <template #cmp><b v-if="a.segments.includes('upsell')" style="color: var(--accent-ink)">آمادهٔ ارتقا</b><template v-else>بدون سیگنال خرید</template></template>
        </KpiTile>
        <KpiTile label="جمع پرداخت‌ها" :value="d.paidTotal ? cp(d.paidTotal).num : '—'" :unit="d.paidTotal ? cp(d.paidTotal).unit + ' ' + CURRENCY : ''" :cmp="fa(d.paidCount) + ' فاکتور · مشتری ' + (a.tenureDays ? fa(Math.round(a.tenureDays / 30)) + ' ماه' : '—')" />
      </div>

      <div class="card"><div class="tabs" style="padding: 0 12px" role="tablist">
        <button v-for="t in tabs" :key="t.key" role="tab" :class="{ on: t.key === tab }" @click="tab = t.key">{{ t.label }} <span v-if="t.n != null" class="n">{{ fa(t.n) }}</span></button>
      </div></div>

      <!-- summary -->
      <div v-if="tab === 'summary'" class="grid g-main">
        <div class="stack">
          <PanelCard :title="'فعالیت ' + fa(act90.series[0].values.length) + ' روز'" hint="ویرایش در روز">
            <ColumnChart v-if="act90.series[0].values.length" :options="act90" /><div v-else class="note">این بخش هنوز از بک‌اند داده نمی‌گیرد.</div>
            <div class="row wrap" style="gap: 18px; margin-top: 10px; font-size: 12px">
              <span><span class="muted">رکورد ساخته‌شده در ۳۰ روز:</span> <b>{{ n(a.records30) }}</b></span>
              <span><span class="muted">روند ۱۴ روزه:</span> <DeltaChip v-if="a.trendPct" :cur="100 + a.trendPct" :prev="100" /><b v-else>بدون تغییر</b></span>
              <span><span class="muted">اعضای فعال امروز:</span> <b>{{ n(d.activeMembersToday) }}</b></span>
            </div>
          </PanelCard>
          <PanelCard title="مسیر این مشتری" hint="از اولین بازدید تا امروز">
            <div class="tl"><div v-for="(e, i) in d.timeline" :key="i" class="ev" :class="e.cls"><div class="t">{{ e.title }} <span class="w">{{ date(e.t, { year: true }) }}</span></div><div class="d">{{ e.desc }}</div></div></div>
          </PanelCard>
        </div>
        <div class="stack">
          <PanelCard :title="'چرا امتیاز سلامت ' + fa(a.health) + ' است؟'" :hint="bandLabel">
            <div v-for="c in HEALTH_COMPONENTS" :key="c.key" class="comp"><span>{{ c.label }}</span><span class="tr"><i :style="{ width: (a.components[c.key] / 20) * 100 + '%', background: c.key === d.weakest ? 'var(--serious)' : undefined }" /></span><b>{{ n(a.components[c.key]) }}</b><q-tooltip>{{ c.desc }}</q-tooltip></div>
            <div class="banner info" style="margin-top: 12px"><AppIcon name="target" /><div><b>قدم بعدی:</b> {{ d.nextStep }}</div></div>
          </PanelCard>
          <PanelCard title="سیگنال‌ها">
            <div class="kv"><span class="k">برخورد با سقف پلن (۳۰ روز)</span><span class="v"><span v-if="a.limitHits30" class="sig limit">{{ fa(a.limitHits30) }} بار · {{ a.maxUsage.label }}</span><template v-else>—</template></span></div>
            <div class="kv"><span class="k">بازدید صفحهٔ قیمت (۳۰ روز)</span><span class="v"><span v-if="a.pricingVisits30" class="sig price">{{ fa(a.pricingVisits30) }} بار</span><template v-else>—</template></span></div>
            <div class="kv"><span class="k">تیکت پشتیبانی باز</span><span class="v"><span v-if="a.tickets" class="sig due">{{ fa(a.tickets) }}</span><template v-else>—</template></span></div>
            <div class="kv"><span class="k">آخرین نظرسنجی NPS</span><span class="v"><template v-if="a.nps != null">{{ fa(a.nps) }} از ۱۰ <StatusBadge v-if="a.nps >= 9" status="good" label="مروج" /><StatusBadge v-else-if="a.nps >= 7" status="warn" label="خنثی" /><StatusBadge v-else status="crit" label="منتقد" /></template><span v-else class="faint">پاسخ نداده</span></span></div>
            <div class="kv"><span class="k">دسته‌ها</span><span class="v"><template v-if="a.segments.length"><router-link v-for="k in a.segments" :key="k" class="tag" :to="'/segments?seg=' + k" style="margin-inline-start: 4px">{{ SEGMENT_LABEL[k] }}</router-link></template><template v-else>—</template></span></div>
          </PanelCard>
          <PanelCard title="مصرف پلن" :hint="'پلن ' + PLAN_NAME[a.plan]">
            <div class="stack" style="gap: 10px"><UsageMeter v-for="u in a.usage.filter((x) => x.limit)" :key="u.key" :label="u.label" :used="u.used" :limit="u.limit" :fmt="u.key === 'storage' ? (v) => n(v, 1) : undefined" /></div>
          </PanelCard>
          <PanelCard title="قابلیت‌ها" :hint="fa(Object.keys(a.feat).length) + ' از ' + fa(d.featureList.length)">
            <div v-for="f in d.featureList" :key="f.key" class="kv"><span class="k" :style="{ color: a.feat[f.key] ? 'var(--ink)' : 'var(--faint)' }">{{ f.label }}</span><span class="v"><span v-if="a.feat[f.key]" class="muted" style="font-weight: 400">{{ a.feat[f.key].last != null ? 'آخرین بار ' + agoDays(a.feat[f.key].last) : fa(a.feat[f.key].count) + ' بار در ۹۰ روز' }}</span><span v-else class="faint" style="font-weight: 400">استفاده نکرده</span></span></div>
          </PanelCard>
        </div>
      </div>

      <!-- activity -->
      <template v-if="tab === 'activity'">
        <div class="grid g2">
          <PanelCard title="ویرایش در روز" :hint="fa(d.ev120.length) + ' روز'"><ColumnChart v-if="d.ev120.length" :options="ev120" /><div v-else class="note">این بخش هنوز از بک‌اند داده نمی‌گیرد.</div></PanelCard>
          <PanelCard title="کاربران فعال در روز" :hint="fa(d.au120.length || d.ev120.length) + ' روز · از ' + fa(a.memberCount) + ' عضو'"><ColumnChart v-if="d.au120.length" :options="au120" /><div v-else class="note">این بخش هنوز از بک‌اند داده نمی‌گیرد.</div></PanelCard>
        </div>
        <PanelCard v-if="a.wk.length" title="هفته‌های فعال از روز ثبت‌نام" :hint="fa(a.wk.length) + ' هفته · ' + pct(a.wk.reduce((s, x) => s + x, 0) / a.wk.length) + ' فعال'">
          <SparkLine :values="a.wk" :w="Math.min(1100, a.wk.length * 14)" :h="34" bars />
          <div class="note" style="margin-top: 6px">هر ستون یک هفته است؛ ستون خاکستری یعنی آن هفته هیچ فعالیتی نبوده. <template v-if="a.decline">افت از حدود {{ agoDays(a.decline.start) }} شروع شده است.</template></div>
        </PanelCard>
      </template>

      <!-- members -->
      <template v-if="tab === 'members'">
        <PanelCard flush>
          <DataTable :rows="d.members" :columns="memberCols" :page-size="25" unit="عضو" :export-name="'members-' + a.slug" :sort="{ key: 'lastSeen', dir: 'asc' }">
            <template #col-name="{ row }"><span class="row"><span class="avatar">{{ initials(row.name) }}</span><b>{{ row.name }}</b></span></template>
            <template #col-role="{ row }"><span v-if="row.role === 'مالک'" class="badge st-info">{{ row.role }}</span><template v-else>{{ row.role }}</template></template>
            <template #col-joined="{ row }"><template v-if="row.joined != null">{{ date(row.joined, { year: true }) }}</template><span v-else class="faint">—</span></template>
            <template #col-lastSeen="{ row }">{{ agoDays(row.lastSeen) }}</template>
            <template #col-active="{ row }"><StatusBadge v-if="row.lastSeen <= 6" status="good" label="فعال" /><span v-else class="faint">غیرفعال</span></template>
          </DataTable>
        </PanelCard>
        <div class="note">سقف پلن و صندلی‌های خریداری‌شده در کارت «اعضای فعال» بالای صفحه آمده است. شمارهٔ تماس اعضا فقط برای نقش‌های مجاز نمایش داده می‌شود.</div>
      </template>

      <!-- bases -->
      <PanelCard v-if="tab === 'bases'" flush>
        <DataTable :rows="d.bases" :columns="baseCols" unit="بیس" :export-name="'bases-' + a.slug" :sort="{ key: 'records', dir: 'desc' }" :on-row="(b) => router.push('/bases/' + b.id)" empty-title="هنوز بیسی نساخته" :empty="'این مشتری ثبت‌نام کرده ولی بیسی نساخته است — ایمیل تمپلیت‌های صنعت ' + a.industryName + ' را بفرستید.'">
          <template #col-name="{ row }"><router-link class="nm" :to="'/bases/' + row.id">{{ row.name }}</router-link><span class="s mono">/{{ row.slug }}</span></template>
          <template #col-tables="{ row }">{{ n(row.tables) }}</template>
          <template #col-records="{ row }">{{ n(row.records) }}</template>
          <template #col-automations="{ row }">{{ n(row.automations) }}</template>
          <template #col-pages="{ row }">{{ n(row.pages) }}</template>
          <template #col-collaborators="{ row }">{{ n(row.collaborators) }}</template>
          <template #col-created="{ row }">{{ date(row.created, { year: true }) }}</template>
          <template #col-lastActive="{ row }">{{ agoDays(row.lastActive) }}</template>
        </DataTable>
      </PanelCard>

      <!-- billing -->
      <div v-if="tab === 'billing'" class="grid g-main">
        <PanelCard flush>
          <DataTable :rows="d.invoices.slice().reverse()" :columns="invoiceCols" unit="فاکتور" :export-name="'invoices-' + a.slug" :sort="{ key: 't', dir: 'asc' }" empty-title="فاکتوری نیست" empty="این مشتری هنوز خریدی نداشته است.">
            <template #col-t="{ row }">{{ date(row.t, { year: true }) }}</template>
            <template #col-plan="{ row }"><PlanBadge :plan="row.plan" /></template>
            <template #col-amount="{ row }">{{ n(row.amount) }}</template>
            <template #col-status="{ row }"><StatusBadge v-if="row.status === 'paid'" status="good" label="پرداخت شد" /><StatusBadge v-else status="crit" :label="'ناموفق · ' + fa(row.retries) + ' تلاش'" /></template>
          </DataTable>
        </PanelCard>
        <div class="stack">
          <PanelCard title="اشتراک">
            <template v-if="a.paying">
              <div class="kv"><span class="k">پلن</span><span class="v"><PlanBadge :plan="a.plan" /></span></div>
              <div class="kv"><span class="k">دورهٔ پرداخت</span><span class="v">{{ CYCLE_NAME[a.cycle] }}<template v-if="d.cycleDiscount"> ({{ pct(d.cycleDiscount) }} تخفیف)</template></span></div>
              <div class="kv"><span class="k">صندلی</span><span class="v">{{ fa(a.seats) }}</span></div>
              <div class="kv"><span class="k">درآمد ماهانه</span><span class="v">{{ money(a.mrr) }}</span></div>
              <div class="kv"><span class="k">تمدید بعدی</span><span class="v">{{ date(-a.renewIn, { year: true }) }} · {{ inDays(a.renewIn) }}</span></div>
            </template>
            <div v-else class="note">{{ a.everPaid ? 'این مشتری قبلاً پرداخت می‌کرد و اکنون روی پلن رایگان است.' : 'هنوز پرداختی نداشته است.' }}</div>
          </PanelCard>
          <PanelCard title="تغییرات پلن">
            <div v-if="d.planEvents.length" class="tl">
              <div v-for="(e, i) in d.planEvents" :key="i" class="ev" :class="e.cls"><div class="t">{{ date(e.t, { year: true }) }} — {{ e.title }}</div><div class="d"><template v-if="e.kind === 'churn'">{{ a.churnReason || '' }}</template><template v-else>پلن {{ PLAN_NAME[e.plan] }} · {{ fa(e.seats) }} صندلی · {{ CYCLE_NAME[e.cycle] }} · {{ money(e.mrr) }} در ماه</template></div></div>
            </div>
            <div v-else class="note">تغییری ثبت نشده.</div>
          </PanelCard>
        </div>
      </div>

      <!-- log -->
      <PanelCard v-if="tab === 'log'" title="تعامل‌ها" hint="تماس، ایمیل، جلسه و قرارداد" flush>
        <template #actions><button class="btn sm" @click="dialogs.addNote(a)"><AppIcon name="note" />یادداشت</button><button class="btn sm primary" @click="dialogs.logCall(a)"><AppIcon name="phone" />ثبت تماس</button></template>
        <div v-if="d.log.length" class="list" style="padding: 0 16px">
          <div v-for="(r, i) in d.log" :key="i" class="li"><span class="tag">{{ r.kind }}</span><span class="main"><span class="t" style="font-weight: 600">{{ r.what }}</span><span class="d">{{ r.who }}</span></span><span class="end faint">{{ r.local ? 'همین مرورگر' : agoDays(r.t) + ' ' + clock(r.min) }}</span></div>
        </div>
        <div v-else class="empty"><b>هنوز تعاملی ثبت نشده</b>اولین تماس را ثبت کنید تا همکاران هم ببینند.</div>
      </PanelCard>
    </template>
  </PageShell>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageShell from 'components/PageShell.vue'
import PanelCard from 'components/PanelCard.vue'
import KpiTile from 'components/KpiTile.vue'
import DataTable from 'components/DataTable.vue'
import AppIcon from 'components/AppIcon.vue'
import PlanBadge from 'components/PlanBadge.vue'
import StatusBadge from 'components/StatusBadge.vue'
import DeltaChip from 'components/DeltaChip.vue'
import UsageMeter from 'components/UsageMeter.vue'
import ColumnChart from 'components/charts/ColumnChart.vue'
import SparkLine from 'components/charts/SparkLine.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useQueryParam } from 'src/composables/useUrlState'
import { useDialogs } from 'src/composables/useDialogs'
import { useUiStore } from 'stores/ui'
import { n, fa, pct, compact, compactParts as cp, money, date, ago, agoDays, inDays, clock, initials, CURRENCY } from 'src/lib/format'
import { REPS, CYCLE_NAME, HEALTH_COMPONENTS, SEGMENT_LABEL, sourceName } from 'src/lib/refs'
import { PLAN_NAME, band, toast } from 'src/lib/ui'

const route = useRoute(), router = useRouter(), ui = useUiStore(), dialogs = useDialogs()
const tab = useQueryParam('tab', 'summary')
const { data: d, loading, error } = useAsync(() => api.customer(route.params.id), [() => route.params.id])
const a = computed(() => d.value.account)
const bandLabel = computed(() => band(a.value.health).label)
const tabs = computed(() => [
  { key: 'summary', label: 'خلاصه' }, { key: 'activity', label: 'فعالیت' },
  { key: 'members', label: 'اعضا', n: a.value.memberCount }, { key: 'bases', label: 'بیس‌ها', n: a.value.bases },
  { key: 'billing', label: 'مالی', n: d.value.invoices.length }, { key: 'log', label: 'تعامل‌ها', n: d.value.log.length },
])

const labels = (days) => { const l = []; for (let i = days - 1; i >= 0; i--) l.push(date(i)); return l }
// the mock gives 120 days, the backend 90: size the charts by what came back
const act90 = computed(() => { const v = d.value.ev120.slice(-90); return { labels: labels(v.length), xEvery: 15, series: [{ name: 'ویرایش', values: v }], height: 190 } })
const ev120 = computed(() => ({ labels: labels(d.value.ev120.length), xEvery: 20, series: [{ name: 'ویرایش', values: d.value.ev120 }], height: 200 }))
const au120 = computed(() => ({ labels: labels(d.value.au120.length), xEvery: 20, series: [{ name: 'کاربر فعال', values: d.value.au120 }], height: 200 }))

const memberCols = [
  { key: 'name', label: 'عضو', csv: (m) => m.name },
  { key: 'role', label: 'نقش', csv: (m) => m.role },
  { key: 'joined', label: 'عضو از', sort: (m) => -(m.joined ?? 0), csv: (m) => (m.joined != null ? date(m.joined, { year: true }) : '') },
  { key: 'lastSeen', label: 'آخرین فعالیت', csv: (m) => m.lastSeen },
  { key: 'active', label: 'این هفته', sort: (m) => (m.lastSeen <= 6 ? 1 : 0), csv: (m) => (m.lastSeen <= 6 ? 'فعال' : 'غیرفعال') },
]
const baseCols = [
  { key: 'name', label: 'بیس', csv: (b) => b.name },
  { key: 'tables', label: 'جدول', num: true },
  { key: 'records', label: 'رکورد', num: true },
  { key: 'automations', label: 'اتوماسیون', num: true },
  { key: 'pages', label: 'صفحهٔ درگاه', num: true },
  { key: 'collaborators', label: 'همکار', num: true },
  { key: 'created', label: 'ساخته‌شده', sort: (b) => -b.created, csv: (b) => date(b.created, { year: true }) },
  { key: 'lastActive', label: 'آخرین فعالیت', sort: (b) => -b.lastActive, csv: (b) => b.lastActive },
]
const invoiceCols = [
  { key: 't', label: 'تاریخ', csv: (v) => date(v.t, { year: true }) },
  { key: 'plan', label: 'پلن', csv: (v) => PLAN_NAME[v.plan] },
  { key: 'amount', label: 'مبلغ (تومان)', num: true },
  { key: 'status', label: 'وضعیت', csv: (v) => v.status },
]
async function changeOwner(v) { await api.setOwner([a.value.id], v || null); ui.bump(); toast('مسئول تغییر کرد') }
</script>
