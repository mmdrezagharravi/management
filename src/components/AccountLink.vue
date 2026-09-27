<template>
  <router-link :class="cls" :to="'/customers/' + id"><slot>{{ name }}</slot></router-link>
</template>

<script setup>
/** Inline customer name links directly to the complete profile. */
defineProps({ id: [Number, String], name: String, cls: [String, Array, Object] })
</script>
