import { sample } from './random'
import type { GameCount, LottoSelection } from '../types/lottery'

const ALL_NUMBERS = Array.from({ length: 45 }, (_, index) => index + 1)

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

export function generateLottoGames(count: GameCount, selection: LottoSelection = { fixed: [], excluded: [] }): number[][] {
  if (![1, 3, 5].includes(count)) throw new LotteryError('게임 수는 1, 3, 5 중에서 선택해 주세요.')
  validateSelection(selection)
  const capacity = combinations(candidates(selection).length, 6 - selection.fixed.length)
  if (capacity < count) throw new LotteryError('현재 고정·제외 조건에서는 서로 다른 게임을 만들 수 없습니다.')
  const unique = new Set<string>()
  const games: number[][] = []
  let attempts = 0
  while (games.length < count) {
    if (++attempts > 10_000) throw new LotteryError('번호 생성에 실패했습니다. 조건을 줄여 다시 시도해 주세요.')
    const numbers = generateLottoNumbers(selection)
    const key = numbers.join('-')
    if (unique.has(key)) continue
    unique.add(key)
    games.push(numbers)
  }
  return games
}

export function regenerateLottoGame(current: readonly number[][], index: number, selection: LottoSelection): number[] {
  if (index < 0 || index >= current.length) throw new LotteryError('게임을 찾을 수 없습니다.')
  validateSelection(selection)
  const existing = new Set(current.filter((_, position) => position !== index).map((game) => game.join('-')))
  const capacity = combinations(candidates(selection).length, 6 - selection.fixed.length)
  if (capacity <= existing.size) throw new LotteryError('다른 조합을 만들 수 없습니다. 고정·제외 조건을 바꿔 주세요.')
  for (let attempt = 0; attempt < 10_000; attempt += 1) {
    const game = generateLottoNumbers(selection)
    if (!existing.has(game.join('-'))) return game
  }
  throw new LotteryError('번호 생성에 실패했습니다. 다시 시도해 주세요.')
}

export const formatLotto = (numbers: readonly number[]) => numbers.map((number) => String(number).padStart(2, '0')).join(', ')
