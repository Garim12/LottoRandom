<script setup lang="ts">
import { Copy, Heart, RefreshCw } from 'lucide-vue-next'
import LottoBall from './LottoBall.vue'
defineProps<{ numbers: number[]; index: number }>()
defineEmits<{ regenerate: []; copy: []; save: [] }>()
</script>

<template>
  <article class="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-800/80 sm:p-5">
    <div class="mb-4 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2.5">
        <span class="grid size-8 place-items-center rounded-xl bg-emerald-50 text-sm font-black text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{{ index + 1 }}</span>
        <h3 class="text-sm font-bold text-slate-700 dark:text-slate-200">게임 {{ index + 1 }}</h3>
      </div>
      <div class="flex items-center gap-0.5">
        <button type="button" class="small-icon-button" :aria-label="`게임 ${index + 1} 다시 생성`" @click="$emit('regenerate')"><RefreshCw :size="18" aria-hidden="true" /></button>
        <button type="button" class="small-icon-button" :aria-label="`게임 ${index + 1} 복사`" @click="$emit('copy')"><Copy :size="18" aria-hidden="true" /></button>
        <button type="button" class="small-icon-button" :aria-label="`게임 ${index + 1} 저장`" @click="$emit('save')"><Heart :size="18" aria-hidden="true" /></button>
      </div>
    </div>
    <div class="flex flex-wrap items-center justify-center gap-1.5 sm:gap-3" :aria-label="`게임 ${index + 1} 번호: ${numbers.join(', ')}`">
      <LottoBall v-for="number in numbers" :key="number" :number="number" />
    </div>
  </article>
</template>
