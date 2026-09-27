<template>
  <div class="dt">
    <div v-if="views" class="chipbar" style="padding: 12px 16px 0">
      <button v-for="v in views" :key="v.key" class="chip" :class="{ on: v.key === st.view }" @click="setView(v.key)">{{ v.label }} <span class="n">{{ fa(viewCount(v)) }}</span></button>
    </div>
    <div class="toolbar" style="padding: 12px 16px">
      <label v-if="search" class="searchbox"><AppIcon name="search" /><input class="input" v-model="st.q" :placeholder="search.placeholder || 'جستجو…'" @input="st.page = 0" /></label>
      <select v-for="f in filters || []" :key="f.key" class="select" :class="{ on: st.f[f.key] }" v-model="st.f[f.key]" :aria-label="f.label" @change="st.page = 0">
        <option value="">{{ f.label }}: همه</option>
        <option v-for="op in f.options" :key="op.v" :value="String(op.v)">{{ op.l }}</option>
      </select>
      <button v-if="st.q || Object.values(st.f).some(Boolean)" class="btn ghost sm" @click="clear">پاک کردن فیلترها</button>
      <span class="count"><b>{{ fa(total) }}</b> {{ unit }}<span v-if="rs.loading" class="faint"> · در حال بارگذاری…</span></span>
      <slot name="toolbar" />
      <button v-if="exportName" class="btn sm" @click="exportCsv"><AppIcon name="download" />خروجی CSV<q-tooltip>خروجی CSV از همین ردیف‌های فیلترشده</q-tooltip></button>
    </div>
    <div v-if="select && st.sel.size" style="padding: 0 16px 10px">
      <div class="bulkbar">
        <b>{{ fa(st.sel.size) }} انتخاب شده</b>
        <slot name="bulk" :rows="selectedRows" :done="clearSel" />
        <button class="btn ghost sm" @click="clearSel">لغو انتخاب</button>
      </div>
    </div>
    <div v-if="rs.error" class="banner crit" style="margin: 0 16px 10px"><AppIcon name="alert" /><div>{{ rs.error }}</div></div>
    <div class="tbl-wrap" :class="{ busy: rs.loading }">
      <table class="tbl" :class="{ compact }">
        <thead>
          <tr>
            <th v-if="select" class="chkcol"><input type="checkbox" :checked="slice.length > 0 && slice.every((r) => st.sel.has(r.id))" aria-label="انتخاب همه در این صفحه" @change="toggleAll($event.target.checked)" /></th>
            <th v-for="c in columns" :key="c.key" :class="[c.num ? 'num' : '', c.cls, sortable(c) ? 'sortable' : '', st.sort === c.key ? st.dir : '']" :tabindex="sortable(c) ? 0 : undefined" :aria-sort="st.sort === c.key ? (st.dir === 'asc' ? 'ascending' : 'descending') : undefined" @click="sortable(c) && sortBy(c)" @keydown.enter.space.prevent="sortable(c) && sortBy(c)">
              {{ c.label }}<span v-if="sortable(c)" class="ar">{{ st.sort === c.key ? (st.dir === 'asc' ? '▲' : '▼') : '▼' }}</span>
              <q-tooltip v-if="c.title">{{ c.title }}</q-tooltip>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in slice" :key="r.id ?? i" :class="[onRow ? 'click' : '', st.sel.has(r.id) ? 'sel' : '', i === st.focus ? 'kfocus' : '', rowClass ? rowClass(r) : '']" @click="rowClick(r, i, $event)">
            <td v-if="select" class="chkcol"><input type="checkbox" :checked="st.sel.has(r.id)" aria-label="انتخاب" @click.stop @change="toggleSel(r.id, $event.target.checked)" /></td>
            <td v-for="c in columns" :key="c.key" :class="[c.num ? 'num' : '', c.cls]">
              <slot :name="'col-' + c.key" :row="r" :value="r[c.key]">{{ c.format ? c.format(r) : r[c.key] }}</slot>
            </td>
          </tr>
          <tr v-if="!slice.length">
            <td :colspan="columns.length + (select ? 1 : 0)"><div v-if="rs.loading" class="empty"><b>در حال بارگذاری…</b></div><div v-else class="empty"><b>{{ emptyTitle || 'ردیفی با این فیلترها نیست' }}</b>{{ empty || 'فیلترها را کم کنید یا عبارت جستجو را تغییر دهید.' }}</div></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="total > st.size || pageSizes" class="tbl-foot">
      <span>نمایش {{ fa(total ? st.page * st.size + 1 : 0) }} تا {{ fa(Math.min(total, (st.page + 1) * st.size)) }} از {{ fa(total) }}</span>
      <span class="row" style="gap: 10px">
        <select class="select" v-model.number="st.size" style="height: 28px" aria-label="ردیف در صفحه" @change="st.page = 0">
          <option v-for="s in sizeOptions" :key="s" :value="s">{{ fa(s) }} ردیف</option>
        </select>
        <span class="pager">
          <button :disabled="st.page === 0" aria-label="قبلی" @click="go(st.page - 1)"><AppIcon name="chevronR" /></button>
          <template v-for="(p, k) in pagerItems" :key="k">
            <span v-if="p === '…'" class="faint">…</span>
            <button v-else :class="{ on: p === st.page }" @click="go(p)">{{ fa(p + 1) }}</button>
          </template>
          <button :disabled="st.page >= pages - 1" aria-label="بعدی" @click="go(st.page + 1)"><AppIcon name="chevronL" /></button>
        </span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { fa, norm } from 'src/lib/format'
import { downloadCsv } from 'src/lib/csv'
import { api } from 'src/api'
import { toast } from 'src/lib/ui'
import { useUiStore } from 'stores/ui'

/**
 * columns: [{ key, label, num, sort: (r)=>v | false, desc, format: (r)=>text, csv: (r)=>text | false, cls, title }]
 * views:   [{ key, label, test: (r)=>bool | null }]   filters: [{ key, label, options:[{v,l}], test:(r,v)=>bool }]
 * search:  { placeholder, text: (r)=>string }          bulk actions go in the #bulk slot ({rows, done})
 * remote:  async (params) => ({ rows, total, counts }) — the server filters, sorts and pages; params are
 *          { page, size, dir, view?, q?, sort? (column.sortKey), [filter.param || filter.key] }. Emits `loaded`.
 * Cell content: use <template #col-KEY="{ row }"> … </template>; the default is row[key] or column.format(row).
 */
const props = defineProps({
  rows: { type: Array, default: () => [] }, columns: { type: Array, required: true },
  views: Array, defaultView: String, filters: Array, search: Object, sort: Object,
  pageSize: { type: Number, default: 25 }, pageSizes: { type: Boolean, default: true },
  select: Boolean, onRow: Function, exportName: String, unit: { type: String, default: 'ردیف' },
  emptyTitle: String, empty: String, compact: Boolean, rowClass: Function, url: Boolean, keyboard: { type: Boolean, default: true },
  remote: Function,
})
const emit = defineEmits(['loaded'])
const route = useRoute(), router = useRouter(), ui = useUiStore()
const Q = props.url ? route.query : {}
const st = reactive({
  q: Q.q || '', view: Q.view || (props.views ? props.defaultView || props.views[0].key : null),
  sort: Q.sort || (props.sort ? props.sort.key : null), dir: Q.dir || (props.sort ? props.sort.dir || 'desc' : 'desc'),
  page: 0, size: props.pageSize, f: {}, sel: new Set(), focus: -1,
})
;(props.filters || []).forEach((f) => { st.f[f.key] = Q[f.key] ? String(Q[f.key]) : '' })

const colByKey = (k) => props.columns.find((c) => c.key === k)
const sortable = (c) => (props.remote ? !!c.sortKey : c.sort !== false && !c.nosort)
const applyView = (rows, key) => { const v = props.views && props.views.find((x) => x.key === key); return v && v.test ? rows.filter(v.test) : rows }
const viewCount = (v) => (props.remote ? rs.counts[v.key] ?? '' : v.test ? props.rows.filter(v.test).length : props.rows.length)

/* remote mode: the server does view/filter/search/sort/paging; one request per change */
const rs = reactive({ rows: [], total: 0, counts: {}, loading: false, error: null })
function remoteParams() {
  const c = st.sort && colByKey(st.sort)
  const p = { page: st.page, size: st.size, dir: st.dir }
  if (props.views) p.view = st.view
  if (st.q) p.q = st.q
  if (c && c.sortKey) p.sort = c.sortKey
  ;(props.filters || []).forEach((f) => { if (st.f[f.key]) p[f.param || f.key] = st.f[f.key] })
  return p
}
let seq = 0
async function load() {
  const my = ++seq
  rs.loading = true
  try {
    const r = await props.remote(remoteParams())
    if (my !== seq) return
    rs.rows = r.rows; rs.total = r.total; rs.counts = r.counts || {}; rs.error = null
    emit('loaded', r)
  } catch (e) {
    if (my === seq) rs.error = e.message || String(e)
  } finally {
    if (my === seq) rs.loading = false
  }
}

const viewRows = computed(() => {
  if (props.remote) return rs.rows
  let rows = applyView(props.rows, st.view)
  ;(props.filters || []).forEach((f) => { const v = st.f[f.key]; if (v) rows = rows.filter((r) => f.test(r, v)) })
  if (st.q && props.search) { const s = norm(st.q); rows = rows.filter((r) => norm(props.search.text(r)).includes(s)) }
  if (st.sort) {
    const c = colByKey(st.sort)
    if (c) {
      const get = typeof c.sort === 'function' ? c.sort : (r) => r[c.key]
      const dir = st.dir === 'asc' ? 1 : -1
      rows = rows.slice().sort((a, b) => { const x = get(a), y = get(b); return (x > y ? 1 : x < y ? -1 : 0) * dir })
    }
  }
  return rows
})
const total = computed(() => (props.remote ? rs.total : viewRows.value.length))
const pages = computed(() => Math.max(1, Math.ceil(total.value / st.size)))
const slice = computed(() => {
  if (props.remote) return rs.rows
  const p = Math.min(st.page, pages.value - 1)
  return viewRows.value.slice(p * st.size, p * st.size + st.size)
})
const sizeOptions = computed(() => [...new Set([props.pageSize, 25, 50, 100])].sort((x, y) => x - y))
const pagerItems = computed(() => {
  const n = pages.value, cur = st.page, out = []
  if (n <= 7) { for (let i = 0; i < n; i++) out.push(i); return out }
  out.push(0); if (cur > 2) out.push('…')
  for (let i = Math.max(1, cur - 1); i <= Math.min(n - 2, cur + 1); i++) out.push(i)
  if (cur < n - 3) out.push('…'); out.push(n - 1)
  return out
})
const selectedRows = computed(() => (props.remote ? rs.rows : props.rows).filter((r) => st.sel.has(r.id)))

function setView(k) { st.view = k; st.page = 0; st.focus = -1 }
function clear() { st.q = ''; Object.keys(st.f).forEach((k) => (st.f[k] = '')); st.page = 0 }
function sortBy(c) { if (st.sort === c.key) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.sort = c.key; st.dir = c.num || c.desc ? 'desc' : 'asc' } st.page = 0 }
function go(p) { st.page = Math.max(0, Math.min(pages.value - 1, p)); st.focus = -1 }
function toggleAll(on) { slice.value.forEach((r) => (on ? st.sel.add(r.id) : st.sel.delete(r.id))); st.sel = new Set(st.sel) }
function toggleSel(id, on) { on ? st.sel.add(id) : st.sel.delete(id); st.sel = new Set(st.sel) }
function clearSel() { st.sel = new Set() }
function rowClick(r, i, ev) { if (!props.onRow || ev.target.closest('a,button,input,select,label')) return; st.focus = i; props.onRow(r) }
async function exportCsv() {
  const cols = props.columns.filter((c) => c.csv !== false)
  const rows = props.remote ? (await props.remote({ ...remoteParams(), page: 0, size: 0 })).rows : viewRows.value
  downloadCsv(props.exportName || 'export', cols.map((c) => c.label), rows.map((r) => cols.map((c) => (c.csv ? c.csv(r) : c.format ? c.format(r) : r[c.key]))))
  api.logAudit('خروجی CSV «' + (props.exportName || 'جدول') + '» (' + fa(rows.length) + ' ردیف)')
  toast('فایل CSV با ' + fa(rows.length) + ' ردیف ساخته شد')
}

/* URL sync — shareable filters */
if (props.url) {
  watch(() => [st.q, st.view, st.sort, st.dir, JSON.stringify(st.f)], () => {
    const q = { ...route.query }
    const put = (k, v, def) => { if (v == null || v === '' || v === def) delete q[k]; else q[k] = v }
    put('q', st.q, ''); if (props.views) put('view', st.view, props.defaultView || props.views[0].key)
    put('sort', st.sort, props.sort && props.sort.key); put('dir', st.dir, (props.sort && props.sort.dir) || 'desc')
    ;(props.filters || []).forEach((f) => put(f.key, st.f[f.key], ''))
    router.replace({ query: q })
  })
  // in-page links (/x?view=…) change the query without remounting: pull it back into state
  watch(() => route.query, (Q2) => {
    const pick = (k, def) => (Q2[k] != null ? String(Q2[k]) : def)
    const view = pick('view', props.views ? props.defaultView || props.views[0].key : null)
    if (props.views && view !== st.view) setView(view)
    const q = pick('q', ''); if (q !== st.q) { st.q = q; st.page = 0 }
    const sort = pick('sort', props.sort ? props.sort.key : null), dir = pick('dir', (props.sort && props.sort.dir) || 'desc')
    if (sort !== st.sort || dir !== st.dir) { st.sort = sort; st.dir = dir }
    ;(props.filters || []).forEach((f) => { const v = pick(f.key, ''); if (v !== st.f[f.key]) { st.f[f.key] = v; st.page = 0 } })
  })
}

if (props.remote) {
  watch(() => [st.view, st.sort, st.dir, st.page, st.size, JSON.stringify(st.f)], load, { immediate: true })
  let qTimer = null
  watch(() => st.q, () => { clearTimeout(qTimer); qTimer = setTimeout(load, 300) })
  watch(() => ui.refreshTick, load)
  onUnmounted(() => clearTimeout(qTimer))
}

/* keyboard: j/k/Enter through the visible rows */
const nav = {
  move(d) { const len = slice.value.length; if (!len) return; st.focus = Math.max(0, Math.min(len - 1, st.focus + d)) },
  open() { if (st.focus >= 0 && props.onRow) props.onRow(slice.value[st.focus]) },
}
onMounted(() => { if (props.keyboard && !ui.listNav) ui.setListNav(nav) })
onUnmounted(() => { if (ui.listNav === nav) ui.setListNav(null) })
watch(() => st.focus, (f) => { const tr = document.querySelectorAll('.dt tbody tr')[f]; if (tr) tr.scrollIntoView({ block: 'nearest' }) })

defineExpose({ viewRows, st, clearSel, reload: load })
</script>

<style scoped>
.tbl-wrap.busy { opacity: .55; transition: opacity .15s; }
</style>
