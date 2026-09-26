<script setup lang="ts">
import { CheckCircle2, Info, X, XCircle } from 'lucide-vue-next'
import type { Toast } from '../../composables/useToast'
defineProps<{ toasts: Toast[] }>()
defineEmits<{ dismiss: [id: number] }>()
</script>

<template>
  <div class="pointer-events-none fixed inset-x-4 bottom-5 z-50 mx-auto flex max-w-sm flex-col gap-2" role="status" aria-live="polite">
    <div v-for="toast in toasts" :key="toast.id" class="pointer-events-auto flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
      <CheckCircle2 v-if="toast.tone === 'success'" :size="20" class="shrink-0 text-emerald-600" aria-hidden="true" />
      <XCircle v-else-if="toast.tone === 'error'" :size="20" class="shrink-0 text-rose-500" aria-hidden="true" />
      <Info v-else :size="20" class="shrink-0 text-sky-500" aria-hidden="true" />
      <span class="flex-1">{{ toast.message }}</span>
      <button type="button" class="rounded-lg p-1 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-500 dark:hover:bg-slate-700" aria-label="알림 닫기" @click="$emit('dismiss', toast.id)"><X :size="16" aria-hidden="true" /></button>
    </div>
  </div>
</template>
