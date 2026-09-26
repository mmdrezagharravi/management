<template>
  <span class="row wrap" style="gap: 4px">
    <span v-if="a.pastDue" class="sig due">پرداخت ناموفق</span>
    <span v-if="a.limitHits30" class="sig limit">{{ fa(a.limitHits30) }}× سقف<q-tooltip>برخورد با سقف پلن در ۳۰ روز</q-tooltip></span>
    <span v-if="a.pricingVisits30" class="sig price">{{ fa(a.pricingVisits30) }}× قیمت<q-tooltip>بازدید صفحهٔ قیمت در ۳۰ روز</q-tooltip></span>
    <span v-if="tickets && a.tickets" class="sig due">{{ fa(a.tickets) }} تیکت باز</span>
    <span v-if="!a.pastDue && !a.limitHits30 && !a.pricingVisits30 && !(tickets && a.tickets)" class="faint">—</span>
  </span>
</template>

<script setup>
import { fa } from 'src/lib/format'
defineProps({ a: Object, tickets: Boolean })
</script>
