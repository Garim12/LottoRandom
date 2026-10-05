import { randomInt, sample, shuffle } from './random'
import type { GameCount, LottoFilters, LottoRules, LottoSelection } from '../types/lottery'

const ALL_NUMBERS = Array.from({ length: 45 }, (_, index) => index + 1)
export const LOTTO_RANGES = ['1–10', '11–20', '21–30', '31–40', '41–45'] as const

export const defaultLottoFilters = (): LottoFilters => ({
  sumMin: 21, sumMax: 255, oddCount: null, maxConsecutive: 6, minRanges: 1,
})

export class LotteryError extends Error {}

function checkList(values: readonly number[], label: string): void {
  if (new Set(values).size !== values.length) throw new LotteryError(`${label}에 중복된 숫자가 있습니다.`)
  if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 45)) {
    throw new LotteryError(`${label}는 1부터 45까지의 숫자여야 합니다.`)
  }
}

export function validateSelection(selection: LottoSelection): void {
  checkList(selection.fixed, '고정 번호')
  checkList(selection.excluded, '제외 번호')
  if (selection.fixed.length > 6) throw new LotteryError('고정 번호는 최대 6개입니다.')
  const excluded = new Set(selection.excluded)
  if (selection.fixed.some((number) => excluded.has(number))) {
    throw new LotteryError('같은 번호를 고정과 제외에 함께 넣을 수 없습니다.')
  }
  if (45 - selection.excluded.length < 6) {
    throw new LotteryError('생성 가능한 번호가 6개보다 적습니다.')
  }
}

function candidates(selection: LottoSelection): number[] {
  const blocked = new Set([...selection.fixed, ...selection.excluded])
  return ALL_NUMBERS.filter((number) => !blocked.has(number))
}

function summarize(numbers: readonly number[]) {
  const sorted = [...numbers].sort((a, b) => a - b)
  const ranges = [0, 0, 0, 0, 0]
  let sum = 0
  let odd = 0
  let run = 0
  let longestRun = 0
  for (let i = 0; i < sorted.length; i += 1) {
    const number = sorted[i]!
    sum += number
    odd += number % 2
    ranges[Math.floor((number - 1) / 10)]! += 1
    run = i > 0 && number === sorted[i - 1]! + 1 ? run + 1 : 1
    longestRun = Math.max(longestRun, run)
  }
  return { sum, odd, even: numbers.length - odd, longestRun, ranges }
}

export function analyzeLottoNumbers(numbers: readonly number[]) {
  checkList(numbers, '분석 번호')
  if (numbers.length !== 6) throw new LotteryError('분석할 번호는 6개여야 합니다.')
  return summarize(numbers)
}

function validateFilters(filters?: LottoFilters): void {
  if (!filters) return
  if (!Number.isInteger(filters.sumMin) || !Number.isInteger(filters.sumMax) ||
    filters.sumMin < 21 || filters.sumMax > 255 || filters.sumMin > filters.sumMax) {
    throw new LotteryError('합계는 21~255 사이의 정수로, 최소가 최대 이하가 되도록 입력해 주세요.')
  }
  if (filters.oddCount !== null && (!Number.isInteger(filters.oddCount) || filters.oddCount < 0 || filters.oddCount > 6)) {
    throw new LotteryError('홀수 개수는 제한 없음 또는 0~6개로 선택해 주세요.')
  }
  if (filters.sumMin === filters.sumMax && filters.oddCount !== null && filters.sumMin % 2 !== filters.oddCount % 2) {
    throw new LotteryError('지정한 합계와 홀짝 비율을 함께 만족하는 조합은 없습니다.')
  }
  if (!Number.isInteger(filters.maxConsecutive) || filters.maxConsecutive < 1 || filters.maxConsecutive > 6 ||
    !Number.isInteger(filters.minRanges) || filters.minRanges < 1 || filters.minRanges > 5) {
    throw new LotteryError('연속 번호는 최대 1~6개, 사용 구간은 최소 1~5개로 선택해 주세요.')
  }
}

function validateRules(rules?: LottoRules): void {
  if (rules?.weights && (rules.weights.length !== 45 || rules.weights.some((weight) => !Number.isFinite(weight) || weight <= 0))) {
    throw new LotteryError('번호별 가중치는 양수 45개여야 합니다.')
  }
  for (const quota of rules?.quotas ?? []) {
    checkList(quota.numbers, '전략 후보 번호')
    if (!Number.isInteger(quota.count) || quota.count < 0 || quota.count > 6 || quota.count > quota.numbers.length) {
      throw new LotteryError('전략별 번호 개수가 올바르지 않습니다.')
    }
  }
}

export function generateLottoNumbers(selection: LottoSelection = { fixed: [], excluded: [] }): number[] {
  validateSelection(selection)
  const remaining = 6 - selection.fixed.length
  const pool = candidates(selection)
  if (pool.length < remaining) throw new LotteryError('생성 가능한 번호가 부족합니다.')
  return [...selection.fixed, ...sample(pool, remaining)].sort((a, b) => a - b)
}

function combinations(n: number, k: number): number {
  let total = 1
  for (let i = 1; i <= k; i += 1) total = (total * (n - i + 1)) / i
  return Math.round(total)
}

function nextLottoGame(selection: LottoSelection, current: readonly number[][], spread: boolean, filters?: LottoFilters, rules?: LottoRules): number[] {
  const existing = new Set(current.map((game) => game.join('-')))
  if (spread || filters || rules) {
    const usage = new Map<number, number>()
    for (const number of current.flat()) usage.set(number, (usage.get(number) ?? 0) + 1)
    const pool = shuffle(candidates(selection))
    if (rules?.weights) {
      const keys = new Map(pool.map((number) => [number, -Math.log((randomInt(0, 0xffff_ffff) + 1) / (0x1_0000_0000 + 1)) / rules.weights![number - 1]!]))
      pool.sort((a, b) => keys.get(a)! - keys.get(b)!)
    }
    if (spread) pool.sort((a, b) => (usage.get(a) ?? 0) - (usage.get(b) ?? 0))
    const tails = filters ? Array.from({ length: pool.length + 1 }, (_, start) => pool.slice(start).sort((a, b) => a - b)) : []
    let visited = 0
    // ponytail: greedy usage order, not a global optimum; use joint search if that becomes a requirement.
    // Prune impossible partial combinations and skip already generated games.
    function pick(start: number, chosen: number[]): number[] | null {
      // ponytail: cap synchronous search at 50k nodes; move to a worker if exhaustive search is needed.
      if (++visited > 50_000) throw new LotteryError('조건 탐색 한도에 도달했습니다. 합계나 패턴 조건을 넓혀 다시 시도해 주세요.')
      const remaining = 6 - selection.fixed.length - chosen.length
      for (const quota of rules?.quotas ?? []) {
        const present = [...selection.fixed, ...chosen].filter((number) => quota.numbers.includes(number)).length
        const available = pool.slice(start).filter((number) => quota.numbers.includes(number)).length
        const needed = quota.count - present
        if (needed < 0 || needed > remaining || needed > available || remaining - needed > pool.length - start - available) return null
      }
      if (filters) {
        const stats = summarize([...selection.fixed, ...chosen])
        const tail = tails[start]!
        if (tail.length < remaining || stats.longestRun > filters.maxConsecutive) return null
        const lowestSum = tail.slice(0, remaining).reduce((sum, number) => sum + number, stats.sum)
        const highestSum = remaining ? tail.slice(-remaining).reduce((sum, number) => sum + number, stats.sum) : stats.sum
        if (lowestSum > filters.sumMax || highestSum < filters.sumMin) return null
        if (filters.oddCount !== null) {
          const needed = filters.oddCount - stats.odd
          const availableOdd = tail.filter((number) => number % 2 === 1).length
          if (needed < 0 || needed > remaining || needed > availableOdd || remaining - needed > tail.length - availableOdd) return null
        }
        const usedRanges = stats.ranges.filter(Boolean).length
        const possibleRanges = new Set(tail.map((number) => Math.floor((number - 1) / 10)))
        stats.ranges.forEach((count, index) => { if (count) possibleRanges.add(index) })
        if (Math.min(usedRanges + remaining, possibleRanges.size) < filters.minRanges) return null
      }
      if (remaining === 0) {
        const numbers = [...selection.fixed, ...chosen].sort((a, b) => a - b)
        return existing.has(numbers.join('-')) ? null : numbers
      }
      for (let i = start; i <= pool.length - remaining; i += 1) {
        const result = pick(i + 1, [...chosen, pool[i]!])
        if (result) return result
      }
      return null
    }
    const numbers = pick(0, [])
    if (numbers) return numbers
  } else {
    for (let attempt = 0; attempt < 10_000; attempt += 1) {
      const numbers = generateLottoNumbers(selection)
      if (!existing.has(numbers.join('-'))) return numbers
    }
  }
  throw new LotteryError('서로 다른 조합을 충분히 만들 수 없습니다. 고정·제외 또는 생성 조건을 바꿔 주세요.')
}

export function generateLottoGames(count: GameCount, selection: LottoSelection = { fixed: [], excluded: [] }, spread = false, filters?: LottoFilters, rules?: LottoRules): number[][] {
  if (![1, 3, 5].includes(count)) throw new LotteryError('게임 수는 1, 3, 5 중에서 선택해 주세요.')
  validateSelection(selection)
  validateFilters(filters)
  validateRules(rules)
  const capacity = combinations(candidates(selection).length, 6 - selection.fixed.length)
  if (capacity < count) throw new LotteryError('현재 고정·제외 조건에서는 서로 다른 게임을 만들 수 없습니다.')
  const games: number[][] = []
  while (games.length < count) games.push(nextLottoGame(selection, games, spread, filters, rules))
  return games
}

export function regenerateLottoGame(current: readonly number[][], index: number, selection: LottoSelection, spread = false, filters?: LottoFilters, rules?: LottoRules): number[] {
  if (!Number.isInteger(index) || index < 0 || index >= current.length) throw new LotteryError('게임을 찾을 수 없습니다.')
  validateSelection(selection)
  validateFilters(filters)
  validateRules(rules)
  const others = current.filter((_, position) => position !== index)
  const existing = new Set(others.filter((game) => selection.fixed.every((number) => game.includes(number)) &&
    !game.some((number) => selection.excluded.includes(number))).map((game) => game.join('-')))
  const capacity = combinations(candidates(selection).length, 6 - selection.fixed.length)
  if (capacity <= existing.size) throw new LotteryError('다른 조합을 만들 수 없습니다. 고정·제외 조건을 바꿔 주세요.')
  return nextLottoGame(selection, others, spread, filters, rules)
}

export const formatLotto = (numbers: readonly number[]) => numbers.map((number) => String(number).padStart(2, '0')).join(', ')
