<script setup lang="ts">
import { computed } from 'vue'
import { CircleDot, Ticket } from 'lucide-vue-next'
import type { LotteryTab } from '../../types/lottery'

const props = defineProps<{ modelValue: LotteryTab }>()
const emit = defineEmits<{ 'update:modelValue': [value: LotteryTab] }>()
const tabs: { value: LotteryTab; label: string }[] = [
  { value: 'lotto', label: '로또 6/45' },
  { value: 'pension', label: '연금복권 720+' },
]
const selected = computed(() => tabs.findIndex((tab) => tab.value === props.modelValue))
function onKeydown(event: KeyboardEvent) {
  const next = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
  if (!next) return
  event.preventDefault()
  emit('update:modelValue', tabs[(selected.value + next + tabs.length) % tabs.length]!.value)
}
</script>

<template>
  <div role="tablist" aria-label="복권 종류" class="flex rounded-2xl bg-slate-100/90 p-1.5 dark:bg-slate-800/80" @keydown="onKeydown">
    <button v-for="tab in tabs" :key="tab.value" type="button" role="tab" :aria-selected="modelValue === tab.value"
      :tabindex="modelValue === tab.value ? 0 : -1" :aria-controls="`${tab.value}-panel`"
      class="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-2 py-3 text-[13px] font-bold transition sm:px-4 sm:text-sm"
      :class="modelValue === tab.value ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'"
      @click="$emit('update:modelValue', tab.value)">
      <CircleDot v-if="tab.value === 'lotto'" :size="17" aria-hidden="true" />
      <Ticket v-else :size="17" aria-hidden="true" />
      <span class="truncate">{{ tab.label }}</span>
    </button>
  </div>
</template>
