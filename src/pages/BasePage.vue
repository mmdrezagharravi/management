<template>
  <PageShell :title="d ? d.base.name : 'جزئیات بیس'" :sources="['main']" :loading="loading" :error="error">
    <template v-if="d" #crumbs><router-link to="/bases">بیس‌ها</router-link> › <AccountLink v-if="d.hasOwner" :id="a.id" :name="a.name" /><span v-else class="faint">بدون مالک</span> › {{ d.base.name }}</template>
    <template v-if="d" #sub><PlanBadge :plan="a.plan" /><template v-if="a.industryName"> · {{ a.industryName }}</template><template v-if="a.city"> · {{ a.city }}</template></template>
    <template v-if="d" #actions>
      <template v-if="d.hasOwner">
        <button class="btn" @click="ui.openAccount(a.id)"><AppIcon name="eye" />نمای سریع حساب</button>
        <router-link class="btn primary" :to="'/customers/' + a.id"><AppIcon name="user" />پروفایل مشتری</router-link>
      </template>
    </template>

    <template v-if="d">
      <div v-if="d.fallback" class="banner info"><AppIcon name="info" /><div>بیسی با شناسهٔ {{ fa(d.requestedId) }} پیدا نشد؛ پربارترین بیس مشتریان پرداخت‌کننده نمایش داده شده. <router-link to="/bases">فهرست بیس‌ها</router-link></div></div>

      <div class="kpis">
        <KpiTile label="عمر بیس" :value="n(b.created)" unit="روز" :cmp="'ساخته‌شده ' + date(b.created)" />
        <KpiTile label="رکورد" :value="n(b.records)" :info="d.recordsUsed != null ? 'سقف رکورد پلن برای هر بیس' : 'سقف رکورد برای کل حساب است، نه هر بیس'">
          <template #cmp><UsageMeter label="" :used="d.recordsUsed ?? a.records" :limit="L.records" :fmt="compact" /><div style="margin-top: 3px">{{ d.recordsUsed != null ? 'از سقف این بیس' : 'کل حساب' }} · {{ pct(d.share) }} رکوردهای حساب در این بیس</div></template>
        </KpiTile>
        <KpiTile label="جدول" :value="n(b.tables)" :cmp="'میانگین ' + n(b.records / Math.max(1, b.tables)) + ' رکورد در هر جدول'" />
        <KpiTile label="خودکارسازی" :value="n(b.automations)" :info="d.exact ? 'اجراهای ۳۰ روز اخیر خودکارسازی‌های این بیس' : 'اجراها سهم این بیس از اجرای ۳۰ روز حساب است (به نسبت تعداد خودکارسازی)'" :cmp="autoCmp" />
        <KpiTile label="همکار این بیس" :value="n(b.collaborators)" unit="نفر" :cmp="n(a.activeMembers7) + ' عضو حساب این هفته فعال بوده‌اند'" />
        <KpiTile label="آخرین فعالیت" :value="agoDays(b.lastActive)">
          <template #cmp><span v-if="b.lastActive === 0 && a.online" class="live"><i />هم‌اکنون آنلاین</span><template v-else-if="b.lastActive >= 9999">هیچ فعالیتی ثبت نشده</template><template v-else>{{ date(b.lastActive) }}</template></template>
        </KpiTile>
      </div>

      <div class="grid g-main">
        <div class="stack">
          <PanelCard title="فعالیت روزانه" :hint="d.exact ? 'رویدادهای این بیس (ساخت، ویرایش، حذف، کپی، خروجی و…) · ۹۰ روز' + (d.measuredDays < d.activity.length ? ' · دادهٔ رفتاری فقط ' + fa(d.measuredDays) + ' روز اخیر' : '') : 'تخمینی · رویدادهای حساب × سهم این بیس از رکوردها (' + pct(d.share) + ') · ۹۰ روز'">
            <ColumnChart :options="actChart" />
            <template #footer><span>{{ n(d.activeDays) }} روز فعال در {{ fa(d.measuredDays) }} روزِ دارای داده · {{ n(d.sumEv) }} رویداد</span><router-link v-if="d.hasOwner" :to="'/customers/' + a.id">فعالیت دقیق حساب</router-link></template>
          </PanelCard>

          <PanelCard title="محتوای بیس">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); gap: 8px">
              <div v-for="c in cells" :key="c.label" style="border: 1px solid var(--border); border-radius: 9px; padding: 10px 12px; min-width: 0">
                <div class="muted" style="font-size: 11.5px; font-weight: 600">{{ c.label }}</div>
                <div style="font-weight: 800; font-size: 20px; line-height: 1.4; font-variant-numeric: tabular-nums"><template v-if="c.value != null">{{ c.value }}</template><span v-else class="faint">—</span></div>
                <div class="faint" style="font-size: 11px; line-height: 1.5">{{ c.sub || ' ' }}</div>
              </div>
            </div>
            <template #footer><span>منبع: Base · Table · Page · ShareView · Automation</span><router-link to="/bases">همهٔ بیس‌ها</router-link></template>
          </PanelCard>

          <PanelCard title="بیس‌های دیگر این حساب" :hint="d.siblings.length ? n(d.siblings.length) + ' بیس' : ''" flush>
            <div v-if="d.siblings.length" class="list" style="padding: 0 16px">
              <router-link v-for="x in d.siblings" :key="x.id" class="li" :to="'/bases/' + x.id"><AppIcon name="db" cls="faint" /><span class="main"><span class="t">{{ x.name }}</span><span class="d">آخرین فعالیت {{ agoDays(x.lastActive) }}</span></span><span class="end"><b>{{ n(x.records) }}</b> <span class="muted">رکورد</span></span></router-link>
            </div>
            <div v-else class="note" style="padding: 0 16px 14px">این تنها بیس این حساب است. حساب‌های چندبیسی بیشتر می‌مانند — در تماس بعدی ساخت بیس دوم را پیشنهاد دهید.</div>
          </PanelCard>

          <PanelCard title="تاریخچهٔ مالکیت">
            <div class="kv"><span class="k">مالک فعلی</span><span class="v"><AccountLink :id="a.id" :name="a.name" /></span></div>
            <div v-for="(t, i) in own.transfers" :key="'t' + i" class="kv"><span class="k">انتقال · {{ dateTime(t.at) }}</span><span class="v">از <PersonLink :p="t.from" /> به <PersonLink :p="t.to" /><template v-if="t.by"> · توسط <PersonLink :p="t.by" /></template></span></div>
            <div v-for="(e, i) in own.earlier" :key="'e' + i" class="kv"><span class="k">{{ e.source === 'creation' ? 'سازندهٔ بیس' : 'مالک قبلی' }}</span><span class="v"><PersonLink :p="e.owner" /><span v-if="e.until" class="faint"> · تا دست‌کم {{ date(daysAgo(e.until), { year: true }) }}</span></span></div>
            <div v-if="!own.transfers.length && !own.earlier.length" class="note" style="margin-top: 8px">{{ own.createdBeforeOwnerSignup ? 'این بیس قبل از ثبت‌نام مالک فعلی ساخته شده، پس از کس دیگری به او منتقل شده؛ ولی مالک قبلی در هیچ داده‌ای ثبت نشده است.' : 'انتقالی برای این بیس ثبت نشده است.' }}</div>
            <div v-if="!own.logsAvailable" class="note" style="margin-top: 6px">لاگ‌ها در دسترس نبودند؛ فقط دادهٔ دیتابیس نشان داده شده است.</div>
            <template #footer><span>انتقال‌ها از ۵ مهر ۱۴۰۵ ثبت می‌شوند · «مالک قبلی» از لاگ ویرایش‌های بیس پیدا شده (تاریخ = آخرین باری که مالک بوده)</span></template>
          </PanelCard>
        </div>

        <div class="stack">
          <PanelCard title="حساب">
            <div class="row" style="gap: 10px; margin-bottom: 8px">
              <span class="avatar large">{{ initials(a.name) }}</span>
              <div style="min-width: 0">
                <AccountLink :id="a.id" :name="a.name" style="font-weight: 800; font-size: 14.5px" />
                <div class="row wrap" style="gap: 8px; font-size: 12px; color: var(--muted)"><PlanBadge :plan="a.plan" /><span v-if="a.paying">{{ money(a.mrr) }} در ماه</span></div>
              </div>
            </div>
            <div class="kv"><span class="k">امتیاز سلامت</span><span class="v"><HealthScore :score="a.health" /></span></div>
            <div class="kv"><span class="k">بیس‌ها</span><span class="v">{{ n(a.bases) }} بیس ساخته<template v-if="a.coOwnedBases || a.sharedBases"> · {{ n((a.coOwnedBases || 0) + (a.sharedBases || 0)) }} مالک یا اشتراکی</template> · {{ n(a.memberCount) }} عضو</span></div>
            <div v-if="a.paying" class="kv"><span class="k">تمدید بعدی</span><span class="v">{{ date(-a.renewIn) }} · {{ inDays(a.renewIn) }}</span></div>
            <div v-if="up" style="margin-top: 10px"><UsageMeter :label="mu.label" :used="mu.used" :limit="mu.limit" /></div>
            <template #footer>
              <template v-if="up"><span>{{ pct(mu.ratio) }} سقف {{ mu.label }} پر شده</span><router-link :to="'/quota?view=' + mu.key">{{ a.plan === 'basic' ? 'پیشنهاد ارتقا' : 'افزایش سهمیه' }}</router-link></template>
              <template v-else><span>{{ a.name }} · مالک حساب</span><router-link v-if="d.hasOwner" :to="'/customers/' + a.id">پروفایل کامل</router-link></template>
            </template>
          </PanelCard>

          <PanelCard title="افراد این بیس" :hint="n(b.collaborators) + ' همکار از ' + n(a.memberCount) + ' عضو حساب'" flush>
            <div class="list" style="padding: 0 16px">
              <div v-for="(m, i) in d.people" :key="i" class="li"><span class="avatar">{{ initials(m.name) }}</span><span class="main"><span class="t">{{ m.name }}</span><span class="d">{{ m.role }} · آخرین بازدید {{ m.lastSeen == null ? 'نامشخص' : agoDays(m.lastSeen) }}</span></span><span class="end"><StatusBadge v-if="m.lastSeen != null && m.lastSeen <= 6" status="good" label="فعال این هفته" /><span v-else-if="m.lastSeen != null" class="faint">غیرفعال</span><span v-else class="faint">—</span></span></div>
            </div>
            <template v-if="d.peopleTotal > d.people.length" #footer><span>و {{ n(d.peopleTotal - d.people.length) }} نفر دیگر</span><router-link v-if="d.hasOwner" :to="'/customers/' + a.id">همهٔ اعضا در پروفایل</router-link></template>
          </PanelCard>
        </div>
      </div>
    </template>
  </PageShell>
</template>

<script setup>
import { computed, h } from 'vue'
import { useRoute } from 'vue-router'
import PageShell from 'components/PageShell.vue'
import PanelCard from 'components/PanelCard.vue'
import KpiTile from 'components/KpiTile.vue'
import AppIcon from 'components/AppIcon.vue'
import AccountLink from 'components/AccountLink.vue'
import PlanBadge from 'components/PlanBadge.vue'
import HealthScore from 'components/HealthScore.vue'
import StatusBadge from 'components/StatusBadge.vue'
import UsageMeter from 'components/UsageMeter.vue'
import ColumnChart from 'components/charts/ColumnChart.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useUiStore } from 'stores/ui'
import { n, fa, pct, compact, money, date, dateTime, daysAgo, agoDays, inDays, initials } from 'src/lib/format'

const route = useRoute(), ui = useUiStore()
const { data: d, loading, error } = useAsync(() => api.base(route.params.id), [() => route.params.id])
const b = computed(() => d.value.base), a = computed(() => d.value.account), L = computed(() => d.value.limits)
const mu = computed(() => a.value.maxUsage)
const up = computed(() => mu.value && mu.value.ratio >= 0.8)
const autoCmp = computed(() => !b.value.automations ? 'خودکارسازی ندارد — فرصت آموزش'
  : n(d.value.runs30) + ' اجرا در ۳۰ روز' + (d.value.failedRuns30 ? ' · ' + n(d.value.failedRuns30) + ' ناموفق' : '') + (d.value.accountAutomations > b.value.automations ? ' · ' + n(b.value.automations) + ' از ' + n(d.value.accountAutomations) + ' خودکارسازی حساب' : ''))
const actChart = computed(() => {
  const labels = d.value.activity.map((x) => date(x.daysAgo))
  return { labels, tipLabels: labels, height: 210, series: [{ name: d.value.exact ? 'رویداد' : 'رویداد (تخمینی)', values: d.value.activity.map((x) => x.v) }] }
})
const own = computed(() => d.value.ownership)
const PersonLink = (props) => (props.p ? h(AccountLink, { id: props.p.id, name: props.p.name || 'کاربر حذف‌شده' }) : h('span', { class: 'faint' }, 'نامشخص'))
PersonLink.props = ['p']
const cells = computed(() => [
  { label: 'جدول', value: n(b.value.tables), sub: n(b.value.records / Math.max(1, b.value.tables)) + ' رکورد در هر جدول' },
  { label: 'رکورد', value: n(b.value.records), sub: (d.value.recordsUsed != null ? 'سقف هر بیس: ' : 'سقف حساب: ') + compact(L.value.records) },
  { label: 'درگاه', value: n(b.value.portals || 0), sub: b.value.portals ? '' : 'درگاهی ندارد' },
  { label: 'خودکارسازی', value: b.value.automations ? n(b.value.automations) : null, sub: L.value.runs ? 'سقف حساب: ' + compact(L.value.runs) + ' اجرا در ماه' : 'در پلن رایگان اجرا نمی‌شود' },
])
</script>
