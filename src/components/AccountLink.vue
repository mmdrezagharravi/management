<template>
  <a :class="cls" :href="'/customers/' + id" @click.prevent="open"><slot>{{ name }}</slot></a>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useUiStore } from 'stores/ui'
/** Inline customer name that opens the quick view; modified click opens the full profile. */
const props = defineProps({ id: [Number, String], name: String, cls: [String, Array, Object] })
const ui = useUiStore(), router = useRouter()
function open(ev) {
  if (ev.ctrlKey || ev.metaKey || ev.shiftKey) return router.push('/customers/' + props.id)
  ui.openAccount(props.id)
}
</script>
