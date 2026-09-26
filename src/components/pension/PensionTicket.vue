<script setup lang="ts">
import type { PensionTicket } from '../../types/lottery'
defineProps<{ ticket: PensionTicket; compact?: boolean }>()
</script>

<template>
  <div class="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-sm dark:border-violet-900/40 dark:bg-slate-800 sm:gap-5 sm:px-5" :aria-label="`${ticket.group}조 ${ticket.number}`">
    <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-100 text-base font-black text-violet-700 dark:bg-violet-900/50 dark:text-violet-200">{{ ticket.group }}조</span>
    <span class="min-w-0 flex-1 text-center font-mono font-black tracking-[0.12em] text-slate-900 tabular-nums dark:text-white" :class="compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-4xl'">{{ ticket.number }}</span>
  </div>
</template>
