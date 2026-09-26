import { defineBoot } from '#q-app/wrappers'
import '@fontsource/vazirmatn/400.css'
import '@fontsource/vazirmatn/500.css'
import '@fontsource/vazirmatn/600.css'
import '@fontsource/vazirmatn/700.css'
import '@fontsource/vazirmatn/800.css'

import { setAppContext } from 'src/composables/useDialogs'
import { api } from 'src/api'
import { currentUser } from 'src/api/http/client'
import { useSessionStore } from 'stores/session'

export default defineBoot(async ({ app }) => {
  // one-off dialogs (call log, note) are mounted outside the page tree and need the app context for Quasar/Pinia
  setAppContext(app._context)
  if (!api.NEEDS_AUTH) return

  const session = useSessionStore()
  if (!session.token) return
  try {
    const user = await currentUser()
    if (!user) {
      session.clearPlatformSession()
      window.location.replace('/auth?redirect=' + encodeURIComponent(window.location.pathname + window.location.search))
      return
    }
    if (user.role !== 'admin') {
      window.location.replace('/home?management=forbidden')
      return
    }
    session.setUser(user)
  } catch {
    // Let the REST request interceptor distinguish an expired session from a
    // temporary GraphQL/network failure. Cached display data is sufficient.
  }
})
