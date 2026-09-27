<template>
  <span class="row wrap" style="gap: 4px">
    <span v-if="a.pastDue" class="sig due">پرداخت ناموفق</span>
    <span v-if="a.atLimit" class="sig limit">سقف پر شده<q-tooltip>دست‌کم یک بیس اکنون به سقف رکورد پلن رسیده است</q-tooltip></span>
    <span v-else-if="a.nearLimit" class="sig price">نزدیک سقف<q-tooltip>دست‌کم یک بیس اکنون ۸۰٪ یا بیشتر از سقف رکورد پلن را مصرف کرده است</q-tooltip></span>
    <span v-if="tickets && a.tickets" class="sig due">{{ fa(a.tickets) }} تیکت باز</span>
    <span v-if="!a.pastDue && !a.atLimit && !a.nearLimit && !(tickets && a.tickets)" class="faint">—</span>
  </span>
</template>

<script setup>
defineProps({ a: Object, tickets: Boolean })
</script>
