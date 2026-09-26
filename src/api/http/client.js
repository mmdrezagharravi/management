/* HTTP transport for cloud-back: REST under /management + the platform GraphQL login.
   Every management call carries the Airsheet login token; a 401/403 drops the session. */
import axios from 'axios'
import { useSessionStore } from 'stores/session'

export const API_BASE = process.env.API_BASE || ''
export const http = axios.create({ baseURL: API_BASE + '/management' })

http.interceptors.request.use((c) => {
  const t = useSessionStore().token
  if (t) c.headers.Authorization = 'Bearer ' + t
  return c
})
http.interceptors.response.use(
  (r) => r,
  (e) => {
    const s = e.response && e.response.status
    if (s === 401) {
      useSessionStore().clearPlatformSession()
      window.location.replace('/auth?redirect=' + encodeURIComponent(window.location.pathname + window.location.search))
    } else if (s === 403) {
      // A valid non-admin Airsheet session must stay valid. Only leave the
      // protected panel; never log the user out of the main application.
      window.location.replace('/home?management=forbidden')
    }
    return Promise.reject(new Error((e.response && e.response.data && e.response.data.message) || e.message))
  },
)

export const get = (path, params) => http.get(path, { params }).then((r) => r.data)
export const post = (path, body) => http.post(path, body).then((r) => r.data)

/** Load the user already signed in to Airsheet; no management-specific login. */
export async function currentUser() {
  const token = useSessionStore().token
  if (!token) return null
  const r = await axios.post(API_BASE + '/graphql', {
    query: 'query { me { _id name mobile role } }',
  }, { headers: { Authorization: 'Bearer ' + token } })
  const user = r.data?.data?.me
  return user ? { id: user._id, name: user.name, mobile: user.mobile, role: user.role } : null
}

/** A whole paginated list. Asks for size=0 (= all rows, server-side change) and falls back to pages of 200. */
export async function all(path, params = {}) {
  const first = await get(path, { ...params, size: 0 }).catch(() => null)
  if (first && Array.isArray(first.items) && first.items.length >= first.total) return first.items
  const out = []
  for (let page = 0; page < 500; page++) {
    const r = await get(path, { ...params, size: 200, page })
    out.push(...r.items)
    if (!r.items.length || out.length >= r.total) break
  }
  return out
}

/** Small in-memory cache so pages that share a list (customers, bases) fetch it once per minute. */
export function memo(fn, ttl = 60_000) {
  let at = 0, value = null, pending = null
  const f = () => {
    if (value && Date.now() - at < ttl) return Promise.resolve(value)
    if (!pending) pending = fn().then((v) => { value = v; at = Date.now(); return v }).finally(() => { pending = null })
    return pending
  }
  f.clear = () => { value = null; at = 0 }
  return f
}
