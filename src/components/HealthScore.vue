<template>
  <span class="score">
    <b>{{ n(score) }}</b>
    <span class="mini"><i :style="{ width: score + '%', background: BAND_COLOR[b.key] }" /></span>
    <span class="sr">{{ b.label }}</span>
    <q-tooltip>{{ b.label }}</q-tooltip>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { n } from 'src/lib/format'
import { band, BAND_COLOR } from 'src/lib/ui'
const props = defineProps({ score: Number })
const b = computed(() => band(props.score))
</script>
