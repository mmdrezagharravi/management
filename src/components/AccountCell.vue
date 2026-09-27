<template>
  <span class="acct">
    <router-link class="nm" :to="'/customers/' + a.id" @click.stop>{{ a.name }}</router-link>
    <span class="s"><slot name="sub">{{ a.contact.first }} {{ a.contact.last }} · {{ a.city }}</slot></span>
  </span>
</template>

<script setup>
/** Customer name cell links directly to the complete profile. */
defineProps({ a: { type: Object, required: true } })
</script>

<style scoped>
.acct { display: block; min-width: 0; }
</style>
