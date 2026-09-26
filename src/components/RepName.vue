<template>
  <span v-if="r">{{ short ? r.short : r.name }}</span>
  <span v-else-if="badge" class="badge st-warn"><i class="dot" />بدون مسئول</span>
  <span v-else class="faint">بدون مسئول</span>
</template>

<script setup>
import { computed } from 'vue'
import { REPS } from 'src/lib/refs'
const props = defineProps({ id: String, short: Boolean, badge: Boolean })
const r = computed(() => REPS.find((x) => x.id === props.id))
</script>
