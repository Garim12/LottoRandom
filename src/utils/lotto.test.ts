import { describe, expect, it } from 'vitest'
import { analyzeLottoNumbers, defaultLottoFilters, generateLottoGames, generateLottoNumbers, regenerateLottoGame, validateSelection } from './lotto'

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
  it('analyzes unsorted numbers without mutation and validates analysis input', () => {
    const numbers = [45, 2, 3, 4, 20, 31]
    expect(analyzeLottoNumbers(numbers)).toEqual({ sum: 105, odd: 3, even: 3, longestRun: 3, ranges: [3, 1, 0, 1, 1] })
    expect(numbers).toEqual([45, 2, 3, 4, 20, 31])
    expect(analyzeLottoNumbers([1, 3, 5, 7, 9, 11]).longestRun).toBe(1)
    for (const invalid of [[1, 2, 3], [1, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5], [1, 2, 3, 4, 5, 46]]) {
      expect(() => analyzeLottoNumbers(invalid)).toThrow()
    }
  })
  it('applies every filter to generation and individual regeneration, with optional spread', () => {
    const filters = { sumMin: 100, sumMax: 175, oddCount: 3, maxConsecutive: 2, minRanges: 3 }
    const selection = { fixed: [7], excluded: [1, 45] }
    for (const spread of [false, true]) {
      for (let i = 0; i < 50; i += 1) {
        const games = generateLottoGames(5, selection, spread, filters)
        games[0] = regenerateLottoGame(games, 0, selection, spread, filters)
        expect(new Set(games.map((game) => game.join('-'))).size).toBe(5)
        for (const game of games) {
          const sum = game.reduce((sum, number) => sum + number, 0)
          expect(sum >= 100 && sum <= 175).toBe(true)
          expect(game.filter((number) => number % 2).length).toBe(3)
          expect(game.some((number) => game.includes(number + 1) && game.includes(number + 2))).toBe(false)
          expect(new Set(game.map((number) => Math.floor((number - 1) / 10))).size).toBeGreaterThanOrEqual(3)
          expect(game).toContain(7)
          expect(game.includes(1) || game.includes(45)).toBe(false)
        }
      }
    }
  })
  it('finds rare endpoint combinations and reports insufficient filtered capacity', () => {
    for (const spread of [false, true]) {
      const lowest = { ...defaultLottoFilters(), sumMin: 21, sumMax: 21 }
      const highest = { ...defaultLottoFilters(), sumMin: 255, sumMax: 255 }
      expect(generateLottoGames(1, undefined, spread, lowest)).toEqual([[1, 2, 3, 4, 5, 6]])
      expect(generateLottoGames(1, undefined, spread, highest)).toEqual([[40, 41, 42, 43, 44, 45]])
      expect(() => generateLottoGames(3, undefined, spread, lowest)).toThrow('충분히')
    }
  })
  it('rejects invalid filter values and contradictory fixed/pattern conditions', () => {
    const defaults = defaultLottoFilters()
    for (const invalid of [{ sumMin: 20 }, { sumMax: 256 }, { sumMin: 150, sumMax: 100 }, { sumMin: NaN },
      { sumMin: '' }, { sumMin: 100.5 }, { oddCount: -1 }, { oddCount: 7 }, { maxConsecutive: 0 }, { minRanges: 6 }]) {
      expect(() => generateLottoGames(1, undefined, false, { ...defaults, ...invalid } as typeof defaults)).toThrow()
    }
    expect(() => generateLottoGames(1, undefined, false, { ...defaults, sumMin: 138, sumMax: 138, oddCount: 3 })).toThrow('홀짝')
    expect(() => generateLottoGames(1, { fixed: [1, 2, 3], excluded: [] }, false, { ...defaults, maxConsecutive: 2 })).toThrow('조건')
    expect(() => generateLottoGames(1, { fixed: [1, 3, 5], excluded: [] }, false, { ...defaults, oddCount: 2 })).toThrow('조건')
    expect(() => generateLottoGames(1, { fixed: [], excluded: Array.from({ length: 35 }, (_, i) => i + 11) }, false, { ...defaults, minRanges: 2 })).toThrow('조건')
    expect(() => generateLottoGames(1, undefined, false, { ...defaults, sumMin: 21, sumMax: 21, maxConsecutive: 1 })).toThrow('조건')
  })
  it('matches an independent exhaustive oracle for a small candidate pool', () => {
    const allowed: number[][] = []
    for (let a = 1; a <= 5; a++) for (let b = a + 1; b <= 6; b++) for (let c = b + 1; c <= 7; c++) {
      for (let d = c + 1; d <= 8; d++) for (let e = d + 1; e <= 9; e++) for (let f = e + 1; f <= 10; f++) {
        const game = [a, b, c, d, e, f]
        if (game.reduce((sum, n) => sum + n, 0) <= 35 && game.filter((n) => n % 2).length === 3 &&
          !game.some((n) => game.includes(n + 1) && game.includes(n + 2))) allowed.push(game)
      }
    }
    expect(allowed.length).toBeGreaterThanOrEqual(5)
    const selection = { fixed: [], excluded: Array.from({ length: 35 }, (_, i) => i + 11) }
    const filters = { ...defaultLottoFilters(), sumMax: 35, oddCount: 3, maxConsecutive: 2 }
    for (const spread of [false, true]) {
      const games = generateLottoGames(5, selection, spread, filters)
      games.forEach((game) => expect(allowed).toContainEqual(game))
    }
  })
})
