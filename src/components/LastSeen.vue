<template>
  <span v-if="a.online" class="live"><i />آنلاین</span>
  <span v-else :class="{ faint: a.lastSeenDays > 14 }">{{ ago(a.lastSeenMin) }}</span>
</template>

<script setup>
import { ago } from 'src/lib/format'
defineProps({ a: Object })
</script>
