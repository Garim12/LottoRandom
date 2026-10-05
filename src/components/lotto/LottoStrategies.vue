<script setup lang="ts">
import { computed } from 'vue'
import { STRATEGIES, type StrategyId, type StrategyWeights, type summarizeHistory, type trainLottoModel } from '../../utils/lottoStrategies'
import type { LottoDraw } from '../../utils/lottoHistory'

const strategy = defineModel<StrategyId>('strategy', { required: true })
const window = defineModel<number>('window', { required: true })
const weights = defineModel<StrategyWeights>('weights', { required: true })
defineProps<{ draws: readonly LottoDraw[]; stats: ReturnType<typeof summarizeHistory>; model: ReturnType<typeof trainLottoModel> | null }>()
const selected = computed(() => STRATEGIES.find((item) => item.id === strategy.value)!)
const weightLabels = { ml: '학습 모델', frequency: '출현 빈도', gap: '미출현 길이', fibonacci: '피보나치 선호' } as const
</script>

<template>
  <fieldset class="mt-4 min-w-0 rounded-2xl border border-white/20 p-4">
    <legend class="px-2 text-sm font-bold">10가지 분석 전략</legend>
    <div class="grid gap-3 sm:grid-cols-2">
      <label class="min-w-0 text-xs font-semibold">생성 전략
        <select v-model="strategy" class="condition-input" aria-describedby="strategy-help">
          <option v-for="item in STRATEGIES" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
      </label>
      <label class="text-xs font-semibold">분석 기간
        <select v-model="window" class="condition-input">
          <option :value="100">최근 100회</option><option :value="300">최근 300회</option><option :value="0">전체 회차</option>
        </select>
      </label>
    </div>
    <p id="strategy-help" class="mt-3 text-sm leading-6">{{ selected.description }}</p>
    <p class="mt-2 text-xs leading-5 text-emerald-100">
      데이터 기준: {{ draws[0]!.round }}~{{ draws[draws.length - 1]!.round }}회 · {{ draws.length }}회 · 마지막 추첨 {{ draws[draws.length - 1]!.date }}.
      <a href="https://www.dhlottery.co.kr/lt645/result" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2">동행복권 원본</a>
      보너스 번호는 분석에서 제외합니다.
    </p>
    <div v-if="strategy === 'custom'" class="mt-4 grid grid-cols-2 gap-3">
      <label v-for="(label, key) in weightLabels" :key="key" class="text-xs font-semibold">{{ label }} 가중치
        <input v-model.number="weights[key]" type="number" min="0" max="10" step="0.5" required class="condition-input" />
      </label>
      <p class="col-span-2 text-xs leading-5 text-emerald-100">0은 해당 항목을 끕니다. 0~10 중 하나 이상을 양수로 설정하세요. 선택 비중이며 당첨 확률이 아닙니다.</p>
    </div>
    <div v-if="model" class="mt-4 rounded-xl bg-black/15 p-3 text-xs leading-5" aria-label="로컬 모델 검증">
      <p class="font-bold">시간 순서 검증 · 모델 상위 6번호 기준</p>
      <p>{{ model.validation.trainingEnd }}회까지 학습 후 {{ model.validation.firstRound }}~{{ model.validation.lastRound }}회({{ model.validation.count }}회)를 검증했습니다.</p>
      <p>평균 일치 {{ model.validation.meanMatches.toFixed(2) }}개 / 무작위 이론 평균 0.80개</p>
      <p class="mt-1 text-emerald-100">앞선 80% 구간으로 학습하며, 각 예측 입력에는 그 회차 이전 번호만 사용합니다. 생성에는 전체 선택 기간의 {{ model.trainingCount }}개 대상 회차로 다시 학습한 모델을 씁니다. 이 검증은 가중 추출·커스텀 혼합의 성능이나 미래 당첨을 보장하지 않습니다.</p>
    </div>
    <details class="mt-4 text-xs">
      <summary class="min-h-8 cursor-pointer font-bold">기간 통계와 적용 기준 보기</summary>
      <div class="mt-2 space-y-2 leading-5 text-emerald-100">
        <p>최빈 홀짝 {{ stats.oddCount }} : {{ 6 - stats.oddCount }} · 합계 20~80백분위 {{ stats.sumMin }}~{{ stats.sumMax }}</p>
        <p>최빈 복합 패턴: 홀수 {{ stats.pattern.oddCount }}개, 저번호(1–22) {{ stats.pattern.lowCount }}개, 최장 연속 {{ stats.pattern.maxConsecutive }}개</p>
        <p>빈도 상위 15개: {{ stats.ordered.slice(0, 15).join(', ') }}</p>
        <p>빈도 하위 15개: {{ stats.ordered.slice(30).join(', ') }}</p>
        <p>미출현은 기준 회차까지 연속으로 나오지 않은 횟수입니다. 기간 내 한 번도 안 나온 번호는 ‘이상’으로 표시합니다.</p>
        <div class="max-h-64 overflow-auto rounded-lg border border-white/20">
          <table class="w-full text-center">
            <caption class="sr-only">번호별 출현 횟수와 연속 미출현</caption>
            <thead><tr><th scope="col" class="p-2">번호</th><th scope="col" class="p-2">출현</th><th scope="col" class="p-2">미출현</th></tr></thead>
            <tbody><tr v-for="(frequency, index) in stats.frequency" :key="index" class="border-t border-white/10">
              <th scope="row" class="p-1.5">{{ index + 1 }}</th><td>{{ frequency }}회</td><td>{{ stats.gaps[index] }}회{{ frequency === 0 ? ' 이상' : '' }}</td>
            </tr></tbody>
          </table>
        </div>
      </div>
    </details>
    <p class="mt-3 text-xs leading-5 text-emerald-100">고정·제외 번호에도 선택한 전략이 적용됩니다. 조건이 충돌하면 안내하며, 전략 변경은 다음 생성부터 적용됩니다. 이력은 배포 시 포함된 데이터입니다.</p>
  </fieldset>
</template>
