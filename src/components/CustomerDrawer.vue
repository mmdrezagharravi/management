<template>
  <q-dialog v-model="open" position="left" full-height @hide="ui.closeAccount()">
    <aside class="drawer" role="dialog" aria-label="نمای سریع مشتری">
      <template v-if="q && q.account">
        <div class="dh">
          <span class="avatar large">{{ initials(a.name) }}</span>
          <div style="flex: 1; min-width: 0">
            <h3>{{ a.name }}</h3>
            <div class="row wrap" style="gap: 8px; font-size: 12px; color: var(--muted)">
              <PlanBadge :plan="a.plan" /><span v-if="a.paying">{{ money(a.mrr) }} در ماه</span><span>{{ a.industryName }} · {{ a.city }}</span>
            </div>
          </div>
          <button class="btn ghost icon" aria-label="بستن (Esc)" @click="open = false"><AppIcon name="x" /></button>
        </div>
        <div class="db">
          <div class="row top" style="gap: 16px">
            <div>
              <div class="muted" style="font-size: 11.5px; font-weight: 700">امتیاز سلامت</div>
              <div class="row" style="gap: 10px"><span class="hero" style="font-size: 38px">{{ n(a.health) }}</span><HealthBadge :score="a.health" /></div>
              <div class="row" style="gap: 6px; font-size: 11.5px; color: var(--muted)">
                <SparkLine :values="a.healthHistory.filter((x) => x != null)" :w="70" :h="18" color="var(--ink-2)" /> ۸ هفتهٔ اخیر
                <DeltaChip v-if="a.health2wAgo != null" :cur="a.health" :prev="a.health2wAgo" abs />
              </div>
            </div>
            <div style="flex: 1; min-width: 0">
              <div v-for="c in HEALTH_COMPONENTS" :key="c.key" class="comp"><span>{{ c.label }}</span><span class="tr"><i :style="{ width: (a.components[c.key] / 20) * 100 + '%' }" /></span><b>{{ n(a.components[c.key]) }}</b><q-tooltip>{{ c.desc }}</q-tooltip></div>
            </div>
          </div>
          <SignalChips v-if="a.pastDue || a.atLimit || a.nearLimit || a.tickets" :a="a" tickets />
          <div class="sec">
            <h4>وضعیت</h4>
            <div class="kv"><span class="k">آخرین فعالیت</span><span class="v"><LastSeen :a="a" /></span></div>
            <div class="kv"><span class="k">اعضای فعال این هفته</span><span class="v">{{ n(a.activeMembers7) }} از {{ n(a.memberCount) }} <span v-if="a.collaboratorLimit != null" class="muted">(سقف {{ n(a.collaboratorLimit) }} همکار)</span></span></div>
            <div v-if="a.paying" class="kv"><span class="k">تمدید بعدی</span><span class="v">{{ date(-a.renewIn) }} · {{ inDays(a.renewIn) }} <span v-if="a.cycle" class="muted">({{ CYCLE_NAME[a.cycle] }})</span></span></div>
            <div v-if="a.buyingIntentDays != null" class="kv"><span class="k">آخرین قصد خرید</span><span class="v">{{ agoDays(a.buyingIntentDays) }}<span v-if="a.segments.includes('hot')" class="badge st-warn" style="margin-inline-start: 6px">سرنخ داغ</span></span></div>
            <div v-if="a.churnedAt !== undefined" class="kv"><span class="k">لغو اشتراک</span><span class="v">{{ date(a.churnedAt) }} · {{ a.churnReason }}</span></div>
            <div class="kv"><span class="k">عضو از</span><span class="v">{{ date(signupDaysAgo(a), { year: true }) }} · {{ channelLabel(a) }}</span></div>
          </div>
          <div class="sec"><h4>فعالیت ۳۰ روز اخیر <span class="faint" style="font-weight: 400">— ویرایش در روز</span></h4><SparkLine :values="a.last30" :w="460" :h="44" bars /></div>
          <div class="sec"><h4>مصرف پلن</h4><div class="stack" style="gap: 9px"><UsageMeter v-for="u in topUsage" :key="u.key" :label="u.label" :used="u.used" :limit="u.limit" /></div></div>
          <div class="sec">
            <h4>تماس</h4>
            <div class="kv"><span class="k">{{ q.profile?.name || a.contact.first }}</span><span class="v">
              <a v-if="a.contact.mobile" class="ltr" :href="'tel:' + a.contact.mobile" style="font-weight: 700">{{ fa(a.contact.mobile) }}</a><span v-else class="faint">—</span></span></div>
            <div class="kv"><span class="k">ایمیل</span><span class="v">
              <a v-if="a.contact.email" class="ltr" :href="'mailto:' + a.contact.email">{{ a.contact.email }}</a><span v-else class="faint">ثبت نشده</span></span></div>
            <div v-if="q.profile?.company?.phone" class="kv"><span class="k">تلفن شرکت</span><span class="v"><a class="ltr" :href="'tel:' + q.profile.company.phone">{{ fa(q.profile.company.phone) }}</a></span></div>
            <div v-if="q.profile?.sessions?.length" class="kv"><span class="k">آخرین ورود</span><span class="v">{{ dateTime(q.profile.sessions[0].lastUse) }} <span class="faint">· {{ q.profile.sessions[0].device }}</span></span></div>
          </div>
          <div v-if="q.tasks.length" class="sec">
            <h4>کارهای باز</h4>
            <div v-for="t in q.tasks" :key="t.id" class="li"><span class="main"><span class="t">{{ TASK_TYPES[t.type]?.label }}</span><span class="d">{{ t.why }}</span></span><span class="end"><span v-if="t.due <= 0" class="sig due">امروز</span><template v-else>{{ inDays(t.due) }}</template></span></div>
          </div>
          <div class="sec">
            <h4>آخرین تعامل‌ها</h4>
            <template v-if="q.notes.length || q.interactions.length">
              <div v-for="(x, i) in q.notes" :key="'n' + i" class="li"><span class="main"><span class="t" style="font-weight: 600">{{ x.text }}</span><span class="d">{{ x.who }} · همین مرورگر</span></span></div>
              <div v-for="(x, i) in q.interactions" :key="'a' + i" class="li"><span class="main"><span class="t" style="font-weight: 600">{{ x.label }}<template v-if="x.mrr"> · {{ money(x.mrr) }}</template></span><span class="d">{{ agoDays(x.t) }} {{ clock(x.min) }}</span></span></div>
            </template>
            <div v-else class="note">هنوز تماسی ثبت نشده.</div>
          </div>
        </div>
        <div class="df">
          <router-link class="btn primary" :to="'/customers/' + a.id" @click="open = false"><AppIcon name="user" />پروفایل کامل</router-link>
          <button class="btn" @click="dialogs.logCall(a).then(reload)"><AppIcon name="phone" />ثبت تماس</button>
          <button class="btn" @click="dialogs.addNote(a).then(reload)"><AppIcon name="note" />یادداشت</button>
        </div>
      </template>
      <div v-else class="db"><div class="skel" style="height: 120px" /><div class="skel" style="height: 200px" /></div>
    </aside>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import PlanBadge from './PlanBadge.vue'
import HealthBadge from './HealthBadge.vue'
import DeltaChip from './DeltaChip.vue'
import SignalChips from './SignalChips.vue'
import LastSeen from './LastSeen.vue'
import UsageMeter from './UsageMeter.vue'
import SparkLine from './charts/SparkLine.vue'
import { api } from 'src/api'
import { useUiStore } from 'stores/ui'
import { useDialogs } from 'src/composables/useDialogs'
import { n, fa, money, date, dateTime, inDays, agoDays, clock, initials, signupDaysAgo } from 'src/lib/format'
import { CYCLE_NAME, HEALTH_COMPONENTS, TASK_TYPES, channelLabel } from 'src/lib/refs'
import { toast } from 'src/lib/ui'

/** Customer quick view. Opened from anywhere via ui.openAccount(id). */
const ui = useUiStore(), dialogs = useDialogs()
const open = computed({ get: () => ui.drawerId != null, set: (v) => { if (!v) ui.closeAccount() } })
const q = ref(null)
const a = computed(() => q.value && q.value.account)
const topUsage = computed(() => a.value.usage.filter((u) => u.limit).slice().sort((p, r) => r.ratio - p.ratio).slice(0, 3))
async function reload() { if (ui.drawerId != null) q.value = await api.quickView(ui.drawerId) }
watch(() => ui.drawerId, (id) => { q.value = null; if (id != null) reload() })
watch(() => ui.refreshTick, () => reload())
</script>
