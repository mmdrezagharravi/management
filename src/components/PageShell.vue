<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div v-if="$slots.crumbs" class="crumbs"><slot name="crumbs" /></div>
        <h1><slot name="title">{{ title }}</slot></h1>
        <div v-if="sub || $slots.sub" class="sub"><slot name="sub">{{ sub }}</slot></div>
      </div>
      <div class="page-actions">
        <div v-if="range" class="seg" role="group" aria-label="بازهٔ زمانی">
          <button v-for="r in [7, 30, 90]" :key="r" :class="{ on: r === (typeof range === 'number' ? range : modelRange) }" @click="$emit('update:range', r)">{{ fa(r) }} روز</button>
        </div>
        <slot name="actions" />
      </div>
    </div>
    <div v-if="lag && lag.status === 'crit' && banner" class="banner crit">
      <AppIcon name="alert" />
      <div><b>بخشی از عددهای این صفحه {{ lagText(lag.lagMin) }} عقب است.</b> {{ lag.desc }} ({{ lag.name }}) در این مدت همگام نشده. <router-link to="/data-health">جزئیات در «سلامت داده»</router-link></div>
    </div>
    <div v-else-if="lag && lag.status === 'unknown' && banner" class="banner warn">
      <AppIcon name="alert" />
      <div><b>تازگی {{ lag.desc }} معلوم نیست.</b> گزارش همگام‌سازی نرسید؛ ممکن است بخشی از عددهای این صفحه قدیمی باشد. <router-link to="/data-health">«سلامت داده»</router-link></div>
    </div>
    <div v-if="loading && !$slots.skeleton" class="stack" style="gap: 16px">
      <div class="kpis"><div v-for="i in 5" :key="i" class="skel" style="height: 96px" /></div>
      <div class="skel" style="height: 300px" />
    </div>
    <slot v-else-if="loading" name="skeleton" />
    <div v-else-if="error" class="banner crit"><AppIcon name="alert" /><div><b>بارگذاری این صفحه ممکن نشد.</b> {{ error.message }}</div></div>
    <div v-else class="stack" style="gap: 16px"><slot /></div>
  </div>
</template>

<script setup>
import { watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { fa, lagText } from 'src/lib/format'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'

/** Page frame: title/sub/actions, optional 7/30/90 range, data-freshness banner, loading skeleton. */
const props = defineProps({
  title: String, sub: String, range: [Boolean, Number], modelRange: Number, // `range v-model:range` binds the number onto `range` itself
  sources: Array, banner: { type: Boolean, default: true },
  loading: Boolean, error: Object,
})
defineEmits(['update:range'])
const { data: lag } = useAsync(() => (props.sources ? api.freshness(props.sources) : Promise.resolve(null)), [() => props.sources])
watch(() => props.title, (v) => { document.title = (v || 'پنل') + ' — پنل Airsheet' }, { immediate: true })
</script>
