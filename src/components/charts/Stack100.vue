<template><div ref="el" /></template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { stack100, hideTip } from 'src/lib/charts'
/** { parts:[{label, value, color}], format, height } */
const props = defineProps({ options: { type: Object, required: true } })
const el = ref(null)
const draw = () => el.value && stack100(el.value, props.options)
onMounted(draw)
watch(() => props.options, draw, { deep: true })
onUnmounted(hideTip)
</script>
