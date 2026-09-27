import { ref, watch, onUnmounted } from 'vue'
import { useUiStore } from 'stores/ui'

/** Run an async loader, re-run when any of `deps` (getter fns) change, expose {data, loading, error, reload}.
 *  Also re-runs after local edits (drawer note/task) so lists stay in sync. */
export function useAsync(loader, deps = [], opts = {}) {
  const data = ref(opts.initial ?? null)
  const loading = ref(true)
  const error = ref(null)
  const ui = useUiStore()
  let seq = 0
  async function reload(silent) {
    const my = ++seq
    if (!silent) loading.value = true
    try {
      const v = await loader()
      if (my === seq) { data.value = v; error.value = null }
    } catch (e) {
      if (my === seq) { error.value = e; console.error(e) }
    } finally {
      if (my === seq) loading.value = false
    }
  }
  const stop = watch([...deps, () => ui.refreshTick], (nv, ov) => reload(ov && nv[nv.length - 1] !== ov[ov.length - 1]), { immediate: true })
  onUnmounted(stop)
  return { data, loading, error, reload }
}
