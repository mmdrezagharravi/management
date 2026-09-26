import { defineRouter } from '#q-app/wrappers'
import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes'
import { api } from 'src/api'
import { useSessionStore } from 'stores/session'

export default defineRouter(() => {
  const router = createRouter({
    routes,
    history: createWebHistory(process.env.VUE_ROUTER_BASE),
    scrollBehavior: (to, from, saved) => saved || (to.hash ? { el: to.hash } : { top: 0 }),
  })
  // The management app shares the Airsheet origin and therefore its existing
  // session. There is deliberately no second login page.
  router.beforeEach(() => {
    if (!api.NEEDS_AUTH) return true
    const session = useSessionStore()
    if (session.token) return true
    const next = window.location.pathname + window.location.search + window.location.hash
    window.location.replace('/auth?redirect=' + encodeURIComponent(next))
    return false
  })
  return router
})
