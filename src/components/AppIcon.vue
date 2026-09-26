<template>
  <svg :class="cls" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="path" />
</template>

<script setup>
import { computed } from 'vue'
import { ICONS } from 'src/lib/icons'

const props = defineProps({ name: { type: String, required: true }, size: { type: [Number, String], default: 16 }, cls: String })
const path = computed(() => ICONS[props.name] || ICONS.info)
</script>
