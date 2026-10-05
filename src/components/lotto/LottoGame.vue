<script setup lang="ts">
import { computed } from 'vue'
import { Copy, Heart, RefreshCw } from 'lucide-vue-next'
import LottoBall from './LottoBall.vue'
import { analyzeLottoNumbers, LOTTO_RANGES } from '../../utils/lotto'
const props = defineProps<{ numbers: number[]; index: number; analysis?: boolean }>()
const stats = computed(() => props.analysis ? analyzeLottoNumbers(props.numbers) : null)
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
    <section v-if="stats" class="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700" :aria-label="`게임 ${index + 1} 조합 분석`">
      <dl class="grid grid-cols-3 gap-2 text-center text-xs">
        <div><dt class="text-slate-500 dark:text-slate-400">합계</dt><dd class="mt-1 font-bold text-slate-900 dark:text-white">{{ stats.sum }}</dd></div>
        <div><dt class="text-slate-500 dark:text-slate-400">홀수 : 짝수</dt><dd class="mt-1 font-bold text-slate-900 dark:text-white">{{ stats.odd }} : {{ stats.even }}</dd></div>
        <div><dt class="text-slate-500 dark:text-slate-400">최장 연속</dt><dd class="mt-1 font-bold text-slate-900 dark:text-white">{{ stats.longestRun === 1 ? '없음' : `${stats.longestRun}개` }}</dd></div>
      </dl>
      <div class="mt-4 grid grid-cols-5 gap-2" aria-label="구간별 번호 개수">
        <div v-for="(label, range) in LOTTO_RANGES" :key="label" class="text-center text-[11px] text-slate-600 dark:text-slate-300">
          <span>{{ label }}</span>
          <progress class="mt-1 block h-2 w-full accent-emerald-600" :value="stats.ranges[range]" max="6" :aria-label="`${label} 구간 ${stats.ranges[range]}개`"></progress>
          <span class="mt-1 block font-bold">{{ stats.ranges[range] }}개</span>
        </div>
      </div>
    </section>
  </article>
</template>
