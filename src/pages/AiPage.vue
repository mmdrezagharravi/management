<template>
  <PageShell title="تحلیل هوشمند" sub="گزارش روزانه — هر جمله از عددهای همین پنل ساخته شده؛ روی نام هر مشتری بزنید تا نمای سریع باز شود" :sources="['main', 'behavior', 'wallet']" :banner="false" :loading="loading" :error="error">
    <template #actions><button class="btn sm" @click="copyBrief"><AppIcon name="copy" />کپی متن گزارش</button></template>
    <template v-if="d">
      <PanelCard cls="ai-card" id="brief" :hint="weekdayName(0) + ' ' + date(0)">
        <template #title><span style="color: #7fb2f0; display: inline-flex"><AppIcon name="sparkle" /></span>وضعیت امروز</template>
        <div ref="briefEl" class="prose"><p v-for="(parts, i) in d.paragraphs" :key="i"><Rich :parts="parts" /></p></div>
        <div class="ai-stamp">تولید امروز ساعت {{ d.stamp.lastAt }}{{ d.stamp.duration ? ' در ' + d.stamp.duration : '' }} · مدل <span class="ltr">{{ d.stamp.model }}</span> · ورودی بی‌نام: فقط شناسهٔ {{ n(d.stamp.analysed) }} حساب و عددهایشان به مدل رفت و نام‌ها همین‌جا در مرورگر جایگزین شدند · {{ n(d.stamp.tokens) }} توکن · هزینه ≈ {{ n(d.stamp.cost, 2) }} دلار</div>
      </PanelCard>

      <div class="grid g3">
        <section v-for="f in d.findings" :key="f.key" class="card find">
          <div class="card-b">
            <div class="kick"><StatusBadge :status="f.cls" :label="f.kind" /></div>
            <h3>{{ f.title }}</h3>
            <div class="ex"><Rich :parts="f.text" /></div>
            <div class="ev">شواهد: <Rich :parts="f.ev" /></div>
          </div>
          <div class="card-f" style="justify-content: flex-start; flex-wrap: wrap; gap: 6px">
            <button v-if="f.taskOpen" class="btn sm ghost good" title="لغو وظیفه" @click="toggleTask(f)"><AppIcon name="check" />وظیفه ساخته شد</button>
            <button v-else class="btn sm primary" @click="toggleTask(f)"><AppIcon name="plus" />ساخت وظیفه</button>
            <router-link class="btn sm ghost" :to="f.link.to">{{ f.link.label }}<AppIcon name="chevronL" /></router-link>
            <span style="margin-inline-start: auto; display: inline-flex; gap: 4px">
              <button class="btn sm icon fb" :class="{ on: f.feedback === 'up' }" :aria-pressed="String(f.feedback === 'up')" title="مفید بود" aria-label="مفید بود" @click="feedback(f, 'up')"><AppIcon name="thumb" size="15" /></button>
              <button class="btn sm icon fb" :class="{ on: f.feedback === 'down' }" :aria-pressed="String(f.feedback === 'down')" title="مفید نبود" aria-label="مفید نبود" @click="feedback(f, 'down')"><span style="display: inline-flex; transform: scaleY(-1)"><AppIcon name="thumb" size="15" /></span></button>
            </span>
          </div>
        </section>
      </div>

      <div class="grid g-main">
        <PanelCard title="اقدام‌های پیشنهادی" hint="به ترتیب اثر بر درآمد ماهانه" flush id="acts">
          <div v-for="(x, i) in d.actions.top" :key="x.key" class="task">
            <span class="ico" :class="x.risk ? 'p1' : 'p3'"><b>{{ fa(i + 1) }}</b></span>
            <div style="min-width: 0">
              <div class="tt"><span><Rich :parts="x.title" /></span></div>
              <div class="why">{{ x.why }}</div>
              <div class="meta">
                <span><span v-if="x.risk" class="sig due">در خطر {{ compact(x.value) }} در ماه</span><span v-else class="sig price">فرصت +{{ compact(x.value) }} در ماه</span></span>
              </div>
            </div>
            <div class="acts">
              <button v-if="x.inToday" class="btn sm ghost good" title="حذف از کارهای امروز" @click="toggleToday(x)"><AppIcon name="check" />در کارهای امروز</button>
              <button v-else class="btn sm" @click="toggleToday(x)"><AppIcon name="inbox" />ثبت در کارهای امروز</button>
            </div>
          </div>
          <template #footer><span>{{ fa(d.actions.total) }} مورد بررسی شد؛ {{ fa(d.actions.top.length) }} مورد پراثرتر اینجاست</span><router-link to="/today">کارهای امروز</router-link></template>
        </PanelCard>
        <div class="stack">
          <PanelCard title="چه داده‌ای استفاده شد">
            <div class="kv"><span class="k">حساب‌های تحلیل‌شده</span><span class="v">{{ n(du.analysed) }} <span class="muted" style="font-weight: 400">از {{ n(du.total) }}</span></span></div>
            <div class="kv"><span class="k">رویدادهای ۳۰ روز اخیر</span><span class="v">{{ n(du.events30) }}</span></div>
            <div class="kv"><span class="k">پرداخت‌های ۳۰ روز اخیر</span><span class="v">{{ n(du.invoices30) }}</span></div>
            <div class="kv"><span class="k">ثبت‌نام‌ها برای مقایسهٔ کانال‌ها</span><span class="v">{{ n(du.signups) }}</span></div>
            <div class="kv"><span class="k">بازهٔ تحلیل</span><span class="v">۳۰ روز فعالیت · {{ fa(du.historyDays) }} روز تاریخچهٔ سلامت</span></div>
            <div class="kv"><span class="k">تأخیر لاگ رفتاری</span><span class="v"><span class="sig due">{{ lagText(du.behaviorLagMin) }}</span></span></div>
            <div class="note" style="margin-top: 8px">به مدل فقط شناسهٔ حساب و عدد می‌رسد؛ نام، شماره و ایمیل از پنل خارج نمی‌شود. <router-link to="/data-health" style="color: var(--accent-ink); font-weight: 600">سلامت داده</router-link></div>
          </PanelCard>
          <PanelCard title="تاریخچه" hint="۷ گزارش اخیر" flush>
            <div class="list hist" style="padding: 0 16px">
              <div v-for="x in d.history" :key="x.d" class="li">
                <span class="when"><b>{{ x.d === 0 ? 'امروز' : x.d === 1 ? 'دیروز' : weekdayName(x.d) }}</b>{{ date(x.d) }}</span>
                <span class="main"><span class="hl"><Rich :parts="x.hl" /></span><span class="d">{{ x.sub }}</span></span>
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </template>
  </PageShell>
</template>

<script setup>
import { computed, h, ref } from 'vue'
import { RouterLink } from 'vue-router'
import PageShell from 'components/PageShell.vue'
import PanelCard from 'components/PanelCard.vue'
import AppIcon from 'components/AppIcon.vue'
import AccountLink from 'components/AccountLink.vue'
import StatusBadge from 'components/StatusBadge.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useUiStore } from 'stores/ui'
import { n, fa, compact, date, weekdayName, lagText } from 'src/lib/format'
import { toast } from 'src/lib/ui'

/** Rich text parts from the brief: string | {b} | {cls,t} | {acc,name,cls} | {to,t}. */
const Rich = (props) => props.parts.map((p) => (typeof p === 'string' ? p
  : p.acc ? h(AccountLink, { id: p.acc, name: p.name, cls: p.cls })
  : p.to ? h(RouterLink, { to: p.to, class: 'ai-link' }, () => p.t)
  : p.b ? h('b', p.b) : h('span', { class: p.cls }, p.t)))
Rich.props = ['parts']

const ui = useUiStore()
const briefEl = ref(null)
const { data: d, loading, error } = useAsync(() => api.aiBrief(), [])
const du = computed(() => d.value.dataUsed)

async function toggleTask(f) {
  await api.setTask(f.taskId, f.taskOpen ? { status: null } : { status: 'open', title: f.title, kind: f.kind, due: 0 })
  ui.bump()
  toast(f.taskOpen ? 'وظیفه لغو شد' : 'وظیفه ساخته شد: ' + f.title, f.taskOpen ? null : async () => { await api.setTask(f.taskId, { status: null }); ui.bump() })
}
async function feedback(f, v) {
  const on = f.feedback !== v
  await api.setAiFeedback(f.fbKey, on ? v : null)
  ui.bump()
  toast(on ? 'بازخورد ثبت شد — ممنون' : 'بازخورد برداشته شد')
}
async function toggleToday(x) {
  await api.setTask(x.taskId, x.inToday ? { status: null } : { status: 'open', due: 0, accountId: x.accountId, value: x.value, why: x.why })
  ui.bump()
  toast(x.inToday ? 'از کارهای امروز برداشته شد' : 'در کارهای امروز ثبت شد')
}
function copyBrief() {
  const txt = 'وضعیت امروز — ' + date(0) + '\n\n' + (briefEl.value ? briefEl.value.innerText : '')
  const done = () => toast('متن گزارش کپی شد')
  const fallback = () => {
    const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select()
    try { document.execCommand('copy'); done() } catch (e) { toast('کپی نشد؛ متن را دستی انتخاب کنید') }
    ta.remove()
  }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fallback); else fallback()
}
</script>

<style scoped>
:deep(.ai-link) { font-weight: 700; color: var(--accent-ink); }
:deep(.ai-link:hover) { text-decoration: underline; }
.ai-card .prose p + p { margin-top: 8px; }
.ai-stamp { font-size: 11.5px; color: #8ea3b8; margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, .09); line-height: 1.9; }
.ai-stamp .ltr { color: #c6d3e0; }
.find .kick { display: flex; align-items: center; gap: 8px; justify-content: space-between; }
.find h3 { font-size: 14.5px; font-weight: 800; letter-spacing: -.2px; line-height: 1.5; margin-top: 8px; }
.find .ex { font-size: 12.5px; color: var(--ink-2); line-height: 1.95; margin-top: 4px; }
.find .ev { font-size: 11.8px; color: var(--muted); background: var(--surface-2); border: 1px solid var(--grid); border-radius: 8px; padding: 7px 10px; margin-top: 10px; line-height: 1.8; }
.find .ev :deep(b) { color: var(--ink); font-variant-numeric: tabular-nums; }
.fb.on { background: var(--accent-wash); border-color: color-mix(in srgb, var(--accent) 55%, transparent); color: var(--accent-ink); }
.hist .li { align-items: flex-start; }
.hist .hl { font-weight: 700; font-size: 12.8px; line-height: 1.7; }
.hist .when { font-size: 11.5px; color: var(--muted); white-space: nowrap; min-width: 92px; }
.hist .when b { display: block; color: var(--ink); font-size: 12px; }
.hist .li .d { white-space: normal; }
</style>
