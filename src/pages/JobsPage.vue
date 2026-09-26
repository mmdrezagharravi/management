<template>
  <PageShell title="صف‌ها و زمان‌بندی" sub="کارهای پس‌زمینه سالم‌اند یا عقب افتاده‌اند — صف‌های Bull و کران‌های سرور" :loading="loading" :error="error">
    <template v-if="d">
      <div class="kpis">
        <KpiTile label="در انتظار" :value="n(k.waiting)" unit="کار" info="مجموع کارهای منتظر در همهٔ صف‌ها" :delta="k.waitingThen == null ? null : { cur: k.waiting, prev: k.waitingThen, goodUp: false }" :cmp="k.waitingThen == null ? 'در ' + n(k.queues) + ' صف' : '۶ روز پیش: ' + n(k.waitingThen)" :spark="k.trendSum.length ? { values: k.trendSum, color: 'var(--ink-2)' } : null" />
        <KpiTile label="در حال اجرا" :value="n(k.active)" unit="کار" :cmp="'در ' + n(k.queues) + ' صف'" />
        <KpiTile label="ناموفق در ۲۴ ساعت" :value="n(k.failed24)" unit="کار" :cmp="'بیشترین: ' + k.worstFail.name + ' (' + n(k.worstFail.failed24) + ')'" />
        <KpiTile label="کران ناموفق" :value="n(k.failedCrons.length)" :unit="'از ' + n(k.cronsTotal)" :to="{ hash: '#crons' }" :cmp="k.failedCrons.length ? k.failedCrons.map((x) => '«' + x + '»').join('، ') : 'همه موفق'" />
        <KpiTile v-if="k.maxDelay" label="بیشترین تأخیر" :value="n(k.maxDelay.delay)" unit="ثانیه" info="زمان انتظار قدیمی‌ترین کار در صف" :cmp="k.maxDelay.name + ' · ' + (k.maxDelay.late ? 'بیش از حد مجاز' : 'در حد مجاز این صف (' + secs(k.maxDelay.sla) + ')')" />
      </div>

      <div v-if="d.expire" class="banner crit">
        <AppIcon name="alert" />
        <div>
          <b>کران «{{ d.expire.name }}» {{ agoDays(d.expire.lastT) }} ساعت {{ d.expire.lastAt }} اجرا نشد.</b>
          تا این کران اجرا نشود هیچ اشتراکی منقضی نمی‌شود: {{ n(d.expire.pastDue) }} حساب با پرداخت ناموفق ({{ money(d.expire.pastDueMrr) }} در ماه) بعد از پایان مهلت هم بدون پرداخت به کار ادامه می‌دهند.
          <template v-if="d.expire.next">اجرای بعدی {{ d.expire.next.day ? 'فردا' : 'امروز' }} {{ clock(d.expire.next.min) }} است و تا کوئری اصلاح نشود احتمالاً دوباره شکست می‌خورد. </template>
          <router-link :to="{ path: '/sales', hash: '#pastdue' }">پرداخت‌های ناموفق را پیگیری کنید</router-link>
        </div>
      </div>

      <div class="grid g-main">
        <PanelCard title="صف‌های Bull" :hint="d.queues.some((q) => q.trend.length) ? 'روند = کارهای در انتظار در ۷ روز اخیر' : 'شمارنده‌های لحظه‌ای Redis'" flush>
          <div class="tbl-wrap"><table class="tbl compact">
            <thead><tr><th>صف</th><th>روند ۷ روز</th><th class="num">در انتظار</th><th class="num">در حال اجرا</th><th class="num">توان در روز</th><th class="num">تأخیر</th><th class="num">ناموفق ۲۴ ساعت</th><th>وضعیت</th></tr></thead>
            <tbody>
              <template v-for="q in d.queues" :key="q.key">
                <tr>
                  <td><b class="mono">{{ q.name }}</b></td>
                  <td><SparkLine v-if="q.trend.length" :values="q.trend" :w="76" :h="22" :color="q.status === 'good' ? 'var(--series-1)' : 'var(--ink-2)'" /><span v-else class="faint">—</span></td>
                  <td class="num"><b>{{ n(q.waiting) }}</b></td>
                  <td class="num">{{ n(q.active) }}</td>
                  <td class="num">{{ compact(q.throughput) }}</td>
                  <td class="num"><template v-if="q.throughput == null"><span class="faint">—</span></template><template v-else><b v-if="q.delay > q.sla">{{ secs(q.delay) }}</b><template v-else>{{ secs(q.delay) }}</template><span class="s">مجاز: {{ secs(q.sla) }}</span></template></td>
                  <td class="num"><b v-if="q.failed24">{{ n(q.failed24) }}</b><span v-else class="faint">۰</span></td>
                  <td><StatusBadge :status="q.status" :label="Q_LABEL[q.status]" /></td>
                </tr>
                <tr v-if="q.error"><td colspan="8" style="padding-top: 0"><div class="mono" style="color: var(--crit-ink); background: var(--crit-wash); border-radius: 6px; padding: 6px 10px; font-size: 11.5px; overflow-wrap: anywhere; text-align: left">{{ q.error }}</div></td></tr>
              </template>
            </tbody>
          </table></div>
          <template #footer><span>بحرانی: {{ n(d.thresholds.critWaiting) }}+ در انتظار یا {{ n(d.thresholds.critFailed) }}+ شکست · هشدار: {{ n(d.thresholds.warnWaiting) }}+ در انتظار، {{ n(d.thresholds.warnFailed) }}+ شکست یا تأخیر بیش از حد مجاز</span></template>
        </PanelCard>
        <PanelCard title="اجرای اتوماسیون در ۲۴ ساعت" hint="ساعتی">
          <div v-if="!d.hourly.length" class="note">این بخش هنوز از بک‌اند داده نمی‌گیرد.</div>
          <ColumnChart v-else :options="runsChart" />
          <div class="legend" style="margin-top: 8px"><span class="k"><i class="sw" style="background: var(--series-1)" />موفق</span><span class="k"><i class="sw" style="background: var(--critical)" />ناموفق</span></div>
          <template #footer>
            <span v-if="!d.hourly.length">شمار اجراهای ساعتی در سرور ثبت نمی‌شود</span>
            <span v-else-if="d.failWindow">اجرای ناموفق فقط بین {{ clock(d.failWindow.from * 60) }} و {{ clock(d.failWindow.to * 60) }} {{ DAY[d.failWindow.day] }} — هم‌زمان با انباشت صف Automation</span>
            <span v-else>در ۲۴ ساعت اخیر اجرای ناموفقی نبوده</span>
          </template>
        </PanelCard>
      </div>

      <PanelCard id="crons" title="کارهای زمان‌بندی‌شده" hint="node-cron داخل server.ts" flush style="scroll-margin-top: 70px">
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>کار</th><th>وضعیت</th><th>آخرین اجرا</th><th>مدت</th><th>زمان‌بندی</th><th>اجرای بعدی</th></tr></thead>
          <tbody>
            <template v-for="c in d.crons" :key="c.key">
              <tr>
                <td><b>{{ c.name }}</b><template v-if="c.isNew"> <span class="tag">جدید</span></template></td>
                <td>
                  <span class="row" style="gap: 8px; flex-wrap: nowrap">
                    <StatusBadge v-if="c.queued" status="info" label="در صف اجرا" />
                    <StatusBadge v-else-if="c.status === 'fail'" status="crit" label="ناموفق" />
                    <StatusBadge v-else status="good" label="موفق" />
                    <button v-if="c.queued" class="btn sm ghost" @click="cancel(c)">لغو</button>
                    <button v-else-if="c.canRun !== false" class="btn sm" :class="{ primary: c.status === 'fail' }" @click="rerun(c)"><AppIcon name="refresh" />اجرای دوباره</button>
                  </span>
                </td>
                <td class="nowrap"><template v-if="c.lastT == null"><span class="faint">هنوز اجرا نشده</span></template><template v-else>{{ agoDays(c.lastT) }} {{ c.lastAt }}</template></td>
                <td class="nowrap">{{ c.duration }}</td>
                <td class="nowrap">{{ c.schedule }}</td>
                <td class="nowrap"><template v-if="c.next">{{ c.next.day ? 'فردا ' : 'امروز ' }}{{ clock(c.next.min) }}<span class="s">{{ waitText(c.next.wait) }}</span></template><span v-else class="faint">—</span></td>
              </tr>
              <tr v-if="c.status === 'fail' && c.error">
                <td colspan="6" style="padding-top: 0"><div class="mono" style="position: sticky; right: 10px; max-width: min(640px, calc(100vw - 72px)); color: var(--crit-ink); background: var(--crit-wash); border-radius: 6px; padding: 6px 10px; font-size: 11.5px; overflow-wrap: anywhere; text-align: left">{{ c.error }}</div></td>
              </tr>
            </template>
          </tbody>
        </table></div>
      </PanelCard>

      <PanelCard title="یادداشت فنی" hint="برای تیم بک‌اند">
        <div class="prose">
          <p v-if="d.expire"><b>علت شکست «{{ d.expire.name }}»:</b> <span class="mono">{{ d.expire.error }}</span> — کرسر Mongo در یک حلقهٔ طولانی منقضی می‌شود. اشتراک‌ها را در دسته‌های کوچک (مثلاً بر اساس <span class="mono">_id</span>) پردازش کنید تا هیچ کرسری باز نماند.</p>
          <p><b>پیشنهاد:</b> کران‌ها را از <span class="mono">node-cron</span> به <span class="mono">Bull repeatable jobs</span> ببرید. آن‌وقت هر اجرا (شروع، پایان، وضعیت، خطا) در Redis ثبت می‌شود، تلاش مجدد خودکار دارد و جدول بالا به‌جای حدس از داده‌ی واقعی پر می‌شود. امروز نتیجهٔ کران‌ها فقط در <span class="mono">console.error</span> می‌ماند و کسی خبردار نمی‌شود.</p>
        </div>
      </PanelCard>
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
import SparkLine from 'components/charts/SparkLine.vue'
import ColumnChart from 'components/charts/ColumnChart.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useUiStore } from 'stores/ui'
import { n, fa, compact, money, clock, agoDays } from 'src/lib/format'
import { toast } from 'src/lib/ui'

const ui = useUiStore()
const { data: d, loading, error } = useAsync(() => api.jobs(), [])
const k = computed(() => d.value.kpis)

const Q_LABEL = { crit: 'بحرانی', warn: 'هشدار', good: 'سالم' }
const DAY = { today: 'امروز', yesterday: 'دیروز' }
const secs = (s) => (s >= 120 ? n(s / 60, 1) + ' دقیقه' : n(s) + ' ثانیه')
const waitText = (w) => (w < 60 ? fa(w) + ' دقیقه دیگر' : fa(Math.round(w / 60)) + ' ساعت دیگر')

const runsChart = computed(() => {
  const hr = d.value.hourly
  return {
    labels: hr.map((x) => clock(x.hr * 60)), tipLabels: hr.map((x) => DAY[x.day] + ' ' + clock(x.hr * 60)), xEvery: 4, height: 250, total: 'کل اجرا',
    series: [
      { name: 'موفق', values: hr.map((x) => Math.max(0, x.runs - x.failed)), color: 'var(--series-1)' },
      { name: 'ناموفق', values: hr.map((x) => x.failed), color: 'var(--critical)' },
    ],
  }
})

async function rerun(c) {
  await api.runCron(c.key); ui.bump()
  toast('«' + c.name + '» در صف اجرا قرار گرفت', async () => { await api.cancelCron(c.key); ui.bump() })
}
async function cancel(c) {
  await api.cancelCron(c.key); ui.bump()
  toast('اجرای دوبارهٔ «' + c.name + '» لغو شد')
}
</script>
