<template><div ref="el" /></template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { line } from 'src/lib/charts'
/** See lib/charts line(): { labels, series, height, yFormat, ... } */
const props = defineProps({ options: { type: Object, required: true } })
const el = ref(null)
let dispose = null
const draw = () => { if (dispose) dispose(); if (el.value) dispose = line(el.value, props.options) }
onMounted(draw)
watch(() => props.options, draw, { deep: true })
onUnmounted(() => dispose && dispose())
</script>
