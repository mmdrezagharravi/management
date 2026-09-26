<template>
  <span class="badge" :class="'st-' + status"><i class="dot" />{{ label }}</span>
</template>

<script setup>
defineProps({ status: { type: String, default: 'info' }, label: String })
</script>
