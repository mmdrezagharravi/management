<template>
  <span class="acct">
    <a class="nm" :href="'/customers/' + a.id" @click.prevent="open">{{ a.name }}</a>
    <span class="s"><slot name="sub">{{ a.contact.first }} {{ a.contact.last }} · {{ a.city }}</slot></span>
  </span>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useUiStore } from 'stores/ui'
/** Customer name cell: plain click opens the quick view, Ctrl/Cmd/middle click goes to the profile. */
const props = defineProps({ a: { type: Object, required: true } })
const ui = useUiStore(), router = useRouter()
function open(ev) {
  if (ev.ctrlKey || ev.metaKey || ev.shiftKey) return router.push('/customers/' + props.a.id)
  ui.openAccount(props.a.id)
}
</script>

<style scoped>
.acct { display: block; min-width: 0; }
</style>
