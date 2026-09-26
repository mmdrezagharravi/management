<template><div ref="el" /></template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { columns } from 'src/lib/charts'
/** See lib/charts columns(): { labels, series, height, stacked, ... } */
const props = defineProps({ options: { type: Object, required: true } })
const el = ref(null)
let dispose = null
const draw = () => { if (dispose) dispose(); if (el.value) dispose = columns(el.value, props.options) }
onMounted(draw)
watch(() => props.options, draw, { deep: true })
onUnmounted(() => dispose && dispose())
</script>
