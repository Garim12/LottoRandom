<script setup lang="ts">
import { computed, ref } from 'vue'
import type { StrategyId, StrategyWeights } from '../../utils/lottoStrategies'
import { PENSION_STRATEGIES, type summarizePensionHistory, type trainPensionModel } from '../../utils/pensionStrategies'
import { PENSION_POSITIONS } from '../../utils/pension'
import type { PensionDraw } from '../../utils/pensionHistory'
const strategy = defineModel<StrategyId>('strategy', { required: true })
const window = defineModel<number>('window', { required: true })
const weights = defineModel<StrategyWeights>('weights', { required: true })
defineProps<{ draws: readonly PensionDraw[]; stats: ReturnType<typeof summarizePensionHistory>; model: ReturnType<typeof trainPensionModel> | null }>()
const selected = computed(() => PENSION_STRATEGIES.find((item) => item.id === strategy.value)!)
const position = ref(1)
const weightLabels = { ml: '학습 모델', frequency: '출현 빈도', gap: '미출현 길이', fibonacci: '피보나치 선호' } as const
</script>

<template>
  <fieldset class="mt-4 min-w-0 rounded-2xl border border-white/20 p-4">
    <legend class="px-2 text-sm font-bold">연금복권 10가지 분석 전략</legend>
    <div class="grid gap-3 sm:grid-cols-2">
      <label class="min-w-0 text-xs font-semibold">연금복권 생성 전략<select v-model="strategy" class="condition-input bg-violet-950" aria-describedby="pension-strategy-help"><option v-for="item in PENSION_STRATEGIES" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
      <label class="text-xs font-semibold">연금복권 분석 기간<select v-model="window" class="condition-input bg-violet-950"><option :value="100">최근 100회</option><option :value="300">최근 300회</option><option :value="0">전체 회차</option></select></label>
    </div>
    <p id="pension-strategy-help" class="mt-3 text-sm leading-6">{{ selected.description }}</p>
    <p class="mt-2 text-xs leading-5 text-violet-100">데이터 기준: {{ draws[0]!.round }}~{{ draws[draws.length - 1]!.round }}회 · {{ draws.length }}회 · 마지막 추첨 {{ draws[draws.length - 1]!.date }}.
      <a href="https://www.dhlottery.co.kr/pt720/result" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2">동행복권 원본</a>의 1등 조·번호만 분석하며 보너스 번호는 제외합니다. 배포에 포함된 이력입니다.</p>
    <div v-if="strategy === 'custom'" class="mt-4 grid grid-cols-2 gap-3">
      <label v-for="(label, key) in weightLabels" :key="key" class="text-xs font-semibold">{{ label }} 가중치<input v-model.number="weights[key]" type="number" min="0" max="10" step="0.5" required class="condition-input bg-violet-950" /></label>
      <p class="col-span-2 text-xs leading-5 text-violet-100">0은 해당 항목을 끕니다. 하나 이상을 양수로 설정하세요. 추출 선호도이며 당첨 확률이 아닙니다.</p>
    </div>
    <div v-if="model" class="mt-4 rounded-xl bg-black/15 p-3 text-xs leading-5" aria-label="연금복권 로컬 모델 검증">
      <p class="font-bold">시간 순서 검증 · 자리별 최상위 숫자 기준</p>
      <p>{{ model.validation.trainingEnd }}회까지 학습 후 {{ model.validation.firstRound }}~{{ model.validation.lastRound }}회({{ model.validation.count }}회)를 검증했습니다.</p>
      <p>6자리 중 같은 자리 평균 일치 {{ model.validation.meanMatches.toFixed(2) }}개 / 무작위 이론 평균 0.60개</p>
      <p>조 일치 {{ model.validation.groupMatches }}/{{ model.validation.count }}회 (무작위 이론 비율 20%)</p>
      <p class="mt-1 text-violet-100">전이 쌍의 앞선 80%로 학습하고 이후 20%를 검증합니다. 입력은 각 회차 직전 번호이며, 생성에는 전체 기간의 {{ model.trainingCount }}개 전이 쌍을 다시 학습합니다. 이 수치는 당첨 등수·끝자리 연속 일치나 커스텀 혼합의 성능이 아닙니다.</p>
    </div>
    <details class="mt-4 text-xs">
      <summary class="min-h-8 cursor-pointer font-bold">자리별 통계와 적용 기준 보기</summary>
      <div class="mt-2 space-y-2 leading-5 text-violet-100">
        <p>최빈 홀짝 {{ stats.oddCount }} : {{ 6 - stats.oddCount }} · 합계 20~80백분위 {{ stats.sumMin }}~{{ stats.sumMax }}</p>
        <p>최빈 복합 패턴: 홀수 {{ stats.pattern.oddCount }}개 · 서로 다른 숫자 {{ stats.pattern.uniqueCount }}개</p>
        <label class="block">통계 자리<select v-model="position" class="condition-input bg-violet-950"><option :value="0">조</option><option v-for="(label, index) in PENSION_POSITIONS" :key="label" :value="index + 1">{{ label }}</option></select></label>
        <p>기간 내 한 번도 나오지 않은 숫자의 미출현은 해당 기간 ‘이상’입니다.</p>
        <table class="w-full text-center"><caption class="sr-only">자리별 출현 횟수와 연속 미출현</caption>
          <thead><tr><th scope="col">{{ position ? '숫자' : '조' }}</th><th scope="col">출현</th><th scope="col">미출현</th></tr></thead>
          <tbody><tr v-for="(frequency, digit) in stats.frequency[position]" :key="digit" class="border-t border-white/10"><th scope="row" class="p-1.5">{{ position ? digit : digit + 1 }}</th><td>{{ frequency }}회</td><td>{{ stats.gaps[position]![digit] }}회{{ frequency === 0 ? ' 이상' : '' }}</td></tr></tbody>
        </table>
      </div>
    </details>
  </fieldset>
</template>
