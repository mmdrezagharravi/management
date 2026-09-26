<template>
  <q-dialog v-model="ui.shortcutsOpen">
    <div class="modal">
      <div class="mh"><span>میان‌برهای صفحه‌کلید</span><button class="btn ghost sm icon" aria-label="بستن" @click="ui.shortcutsOpen = false"><AppIcon name="x" /></button></div>
      <div class="mb">
        <div v-for="[k, d] in KEYS" :key="k" class="kv"><span class="k">{{ d }}</span><span class="v"><span class="kbd">{{ k }}</span></span></div>
      </div>
    </div>
  </q-dialog>
</template>

<script setup>
import AppIcon from '../AppIcon.vue'
import { useUiStore } from 'stores/ui'
const ui = useUiStore()
const KEYS = [
  ['Ctrl K یا /', 'جستجوی سراسری'], ['j / k', 'ردیف بعدی / قبلی'], ['Enter', 'نمای سریع ردیف انتخاب‌شده'], ['Esc', 'بستن نمای سریع یا پنجره'],
  ['d', 'در «کارهای امروز»: انجام شد'], ['s', 'در «کارهای امروز»: تعویق تا فردا'], ['c', 'در «کارهای امروز»: ثبت نتیجهٔ تماس'], ['?', 'همین راهنما'],
]
</script>
