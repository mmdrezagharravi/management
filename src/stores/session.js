import { defineStore } from 'pinia'
import { Dark, LocalStorage } from 'quasar'

const get = (k, def) => { const v = LocalStorage.getItem('as.' + k); return v == null ? def : v }
const set = (k, v) => LocalStorage.set('as.' + k, v)
const platformToken = () => LocalStorage.getItem('token')

/** Who is looking at the panel and how: role, theme, time range, menu state. */
export const useSessionStore = defineStore('session', {
  state: () => ({
    me: get('me', { role: 'manager', rep: 'r1' }),
    theme: get('theme', null),          // null = follow the OS
    range: get('range', 30),            // 7 | 30 | 90
    collapsed: get('collapsed', false),
    todayRep: get('todayRep', 'r1'),
    token: platformToken(),                // shared Airsheet login token (same origin)
    user: get('user', null),               // cached display data; refreshed from GraphQL on boot
    authError: null,
  }),
  getters: {
    isRep: (s) => s.me.role === 'rep',
    repId: (s) => (s.me.role === 'rep' ? s.me.rep : null),
    isDark: () => Dark.isActive,
  },
  actions: {
    applyTheme() { Dark.set(this.theme == null ? 'auto' : this.theme === 'dark') },
    toggleTheme() {
      this.theme = Dark.isActive ? 'light' : 'dark'
      set('theme', this.theme)
      this.applyTheme()
    },
    setMe(me) { this.me = me; set('me', me) },
    setRange(r) { if ([7, 30, 90].includes(r)) { this.range = r; set('range', r) } },
    setCollapsed(v) { this.collapsed = v; set('collapsed', v) },
    setTodayRep(id) { this.todayRep = id; set('todayRep', id) },
    setUser(user) { this.user = user; this.authError = null; set('user', user) },
    clearPlatformSession() {
      this.token = null
      this.user = null
      LocalStorage.remove('token')
      LocalStorage.remove('as.user')
    },
  },
})
