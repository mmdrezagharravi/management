<template>
  <div class="hbars">
    <component :is="it.to ? 'router-link' : 'div'" v-for="(it, i) in items" :key="i" :to="it.to" class="hbrow" :style="{ gridTemplateColumns: labelWidth + 'px minmax(0,1fr) auto' }">
      <span class="lab">{{ it.label }}<small v-if="it.sub">{{ it.sub }}</small></span>
      <span class="track"><i :style="{ width: Math.max(0.5, (it.value / max) * 100) + '%', background: it.color || 'var(--series-1)' }" /></span>
      <span class="val" :style="{ minWidth: valueWidth + 'px' }"><b>{{ f(it.value) }}</b><span v-if="it.note">{{ it.note }}</span></span>
    </component>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { n } from 'src/lib/format'
/** Horizontal bars: items [{label, sub, value, to, color, note}] */
const props = defineProps({ items: { type: Array, default: () => [] }, format: Function, max: Number, labelWidth: { type: Number, default: 130 }, valueWidth: { type: Number, default: 64 } })
const f = (v) => (props.format || n)(v)
const max = computed(() => props.max || Math.max(...props.items.map((i) => i.value), 1))
</script>

<style scoped>
.hbars { display: flex; flex-direction: column; gap: 2px; }
</style>
