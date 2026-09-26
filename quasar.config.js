import { defineConfig } from '#q-app/wrappers'
import fs from 'node:fs'

/** true when the kernel's inotify watch limit is too small for a Vite dev server next to an editor */
const lowInotify = (() => { try { return +fs.readFileSync('/proc/sys/fs/inotify/max_user_watches', 'utf8') < 200000 } catch { return false } })()

export default defineConfig((ctx) => ({
  boot: ['app'],
  css: ['app.scss'],
  extras: [],
  build: {
    target: { browser: ['es2022', 'firefox115', 'chrome115', 'safari15'], node: 'node20' },
    vueRouterMode: 'history',
    // The panel is part of the main Airsheet origin, alongside /admin.
    // Quasar uses this for both Vite assets and the Vue Router history base.
    publicPath: '/management/',
    vueOptionsAPI: false,
    env: {
      API_BASE: process.env.API_BASE ?? (ctx.dev ? 'http://localhost:3000' : ''), // '' = same origin in production
      API_MODE: process.env.API_MODE || 'http',                                   // 'mock' = seeded fake world
    },
  },
  devServer: {
    open: false, port: 9100,
    // ponytail: poll instead of inotify only on machines whose fs.inotify.max_user_watches is too low (editor +
    // Claude Desktop already use ~65k here). Raise it (sysctl fs.inotify.max_user_watches=1048576) for instant HMR.
    watch: lowInotify ? { usePolling: true, interval: 700, ignored: ['**/node_modules/**', '**/dist/**', '**/.quasar/**', '**/.git/**'] } : undefined,
  },
  framework: {
    config: {
      dark: 'auto',
      notify: { position: 'bottom-left', timeout: 4200, textColor: 'white', classes: 'app-toast' },
    },
    lang: 'fa-IR',
    plugins: ['Dark', 'Notify', 'Dialog', 'LocalStorage'],
  },
  animations: [],
}))
