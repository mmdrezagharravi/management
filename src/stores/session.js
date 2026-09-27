import { defineStore } from 'pinia'
import { Dark, LocalStorage } from 'quasar'

const get = (k, def) => { const v = LocalStorage.getItem('as.' + k); return v == null ? def : v }
const set = (k, v) => LocalStorage.set('as.' + k, v)
const platformToken = () => LocalStorage.getItem('token')

/** Who is looking at the panel and how: theme, time range, menu state. */
export const useSessionStore = defineStore('session', {
  state: () => ({
    theme: get('theme', null),          // null = follow the OS
    range: get('range', 30),            // 7 | 30 | 90
    collapsed: get('collapsed', false),
    token: platformToken(),                // shared Airsheet login token (same origin)
    user: get('user', null),               // cached display data; refreshed from GraphQL on boot
    authError: null,
  }),
  getters: {
    isDark: () => Dark.isActive,
  },
  actions: {
    applyTheme() { Dark.set(this.theme == null ? 'auto' : this.theme === 'dark') },
    toggleTheme() {
      this.theme = Dark.isActive ? 'light' : 'dark'
      set('theme', this.theme)
      this.applyTheme()
    },
    setRange(r) { if ([7, 30, 90].includes(r)) { this.range = r; set('range', r) } },
    setCollapsed(v) { this.collapsed = v; set('collapsed', v) },
    setUser(user) { this.user = user; this.authError = null; set('user', user) },
    clearPlatformSession() {
      this.token = null
      this.user = null
      LocalStorage.remove('token')
      LocalStorage.remove('as.user')
    },
  },
})
