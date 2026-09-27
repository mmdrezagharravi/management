<template>
  <PageShell title="دسته‌بندی‌ها" :sub="d ? n(d.segs.length) + ' دستهٔ رفتاری · ' + n(d.inAny) + ' حساب در دست‌کم یک دسته — دسته‌ها هم‌پوشانی دارند؛ روی هر دسته بزنید تا اعضایش را ببینید' : ''" :sources="['main', 'behavior']" :loading="loading && !d" :error="error">
    <template #actions><router-link class="btn sm" to="/settings"><AppIcon name="gear" />قواعد و آستانه‌ها</router-link></template>
    <template v-if="d">
      <div class="grid g3">
        <section v-for="s in d.segs" :key="s.key" class="card" :class="{ 'tint-accent': s.key === cur }">
          <div class="card-h"><h2>{{ s.label }}</h2><span v-if="s.key === cur" class="badge st-info">در فهرست پایین</span></div>
          <div class="card-b stack" style="gap: 9px">
            <div class="row between" style="align-items: flex-end; gap: 12px">
              <div><span style="font-size: 26px; font-weight: 800; letter-spacing: -0.6px; line-height: 1.1">{{ n(s.n) }}</span> <span class="muted" style="font-size: 12px">حساب</span></div>
              <div style="text-align: end; line-height: 1.5">
                <div><template v-if="s.mrr"><b>{{ cp(s.mrr).num }}</b> <span class="muted" style="font-size: 11.5px">{{ cp(s.mrr).unit }} تومان در ماه</span></template><span v-else class="faint" style="font-size: 11.5px">بدون درآمد ماهانه</span></div>
                <div class="muted" style="font-size: 11.5px">{{ shareTxt(s) }}<q-tooltip>{{ shareTip(s) }}</q-tooltip></div>
              </div>
            </div>
            <div style="font-size: 12.3px; color: var(--ink-2)">{{ s.desc }}</div>
            <div class="mono faint seg-rule" style="font-size: 10.8px; line-height: 1.6; text-align: end">{{ s.rule }}</div>
            <div>
              <div class="muted" style="font-size: 11px; font-weight: 700; margin-bottom: 4px">سلامت اعضا</div>
              <div style="display: flex; gap: 2px; height: 8px; border-radius: 4px; overflow: hidden; background: var(--grid)">
                <i v-for="x in s.dist.filter((y) => y.n)" :key="x.key" :style="{ flex: x.n + ' 1 0', background: BAND_COLOR[x.key], minWidth: '2px' }"><q-tooltip>{{ x.label }}: {{ fa(x.n) }} حساب</q-tooltip></i>
              </div>
              <div class="legend" style="margin-top: 6px; gap: 3px 10px; font-size: 11px"><span v-for="x in s.dist" :key="x.key" class="k"><i class="sw" :style="{ width: '8px', height: '8px', background: BAND_COLOR[x.key] }" />{{ x.label }} <b style="color: var(--ink)">{{ pct(x.n / (s.n || 1)) }}</b></span></div>
            </div>
          </div>
          <div class="card-f">
            <span>{{ fa(s.active) }} عضو فعال در ۷ روز</span>
            <button class="btn sm" :class="{ primary: s.key === cur }" @click="pick(s.key, true)"><AppIcon name="users" />فهرست اعضا</button>
          </div>
        </section>
      </div>

      <PanelCard id="members" :hint="fa(curSeg.n) + ' حساب · ' + (curSeg.mrr ? money(curSeg.mrr) + ' در ماه' : 'بدون درآمد ماهانه')" flush style="scroll-margin-top: 70px">
        <template #title>اعضای «{{ curSeg.label }}»</template>
        <template #actions>
          <label class="row" style="gap: 6px; font-size: 12px; color: var(--muted)">دسته<select class="select" style="height: 28px; font-size: 12px" :value="cur" @change="pick($event.target.value, false)"><option v-for="s in d.segs" :key="s.key" :value="s.key">{{ s.label }} ({{ fa(s.n) }})</option></select></label>
        </template>
        <DataTable :key="cur" :rows="d.members" :columns="columns" :filters="filters" :search="search" :sort="SEG_SORT[cur] || { key: 'mrr', dir: 'desc' }" url select :export-name="'segment-' + cur" unit="حساب" :on-row="(a) => ui.openAccount(a.id)">
          <template #col-name="{ row }"><AccountCell :a="row" /></template>
          <template #col-plan="{ row }"><PlanBadge :plan="row.plan" /></template>
          <template #col-mrr="{ row }"><template v-if="row.mrr">{{ compact(row.mrr) }}</template><span v-else class="faint">—</span></template>
          <template #col-health="{ row }"><HealthScore :score="row.health" /></template>
          <template #col-lastSeen="{ row }"><LastSeen :a="row" /></template>
          <template #col-signal="{ row }"><SignalChips :a="row" /></template>
        </DataTable>
      </PanelCard>

      <PanelCard title="هم‌پوشانی دسته‌ها" hint="هر خانه: چند درصد از اعضای ردیف، عضو دستهٔ ستون هم هستند">
        <div class="tbl-wrap"><div style="min-width: 760px"><HeatMap :options="overlap" /></div></div>
        <div class="note" style="margin-top: 10px">دسته‌ها انحصاری نیستند؛ یک حساب می‌تواند هم‌زمان «تیمی»، «خودکارساز» و «در خطر ریزش» باشد.<template v-if="d.top"> بیشترین هم‌پوشانی: <b>{{ pct(d.top.v) }}</b> از اعضای «{{ d.top.r.label }}» در «{{ d.top.c.label }}» هم هستند — <a :href="'/segments?seg=' + d.top.r.key" style="color: var(--accent-ink); font-weight: 600" @click.prevent="pick(d.top.r.key, true)">اعضای «{{ d.top.r.label }}»</a></template></div>
      </PanelCard>

      <div class="grid g2">
        <PanelCard title="میانگین سلامت هر دسته" hint="از ۱۰۰ · روی هر ردیف بزنید">
          <HBars :items="d.segs.map((s) => ({ label: s.label, value: s.avgHealth, note: band(s.avgHealth).label, to: '/segments?seg=' + s.key }))" :label-width="96" :max="100" :format="(v) => n(v)" />
        </PanelCard>
        <PanelCard title="درآمد ماهانه در هر دسته" hint="تومان · سهم از کل درآمد ماهانه">
          <HBars :items="d.segs.map((s) => ({ label: s.label, value: s.mrr, note: pct(d.totalMrr ? s.mrr / d.totalMrr : 0), to: '/segments?seg=' + s.key }))" :label-width="96" :format="(v) => (v ? compact(v) : '—')" />
        </PanelCard>
      </div>

      <div class="note">قواعد و آستانه‌های هر دسته در <router-link to="/settings" style="color: var(--accent-ink); font-weight: 600">تعریف‌ها و دسترسی</router-link> تنظیم می‌شوند و همهٔ صفحه‌ها همان تعریف را می‌خوانند.</div>
    </template>
  </PageShell>
</template>

<script setup>
import { computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageShell from 'components/PageShell.vue'
import PanelCard from 'components/PanelCard.vue'
import DataTable from 'components/DataTable.vue'
import AppIcon from 'components/AppIcon.vue'
import AccountCell from 'components/AccountCell.vue'
import PlanBadge from 'components/PlanBadge.vue'
import HealthScore from 'components/HealthScore.vue'
import LastSeen from 'components/LastSeen.vue'
import SignalChips from 'components/SignalChips.vue'
import HeatMap from 'components/charts/HeatMap.vue'
import HBars from 'components/charts/HBars.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useQueryParam } from 'src/composables/useUrlState'
import { useUiStore } from 'stores/ui'
import { n, fa, pct, compact, compactParts as cp, money } from 'src/lib/format'
import { PLAN_ORDER } from 'src/lib/refs'
import { PLAN_NAME, BAND_COLOR, band, toast } from 'src/lib/ui'

// the default sort of the member list follows what a rep does with that group
const SEG_SORT = { upsell: { key: 'signal', dir: 'desc' }, new: { key: 'lastSeen', dir: 'desc' }, stuck: { key: 'lastSeen', dir: 'desc' } }

const ui = useUiStore(), route = useRoute(), router = useRouter()
const seg = useQueryParam('seg', 'upsell')
const { data: d, loading, error } = useAsync(() => api.segments({ seg: seg.value }), [seg])
const cur = computed(() => d.value.seg) // validated key
const curSeg = computed(() => d.value.segs.find((s) => s.key === cur.value))

const p = (x) => pct(x, x < 0.1 ? 1 : 0)
const shareTxt = (s) => (s.key === 'dormant' ? p(s.n / d.value.totalAccounts) + ' از کل حساب‌ها' : p(d.value.activeN ? s.active / d.value.activeN : 0) + ' از حساب‌های فعال')
const shareTip = (s) => (s.key === 'dormant' ? 'این دسته طبق تعریف فعالیتی ندارد؛ سهم از کل ' + fa(d.value.totalAccounts) + ' حساب' : fa(s.active) + ' عضو فعال در ' + fa(d.value.activeWindow) + ' روز اخیر، از ' + fa(d.value.activeN) + ' حساب فعال')

async function pick(k, scroll) {
  if (!d.value.segs.some((s) => s.key === k)) return
  // the table remounts (:key) with the group's default sort; filters and search stay in the URL
  const q = { ...route.query }; delete q.sort; delete q.dir
  if (k === 'upsell') delete q.seg; else q.seg = k
  await router.replace({ query: q })
  if (scroll) { await nextTick(); const el = document.getElementById('members'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
}

const search = { placeholder: 'نام، شخص یا شماره…', text: (a) => a.name + ' ' + a.contact.first + ' ' + a.contact.last + ' ' + a.contact.mobile + ' ' + a.slug }
const filters = [
  { key: 'plan', label: 'پلن', options: PLAN_ORDER.map((k) => ({ v: k, l: PLAN_NAME[k] })), test: (a, v) => a.plan === v },
]
const columns = [
  { key: 'name', label: 'حساب', cls: 'nmcol', csv: (a) => a.name },
  { key: 'plan', label: 'پلن', sort: (a) => PLAN_ORDER.indexOf(a.plan) * 1e9 + a.mrr, desc: true, csv: (a) => PLAN_NAME[a.plan] },
  { key: 'mrr', label: 'درآمد ماهانه', num: true, csv: (a) => a.mrr },
  { key: 'health', label: 'سلامت', num: true, csv: (a) => a.health },
  { key: 'lastSeen', label: 'آخرین فعالیت', sort: (a) => -a.lastSeenMin, desc: true, csv: (a) => a.lastSeenDays },
  { key: 'signal', label: 'سیگنال', sort: (a) => (a.pastDue ? 4 : 0) + (a.atLimit ? 2 : 0) + (a.nearLimit ? 1 : 0), desc: true, csv: (a) => [a.pastDue && 'پرداخت ناموفق', a.atLimit ? 'سقف پر شده' : a.nearLimit ? 'نزدیک سقف' : ''].filter(Boolean).join('، ') },
]

const overlap = computed(() => {
  const segs = d.value.segs, cells = d.value.cells
  return {
    rowHead: 'عضو این دسته…', cols: segs.map((s) => s.label), tipLabel: 'هم‌پوشانی', format: (v) => pct(v), domain: [0, 1],
    rows: segs.map((r, i) => ({ label: r.label, sub: fa(r.n), cells: cells[i], tips: segs.map((c, j) => (cells[i][j] == null ? '' : fa(Math.round(cells[i][j] * r.n)) + ' از ' + fa(r.n) + ' عضو «' + r.label + '» در «' + c.label + '» هم هستند')) })),
  }
})
</script>

<style scoped>
:deep(td.nmcol) { min-width: 170px; }
@media (max-width: 860px) { .seg-rule { display: none !important; } }
</style>
