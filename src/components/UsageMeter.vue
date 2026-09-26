<template>
  <div class="meter" :class="cls">
    <div class="top">
      <span>{{ label }}</span>
      <span><b>{{ f(used) }}</b> <span class="muted">از {{ limit ? f(limit) : 'نامحدود' }}</span><template v-if="limit"> · <b>{{ pct(Math.min(r, 9.99)) }}</b></template></span>
    </div>
    <div class="bar"><i :style="{ width: Math.min(100, r * 100) + '%' }" /></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { n, pct } from 'src/lib/format'
const props = defineProps({ label: String, used: Number, limit: Number, fmt: Function })
const f = (v) => (props.fmt || n)(v)
const r = computed(() => (props.limit ? props.used / props.limit : 0))
const cls = computed(() => (r.value >= 0.95 ? 'crit' : r.value >= 0.8 ? 'warn' : ''))
</script>
