import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/** A query-string parameter as a writable computed; `def` is omitted from the URL. */
export function useQueryParam(key, def = null) {
  const route = useRoute(), router = useRouter()
  return computed({
    get: () => (route.query[key] != null ? String(route.query[key]) : def),
    set: (v) => {
      const q = { ...route.query }
      if (v == null || v === '' || v === def) delete q[key]; else q[key] = String(v)
      router.replace({ query: q })
    },
  })
}
