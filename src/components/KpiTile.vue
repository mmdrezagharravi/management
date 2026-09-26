<template>
  <component :is="to ? 'router-link' : 'div'" :to="to" class="kpi">
    <div class="lab">
      {{ label }}
      <span v-if="info" class="row"><AppIcon name="info" cls="i" /><q-tooltip anchor="bottom middle" self="top middle">{{ info }}</q-tooltip></span>
    </div>
    <div class="val">
      <slot name="value">{{ value }}</slot>
      <small v-if="unit">{{ unit }}</small>
    </div>
    <div class="foot">
      <div class="cmp">
        <DeltaChip v-if="delta" v-bind="delta" />
        <div v-if="cmp || $slots.cmp"><slot name="cmp">{{ cmp }}</slot></div>
      </div>
      <div v-if="spark || $slots.spark" class="spark"><slot name="spark"><SparkLine v-bind="spark" /></slot></div>
    </div>
  </component>
</template>

<script setup>
import AppIcon from './AppIcon.vue'
import DeltaChip from './DeltaChip.vue'
import SparkLine from './charts/SparkLine.vue'

defineProps({ label: String, value: [String, Number], unit: String, info: String, cmp: String, to: [String, Object], delta: Object, spark: Object })
</script>
