<script setup lang="ts">
import { computed, useId } from 'vue'
import { BrainCircuit, TrendingUp, Clock3, Hash, RotateCcw } from 'lucide-vue-next'
import { DEFAULT_STRATEGY_WEIGHTS, type StrategyWeights } from '../../utils/lottoStrategies'

const weights = defineModel<StrategyWeights>({ required: true })
defineProps<{ pension?: boolean }>()
const id = useId()
const items = [
  { key: 'ml', label: '학습 패턴', icon: BrainCircuit, help: '과거 데이터를 학습한 결과를 반영해요.' },
  { key: 'frequency', label: '자주 나온 번호', icon: TrendingUp, help: '선택한 기간에 많이 나온 번호를 더 골라요.' },
  { key: 'gap', label: '오래 안 나온 번호', icon: Clock3, help: '최근까지 오래 나오지 않은 번호를 더 골라요.' },
  { key: 'fibonacci', label: '수열 숫자 선호', icon: Hash, help: '' },
] as const
const total = computed(() => items.reduce((sum, item) => sum + weights.value[item.key], 0))
const rows = computed(() => items.map((item) => ({ ...item,
  share: total.value ? weights.value[item.key] / total.value * 100 : 0,
})))
const percent = (value: number) => `${Number(value.toFixed(1))}%`
const summary = computed(() => rows.value.filter((row) => weights.value[row.key] > 0)
  .map((row) => `${row.label} ${percent(row.share)}`).join(' · '))
const groupSummary = computed(() => {
  const groupTotal = weights.value.ml + weights.value.frequency + weights.value.gap
  return groupTotal ? items.slice(0, 3).filter((item) => weights.value[item.key] > 0)
    .map((item) => `${item.label} ${percent(weights.value[item.key] / groupTotal * 100)}`).join(' · ') : '1~5조를 같은 확률로 선택해요.'
})
</script>

<template>
  <section class="weight-mixer mt-4 rounded-2xl bg-white p-4 text-slate-900 sm:p-5 dark:bg-slate-900 dark:text-slate-100" :aria-labelledby="`${id}-title`">
    <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <h3 :id="`${id}-title`" class="text-base font-extrabold tracking-tight">반영 비율 조절</h3>
      <button type="button" class="mixer-reset inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" @click="weights = { ...DEFAULT_STRATEGY_WEIGHTS }">
        <RotateCcw :size="14" aria-hidden="true" /> 기본 비율로
      </button>
    </div>
    <p class="text-xs leading-5 text-slate-600 dark:text-slate-300">어떤 기준을 더 참고할까요?</p>

    <div class="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
      <p class="text-xs font-bold text-slate-600 dark:text-slate-300">{{ pension ? '6자리 숫자에 반영하는 비율' : '번호 선택에 반영하는 비율' }}</p>
      <div class="mt-2 flex h-7 overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-700" role="img" :aria-label="summary || '사용 중인 기준 없음'">
        <span v-for="row in rows" :key="row.key" :class="`weight-${row.key}`" class="mix-segment flex shrink-0 items-center justify-center overflow-hidden text-xs font-bold tabular-nums" :style="{ width: `${row.share}%` }" aria-hidden="true">
          <span v-if="row.share >= 15">{{ percent(row.share) }}</span>
        </span>
      </div>
      <p v-if="total > 0" class="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{{ summary }}</p>
      <p v-else class="mt-2 text-xs font-semibold leading-5 text-rose-700 dark:text-rose-300" role="alert">모든 기준이 꺼져 있어요. 슬라이더를 하나 이상 올려 주세요.</p>
    </div>

    <div class="mt-1 divide-y divide-slate-100 dark:divide-slate-700">
      <div v-for="row in rows" :key="row.key" :class="`weight-${row.key}`" class="weight-row py-3">
        <div class="flex items-center justify-between gap-3">
          <label :for="`${id}-${row.key}`" class="flex min-w-0 items-center gap-2 text-sm font-bold">
            <component :is="row.icon" :size="17" class="weight-icon shrink-0" aria-hidden="true" />{{ row.label }}
          </label>
          <span class="shrink-0 text-lg font-extrabold tabular-nums" :class="weights[row.key] === 0 ? 'text-xs font-semibold text-slate-500 dark:text-slate-400' : 'weight-value'">{{ weights[row.key] === 0 ? '사용 안 함' : percent(row.share) }}</span>
        </div>
        <p :id="`${id}-${row.key}-help`" class="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{{ row.key === 'fibonacci' ? (pension ? '1·2·3·5·8을 더 고르는 취향 설정이에요.' : '1·2·3·5·8·13·21·34를 더 고르는 취향 설정이에요.') : row.help }}</p>
        <div class="flex min-h-11 items-center gap-3">
          <input :id="`${id}-${row.key}`" v-model.number="weights[row.key]" class="weight-slider min-w-0 flex-1" type="range" min="0" max="10" step="0.5" :aria-describedby="`${id}-${row.key}-help ${id}-guide`" :aria-valuetext="`조절값 ${weights[row.key]}, 반영 비율 ${percent(row.share)}`" :style="{ '--fill': `${weights[row.key] * 10}%` }" />
          <span class="w-12 shrink-0 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400" aria-hidden="true">{{ weights[row.key] }} / 10</span>
        </div>
      </div>
    </div>

    <div :id="`${id}-guide`" class="border-t border-slate-200 pt-3 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:text-slate-300">
      <p><strong class="font-semibold text-slate-800 dark:text-slate-100">오른쪽으로 갈수록 더 반영해요.</strong> 0이면 꺼져요. 비율은 자동으로 계산돼요.</p>
      <p class="mt-1">변경은 다음 번호 생성부터 적용돼요.</p>
      <p v-if="pension" class="mt-2">조에는 수열 숫자 선호를 적용하지 않아요.<span v-if="total > 0 && weights.fibonacci > 0" class="block">조 선택: {{ groupSummary }}</span></p>
      <p class="mt-2 font-medium">이 비율은 선택 기준이며, 당첨 확률이 아니에요.</p>
    </div>
  </section>
</template>

<style scoped>
.weight-mixer { --track: #e2e8f0; --segment-text: #fff; }
.weight-ml { --accent: #2563eb; }
.weight-frequency { --accent: #0f766e; }
.weight-gap { --accent: #b45309; }
.weight-fibonacci { --accent: #7c3aed; }
:global(.dark .weight-mixer) { --track: #334155; --segment-text: #0f172a; }
:global(.dark .weight-ml) { --accent: #60a5fa; }
:global(.dark .weight-frequency) { --accent: #2dd4bf; }
:global(.dark .weight-gap) { --accent: #fbbf24; }
:global(.dark .weight-fibonacci) { --accent: #c4b5fd; }
.mix-segment { background: var(--accent); color: var(--segment-text); }
.weight-icon, .weight-value { color: var(--accent); }
.weight-slider { height: 44px; margin: 0; appearance: none; cursor: pointer; background: transparent; }
.weight-slider::-webkit-slider-runnable-track { height: 6px; border-radius: 3px; background: linear-gradient(to right, var(--accent) var(--fill), var(--track) var(--fill)); }
.weight-slider::-moz-range-track { height: 6px; border-radius: 3px; background: linear-gradient(to right, var(--accent) var(--fill), var(--track) var(--fill)); }
.weight-slider::-webkit-slider-thumb { width: 20px; height: 20px; margin-top: -7px; appearance: none; border: 3px solid var(--accent); border-radius: 50%; background: white; box-shadow: 0 1px 3px #0f172a25; }
.weight-slider::-moz-range-thumb { width: 14px; height: 14px; border: 3px solid var(--accent); border-radius: 50%; background: white; }
.weight-slider:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
@media (prefers-reduced-motion: no-preference) { .mix-segment { transition: width .15s ease; } }
</style>
