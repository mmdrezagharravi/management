<template>
  <PageShell title="تعریف‌ها و دسترسی" sub="هر عدد پنل با همین تعریف‌ها حساب می‌شود — یک جا، برای همه" :loading="loading" :error="error">
    <template v-if="d">
      <div class="tabs" role="tablist">
        <button v-for="t in TABS" :key="t.key" role="tab" :class="{ on: t.key === tab }" :aria-selected="t.key === tab" @click="tab = t.key">{{ t.label }}<span v-if="t.key === 'audit'" class="n">{{ fa(d.audit.length) }}</span></button>
      </div>

      <!-- ===================================================== definitions -->
      <div v-if="tab === 'defs'" class="stack" style="gap: 14px">
        <div class="grid g2">
          <PanelCard title="فعالیت و فعال‌سازی" flush>
            <div class="list" style="padding: 0 16px">
              <DefRow name="حساب فعال" :text="'حسابی که در ' + fa(D.activeWindow) + ' روز اخیر دست‌کم یک رویداد (ساخت یا ویرایش رکورد، اجرای اتوماسیون و…) داشته.'" :val="n(D.active7)" />
              <DefRow name="فعال‌سازی" :text="'ثبت‌نامی که در ' + fa(D.activation.days) + ' روز اول به ' + fa(D.activation.records) + ' رکورد رسیده. نرخ آن فقط برای کوهورت‌هایی که ۷ روزشان تمام شده حساب می‌شود.'" />
              <DefRow name="عادت" :text="'حساب فعال‌شده‌ای که در ' + fa(D.habit.weeks) + ' هفته از ' + fa(D.habit.of) + ' هفتهٔ اول کار کرده.'" />
              <DefRow name="حساب خاموش" :text="'بیش از ' + fa(D.dormantDays) + ' روز هیچ فعالیتی نداشته.'" :val="n(D.dormant)" />
            </div>
          </PanelCard>
          <PanelCard title="درآمد" flush>
            <div class="list" style="padding: 0 16px">
              <DefRow name="MRR — درآمد ماهانهٔ تکرارشونده" :text="'جمع اشتراک‌های فعال به ماه. پرداخت سه‌ماهه و سالانه بر تعداد ماه تقسیم می‌شود' + (cyc ? ' (با تخفیف ' + cyc + ')' : '') + '.'" :val="money(D.mrrNow)" />
              <DefRow name="ARPA — میانگین درآمد هر حساب" :val="money(D.payNow ? D.mrrNow / D.payNow : 0)"><span class="ltr">MRR</span> تقسیم بر تعداد حساب‌های پرداخت‌کننده ({{ n(D.payNow) }}).</DefRow>
              <DefRow name="ریزش درآمد" :val="pct(D.churnRate, 1)"><span class="ltr">MRR</span> اشتراک‌های لغوشده در ۳۰ روز، تقسیم بر <span class="ltr">MRR</span> سی روز پیش. ریزش حساب: {{ n(D.churnCount) }} از {{ n(D.payPrev) }} حساب.</DefRow>
              <DefRow name="NRR — نگهداشت خالص درآمد" :val="pct(D.nrr, 1)">(<span class="ltr">MRR</span> سی روز پیش + افزایش − کاهش − ریزش) تقسیم بر <span class="ltr">MRR</span> سی روز پیش. مشتریان جدید حساب نمی‌شوند؛ بالای ۱۰۰٪ یعنی مشتریان فعلی به‌تنهایی رشد می‌دهند.</DefRow>
            </div>
          </PanelCard>
        </div>
        <div class="grid g2">
          <PanelCard title="امتیاز سلامت" hint="پنج مؤلفه × ۲۰ = ۰ تا ۱۰۰" flush>
            <div class="list" style="padding: 0 16px">
              <DefRow v-for="c in D.components" :key="c.key" :text="c.desc"><template #name>{{ c.label }} <span class="faint" style="font-weight: 400">· ۰ تا ۲۰</span></template></DefRow>
            </div>
            <div style="padding: 4px 16px 14px">
              <div class="section-title" style="margin: 6px 0 8px">باندها <span class="faint" style="font-weight: 400">— تعداد مشتریان پرداخت‌کننده</span></div>
              <div class="stack" style="gap: 6px">
                <div v-for="(b, i) in D.bands" :key="b.key" class="row between">
                  <StatusBadge :status="b.key" :label="b.label" />
                  <span class="muted" style="font-size: 12px">{{ fa(b.min) }} تا {{ fa(i ? D.bands[i - 1].min - 1 : 100) }}</span>
                  <b style="min-width: 48px; text-align: left">{{ n(b.n) }}</b>
                </div>
              </div>
            </div>
            <template #footer><span>آستانهٔ باندها را در زبانهٔ «آستانه‌ها» می‌توانید تغییر دهید</span><router-link to="/health">سلامت و ریسک</router-link></template>
          </PanelCard>
          <PanelCard title="سقف پلن‌ها" hint="از پیکربندی پلن" flush>
            <div class="tbl-wrap"><table class="tbl compact">
              <thead><tr><th></th><th v-for="p in D.plans" :key="p.key" class="num"><PlanBadge :plan="p.key" /></th></tr></thead>
              <tbody>
                <tr v-for="r in planRows" :key="r.label">
                  <td class="nowrap muted">{{ r.label }}</td>
                  <td v-for="p in D.plans" :key="p.key" class="num"><span :class="r.cell(p).cls">{{ r.cell(p).text }}</span></td>
                </tr>
              </tbody>
            </table></div>
            <template #footer><span>رکورد و فضا تجمعی است؛ اجرا، پیامک و توکن هر ماه صفر می‌شود</span><router-link to="/quota">مصرف و سهمیه</router-link></template>
          </PanelCard>
        </div>
        <PanelCard title="دسته‌بندی‌ها" hint="هر حساب می‌تواند در چند دسته باشد" flush>
          <div class="tbl-wrap"><table class="tbl">
            <thead><tr><th>دسته</th><th class="num">حساب امروز</th><th>قانون</th><th>یعنی</th></tr></thead>
            <tbody>
              <tr v-for="s in D.segments" :key="s.key"><td class="nowrap"><b>{{ s.label }}</b></td><td class="num"><b>{{ n(s.n) }}</b></td><td><span class="mono" style="font-size: 11.5px">{{ s.rule }}</span></td><td class="muted">{{ s.desc }}</td></tr>
            </tbody>
          </table></div>
          <template #footer><span>قانون‌ها همان‌طور که در موتور محاسبه نوشته شده‌اند</span><router-link to="/segments">دسته‌بندی‌ها</router-link></template>
        </PanelCard>
      </div>

      <!-- ===================================================== thresholds -->
      <div v-else-if="tab === 'thresholds'" class="stack" style="gap: 14px">
        <div v-if="!canEdit" class="banner info"><AppIcon name="lock" /><div>فقط مدیر فروش و مدیر سیستم می‌توانند آستانه‌ها را تغییر دهند. مقدارهای فعلی را می‌بینید.</div></div>
        <div class="grid g3">
          <PanelCard title="فعال‌سازی" hint="برای ثبت‌نام‌های جدید">
            <div class="stack" style="gap: 12px">
              <ThField k="actRecords" label="حداقل رکورد" :min="1" :max="10000" />
              <ThField k="actDays" label="در چند روز اول" :min="1" :max="30" />
            </div>
          </PanelCard>
          <PanelCard title="باندهای سلامت" hint="حداقل امتیاز هر باند">
            <div class="stack" style="gap: 12px">
              <ThField k="good" :label="bandLabel('good') + ' از'" :min="1" :max="100" />
              <ThField k="warn" :label="bandLabel('warn') + ' از'" :min="1" :max="100" />
              <ThField k="ser" :label="bandLabel('ser') + ' از'" :min="1" :max="100" />
              <span class="note">کمتر از آخرین عدد = {{ bandLabel('crit') }}</span>
            </div>
          </PanelCard>
          <PanelCard title="آمادهٔ ارتقا" hint="پلن رایگان و پایه">
            <div class="stack" style="gap: 12px">
              <ThField k="upHits" label="برخورد با سقف در ۳۰ روز (حداقل)" :min="1" :max="40" />
              <ThField k="upPricing" label="بازدید صفحهٔ قیمت در ۳۰ روز (حداقل)" :min="0" :max="20" />
              <ThField k="upSeen" label="آخرین فعالیت (حداکثر روز)" :min="1" :max="90" />
            </div>
          </PanelCard>
        </div>
        <PanelCard title="اثر روی امروز" hint="با عددهای بالا — پیش از ذخیره">
          <div v-if="pv" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px">
            <PreviewCell label="آمادهٔ ارتقا" :n="pv.upsell.n" :today="pv.upsell.today" />
            <PreviewCell v-for="b in pv.bands" :key="b.key" :label="'پرداخت‌کنندهٔ ' + b.label" :n="b.n" :today="b.today" />
          </div>
          <div class="note" style="margin-top: 8px">فعال‌سازی فقط روی ثبت‌نام‌های بعد از ذخیره اثر دارد، برای همین پیش‌نمایش ندارد.</div>
          <template #footer>
            <span class="row wrap" style="gap: 8px">
              <template v-if="canEdit">
                <button class="btn primary" @click="save"><AppIcon name="check" />ذخیره</button>
                <button class="btn ghost" :disabled="!d.saved" @click="reset">بازگشت به پیش‌فرض</button>
              </template>
            </span>
            <span>{{ d.saved ? 'مقدارهای ذخیره‌شده در این مرورگر' : 'مقدارهای پیش‌فرض سیستم' }}</span>
          </template>
        </PanelCard>
      </div>

      <!-- ===================================================== roles -->
      <div v-else-if="tab === 'roles'" class="stack" style="gap: 14px">
        <PanelCard title="نقش‌ها و دسترسی" :hint="'نقش شما: ' + myRole.label" flush>
          <div class="tbl-wrap"><table class="tbl">
            <thead><tr><th>نقش</th><th v-for="p in d.perms" :key="p" style="text-align: center">{{ p }}</th></tr></thead>
            <tbody>
              <tr v-for="r in d.roles" :key="r.key" :class="{ sel: r.key === myRole.key }">
                <td class="nowrap"><b>{{ r.label }}</b><template v-if="r.key === myRole.key"> <span class="tag">شما</span></template></td>
                <td v-for="(x, i) in r.p" :key="i" style="text-align: center"><b v-if="x" style="color: var(--good-ink)" aria-label="دارد">✓</b><span v-else class="faint" aria-label="ندارد">—</span></td>
              </tr>
            </tbody>
          </table></div>
          <template #footer><span>کارشناس فروش فقط مشتریانی را می‌بیند که مسئولشان است</span><a href="/settings?tab=audit" @click.prevent="tab = 'audit'">گزارش ممیزی</a></template>
        </PanelCard>
        <div class="banner info"><AppIcon name="lock" /><div><b>شماره و ایمیل مشتری پیش‌فرض پوشیده است.</b> هر بار که کسی آن را باز می‌کند یا خروجی CSV می‌گیرد، با نام، زمان و حساب در «گزارش ممیزی» ثبت می‌شود.</div></div>
      </div>

      <!-- ===================================================== audit -->
      <div v-else-if="tab === 'audit'" class="stack" style="gap: 14px">
        <PanelCard flush>
          <DataTable :rows="d.audit" :columns="auditColumns" :filters="auditFilters" :search="auditSearch" :sort="{ key: 'ts', dir: 'desc' }" :page-size="25" export-name="audit" unit="رویداد" :on-row="(r) => r.target && ui.openAccount(r.target.id)">
            <template #col-ts="{ row }">
              <span v-if="row.src === 'server'" class="nowrap">{{ agoDays(row.t) }} {{ clock(row.min) }}</span>
              <span v-else class="nowrap">{{ ago(Math.max(0, (Date.now() - row.at) / 60000)) }}<q-tooltip>{{ fmtLocal.format(new Date(row.at)) }}</q-tooltip></span>
            </template>
            <template #col-who="{ row }"><span class="row" style="gap: 7px"><span class="avatar">{{ initials(row.who) }}</span><b class="nowrap">{{ row.who }}</b></span></template>
            <template #col-target="{ row }"><AccountLink v-if="row.target" :id="row.target.id" :name="row.target.name" style="font-weight: 600" /><span v-else class="faint">—</span></template>
            <template #col-src="{ row }"><span v-if="row.src === 'local'" class="tag">این مرورگر</span><span v-else class="muted">سرور</span></template>
          </DataTable>
        </PanelCard>
        <div class="note">«این مرورگر» یعنی کارهایی که همین‌جا انجام داده‌اید (نمایش شماره، خروجی، تغییر مسئول، تغییر آستانه) — {{ n(d.audit.filter((r) => r.src === 'local').length) }} مورد. در نسخهٔ واقعی همه روی سرور ثبت می‌شوند.</div>
      </div>
    </template>
  </PageShell>
</template>

<script setup>
import { computed, reactive, watch, h } from 'vue'
import PageShell from 'components/PageShell.vue'
import PanelCard from 'components/PanelCard.vue'
import DataTable from 'components/DataTable.vue'
import StatusBadge from 'components/StatusBadge.vue'
import PlanBadge from 'components/PlanBadge.vue'
import AccountLink from 'components/AccountLink.vue'
import AppIcon from 'components/AppIcon.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useQueryParam } from 'src/composables/useUrlState'
import { useUiStore } from 'stores/ui'
import { useSessionStore } from 'stores/session'
import { n, fa, pct, money, compact, clock, ago, agoDays, initials } from 'src/lib/format'
import { toast } from 'src/lib/ui'

const ui = useUiStore(), session = useSessionStore()
const TABS = [
  { key: 'defs', label: 'تعریف معیارها' },
  { key: 'thresholds', label: 'آستانه‌ها' },
  { key: 'roles', label: 'نقش‌ها و دسترسی' },
  { key: 'audit', label: 'گزارش ممیزی' },
]
const tabParam = useQueryParam('tab', 'defs')
const tab = computed({ get: () => (TABS.some((t) => t.key === tabParam.value) ? tabParam.value : 'defs'), set: (v) => { tabParam.value = v } })

const { data: d, loading, error } = useAsync(() => api.settings(), [])
const D = computed(() => d.value.defs)
const canEdit = computed(() => session.me.role === 'manager')
const myRole = computed(() => d.value.roles.find((r) => r.key === (session.me.role === 'rep' ? 'rep' : 'manager')))

/* ---- definitions */
const cyc = computed(() => D.value.cycles.map((c) => c.name + ' ' + pct(c.discount)).join('، '))
const lim = (v, f) => (v == null ? { cls: 'muted', text: 'به تعداد خرید' } : v === 0 ? { cls: 'faint', text: '—' } : { cls: '', text: f ? f(v) : n(v) })
const planRows = [
  { label: 'قیمت ماهانه', cell: (p) => (p.price == null ? { cls: 'faint', text: '—' } : { cls: '', text: p.price ? money(p.price) : 'رایگان' }) },
  { label: 'صندلی در قیمت', cell: (p) => ({ cls: '', text: n(p.seatsIncluded) }) },
  { label: 'هر صندلی اضافه', cell: (p) => (p.seatPrice ? { cls: '', text: money(p.seatPrice) } : { cls: 'faint', text: '—' }) },
  { label: 'سقف صندلی', cell: (p) => lim(p.limits.seats) },
  { label: 'رکورد (کل حساب)', cell: (p) => lim(p.limits.records) },
  { label: 'اجرای اتوماسیون در ماه', cell: (p) => lim(p.limits.runs) },
  { label: 'پیامک در ماه', cell: (p) => lim(p.limits.sms) },
  { label: 'توکن هوش مصنوعی در ماه', cell: (p) => lim(p.limits.ai, compact) },
  { label: 'فضای ذخیره', cell: (p) => lim(p.limits.storage, (v) => n(v) + ' گیگ') },
]
/** One definition line: name, explanation, optional today's value. */
const DefRow = (props, { slots }) => h('div', { class: 'li', style: 'align-items:flex-start' }, [
  h('span', { class: 'main' }, [h('span', { class: 't' }, slots.name ? slots.name() : props.name), h('span', { class: 'd', style: 'white-space:normal' }, slots.default ? slots.default() : props.text)]),
  props.val ? h('span', { class: 'end' }, [h('b', props.val), h('div', { class: 'muted', style: 'font-size:11px' }, 'امروز')]) : null,
])
DefRow.props = ['name', 'text', 'val']

/* ---- thresholds */
const form = reactive({})
watch(d, (v) => { if (v) Object.assign(form, v.current) }, { immediate: true })
const bandLabel = (k) => D.value.bands.find((b) => b.key === k).label
const { data: pv } = useAsync(() => (d.value ? api.settingsPreview(read()) : Promise.resolve(null)), [() => JSON.stringify(form)])
const read = () => { const o = {}; Object.keys(form).forEach((k) => { o[k] = Math.round(+form[k]) }); return o }
const ThField = (props) => h('label', { class: 'field' }, [
  props.label,
  h('input', { class: 'input', type: 'number', inputmode: 'numeric', min: props.min, max: props.max, value: form[props.k], disabled: !canEdit.value, style: 'max-width:140px', onInput: (e) => { form[props.k] = e.target.value } }),
  h('span', { class: 'faint', style: 'font-weight:400' }, ['پیش‌فرض: ' + fa(d.value.defaults[props.k]), d.value.current[props.k] !== d.value.defaults[props.k] ? h('span', [' · ', h('b', { style: 'color:var(--accent-ink)' }, 'تغییر کرده')]) : null]),
])
ThField.props = ['k', 'label', 'min', 'max']
const PreviewCell = (props) => h('div', { style: 'border:1px solid var(--border);border-radius:9px;padding:9px 12px;min-width:0' }, [
  h('div', { class: 'muted', style: 'font-size:11.5px;font-weight:600' }, props.label),
  h('div', { style: 'font-weight:800;font-size:19px' }, n(props.n)),
  h('div', { style: 'font-size:11.5px' }, props.n === props.today ? [h('span', { class: 'faint' }, 'بدون تغییر')] : [h('b', { style: 'color:var(--accent-ink)' }, (props.n > props.today ? '+' : '−') + n(Math.abs(props.n - props.today))), ' ', h('span', { class: 'faint' }, 'نسبت به ' + n(props.today) + ' امروز')]),
])
PreviewCell.props = ['label', 'n', 'today']

async function save() {
  const v = read()
  const bad = Object.entries(v).find(([, x]) => isNaN(x) || x < 0)
  if (bad) return toast('عدد نامعتبر است')
  if (!(v.good <= 100 && v.good > v.warn && v.warn > v.ser && v.ser > 0)) return toast('باندها باید نزولی باشند: سالم > نیاز به توجه > در خطر > ۰')
  if (v.actRecords < 1 || v.actDays < 1 || v.actDays > 30) return toast('فعال‌سازی: حداقل ۱ رکورد و بین ۱ تا ۳۰ روز')
  await api.setThresholds(v, Object.keys(v).filter((k) => v[k] !== d.value.defaults[k]).length); ui.bump()
  toast('ذخیره شد — در نسخهٔ واقعی روی سرور اعمال می‌شود')
}
async function reset() {
  const prev = d.value.saved ? { ...d.value.current } : null
  await api.setThresholds(null); ui.bump()
  toast('آستانه‌ها به پیش‌فرض برگشت', async () => { await api.setThresholds(prev); ui.bump() })
}

/* ---- audit */
const fmtLocal = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tehran' })
const auditSearch = { placeholder: 'کار، شخص یا حساب…', text: (r) => r.action + ' ' + r.who + ' ' + (r.target ? r.target.name : '') }
const auditFilters = computed(() => [
  { key: 'src', label: 'منبع', options: [{ v: 'server', l: 'سرور' }, { v: 'local', l: 'این مرورگر' }], test: (r, v) => r.src === v },
  { key: 'who', label: 'شخص', options: [...new Set(d.value.audit.map((r) => r.who))].map((w) => ({ v: w, l: w })), test: (r, v) => r.who === v },
])
const auditColumns = [
  { key: 'ts', label: 'زمان', desc: true, csv: (r) => new Date(r.ts).toISOString() },
  { key: 'who', label: 'چه کسی', csv: (r) => r.who },
  { key: 'action', label: 'کار' },
  { key: 'target', label: 'حساب', sort: (r) => (r.target ? r.target.name : ''), csv: (r) => (r.target ? r.target.name : '') },
  { key: 'src', label: 'منبع', csv: (r) => (r.src === 'local' ? 'این مرورگر' : 'سرور') },
]
</script>
