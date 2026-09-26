<template><div ref="el" /></template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { heat, hideTip } from 'src/lib/charts'
/** See lib/charts heat(): { cols, rows, format, domain, rowHead, tipLabel } */
const props = defineProps({ options: { type: Object, required: true } })
const el = ref(null)
const draw = () => el.value && heat(el.value, props.options)
onMounted(draw)
watch(() => props.options, draw, { deep: true })
onUnmounted(hideTip)
</script>
