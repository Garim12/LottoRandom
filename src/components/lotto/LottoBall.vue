<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ number: number }>()
const tone = computed(() => {
  if (props.number <= 10) return 'bg-amber-400 text-amber-950 shadow-amber-500/20'
  if (props.number <= 20) return 'bg-sky-500 text-white shadow-sky-500/20'
  if (props.number <= 30) return 'bg-rose-500 text-white shadow-rose-500/20'
  if (props.number <= 40) return 'bg-slate-500 text-white shadow-slate-500/20'
  return 'bg-emerald-600 text-white shadow-emerald-500/20'
})
</script>

<template>
  <span class="lotto-ball" :class="tone" :aria-label="`${number}번`">{{ String(number).padStart(2, '0') }}</span>
</template>
