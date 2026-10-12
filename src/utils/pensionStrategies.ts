import type { PensionOptions } from '../types/lottery'
import type { PensionDraw } from './pensionHistory'
import { STRATEGIES, type StrategyId, type StrategyWeights } from './lottoStrategies'
import { analyzePensionNumber, defaultPensionFilters, PENSION_FIBONACCI } from './pension'

const descriptions: Record<StrategyId, string> = {
  random: '1~5조와 6자리 숫자를 무작위로 고릅니다. 앞자리 0과 같은 숫자 반복을 허용합니다.',
  frequency: '조와 각 자리에서 출현 상위·하위 숫자에 같은 선호도를 줍니다. 숫자는 상·하위 3개, 조는 상·하위 2개이며 중간은 1/4 가중치입니다. 동률은 숫자순입니다.',
  ranges: '0–2 / 3–5 / 6–9 구간에서 각각 2자리씩 고릅니다. 마지막 구간에는 숫자가 4개입니다.',
  similarity: '선택 기간의 1등 번호에서 가장 흔했던 6자리 홀짝 비율을 적용합니다. 조는 제외합니다.',
  ml: '직전 회차의 같은 자리 숫자 다음에 나온 숫자를 학습하는 마르코프 전이 모델입니다. 조도 별도로 학습하며 모든 전이에 1을 더해 보정합니다.',
  gap: '조와 각 자리 숫자의 연속 미출현 횟수 + 1을 추출 가중치로 사용합니다.',
  pattern: '선택 기간의 최빈 홀수 개수·서로 다른 숫자 개수 묶음을 맞춥니다. 자리 순서와 숫자 반복을 허용합니다.',
  fibonacci: '피보나치 숫자 1·2·3·5·8을 정확히 3자리에 배치하는 수열 테마입니다. 숫자 반복을 허용하며 예측 근거는 없습니다.',
  sum: '선택 기간의 1등 번호에서 6자리 숫자 합계의 20~80백분위 범위를 적용합니다. 조는 합계에 넣지 않습니다.',
  custom: '로컬 전이 모델·자리별 빈도·미출현·피보나치 선호를 설정 비중으로 혼합합니다. 조에는 앞의 세 항목만 적용하며 외부 AI를 호출하지 않습니다.',
}
export const PENSION_STRATEGIES = STRATEGIES.map(({ id, name }) => ({ id, name, description: descriptions[id] }))
const categories = (draw: PensionDraw) => [draw.group - 1, ...[...draw.number].map(Number)]
function mostCommon(values: string[]) {
  const counts = new Map<string, number>()
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]![0]
}

export function summarizePensionHistory(draws: readonly PensionDraw[]) {
  if (draws.length < 60) throw new RangeError('연금복권 분석에는 연속된 당첨 이력 60회 이상이 필요합니다.')
  const values = draws.map(categories)
  const frequency = Array.from({ length: 7 }, (_, position) => Array.from({ length: position ? 10 : 5 }, (_, digit) => values.filter((row) => row[position] === digit).length))
  const gaps = frequency.map((row, position) => row.map((_, digit) => {
    let last = values.length - 1
    while (last >= 0 && values[last]![position] !== digit) last -= 1
    return last < 0 ? values.length : values.length - 1 - last
  }))
  const stats = draws.map((draw) => analyzePensionNumber(draw.number))
  const sums = stats.map((stat) => stat.sum).sort((a, b) => a - b)
  const pattern = mostCommon(stats.map((stat) => `${stat.odd},${stat.unique}`)).split(',').map(Number)
  return { frequency, gaps, oddCount: Number(mostCommon(stats.map((stat) => String(stat.odd)))),
    pattern: { oddCount: pattern[0]!, uniqueCount: pattern[1]! },
    sumMin: sums[Math.floor((sums.length - 1) * 0.2)]!, sumMax: sums[Math.ceil((sums.length - 1) * 0.8)]! }
}

function fit(draws: readonly PensionDraw[]) {
  const rows = draws.map(categories)
  const transitions = Array.from({ length: 7 }, (_, position) => Array.from({ length: position ? 10 : 5 }, () => Array<number>(position ? 10 : 5).fill(1)))
  for (let i = 1; i < rows.length; i += 1) rows[i]!.forEach((digit, position) => { transitions[position]![rows[i - 1]![position]!]![digit]! += 1 })
  return transitions
}
function predict(transitions: number[][][], previous: PensionDraw) {
  return categories(previous).map((digit, position) => {
    const row = transitions[position]![digit]!
    const total = row.reduce((a, b) => a + b, 0)
    return row.map((count) => count / total)
  })
}
export function trainPensionModel(draws: readonly PensionDraw[]) {
  if (draws.length < 60) throw new RangeError('연금복권 학습에는 연속된 당첨 이력 60회 이상이 필요합니다.')
  const split = Math.floor((draws.length - 1) * 0.8)
  // shortcut: first-order transitions only; compare out-of-time results before adding longer contexts.
  const evaluation = fit(draws.slice(0, split + 1))
  let matches = 0
  let groupMatches = 0
  for (let i = split + 1; i < draws.length; i += 1) {
    const actual = categories(draws[i]!)
    predict(evaluation, draws[i - 1]!).forEach((scores, position) => {
      const best = scores.indexOf(Math.max(...scores))
      if (best === actual[position]) { if (position) matches += 1; else groupMatches += 1 }
    })
  }
  const scores = predict(fit(draws), draws[draws.length - 1]!)
  const count = draws.length - 1 - split
  return { groupWeights: scores[0]!, digitWeights: scores.slice(1), trainingCount: draws.length - 1,
    validation: { trainingEnd: draws[split]!.round, firstRound: draws[split + 1]!.round, lastRound: draws[draws.length - 1]!.round,
      count, meanMatches: matches / count, groupMatches, transitions: evaluation } }
}

export function pensionStrategyPlan(id: StrategyId, stats: ReturnType<typeof summarizePensionHistory>, model: ReturnType<typeof trainPensionModel> | null, custom: StrategyWeights): PensionOptions {
  const filters = defaultPensionFilters()
  switch (id) {
    case 'random': return {}
    case 'ranges': return { rangeCounts: [2, 2, 2] }
    case 'similarity': return { filters: { ...filters, oddCount: stats.oddCount } }
    case 'pattern': return { filters: { ...filters, oddCount: stats.pattern.oddCount }, uniqueCount: stats.pattern.uniqueCount }
    case 'fibonacci': return { fibonacciCount: 3 }
    case 'sum': return { filters: { ...filters, sumMin: stats.sumMin, sumMax: stats.sumMax } }
    case 'frequency':
    case 'gap': {
      const weights = stats.frequency.map((row, position) => {
        if (id === 'gap') return stats.gaps[position]!.map((gap) => gap + 1)
        const order = row.map((_, digit) => digit).sort((a, b) => row[b]! - row[a]! || a - b)
        const size = position ? 3 : 2
        return row.map((_, digit) => order.slice(0, size).includes(digit) || order.slice(-size).includes(digit) ? 1 : 0.25)
      })
      return { groupWeights: weights[0]!, digitWeights: weights.slice(1) }
    }
    case 'ml':
    case 'custom': {
      if (!model) throw new RangeError('연금복권 로컬 모델을 준비하지 못했습니다.')
      if (id === 'ml') return { groupWeights: model.groupWeights, digitWeights: model.digitWeights }
      const parts = [custom.ml, custom.frequency, custom.gap, custom.fibonacci]
      if (parts.some((weight) => !Number.isFinite(weight) || weight < 0 || weight > 10) || parts.every((weight) => weight === 0)) throw new RangeError('가중치는 0~10 사이의 숫자이며, 하나 이상은 0보다 커야 합니다.')
      const learned = [model.groupWeights, ...model.digitWeights]
      const weights = stats.frequency.map((row, position) => {
        const total = custom.ml + custom.frequency + custom.gap + (position ? custom.fibonacci : 0)
        return row.map((frequency, digit) => total === 0 ? 1 : 0.05 + (custom.ml * learned[position]![digit]! / Math.max(...learned[position]!) +
          custom.frequency * frequency / Math.max(...row) + custom.gap * stats.gaps[position]![digit]! / Math.max(1, ...stats.gaps[position]!) +
          (position && PENSION_FIBONACCI.includes(digit) ? custom.fibonacci : 0)) / total)
      })
      return { groupWeights: weights[0]!, digitWeights: weights.slice(1) }
    }
    default: throw new RangeError('알 수 없는 연금복권 전략입니다.')
  }
}
