<template>
  <q-dialog v-model="open" @hide="$emit('closed')">
    <div class="modal">
      <div class="mh"><span>ثبت نتیجهٔ تماس — {{ account.name }}</span><button class="btn ghost small icon" aria-label="بستن" @click="open = false"><AppIcon name="x" /></button></div>
      <div class="mb">
        <div class="field">نتیجه
          <select class="select" v-model="outcome">
            <option value="reached">صحبت شد</option><option value="noanswer">پاسخ نداد</option><option value="callback">بعداً تماس بگیرم</option>
            <option value="won">موفق — ارتقا/تمدید قطعی شد</option><option value="lost">مشتری نمی‌خواهد ادامه دهد</option>
          </select>
        </div>
        <div class="field">یادداشت<textarea class="input" v-model="text" rows="3" placeholder="چه گفت؟ قدم بعدی چیست؟" autofocus /></div>
        <div class="field">پیگیری بعدی
          <div class="seg"><button v-for="[d, l] in NEXT" :key="d" :class="{ on: next === d }" @click="next = d">{{ l }}</button></div>
        </div>
      </div>
      <div class="mf"><button class="btn primary" @click="save"><AppIcon name="check" />ثبت</button><button class="btn ghost" @click="open = false">انصراف</button></div>
    </div>
  </q-dialog>
</template>

<script setup>
import { ref } from 'vue'
import AppIcon from '../AppIcon.vue'
import { api } from 'src/api'
import { toast } from 'src/lib/ui'
import { inDays } from 'src/lib/format'
import { useUiStore } from 'stores/ui'

/** Log a call outcome for an account; optionally closes/snoozes the task it came from. */
const props = defineProps({ account: { type: Object, required: true }, taskId: String })
const emit = defineEmits(['saved', 'closed'])
const NEXT = [[0, 'ندارد'], [1, 'فردا'], [3, '۳ روز'], [7, 'یک هفته']]
const LABEL = { reached: 'صحبت شد', noanswer: 'پاسخ نداد', callback: 'بعداً تماس', won: 'موفق', lost: 'از دست رفت' }
const open = ref(true), outcome = ref('reached'), text = ref(''), next = ref(0)
const ui = useUiStore()
async function save() {
  await api.addNote(props.account.id, { kind: 'call', outcome: outcome.value, text: LABEL[outcome.value] + (text.value.trim() ? ' — ' + text.value.trim() : ''), next: next.value })
  if (props.taskId) await api.setTask(props.taskId, next.value ? { status: 'snoozed', snoozeDays: next.value, outcome: outcome.value } : { status: 'done', outcome: outcome.value })
  ui.bump()
  toast('نتیجه ثبت شد' + (next.value ? ' · پیگیری ' + inDays(next.value) : ''))
  emit('saved'); open.value = false
}
</script>
