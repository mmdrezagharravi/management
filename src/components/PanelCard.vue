<template>
  <section class="card" :class="cls" :id="id">
    <div v-if="title || $slots.title || $slots.actions" class="card-h">
      <h2><slot name="title">{{ title }}</slot></h2>
      <span v-if="hint" class="hint">{{ hint }}</span>
      <div v-if="$slots.actions" class="acts"><slot name="actions" /></div>
    </div>
    <div class="card-b" :class="{ flush }"><slot /></div>
    <div v-if="$slots.footer" class="card-f"><slot name="footer" /></div>
  </section>
</template>

<script setup>
defineProps({ title: String, hint: String, flush: Boolean, cls: [String, Array, Object], id: String })
</script>
