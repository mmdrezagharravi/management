<template>
  <span class="acct">
    <span class="top">
      <router-link class="nm" :to="'/customers/' + a.id" @click.stop>{{ a.name }}</router-link>
      <span v-if="a.source === 'invite'" class="badge st-info inv" title="این حساب با افزودن همکار به یک بیس ساخته شده؛ خود شخص ثبت‌نام نکرده">دعوت همکار</span>
    </span>
    <span class="s"><slot name="sub">{{ sub }}</slot></span>
  </span>
</template>

<script setup>
/** Customer name cell links directly to the complete profile. */
import { computed } from 'vue'
const props = defineProps({ a: { type: Object, required: true } })
const sub = computed(() => {
  const c = props.a.contact || {}
  const person = [c.first, c.last].filter(Boolean).join(' ')
  return [person !== props.a.name ? person : '', props.a.city || c.mobile].filter(Boolean).join(' · ')
})
</script>

<style scoped>
.acct { display: block; min-width: 0; }
.top { display: flex; align-items: center; gap: 6px; min-width: 0; }
.top .nm { display: inline; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.inv { height: 18px; padding: 0 6px; font-size: 10.5px; flex: none; }
</style>
