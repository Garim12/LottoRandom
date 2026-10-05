import { describe, expect, it } from 'vitest'
import historyData from '../data/lotto-history.json'
import { validateHistory, type LottoDraw } from './lottoHistory'
import { generateLottoGames, regenerateLottoGame, analyzeLottoNumbers } from './lotto'
import { FIBONACCI, STRATEGIES, strategyPlan, summarizeHistory, trainLottoModel } from './lottoStrategies'

const history = validateHistory(historyData)
const draws = history.draws.slice(-100)
const stats = summarizeHistory(draws)
const weights = { ml: 4, frequency: 2, gap: 2, fibonacci: 0 }
const model = trainLottoModel(draws)
const fixture = (size: number): LottoDraw[] => Array.from({ length: size }, (_, i) => ({
  round: i + 1, date: new Date(Date.UTC(2020, 0, 4 + i * 7)).toISOString().slice(0, 10), numbers: [1, 2, 3, 4, 5, 6],
}))

describe('ten lotto strategies', () => {
  it('validates the official snapshot and rejects corrupt or discontinuous histories', () => {
    expect(history.draws[0]!.round).toBe(1)
    expect(history.draws[history.draws.length - 1]!.round).toBe(history.draws.length)
    expect(history.draws[0]!.numbers).toEqual([10, 23, 29, 33, 37, 40])
    const base = { ...history, draws: fixture(60) }
    expect(validateHistory(base).draws).toHaveLength(60)
    for (const override of [{ round: 1 }, { date: '2020-02-31' }, { numbers: [1, 1, 2, 3, 4, 5] }, { numbers: [0, 2, 3, 4, 5, 6] }]) {
      const broken = { ...base, draws: base.draws.map((draw, i) => i === 1 ? { ...draw, ...override } : draw) }
      expect(() => validateHistory(broken)).toThrow()
    }
    for (const broken of [null, {}, { ...base, source: 'unknown' }, { ...base, draws: base.draws.slice(0, 59) }, { ...base, retrievedAt: '' }]) {
      expect(() => validateHistory(broken)).toThrow()
    }
  })
  it('calculates known frequencies, period-censored gaps, modal patterns and empirical sums', () => {
    const known = fixture(100)
    known[99] = { ...known[99]!, numbers: [7, 8, 9, 10, 11, 12] }
    const summary = summarizeHistory(known)
    expect(summary.frequency.slice(0, 7)).toEqual([99, 99, 99, 99, 99, 99, 1])
    expect(summary.gaps.slice(0, 13)).toEqual([1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 100])
    expect(summary.pattern).toEqual({ oddCount: 3, lowCount: 6, maxConsecutive: 6 })
    expect([summary.sumMin, summary.sumMax]).toEqual([21, 21])
  })
  it('executes all ten strategies, respects fixed/excluded numbers and regenerates without sibling duplicates', () => {
    expect(STRATEGIES).toHaveLength(10)
    for (const { id } of STRATEGIES) {
      const plan = strategyPlan(id, stats, model, weights)
      const selection = { fixed: [7], excluded: [45] }
      const games = generateLottoGames(5, selection, false, plan.filters, plan.rules)
      games[0] = regenerateLottoGame(games, 0, selection, false, plan.filters, plan.rules)
      expect(new Set(games.map((game) => game.join('-'))).size).toBe(5)
      for (const game of games) {
        expect(game).toHaveLength(6)
        expect(game).toContain(7)
        expect(game).not.toContain(45)
        expect(new Set(game).size).toBe(6)
        const info = analyzeLottoNumbers(game)
        if (id === 'frequency') for (const start of [0, 15, 30]) expect(game.filter((number) => stats.ordered.slice(start, start + 15).includes(number))).toHaveLength(2)
        if (id === 'ranges') expect(info.ranges.every((count) => count >= 1)).toBe(true)
        if (id === 'similarity') expect(info.odd).toBe(stats.oddCount)
        if (id === 'pattern') {
          expect(info.odd).toBe(stats.pattern.oddCount)
          expect(game.filter((number) => number <= 22)).toHaveLength(stats.pattern.lowCount)
          expect(info.longestRun).toBeLessThanOrEqual(stats.pattern.maxConsecutive)
        }
        if (id === 'fibonacci') expect(game.filter((number) => FIBONACCI.includes(number))).toHaveLength(2)
        if (id === 'sum') expect(info.sum >= stats.sumMin && info.sum <= stats.sumMax).toBe(true)
      }
    }
  })
  it('trains a real model and separates holdout targets from fitted evaluation weights', () => {
    const known = fixture(100)
    const learned = trainLottoModel(known)
    expect(learned.validation.trainingEnd).toBe(84)
    expect(learned.validation.firstRound).toBe(85)
    expect(learned.validation.count).toBe(16)
    expect(learned.validation.meanMatches).toBe(6)
    expect(learned.scores[0]!).toBeGreaterThan(learned.scores[44]!)
    expect(learned.weights.some((weight, i) => i > 0 && weight !== 0)).toBe(true)
    const changed = known.map((draw) => draw.round > 84 ? { ...draw, numbers: [40, 41, 42, 43, 44, 45] } : draw)
    expect(trainLottoModel(changed).validation.weights).toEqual(learned.validation.weights)
    expect(model.scores.every((score) => Number.isFinite(score) && score > 0 && score < 1)).toBe(true)
    expect(() => trainLottoModel(known.slice(0, 59))).toThrow()
  })
  it('uses actual gap/model weights and adjustable mixtures, and rejects invalid or conflicting rules', () => {
    expect(strategyPlan('gap', stats, null, weights).rules!.weights).toEqual(stats.gaps.map((gap) => gap + 1))
    expect(strategyPlan('ml', stats, model, weights).rules!.weights).toEqual(model.scores)
    const custom = strategyPlan('custom', stats, model, { ml: 0, frequency: 0, gap: 0, fibonacci: 1 }).rules!.weights!
    expect(custom[0]).toBeCloseTo(1.05)
    expect(custom[3]).toBeCloseTo(0.05)
    for (const invalid of [{ ml: 0, frequency: 0, gap: 0, fibonacci: 0 }, { ...weights, ml: NaN }, { ...weights, gap: -1 }, { ...weights, ml: 11 }]) {
      expect(() => strategyPlan('custom', stats, model, invalid)).toThrow('가중치')
    }
    expect(() => strategyPlan('ml', stats, null, weights)).toThrow()
    const plan = strategyPlan('fibonacci', stats, null, weights)
    expect(() => generateLottoGames(1, { fixed: [1, 2, 3], excluded: [] }, false, plan.filters, plan.rules)).toThrow('조건')
    expect(() => generateLottoGames(1, undefined, false, undefined, { weights: [1] })).toThrow()
    expect(() => generateLottoGames(1, undefined, false, undefined, { weights: Array(45).fill(0) })).toThrow()
    expect(() => generateLottoGames(1, undefined, false, undefined, { quotas: [{ numbers: [1, 1], count: 1 }] })).toThrow()
  })
})
