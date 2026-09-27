<template>
  <div class="app" :class="{ collapsed: session.collapsed, 'menu-open': menuOpen }">
    <aside class="side">
      <div class="rail">
        <router-link class="logo" to="/" title="Airsheet">A</router-link>
        <div class="rail-nav" aria-label="دسته‌ها">
          <button v-for="(g, i) in NAV" :key="g.grp" v-show="navItems(g).length" class="rail-it" :class="{ on: i === openGrp, end: g.end }" :aria-expanded="i === openGrp" :title="g.grp" @click="pickGroup(i)">
            <AppIcon :name="g.icon" :size="20" /><span>{{ g.short }}</span><i v-if="groupWarn(g)" class="rail-dot" />
          </button>
        </div>
      </div>
      <div class="subnav">
        <div class="brand">
          <div><b>Airsheet</b><span>پنل مدیریت مشتری</span></div>
          <button class="collapse-btn" title="جمع کردن منو" @click="session.setCollapsed(true)"><AppIcon name="collapse" /></button>
        </div>
        <nav aria-label="منوی اصلی">
          <div class="sub-h"><AppIcon :name="NAV[openGrp].icon" />{{ NAV[openGrp].grp }}</div>
          <router-link v-for="it in navItems(NAV[openGrp])" :key="it.id" :to="it.to" :class="{ on: it.id === activeId }" :aria-current="it.id === activeId ? 'page' : undefined" @click="menuOpen = false">
            <AppIcon :name="it.icon" /><span>{{ it.label }}</span>
            <span v-if="badges?.[it.id]?.n" class="cnt" :class="{ warn: badges[it.id].warn }">{{ fa(badges[it.id].n) }}</span>
          </router-link>
        </nav>
        <div class="foot">{{ api.NEEDS_AUTH ? '' : 'زمان ماکاپ: ' }}{{ todayLabel() }}، {{ clock(nowMinutes) }}</div>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <button class="iconbtn menu-btn" aria-label="منو" @click="menuOpen = !menuOpen"><AppIcon name="menu" /></button>
        <button class="search-trigger" @click="ui.openPalette()"><AppIcon name="search" /><span>جستجوی مشتری، شماره یا بیس…</span><span class="kbd">Ctrl K</span></button>
        <span class="spacer" />
        <button class="iconbtn" aria-label="هشدارها">
          <AppIcon name="bell" /><span v-if="alerts?.length" class="dotcount">{{ fa(alerts.length) }}</span>
          <q-menu anchor="bottom left" self="top left" :offset="[0, 6]" class="pop" style="min-width: 320px">
            <div class="lbl">هشدارها</div>
            <template v-if="alerts?.length">
              <router-link v-for="(x, i) in alerts" :key="i" class="it" :to="x.to" style="align-items: flex-start" v-close-popup>
                <i class="dot" :style="{ background: STATUS_COLOR[x.lvl], marginTop: '6px' }" />
                <span><b style="display: block; font-size: 12.5px">{{ x.t }}</b><span class="muted" style="font-size: 11.5px">{{ x.mrr ? money(x.mrr) + ' ' : '' }}{{ x.d }}</span></span>
              </router-link>
            </template>
            <div v-else class="it">هشداری نیست</div>
          </q-menu>
        </button>
        <button class="iconbtn" aria-label="تغییر تم" @click="session.toggleTheme()"><AppIcon :name="dark ? 'sun' : 'moon'" /></button>
        <button v-if="api.NEEDS_AUTH" class="who">
          <span class="avatar">{{ initials(session.user?.name || 'م') }}</span><span class="nm">{{ session.user?.name || session.user?.mobile || 'مدیر' }}</span>
          <q-menu anchor="bottom left" self="top left" :offset="[0, 6]" class="pop" style="min-width: 220px">
            <div class="lbl">حساب</div>
            <div class="it"><span class="avatar">{{ initials(session.user?.name || 'م') }}</span><span><b style="display:block">{{ session.user?.name || 'مدیر' }}</b><span class="muted ltr" style="font-size:11.5px">{{ session.user?.mobile }}</span></span></div>
            <div class="sep" />
            <button class="it" v-close-popup @click="logout"><AppIcon name="x" />خروج از پنل</button>
          </q-menu>
        </button>
      </header>
      <main class="content">
        <router-view v-slot="{ Component }">
          <component :is="Component" :key="routeKey" />
        </router-view>
      </main>
    </div>

    <CustomerDrawer />
    <CommandPalette />
    <ShortcutsDialog />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Dark } from 'quasar'
import AppIcon from 'components/AppIcon.vue'
import CustomerDrawer from 'components/CustomerDrawer.vue'
import CommandPalette from 'components/CommandPalette.vue'
import ShortcutsDialog from 'components/dialogs/ShortcutsDialog.vue'
import { NAV } from 'src/lib/nav'
import { fa, money, clock, initials, todayLabel } from 'src/lib/format'
import { STATUS_COLOR } from 'src/lib/ui'
import { api } from 'src/api'
import { useSessionStore } from 'stores/session'
import { useUiStore } from 'stores/ui'
import { useAsync } from 'src/composables/useAsync'
import { useHotkeys } from 'src/composables/useHotkeys'

const session = useSessionStore(), ui = useUiStore(), route = useRoute()
// pages the current data source cannot serve stay out of the menu (api.UNAVAILABLE is only set in http mode)
const navItems = (g) => g.items.filter((it) => !(api.UNAVAILABLE && api.UNAVAILABLE.has(it.id)))
function logout() { window.location.assign('/home') }
useHotkeys(ui)
const dark = computed(() => Dark.isActive)
const nowMinutes = api.NEEDS_AUTH ? new Date().getHours() * 60 + new Date().getMinutes() : 13 * 60 + 10
const menuOpen = ref(false)
const activeId = computed(() => route.meta.nav || route.name)
const groupOf = (id) => Math.max(0, NAV.findIndex((g) => g.items.some((it) => it.id === id)))
const openGrp = ref(groupOf(activeId.value))
watch(activeId, (id) => { openGrp.value = groupOf(id) })
function pickGroup(i) { openGrp.value = i; if (session.collapsed) session.setCollapsed(false) }
const routeKey = computed(() => route.path)

const { data: alerts } = useAsync(() => api.alerts(), [])
const { data: badges } = useAsync(() => api.navBadges(), [])
const groupWarn = (g) => g.items.some((it) => badges.value?.[it.id]?.n && badges.value[it.id].warn)
// a shareable quick-view link: /customers?open=123
watch(() => route.query.open, (id) => { if (id) ui.openAccount(id) }, { immediate: true })
</script>
