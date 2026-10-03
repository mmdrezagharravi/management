<template>
  <q-dialog v-model="ui.paletteOpen" position="top" @show="onShow">
    <div class="palette">
      <div class="pi">
        <AppIcon name="search" />
        <input ref="inp" v-model="q" placeholder="جستجوی مشتری، شماره، ایمیل، بیس یا صفحه…" autocomplete="off" @keydown="onKey" />
        <span class="kbd">Esc</span>
      </div>
      <div class="res">
        <template v-for="(it, i) in items" :key="i">
          <div v-if="i === 0 || items[i - 1].grp !== it.grp" class="grp">{{ it.grp }}</div>
          <div class="r" :class="{ act: i === act }" @mousemove="act = i" @click="go(it, $event.ctrlKey || $event.metaKey)">
            <span class="ic"><AppIcon :name="it.ic" /></span>
            <span style="min-width: 0"><div style="font-weight: 700">{{ it.t }}</div><div v-if="it.d" class="d">{{ it.d }}</div></span>
            <span v-if="it.end" class="end">{{ it.end }}</span>
          </div>
        </template>
        <div v-if="!items.length" class="empty"><b>چیزی پیدا نشد</b>نام شرکت، نام شخص، شمارهٔ موبایل یا نشانی بیس را امتحان کنید.</div>
      </div>
      <div class="hintbar"><span><span class="kbd">↑</span> <span class="kbd">↓</span> حرکت</span><span><span class="kbd">Enter</span> نمای سریع</span><span><span class="kbd">Ctrl</span>+<span class="kbd">Enter</span> صفحهٔ کامل</span></div>
    </div>
  </q-dialog>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Dark } from 'quasar'
import AppIcon from './AppIcon.vue'
import { api } from 'src/api'
import { useUiStore } from 'stores/ui'
import { useSessionStore } from 'stores/session'
import { PAGE_INDEX } from 'src/lib/nav'
import { fa, money, norm } from 'src/lib/format'
import { PLAN_NAME } from 'src/lib/ui'

const ui = useUiStore(), session = useSessionStore(), router = useRouter()
const q = ref(''), items = ref([]), act = ref(0), inp = ref(null)
let seq = 0
async function draw() {
  const my = ++seq
  const s = norm(q.value)
  const out = []
  if (s) {
    const r = await api.search(q.value)
    if (my !== seq) return
    r.customers.forEach((a) => out.push({ grp: 'مشتریان', ic: 'user', t: a.name, d: PLAN_NAME[a.plan] + ' · ' + a.contact.first + ' ' + a.contact.last + ' · سلامت ' + fa(a.health), end: a.paying ? money(a.mrr) : '', acc: a.id, to: '/customers/' + a.id }))
    r.bases.forEach((b) => out.push({ grp: 'بیس‌ها', ic: 'db', t: b.name, d: b.accountName, end: fa(b.records) + ' رکورد', to: '/bases/' + b.id }))
  }
  PAGE_INDEX.filter((p) => !s || norm(p.label).includes(s)).slice(0, s ? 5 : 8).forEach((p) => out.push({ grp: 'صفحه‌ها', ic: p.icon, t: p.label, d: p.grp, to: p.to }))
  if (!s) out.unshift({ grp: 'کارها', ic: Dark.isActive ? 'sun' : 'moon', t: 'تغییر تم روشن/تیره', run: () => session.toggleTheme() })
  items.value = out; act.value = 0
}
watch(q, draw)
function onShow() { q.value = ''; draw(); nextTick(() => inp.value && inp.value.focus()) }
function onKey(ev) {
  if (ev.key === 'ArrowDown') { act.value = Math.min(items.value.length - 1, act.value + 1); ev.preventDefault() }
  else if (ev.key === 'ArrowUp') { act.value = Math.max(0, act.value - 1); ev.preventDefault() }
  else if (ev.key === 'Enter') { go(items.value[act.value], ev.ctrlKey || ev.metaKey); ev.preventDefault() }
}
function go(it, full) {
  if (!it) return
  ui.paletteOpen = false
  if (it.run) return it.run()
  if (it.acc && !full) return ui.openAccount(it.acc)
  router.push(it.to)
}
</script>
