import { computed } from 'vue'
import { useQueryParam } from './useUrlState'
import { useSessionStore } from 'stores/session'

/** The page time range (7|30|90 days): URL first, then the remembered preference. */
export function useRange() {
  const session = useSessionStore()
  const p = useQueryParam('r')
  return computed({
    get: () => { const v = +(p.value || session.range); return [7, 30, 90].includes(v) ? v : 30 },
    set: (v) => { session.setRange(+v); p.value = String(v) },
  })
}
