<template>
  <q-dialog v-model="open" @hide="$emit('closed')">
    <div class="modal">
      <div class="mh"><span>یادداشت — {{ account.name }}</span><button class="btn ghost sm icon" aria-label="بستن" @click="open = false"><AppIcon name="x" /></button></div>
      <div class="mb"><textarea class="input" v-model="text" rows="4" placeholder="یادداشت برای همکاران…" autofocus /></div>
      <div class="mf"><button class="btn primary" :disabled="!text.trim()" @click="save">ذخیره</button><button class="btn ghost" @click="open = false">انصراف</button></div>
    </div>
  </q-dialog>
</template>

<script setup>
import { ref } from 'vue'
import AppIcon from '../AppIcon.vue'
import { api } from 'src/api'
import { toast } from 'src/lib/ui'
import { useUiStore } from 'stores/ui'

const props = defineProps({ account: { type: Object, required: true } })
const emit = defineEmits(['saved', 'closed'])
const open = ref(true), text = ref('')
const ui = useUiStore()
async function save() {
  await api.addNote(props.account.id, { kind: 'note', text: text.value.trim() })
  ui.bump(); toast('یادداشت ذخیره شد'); emit('saved'); open.value = false
}
</script>
