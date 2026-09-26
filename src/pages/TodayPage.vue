<template>
  <PageShell title="کارهای امروز" :sub="todayLabel() + ' — فهرست را از بالا شروع کنید؛ ترتیب بر اساس فوریت و ارزش است'" :sources="['main', 'wallet']" :banner="false" :loading="loading" :error="error">
    <template #actions>
      <div v-if="!session.isRep" class="seg" role="group" aria-label="کارشناس">
        <button v-for="r in REPS" :key="r.id" :class="{ on: r.id === repId }" @click="pickRep(r.id)">{{ r.short }}</button>
      </div>
      <button class="btn sm ghost" title="میان‌برهای صفحه‌کلید" @click="ui.shortcutsOpen = true"><AppIcon name="info" />میان‌برها</button>
    </template>
    <template v-if="d">
      <div class="kpis">
        <KpiTile label="کار باز برای امروز" :value="n(k.open)">
          <template #cmp>{{ n(k.done) }} انجام شده<template v-if="k.overdue"> · <b style="color: var(--crit-ink)">{{ n(k.overdue) }} عقب‌افتاده</b></template></template>
        </KpiTile>
        <KpiTile label="تماس امروز" :value="n(k.calls)" :unit="'از ' + n(k.callTarget)">
          <template #cmp><div class="progress" style="width: 120px; margin-top: 5px"><i :style="{ width: Math.min(100, (k.calls / k.callTarget) * 100) + '%' }" /></div></template>
        </KpiTile>
        <KpiTile label="درآمد در گرو کارهای امروز" :value="cp(k.valueToday).num" :unit="cp(k.valueToday).unit + ' ' + CURRENCY" cmp="ماهانه · جمع حساب‌های فهرست امروز" />
        <KpiTile label="تمدید در ۱۴ روز آینده" :value="n(k.renew14.n)" :cmp="compact(k.renew14.mrr) + ' در ماه · ' + n(k.renew14.low) + ' با سلامت پایین'" />
        <KpiTile :label="'دفتر مشتریان ' + d.rep.short" :value="n(k.book.n)" unit="حساب" :cmp="compact(k.book.mrr) + ' در ماه · ' + n(k.book.risk) + ' در خطر'" :to="'/customers?view=paying&owner=' + d.rep.id" />
      </div>

      <PanelCard v-if="d.isManager && d.team" title="وضعیت تیم امروز" hint="برای دیدن فهرست هر نفر، نامش را بالا انتخاب کنید">
        <div class="grid g4" style="padding-top: 8px">
          <button v-for="r in d.team" :key="r.id" class="row top rep-pick" :class="{ on: r.id === d.rep.id }" @click="pickRep(r.id)">
            <span class="avatar">{{ initials(r.name) }}</span>
            <span style="flex: 1; min-width: 0">
              <b style="display: block">{{ r.name }}</b>
              <span class="muted" style="font-size: 11.5px">{{ n(r.open) }} کار باز · {{ n(r.done) }} انجام · {{ n(r.calls) }}/{{ n(r.callTarget) }} تماس</span>
              <div class="progress" style="margin-top: 6px"><i :style="{ width: Math.min(100, (r.calls / r.callTarget) * 100) + '%' }" /></div>
            </span>
          </button>
        </div>
      </PanelCard>

      <div class="grid g-side">
        <section class="card">
          <div class="tabs" style="padding: 0 12px" role="tablist">
            <button v-for="[key, l] in TABS" :key="key" role="tab" :class="{ on: key === tab }" @click="tab = key; focus = -1">{{ l }} <span class="n">{{ fa(d.lists[key].length) }}</span></button>
          </div>
          <div ref="listEl">
            <div v-if="!list.length" class="empty">
              <b>{{ tab === 'done' ? 'هنوز کاری انجام نشده' : tab === 'today' ? 'کار امروز تمام شد 🎉' : 'برای این هفته کاری نمانده' }}</b>
              <template v-if="tab === 'today'">سراغ «این هفته» بروید یا از «میز فروش» سرنخ تازه بردارید.</template>
            </div>
            <div v-for="(t, i) in list" :key="t.id" class="task" :class="{ done: t.bucket === 'done', kfocus: i === focus }" @click="rowClick($event, i)">
              <span class="ico" :class="'p' + t.prio"><AppIcon :name="t.icon" /></span>
              <div style="min-width: 0">
                <div class="tt">
                  <AccountLink :id="t.account.id" :name="t.account.name" /><PlanBadge :plan="t.account.plan" /><span class="tag">{{ t.label }}</span>
                  <span v-if="t.overdue" class="sig due">عقب‌افتاده</span><span v-if="t.bucket === 'week'" class="tag">{{ inDays(t.due) }}</span>
                </div>
                <div class="why">{{ t.why }}<template v-if="t.outcome"> · <b>نتیجه: {{ t.outcome }}</b></template></div>
                <div class="meta">
                  <span>{{ t.account.mrr ? money(t.account.mrr) + ' در ماه' : 'پلن ' + PLAN_NAME[t.account.plan] }}</span><span>سلامت {{ n(t.account.health) }}</span><span>آخرین فعالیت: {{ ago(t.account.lastSeenMin) }}</span>
                  <span v-if="t.type === 'upsell'">ارزش ارتقا: +{{ compact(t.value) }}</span>
                </div>
              </div>
              <div class="acts">
                <button v-if="t.bucket === 'done'" class="btn sm ghost" @click.stop="act(i, 'undo')">بازگردانی</button>
                <template v-else>
                  <button class="btn sm primary" title="ثبت نتیجهٔ تماس (c)" @click.stop="act(i, 'call')"><AppIcon name="phone" />ثبت نتیجه</button>
                  <span class="rel">
                    <button class="btn sm" title="تعویق (s = فردا)" @click.stop><AppIcon name="snooze" />تعویق
                      <q-menu class="pop" style="min-width: 150px" anchor="bottom middle" self="top middle">
                        <button v-for="[days, l] in SNOOZE" :key="days" class="it" v-close-popup @click.stop="snooze(i, days)">{{ l }}</button>
                      </q-menu>
                    </button>
                  </span>
                  <button class="btn sm ghost icon" title="انجام شد (d)" aria-label="انجام شد" @click.stop="act(i, 'done')"><AppIcon name="check" /></button>
                </template>
              </div>
            </div>
          </div>
          <div class="card-f">
            <span>{{ d.spilled ? fa(d.spilled) + ' کار کم‌ارزش‌تر به روزهای بعد منتقل شد تا فهرست امروز از ظرفیت (' + fa(d.capacity) + ' کار) بیشتر نشود' : 'فهرست از قاعده‌ها ساخته می‌شود: پرداخت ناموفق، تمدید، افت سلامت، سرنخ ارتقا، صندلی پر، مشتری جدید، قرار تماس' }}</span>
            <span class="nowrap"><span class="kbd">j</span> <span class="kbd">k</span> حرکت · <span class="kbd">c</span> ثبت نتیجه · <span class="kbd">d</span> انجام شد</span>
          </div>
        </section>
        <div class="stack">
          <PanelCard title="تمدیدهای پیش رو" :hint="fa(d.renewals.in30) + ' در ۳۰ روز'" flush>
            <div class="list" style="padding: 0 16px">
              <div v-for="a in d.renewals.top" :key="a.id" class="li">
                <span class="main"><AccountLink :id="a.id" :name="a.name" cls="t" /><span class="d">{{ date(-a.renewIn) }} · {{ inDays(a.renewIn) }} · {{ compact(a.mrr) }}</span></span>
                <span class="end"><HealthScore :score="a.health" /></span>
              </div>
            </div>
            <template #footer><span>همهٔ تمدیدها</span><router-link to="/sales?tab=renew">میز فروش</router-link></template>
          </PanelCard>
          <PanelCard :title="'فعالیت امروز ' + d.rep.short" flush>
            <div class="list" style="padding: 0 16px">
              <div v-for="(x, i) in d.acts" :key="i" class="li">
                <span class="main"><AccountLink :id="x.accountId" :name="x.name" cls="t" /><span class="d">{{ x.text }}{{ x.mrr ? compact(x.mrr) : '' }}</span></span>
                <span class="end faint">{{ x.local ? 'همین حالا' : clock(x.min) }}</span>
              </div>
              <div v-if="!d.acts.length" class="empty">امروز هنوز تماسی ثبت نشده</div>
            </div>
          </PanelCard>
        </div>
      </div>
    </template>
  </PageShell>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import PageShell from 'components/PageShell.vue'
import PanelCard from 'components/PanelCard.vue'
import KpiTile from 'components/KpiTile.vue'
import AppIcon from 'components/AppIcon.vue'
import AccountLink from 'components/AccountLink.vue'
import PlanBadge from 'components/PlanBadge.vue'
import HealthScore from 'components/HealthScore.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useQueryParam } from 'src/composables/useUrlState'
import { useDialogs } from 'src/composables/useDialogs'
import { useUiStore } from 'stores/ui'
import { useSessionStore } from 'stores/session'
import { n, fa, compact, compactParts as cp, money, date, inDays, ago, clock, initials, todayLabel, CURRENCY } from 'src/lib/format'
import { REPS } from 'src/lib/refs'
import { PLAN_NAME, toast } from 'src/lib/ui'

const ui = useUiStore(), session = useSessionStore(), dialogs = useDialogs()
const repParam = useQueryParam('rep')
const tab = useQueryParam('tab', 'today')
const focus = ref(-1), listEl = ref(null)
const TABS = [['today', 'امروز'], ['week', 'این هفته'], ['done', 'انجام‌شده']]
const SNOOZE = [[1, 'فردا'], [3, '۳ روز دیگر'], [7, 'هفتهٔ بعد']]

const { data: d, loading, error } = useAsync(() => api.today({ rep: repParam.value || undefined }), [repParam])
const k = computed(() => d.value.kpis)
const repId = computed(() => (d.value ? d.value.rep.id : repParam.value || session.todayRep))
const list = computed(() => (d.value ? d.value.lists[tab.value] || [] : []))

function pickRep(id) { session.setTodayRep(id); repParam.value = id; focus.value = -1 }
function rowClick(ev, i) { if (ev.target.closest('a,button')) return; focus.value = i; ui.openAccount(list.value[i].account.id) }

const reopen = (t) => ({ status: t.type === 'ai' ? 'open' : null })
async function act(i, what) {
  const t = list.value[i]; if (!t) return
  if (what === 'call') { await dialogs.logCall(t.account, t.id); return }
  if (what === 'done') { await api.setTask(t.id, { status: 'done' }); toast('«' + t.account.name + '» انجام شد', async () => { await api.setTask(t.id, reopen(t)); ui.bump() }) }
  else if (what === 'undo') await api.setTask(t.id, reopen(t))
  else if (what === 'snooze1') { await api.setTask(t.id, { status: 'snoozed', snoozeDays: 1 }); toast('به فردا منتقل شد', async () => { await api.setTask(t.id, reopen(t)); ui.bump() }) }
  ui.bump()
}
async function snooze(i, days) {
  const t = list.value[i]; if (!t) return
  await api.setTask(t.id, { status: 'snoozed', snoozeDays: days }); toast('تعویق تا ' + inDays(days)); ui.bump()
}

const nav = {
  move(dir) {
    focus.value = Math.max(0, Math.min(list.value.length - 1, focus.value + dir))
    const r = listEl.value && listEl.value.querySelectorAll('.task')[focus.value]; if (r) r.scrollIntoView({ block: 'nearest' })
  },
  open() { const t = list.value[focus.value]; if (t) ui.openAccount(t.account.id) },
  act(key) { if (focus.value < 0) return; if (key === 'c') act(focus.value, 'call'); else if (key === 'd') act(focus.value, tab.value === 'done' ? 'undo' : 'done'); else if (key === 's') act(focus.value, 'snooze1') },
}
onMounted(() => ui.setListNav(nav))
onUnmounted(() => { if (ui.listNav === nav) ui.setListNav(null) })
</script>

<style scoped>
.rep-pick { gap: 10px; text-align: start; padding: 8px; border-radius: 9px; border: 1px solid var(--border); background: transparent; cursor: pointer; font-family: inherit; color: inherit; }
.rep-pick.on { border-color: color-mix(in srgb, var(--accent) 50%, transparent); background: var(--accent-wash); }
.rel { position: relative; }
</style>
