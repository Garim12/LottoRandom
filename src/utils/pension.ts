import { randomInt, sample, shuffle } from './random'
import type { PensionFilters, PensionOptions, PensionSet, PensionTicket } from '../types/lottery'

export const PENSION_POSITIONS = ['십만 자리', '만 자리', '천 자리', '백 자리', '십 자리', '일 자리'] as const
export const PENSION_RANGES = ['0–2', '3–5', '6–9'] as const
export const PENSION_FIBONACCI = [1, 2, 3, 5, 8]
const DIGITS = Array.from({ length: 10 }, (_, i) => i)
const rangeOf = (digit: number) => digit < 3 ? 0 : digit < 6 ? 1 : 2
export const defaultPensionFilters = (): PensionFilters => ({ sumMin: 0, sumMax: 54, oddCount: null, maxRepeat: 6, minRanges: 1 })

function summarize(digits: number[]) {
  const counts = DIGITS.map((digit) => digits.filter((value) => value === digit).length)
  const odd = digits.filter((digit) => digit % 2).length
  return { sum: digits.reduce((sum, digit) => sum + digit, 0), odd, even: digits.length - odd,
    unique: counts.filter(Boolean).length, maxRepeat: Math.max(0, ...counts),
    ranges: [0, 1, 2].map((range) => digits.filter((digit) => rangeOf(digit) === range).length),
    fibonacci: digits.filter((digit) => PENSION_FIBONACCI.includes(digit)).length }
}

export function analyzePensionNumber(number: string) {
  if (typeof number !== 'string' || !/^\d{6}$/.test(number)) throw new RangeError('연금복권 번호는 0을 포함한 숫자 6자리여야 합니다.')
  return summarize([...number].map(Number))
}

function validateOptions(options: PensionOptions) {
  const validDigit = (value: number) => Number.isInteger(value) && value >= 0 && value <= 9
  if (options.group != null && (!Number.isInteger(options.group) || options.group < 1 || options.group > 5)) throw new RangeError('조는 1~5 중에서 선택해 주세요.')
  if (options.fixedDigits && (options.fixedDigits.length !== 6 || options.fixedDigits.some((digit) => digit !== null && !validDigit(digit)))) throw new RangeError('고정 번호는 각 자리에 0~9 또는 제한 없음을 선택해 주세요.')
  if (options.excludedDigits && (new Set(options.excludedDigits).size !== options.excludedDigits.length || options.excludedDigits.some((digit) => !validDigit(digit)) || options.excludedDigits.length === 10)) throw new RangeError('제외 숫자는 중복 없이 0~9 중에서 선택하고 하나 이상 남겨 주세요.')
  if (options.fixedDigits?.some((digit) => digit !== null && options.excludedDigits?.includes(digit))) throw new RangeError('같은 숫자를 고정과 제외에 함께 넣을 수 없습니다.')
  const filters = options.filters
  if (filters && (!Number.isInteger(filters.sumMin) || !Number.isInteger(filters.sumMax) || filters.sumMin < 0 || filters.sumMax > 54 || filters.sumMin > filters.sumMax ||
    (filters.oddCount !== null && (!Number.isInteger(filters.oddCount) || filters.oddCount < 0 || filters.oddCount > 6)) ||
    !Number.isInteger(filters.maxRepeat) || filters.maxRepeat < 1 || filters.maxRepeat > 6 ||
    !Number.isInteger(filters.minRanges) || filters.minRanges < 1 || filters.minRanges > 3)) throw new RangeError('합계는 0~54, 홀수는 0~6개, 같은 숫자는 최대 1~6개, 구간은 최소 1~3개로 설정해 주세요.')
  if (filters && filters.sumMin === filters.sumMax && filters.oddCount !== null && filters.sumMin % 2 !== filters.oddCount % 2) throw new RangeError('지정한 합계와 홀짝 비율을 함께 만족하는 연금복권 번호가 없습니다.')
  for (const [weights, length] of [[options.groupWeights, 5], ...(options.digitWeights ?? []).map((row) => [row, 10])] as [number[] | undefined, number][]) {
    if (weights && (weights.length !== length || weights.some((weight) => !Number.isFinite(weight) || weight <= 0))) throw new RangeError('전략 가중치가 올바르지 않습니다.')
  }
  if (options.digitWeights && options.digitWeights.length !== 6) throw new RangeError('자리별 가중치는 6개 자리에 필요합니다.')
  if (options.rangeCounts && (options.rangeCounts.length !== 3 || options.rangeCounts.some((n) => !Number.isInteger(n) || n < 0) || options.rangeCounts.reduce((a, b) => a + b, 0) !== 6)) throw new RangeError('구간별 개수의 합은 6이어야 합니다.')
  if (options.uniqueCount !== undefined && (!Number.isInteger(options.uniqueCount) || options.uniqueCount < 1 || options.uniqueCount > 6)) throw new RangeError('서로 다른 숫자는 1~6개여야 합니다.')
  if (options.fibonacciCount !== undefined && (!Number.isInteger(options.fibonacciCount) || options.fibonacciCount < 0 || options.fibonacciCount > 6)) throw new RangeError('피보나치 숫자는 0~6개여야 합니다.')
}

function order(values: number[], weights?: number[]) {
  if (!weights) return shuffle(values)
  return values.map((value) => ({ value, key: -Math.log((randomInt(0, 0xffff_ffff) + 1) / (0x1_0000_0000 + 1)) / weights[value]! }))
    .sort((a, b) => a.key - b.key).map(({ value }) => value)
}

function findDigits(options: PensionOptions, lastDigit?: number): string | null {
  const pools = Array.from({ length: 6 }, (_, position) => {
    const fixed = options.fixedDigits?.[position]
    return order(DIGITS.filter((digit) => !options.excludedDigits?.includes(digit) && (fixed == null || digit === fixed) &&
      (position !== 5 || lastDigit === undefined || digit === lastDigit)), options.digitWeights?.[position])
  })
  if (pools.some((pool) => !pool.length)) return null
  const filters = options.filters ?? defaultPensionFilters()
  let visited = 0
  function pick(chosen: number[]): string | null {
    // shortcut: 50k nodes per ending, move exhaustive searches to a worker if needed.
    if (++visited > 50_000) throw new RangeError('조건 탐색 한도에 도달했습니다. 연금복권 조건을 넓혀 주세요.')
    const remaining = 6 - chosen.length
    const stats = summarize(chosen)
    const rest = pools.slice(chosen.length)
    if (stats.maxRepeat > filters.maxRepeat || stats.sum + rest.reduce((sum, pool) => sum + Math.min(...pool), 0) > filters.sumMax ||
      stats.sum + rest.reduce((sum, pool) => sum + Math.max(...pool), 0) < filters.sumMin) return null
    const possibleCount = (predicate: (digit: number) => boolean, present: number, target: number) =>
      present + rest.filter((pool) => pool.every(predicate)).length <= target && present + rest.filter((pool) => pool.some(predicate)).length >= target
    if (filters.oddCount !== null && !possibleCount((digit) => digit % 2 === 1, stats.odd, filters.oddCount)) return null
    const possibleRanges = new Set([...chosen, ...rest.flat()].map(rangeOf)).size
    if (Math.min(stats.ranges.filter(Boolean).length + remaining, possibleRanges) < filters.minRanges) return null
    if (options.rangeCounts?.some((count, range) => !possibleCount((digit) => rangeOf(digit) === range, stats.ranges[range]!, count))) return null
    if (options.uniqueCount !== undefined && (stats.unique > options.uniqueCount || Math.min(stats.unique + remaining, new Set([...chosen, ...rest.flat()]).size) < options.uniqueCount)) return null
    if (options.fibonacciCount !== undefined && !possibleCount((digit) => PENSION_FIBONACCI.includes(digit), stats.fibonacci, options.fibonacciCount)) return null
    if (!remaining) return chosen.join('')
    for (const digit of pools[chosen.length]!) {
      const result = pick([...chosen, digit])
      if (result !== null) return result
    }
    return null
  }
  return pick([])
}

function group(options: PensionOptions, previous?: number) {
  const groups = [0, 1, 2, 3, 4].filter((index) => index + 1 !== previous && (options.group == null || options.group === index + 1))
  if (!groups.length) throw new RangeError('조 고정 조건 때문에 다른 조를 만들 수 없습니다. 조 고정을 해제해 주세요.')
  return order(groups, options.groupWeights)[0]! + 1
}

export function generatePensionDigits(options?: PensionOptions): string {
  if (options) {
    validateOptions(options)
    const number = findDigits(options)
    if (number === null) throw new RangeError('조건에 맞는 연금복권 번호가 없습니다. 고정·제외 또는 생성 조건을 바꿔 주세요.')
    return number
  }
  return String(randomInt(0, 999_999)).padStart(6, '0')
}

export function generatePensionNumber(options?: PensionOptions): PensionTicket {
  const number = generatePensionDigits(options)
  return { group: options ? group(options) : randomInt(1, 5), number }
}

export function generatePensionSet(options?: PensionOptions): PensionSet {
  if (options?.group != null) throw new RangeError('5개조 세트는 조 고정을 해제해 주세요.')
  const number = generatePensionDigits(options)
  return { number, tickets: Array.from({ length: 5 }, (_, index) => ({ group: index + 1, number })) }
}

export function generatePensionSpread(options?: PensionOptions): PensionTicket[] {
  if (options) {
    validateOptions(options)
    const tickets: PensionTicket[] = []
    for (const lastDigit of order(DIGITS, options.digitWeights?.[5])) {
      const number = findDigits(options, lastDigit)
      if (number !== null) tickets.push({ group: group(options), number })
      if (tickets.length === 5) return tickets
    }
    throw new RangeError('조건에 맞는 서로 다른 끝자리가 5개 미만입니다. 일 자리 고정·제외 또는 생성 조건을 바꿔 주세요.')
  }
  return sample(Array.from({ length: 10 }, (_, digit) => digit), 5).map((lastDigit) => ({
    group: randomInt(1, 5),
    number: `${String(randomInt(0, 99_999)).padStart(5, '0')}${lastDigit}`,
  }))
}

export function regenerateGroup(ticket: PensionTicket, options?: PensionOptions): PensionTicket {
  if (!Number.isInteger(ticket.group) || ticket.group < 1 || ticket.group > 5) {
    throw new RangeError('조 번호가 올바르지 않습니다.')
  }
  analyzePensionNumber(ticket.number)
  if (options) { validateOptions(options); return { ...ticket, group: group(options, ticket.group) } }
  const others = [1, 2, 3, 4, 5].filter((group) => group !== ticket.group)
  return { ...ticket, group: others[randomInt(0, others.length - 1)]! }
}

export const formatPension = (ticket: PensionTicket) => `${ticket.group}조 ${ticket.number}`
