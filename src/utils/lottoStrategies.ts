import type { LottoFilters, LottoRules } from '../types/lottery'
import type { LottoDraw } from './lottoHistory'
import { analyzeLottoNumbers, defaultLottoFilters, LotteryError } from './lotto'

export const STRATEGIES = [
  { id: 'random', name: '1. 랜덤 생성', description: '고정·제외 번호를 적용한 균등 무작위 추출입니다.' },
  { id: 'frequency', name: '2. 빈도 균형', description: '분석 기간의 출현 횟수로 나눈 상위·중간·하위 15개 번호에서 각각 2개를 고릅니다. 동률은 번호순입니다.' },
  { id: 'ranges', name: '3. 구간 분산', description: '1–10 / 11–20 / 21–30 / 31–40 / 41–45에서 각각 1개 이상 고릅니다. 마지막 구간의 번호 수는 절반입니다.' },
  { id: 'similarity', name: '4. 패턴 유사성', description: '분석 기간에서 가장 자주 나타난 홀짝 비율을 적용합니다.' },
  { id: 'ml', name: '5. 머신러닝', description: '이전 회차의 빈도·미출현 길이로 학습한 로지스틱 회귀 모델의 출력에 따라 추출 가중치를 정합니다.' },
  { id: 'gap', name: '6. 연속 미출현', description: '분석 기간 내 미출현 길이 + 1을 추출 가중치로 사용합니다. 오래 안 나왔다고 다음 확률이 높아지지는 않습니다.' },
  { id: 'pattern', name: '7. 당첨 패턴', description: '과거에 가장 흔했던 홀수 개수·저번호(1–22) 개수·최장 연속 길이 묶음을 적용합니다. 연속 길이는 상한으로 사용합니다.' },
  { id: 'fibonacci', name: '8. 황금비율 (피보나치)', description: '1·2·3·5·8·13·21·34 중 2개, 나머지에서 4개를 고르는 수열 테마입니다. 황금비에 의한 예측 근거는 없습니다.' },
  { id: 'sum', name: '9. 합계 범위', description: '분석 기간의 당첨번호 합계에서 20~80백분위 범위를 적용합니다.' },
  { id: 'custom', name: '10. AI 커스텀 (로컬)', description: '로컬 학습 모델·출현 빈도·미출현·피보나치 선호도를 설정한 비중으로 혼합합니다. 외부 생성형 AI를 호출하지 않습니다.' },
] as const
export type StrategyId = typeof STRATEGIES[number]['id']
export interface StrategyWeights { ml: number; frequency: number; gap: number; fibonacci: number }
export const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34]
const NUMBERS = Array.from({ length: 45 }, (_, i) => i + 1)

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>()
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]![0]
}

export function summarizeHistory(draws: readonly LottoDraw[]) {
  if (draws.length < 60) throw new LotteryError('분석에는 연속된 당첨 이력 60회 이상이 필요합니다.')
  const frequency = NUMBERS.map((number) => draws.filter((draw) => draw.numbers.includes(number)).length)
  const gaps = NUMBERS.map((number) => {
    let last = draws.length - 1
    while (last >= 0 && !draws[last]!.numbers.includes(number)) last -= 1
    return last < 0 ? draws.length : draws.length - 1 - last
  })
  const ordered = [...NUMBERS].sort((a, b) => frequency[b - 1]! - frequency[a - 1]! || a - b)
  const stats = draws.map((draw) => analyzeLottoNumbers(draw.numbers))
  const sums = stats.map((value) => value.sum).sort((a, b) => a - b)
  const pattern = mostCommon(stats.map((value, i) => `${value.odd},${draws[i]!.numbers.filter((n) => n <= 22).length},${value.longestRun}`)).split(',').map(Number)
  return { frequency, gaps, ordered, oddCount: Number(mostCommon(stats.map((value) => String(value.odd)))),
    pattern: { oddCount: pattern[0]!, lowCount: pattern[1]!, maxConsecutive: pattern[2]! },
    sumMin: sums[Math.floor((sums.length - 1) * 0.2)]!, sumMax: sums[Math.ceil((sums.length - 1) * 0.8)]! }
}

type Sample = { round: number; features: number[][]; winners: readonly number[] }
const sigmoid = (value: number) => 1 / (1 + Math.exp(-value))
const predict = (weights: readonly number[], features: readonly number[]) => sigmoid(features.reduce((sum, value, i) => sum + value * weights[i]!, 0))

/** Features are captured before adding the target draw: no target/future numbers enter training inputs. */
function modelSamples(draws: readonly LottoDraw[]) {
  const short = Array<number>(45).fill(0)
  const long = Array<number>(45).fill(0)
  const last = Array<number>(45).fill(-1)
  const samples: Sample[] = []
  let next: number[][] = []
  for (let i = 0; i <= draws.length; i += 1) {
    const features = NUMBERS.map((number, n) => [1,
      (short[n]! - Math.min(i, 20) * 6 / 45) / 2,
      (long[n]! - Math.min(i, 100) * 6 / 45) / 4,
      Math.min(last[n] === -1 ? i : i - 1 - last[n]!, 60) / 10,
      i > 0 && draws[i - 1]!.numbers.includes(number) ? 1 : 0])
    if (i === draws.length) { next = features; break }
    const draw = draws[i]!
    if (i >= 20) samples.push({ round: draw.round, features, winners: draw.numbers })
    draw.numbers.forEach((number) => { short[number - 1]! += 1; long[number - 1]! += 1; last[number - 1] = i })
    if (i >= 20) draws[i - 20]!.numbers.forEach((number) => { short[number - 1]! -= 1 })
    if (i >= 100) draws[i - 100]!.numbers.forEach((number) => { long[number - 1]! -= 1 })
  }
  return { samples, next }
}

function fit(samples: readonly Sample[]) {
  const weights = [Math.log(6 / 39), 0, 0, 0, 0]
  // ponytail: a small linear model, 40 full-batch steps; use a worker if larger models cause UI latency.
  for (let epoch = 0; epoch < 40; epoch += 1) {
    const gradient = [0, 0, 0, 0, 0]
    for (const sample of samples) {
      sample.features.forEach((features, n) => {
        const error = predict(weights, features) - (sample.winners.includes(n + 1) ? 1 : 0)
        features.forEach((value, j) => { gradient[j]! += error * value })
      })
    }
    weights.forEach((weight, j) => { weights[j]! -= 0.2 * (gradient[j]! / (samples.length * 45) + (j ? 0.01 * weight : 0)) })
  }
  return weights
}

export function trainLottoModel(draws: readonly LottoDraw[]) {
  if (draws.length < 60) throw new LotteryError('로컬 학습에는 연속된 당첨 이력 60회 이상이 필요합니다.')
  const { samples, next } = modelSamples(draws)
  const split = Math.floor(samples.length * 0.8)
  const training = samples.slice(0, split)
  const testing = samples.slice(split)
  const evaluationWeights = fit(training)
  let matches = 0
  for (const sample of testing) {
    const ranked = NUMBERS.map((number) => ({ number, score: predict(evaluationWeights, sample.features[number - 1]!) }))
      .sort((a, b) => b.score - a.score || a.number - b.number).slice(0, 6)
    matches += ranked.filter(({ number }) => sample.winners.includes(number)).length
  }
  const weights = fit(samples)
  return { scores: next.map((features) => predict(weights, features)), weights,
    validation: { trainingEnd: training[training.length - 1]!.round, firstRound: testing[0]!.round, lastRound: testing[testing.length - 1]!.round,
      count: testing.length, meanMatches: matches / testing.length, weights: evaluationWeights }, trainingCount: samples.length }
}

export function strategyPlan(id: StrategyId, stats: ReturnType<typeof summarizeHistory>, model: ReturnType<typeof trainLottoModel> | null,
  custom: StrategyWeights): { filters?: LottoFilters; rules?: LottoRules } {
  const filters = defaultLottoFilters()
  switch (id) {
    case 'random': return {}
    case 'frequency': return { rules: { quotas: [0, 15, 30].map((start) => ({ numbers: stats.ordered.slice(start, start + 15), count: 2 })) } }
    case 'ranges': return { filters: { ...filters, minRanges: 5 } }
    case 'similarity': return { filters: { ...filters, oddCount: stats.oddCount } }
    case 'gap': return { rules: { weights: stats.gaps.map((gap) => gap + 1) } }
    case 'pattern': return { filters: { ...filters, oddCount: stats.pattern.oddCount, maxConsecutive: stats.pattern.maxConsecutive },
      rules: { quotas: [{ numbers: NUMBERS.filter((number) => number <= 22), count: stats.pattern.lowCount }] } }
    case 'fibonacci': return { rules: { quotas: [{ numbers: FIBONACCI, count: 2 }] } }
    case 'sum': return { filters: { ...filters, sumMin: stats.sumMin, sumMax: stats.sumMax } }
    case 'ml':
    case 'custom': {
      if (!model) throw new LotteryError('로컬 학습 모델을 준비하지 못했습니다.')
      if (id === 'ml') return { rules: { weights: model.scores } }
      const parts = [custom.ml, custom.frequency, custom.gap, custom.fibonacci]
      if (parts.some((weight) => !Number.isFinite(weight) || weight < 0 || weight > 10) || parts.every((weight) => weight === 0)) {
        throw new LotteryError('가중치는 0~10 사이의 숫자이며, 하나 이상은 0보다 커야 합니다.')
      }
      const total = parts.reduce((sum, weight) => sum + weight, 0)
      const maxModel = Math.max(...model.scores)
      const maxFreq = Math.max(...stats.frequency)
      const maxGap = Math.max(1, ...stats.gaps)
      return { rules: { weights: NUMBERS.map((number, n) => 0.05 + (custom.ml * model.scores[n]! / maxModel +
        custom.frequency * stats.frequency[n]! / maxFreq + custom.gap * stats.gaps[n]! / maxGap +
        custom.fibonacci * (FIBONACCI.includes(number) ? 1 : 0)) / total) } }
    }
    default: throw new LotteryError('알 수 없는 생성 전략입니다.')
  }
}
