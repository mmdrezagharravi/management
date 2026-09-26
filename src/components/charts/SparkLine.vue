<template><span class="sparkwrap" v-html="svg" /></template>

<script setup>
import { computed } from 'vue'
import { spark } from 'src/lib/charts'
const props = defineProps({ values: { type: Array, default: () => [] }, w: Number, h: Number, bars: Boolean, area: Boolean, color: String, min0: Boolean })
const svg = computed(() => spark(props.values, { w: props.w, h: props.h, bars: props.bars, area: props.area, color: props.color, min0: props.min0 }))
</script>

<style scoped>
.sparkwrap { display: inline-block; line-height: 0; }
</style>
