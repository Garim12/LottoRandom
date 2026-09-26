import { describe, expect, it } from 'vitest'
import { generateLottoGames, generateLottoNumbers, regenerateLottoGame, validateSelection } from './lotto'

describe('lotto 6/45', () => {
  it('generates six sorted, unique, in-range numbers across 1000 draws', () => {
    for (let i = 0; i < 1000; i += 1) {
      const numbers = generateLottoNumbers()
      expect(numbers).toHaveLength(6)
      expect(new Set(numbers).size).toBe(6)
      expect(numbers.every((number) => number >= 1 && number <= 45)).toBe(true)
      expect(numbers).toEqual([...numbers].sort((a, b) => a - b))
    }
  })
  it('includes fixed numbers and omits excluded numbers', () => {
    const selection = { fixed: [7, 15], excluded: [1, 2, 3, 4, 5] }
    for (let i = 0; i < 500; i += 1) {
      const numbers = generateLottoNumbers(selection)
      expect(numbers).toContain(7)
      expect(numbers).toContain(15)
      expect(numbers.some((number) => selection.excluded.includes(number))).toBe(false)
    }
  })
  it('creates distinct full combinations and regenerates individually', () => {
    for (const count of [1, 3, 5] as const) {
      const games = generateLottoGames(count, { fixed: [7], excluded: [45] })
      expect(games).toHaveLength(count)
      expect(new Set(games.map((game) => game.join('-'))).size).toBe(count)
      const replacement = regenerateLottoGame(games, 0, { fixed: [7], excluded: [45] })
      expect(games.slice(1).some((game) => game.join('-') === replacement.join('-'))).toBe(false)
    }
  })
  it('rejects conflicts, duplicates, invalid values and impossible combinations', () => {
    expect(() => validateSelection({ fixed: [1, 1], excluded: [] })).toThrow()
    expect(() => validateSelection({ fixed: [0], excluded: [] })).toThrow()
    expect(() => validateSelection({ fixed: [1], excluded: [1] })).toThrow()
    expect(() => validateSelection({ fixed: [1, 2, 3, 4, 5, 6, 7], excluded: [] })).toThrow()
    expect(() => validateSelection({ fixed: [], excluded: Array.from({ length: 40 }, (_, i) => i + 1) })).toThrow()
    expect(() => generateLottoGames(3, { fixed: [1, 2, 3, 4, 5, 6], excluded: [] })).toThrow()
  })
})
