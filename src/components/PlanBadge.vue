<template>
  <span class="plan" :class="plan"><i />{{ PLAN_NAME[plan] || plan }}</span>
</template>

<script setup>
import { PLAN_NAME } from 'src/lib/ui'
defineProps({ plan: String })
</script>
