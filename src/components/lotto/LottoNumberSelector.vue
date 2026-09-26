<script setup lang="ts">
import { computed, ref } from 'vue'
import { Ban, LockKeyhole, RotateCcw } from 'lucide-vue-next'
import type { LottoSelection } from '../../types/lottery'

const props = defineProps<{ selection: LottoSelection }>()
const emit = defineEmits<{ change: [value: LottoSelection]; error: [message: string] }>()
const mode = ref<'fixed' | 'excluded'>('fixed')
const all = Array.from({ length: 45 }, (_, index) => index + 1)
const fixedSet = computed(() => new Set(props.selection.fixed))
const excludedSet = computed(() => new Set(props.selection.excluded))

function toggle(number: number) {
  const fixed = [...props.selection.fixed]
  const excluded = [...props.selection.excluded]
  const source = mode.value === 'fixed' ? fixed : excluded
  const other = mode.value === 'fixed' ? excluded : fixed
  const index = source.indexOf(number)
  if (index >= 0) source.splice(index, 1)
  else {
    if (mode.value === 'fixed' && fixed.length >= 6) { emit('error', '고정 번호는 최대 6개입니다.'); return }
    const otherIndex = other.indexOf(number)
    if (otherIndex >= 0) other.splice(otherIndex, 1)
    if (mode.value === 'excluded' && 45 - (excluded.length + 1) < 6) {
      emit('error', '생성 가능한 번호는 최소 6개가 필요합니다.'); return
    }
    source.push(number)
  }
  emit('change', { fixed: fixed.sort((a, b) => a - b), excluded: excluded.sort((a, b) => a - b) })
}
function clear(which: 'fixed' | 'excluded' | 'all') {
  emit('change', {
    fixed: which === 'excluded' ? [...props.selection.fixed] : [],
    excluded: which === 'fixed' ? [...props.selection.excluded] : [],
  })
}
</script>

<template>
  <section class="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/80 sm:p-6" aria-labelledby="number-select-title">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 id="number-select-title" class="text-base font-extrabold text-slate-900 dark:text-white">나만의 번호 조건</h3>
        <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">고정 {{ selection.fixed.length }}/6 · 제외 {{ selection.excluded.length }}개</p>
      </div>
      <button type="button" class="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700" @click="clear('all')"><RotateCcw :size="14" aria-hidden="true" /> 전체 초기화</button>
    </div>
    <div class="mt-5 grid grid-cols-2 gap-2" role="group" aria-label="번호 선택 모드">
      <button type="button" class="selector-mode" :class="mode === 'fixed' ? 'selector-mode-active' : ''" :aria-pressed="mode === 'fixed'" @click="mode = 'fixed'"><LockKeyhole :size="16" aria-hidden="true" /> 번호 고정</button>
      <button type="button" class="selector-mode" :class="mode === 'excluded' ? 'selector-mode-active' : ''" :aria-pressed="mode === 'excluded'" @click="mode = 'excluded'"><Ban :size="16" aria-hidden="true" /> 번호 제외</button>
    </div>
    <div class="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-9" role="group" aria-label="1부터 45까지 번호 선택">
      <button v-for="number in all" :key="number" type="button" class="number-choice" :class="fixedSet.has(number) ? 'number-choice-fixed' : excludedSet.has(number) ? 'number-choice-excluded' : ''"
        :aria-pressed="fixedSet.has(number) || excludedSet.has(number)" :aria-label="`${number}번 ${fixedSet.has(number) ? '고정됨' : excludedSet.has(number) ? '제외됨' : '선택 안 됨'}`" @click="toggle(number)">
        <span v-if="fixedSet.has(number)" class="absolute right-0.5 top-0.5 text-[9px]" aria-hidden="true">🔒</span>
        <span v-if="excludedSet.has(number)" class="absolute right-0.5 top-0.5 text-[9px]" aria-hidden="true">×</span>
        {{ String(number).padStart(2, '0') }}
      </button>
    </div>
    <div class="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
      <button type="button" class="text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300" @click="clear('fixed')">고정 초기화</button>
      <span class="text-slate-300 dark:text-slate-600">·</span>
      <button type="button" class="text-slate-500 underline-offset-2 hover:underline dark:text-slate-300" @click="clear('excluded')">제외 초기화</button>
    </div>
  </section>
</template>
