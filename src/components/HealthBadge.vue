<template>
  <StatusBadge :status="b.key" :label="b.label" />
</template>

<script setup>
import { computed } from 'vue'
import StatusBadge from './StatusBadge.vue'
import { band } from 'src/lib/ui'
const props = defineProps({ score: Number })
const b = computed(() => band(props.score))
</script>
