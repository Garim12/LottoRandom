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
  it('spreads games and individual replacements while respecting fixed and excluded numbers', () => {
    for (let i = 0; i < 100; i += 1) {
      expect(new Set(generateLottoGames(5, undefined, true).flat()).size).toBe(30)
      const selection = { fixed: [7, 15], excluded: [1, 2, 3, 45] }
      for (const count of [1, 3, 5] as const) {
        const games = generateLottoGames(count, selection, true)
        games[0] = regenerateLottoGame(games, 0, selection, true)
        expect(new Set(games.flat()).size).toBe(2 + count * 4)
        for (const game of games) {
          expect(game).toHaveLength(6)
          expect(new Set(game).size).toBe(6)
          expect(game).toEqual([...game].sort((a, b) => a - b))
          expect(game).toEqual(expect.arrayContaining(selection.fixed))
          expect(game.some((number) => selection.excluded.includes(number))).toBe(false)
        }
      }
    }
  })
  it('keeps constrained spread games distinct even when numbers must overlap', () => {
    const selection = { fixed: [1, 2, 3, 4], excluded: Array.from({ length: 38 }, (_, i) => i + 8) }
    const games = generateLottoGames(3, selection, true)
    expect(new Set(games.map((game) => game.join('-'))).size).toBe(3)
    expect(games.flat().every((number) => number >= 1 && number <= 7)).toBe(true)
    expect(regenerateLottoGame(games, 0, selection, true)).toEqual(games[0])
    expect(() => generateLottoGames(5, selection, true)).toThrow()
    const fixed = { fixed: [1, 2, 3, 4, 5, 6], excluded: [] }
    expect(generateLottoGames(1, fixed, true)).toEqual([fixed.fixed])
    expect(() => generateLottoGames(3, fixed, true)).toThrow()
  })
  it('allows a newly fixed combination when the other games do not satisfy the new conditions', () => {
    const games = [[1, 2, 3, 4, 5, 6], [10, 11, 12, 13, 14, 15], [20, 21, 22, 23, 24, 25]]
    const selection = { fixed: [1, 2, 3, 4, 5, 6], excluded: [] }
    for (const spread of [false, true]) {
      expect(regenerateLottoGame(games, 0, selection, spread)).toEqual(selection.fixed)
      expect(() => regenerateLottoGame(games, 0.5, selection, spread)).toThrow()
    }
  })
})
