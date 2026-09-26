<template>
  <span v-if="d" class="delta" :class="d.cls"><span class="ar">{{ d.arrow }}</span>{{ d.text }}</span>
</template>

<script setup>
import { computed } from 'vue'
import { delta } from 'src/lib/ui'
/** Either pass {cur, prev, abs?, points?, goodUp?, fmt?} or a ready {cls, arrow, text}. */
const props = defineProps({ cur: Number, prev: Number, abs: Boolean, points: Boolean, goodUp: { type: Boolean, default: true }, fmt: Function, flat: Number, cls: String, arrow: String, text: String })
const d = computed(() => (props.cls ? { cls: props.cls, arrow: props.arrow, text: props.text } : delta(props.cur, props.prev, { abs: props.abs, points: props.points, goodUp: props.goodUp, fmt: props.fmt, flat: props.flat })))
</script>
