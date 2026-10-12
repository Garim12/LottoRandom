<script setup lang="ts">
import { computed } from 'vue'
import { analyzePensionNumber, PENSION_RANGES } from '../../utils/pension'
import type { PensionTicket } from '../../types/lottery'
const props = defineProps<{ ticket: PensionTicket; compact?: boolean; analysis?: boolean }>()
const stats = computed(() => props.analysis ? analyzePensionNumber(props.ticket.number) : null)
</script>

<template>
  <div class="rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-sm dark:border-violet-900/40 dark:bg-slate-800 sm:px-5" :aria-label="`${ticket.group}조 ${ticket.number}`">
    <div class="flex items-center gap-3 sm:gap-5">
    <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-100 text-base font-black text-violet-700 dark:bg-violet-900/50 dark:text-violet-200">{{ ticket.group }}조</span>
    <span class="min-w-0 flex-1 text-center font-mono font-black tracking-[0.12em] text-slate-900 tabular-nums dark:text-white" :class="compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-4xl'">{{ ticket.number }}</span>
    </div>
    <section v-if="stats" class="mt-4 border-t border-slate-200 pt-3 text-xs dark:border-slate-700" :aria-label="`${ticket.group}조 ${ticket.number} 조합 분석`">
      <dl class="grid grid-cols-3 gap-2 text-center">
        <div><dt class="text-slate-500 dark:text-slate-400">숫자 합계</dt><dd class="mt-1 font-bold text-slate-900 dark:text-white">{{ stats.sum }}</dd></div>
        <div><dt class="text-slate-500 dark:text-slate-400">홀수 : 짝수</dt><dd class="mt-1 font-bold text-slate-900 dark:text-white">{{ stats.odd }} : {{ stats.even }}</dd></div>
        <div><dt class="text-slate-500 dark:text-slate-400">다른 숫자 수</dt><dd class="mt-1 font-bold text-slate-900 dark:text-white">{{ stats.unique }}개</dd></div>
      </dl>
      <p class="mt-3 text-slate-500 dark:text-slate-400">같은 숫자 최대 {{ stats.maxRepeat }}개 · 끝자리 {{ ticket.number[5] }} · 조는 분석에서 제외</p>
      <div class="mt-3 grid grid-cols-3 gap-3 text-center text-slate-600 dark:text-slate-300"><div v-for="(label, range) in PENSION_RANGES" :key="label">{{ label }}<progress class="my-1 block h-2 w-full accent-violet-600" :value="stats.ranges[range]" max="6" :aria-label="`${label} 구간 ${stats.ranges[range]}개`"></progress>{{ stats.ranges[range] }}개</div></div>
    </section>
  </div>
</template>
