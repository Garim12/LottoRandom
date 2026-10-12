import { describe, expect, it } from 'vitest'
import data from '../data/pension-history.json'
import { validatePensionHistory, type PensionDraw } from './pensionHistory'
import { PENSION_STRATEGIES, pensionStrategyPlan, summarizePensionHistory, trainPensionModel } from './pensionStrategies'
import { analyzePensionNumber, defaultPensionFilters, generatePensionDigits, generatePensionNumber, generatePensionSet, generatePensionSpread, regenerateGroup } from './pension'
import type { PensionOptions } from '../types/lottery'

const history = validatePensionHistory(data)
const custom = { ml: 4, frequency: 2, gap: 2, fibonacci: 0 }
const fixture = (count = 100): PensionDraw[] => Array.from({ length: count }, (_, i) => ({
  round: i + 1, date: new Date(Date.UTC(2020, 4, 7 + i * 7)).toISOString().slice(0, 10), group: 2, number: '003817',
}))

describe('pension analysis and ten strategies', () => {
  it('validates complete official history without stripping leading zeroes or repeated digits', () => {
    expect(history.draws[0]!.round).toBe(1)
    expect(history.draws[history.draws.length - 1]!.round).toBe(history.draws.length)
    expect(history.draws.some((draw) => draw.number.startsWith('0'))).toBe(true)
    const base = { ...history, draws: fixture() }
    expect(validatePensionHistory(base).draws[0]!.number).toBe('003817')
    for (const invalid of [{ round: 1 }, { date: '2020-02-31' }, { number: 3817 }, { number: '03817' }, { group: 0 }, { group: 6 }]) {
      expect(() => validatePensionHistory({ ...base, draws: base.draws.map((draw, i) => i === 1 ? { ...draw, ...invalid } : draw) })).toThrow()
    }
    for (const invalid of [null, {}, { ...base, source: 'unknown' }, { ...base, retrievedAt: '' }, { ...base, draws: fixture(59) }]) expect(() => validatePensionHistory(invalid)).toThrow()
  })
  it('counts ordered digits, zero parity and position-specific history accurately', () => {
    expect(analyzePensionNumber('001122')).toEqual({ sum: 6, odd: 2, even: 4, unique: 3, maxRepeat: 2, ranges: [6, 0, 0], fibonacci: 4 })
    const draws = fixture()
    draws[99] = { ...draws[99]!, group: 5, number: '999999' }
    const stats = summarizePensionHistory(draws)
    expect(stats.frequency[0]).toEqual([0, 99, 0, 0, 1])
    expect(stats.frequency[1]).toEqual([99, 0, 0, 0, 0, 0, 0, 0, 0, 1])
    expect(stats.gaps[1]).toEqual([1, 100, 100, 100, 100, 100, 100, 100, 100, 0])
    expect(stats.pattern).toEqual({ oddCount: 3, uniqueCount: 5 })
    expect([stats.sumMin, stats.sumMax]).toEqual([19, 19])
    for (const invalid of ['12345', '1234567', 'abcdef', '１２３４５６']) expect(() => analyzePensionNumber(invalid)).toThrow()
  })
  it('runs all ten strategies in every purchase mode and history window', () => {
    expect(PENSION_STRATEGIES).toHaveLength(10)
    for (const window of [100, 300, history.draws.length]) {
      const draws = history.draws.slice(-window)
      const stats = summarizePensionHistory(draws)
      const model = trainPensionModel(draws)
      for (const { id } of PENSION_STRATEGIES) {
        const plan = pensionStrategyPlan(id, stats, model, custom)
        const single = generatePensionNumber(plan)
        const set = generatePensionSet(plan)
        const spread = generatePensionSpread(plan)
        expect(set.tickets.map((ticket) => ticket.group)).toEqual([1, 2, 3, 4, 5])
        expect(set.tickets.every((ticket) => ticket.number === set.number)).toBe(true)
        expect(new Set(spread.map((ticket) => ticket.number[5])).size).toBe(5)
        for (const ticket of [single, ...set.tickets, ...spread]) {
          expect(ticket.group).toBeGreaterThanOrEqual(1)
          expect(ticket.group).toBeLessThanOrEqual(5)
          expect(ticket.number).toMatch(/^\d{6}$/)
          const info = analyzePensionNumber(ticket.number)
          if (id === 'ranges') expect(info.ranges).toEqual([2, 2, 2])
          if (id === 'similarity') expect(info.odd).toBe(stats.oddCount)
          if (id === 'pattern') { expect(info.odd).toBe(stats.pattern.oddCount); expect(info.unique).toBe(stats.pattern.uniqueCount) }
          if (id === 'fibonacci') expect(info.fibonacci).toBe(3)
          if (id === 'sum') expect(info.sum >= stats.sumMin && info.sum <= stats.sumMax).toBe(true)
        }
        const groupOnly = regenerateGroup(single, plan)
        expect(groupOnly.number).toBe(single.number)
        expect(groupOnly.group).not.toBe(single.group)
      }
    }
  })
  it('applies fixed/excluded digits and filters including rare endpoints, and rejects impossible spread capacity', () => {
    const options: PensionOptions = { group: 3, fixedDigits: [0, null, null, null, null, null], excludedDigits: [9],
      filters: { sumMin: 18, sumMax: 36, oddCount: 3, maxRepeat: 2, minRanges: 3 } }
    for (let i = 0; i < 30; i += 1) {
      for (const ticket of [generatePensionNumber(options), ...generatePensionSpread(options)]) {
        expect(ticket.group).toBe(3)
        expect(ticket.number.startsWith('0') && !ticket.number.includes('9')).toBe(true)
        const info = analyzePensionNumber(ticket.number)
        expect(info.sum >= 18 && info.sum <= 36).toBe(true)
        expect(info.odd).toBe(3)
        expect(info.maxRepeat).toBeLessThanOrEqual(2)
        expect(info.ranges.every((count) => count > 0)).toBe(true)
      }
    }
    expect(generatePensionDigits({ filters: { ...defaultPensionFilters(), sumMin: 0, sumMax: 0 } })).toBe('000000')
    expect(generatePensionDigits({ filters: { ...defaultPensionFilters(), sumMin: 54, sumMax: 54 } })).toBe('999999')
    expect(generatePensionDigits({ fixedDigits: [0, 0, 1, 1, 2, 2] })).toBe('001122')
    expect(() => generatePensionSpread({ fixedDigits: [null, null, null, null, null, 0] })).toThrow('끝자리')
    expect(() => generatePensionSpread({ excludedDigits: [0, 1, 2, 3, 4, 5] })).toThrow('끝자리')
    expect(() => generatePensionDigits({ fixedDigits: [0, null, null, null, null, null], excludedDigits: [0] })).toThrow('고정과 제외')
    expect(() => generatePensionSet({ group: 3 })).toThrow('조 고정')
    expect(() => regenerateGroup({ group: 3, number: '123456' }, { group: 3 })).toThrow('조 고정')
  })
  it('learns transitions and keeps holdout targets out of evaluation training', () => {
    const draws = fixture()
    const learned = trainPensionModel(draws)
    expect(learned.validation.trainingEnd).toBe(80)
    expect(learned.validation.firstRound).toBe(81)
    expect(learned.validation.count).toBe(20)
    expect(learned.validation.meanMatches).toBe(6)
    expect(learned.validation.groupMatches).toBe(20)
    expect(learned.digitWeights[0]![0]).toBeGreaterThan(learned.digitWeights[0]![9]!)
    const changed = draws.map((draw) => draw.round > 80 ? { ...draw, group: 5, number: '999999' } : draw)
    expect(trainPensionModel(changed).validation.transitions).toEqual(learned.validation.transitions)
    for (const row of [learned.groupWeights, ...learned.digitWeights]) {
      expect(row.every((n) => n > 0 && n < 1)).toBe(true)
      expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1)
    }
    expect(() => trainPensionModel(fixture(59))).toThrow()
  })
  it('applies custom weights and rejects invalid user inputs before generation', () => {
    const draws = fixture()
    const stats = summarizePensionHistory(draws)
    const model = trainPensionModel(draws)
    const plan = pensionStrategyPlan('custom', stats, model, { ml: 0, frequency: 0, gap: 0, fibonacci: 1 })
    expect(plan.groupWeights).toEqual([1, 1, 1, 1, 1])
    expect(plan.digitWeights![0]![1]).toBeCloseTo(1.05)
    expect(plan.digitWeights![0]![0]).toBeCloseTo(0.05)
    for (const invalid of [{ ...custom, ml: NaN }, { ...custom, ml: -1 }, { ...custom, ml: 11 }, { ml: 0, frequency: 0, gap: 0, fibonacci: 0 }]) expect(() => pensionStrategyPlan('custom', stats, model, invalid)).toThrow('가중치')
    for (const invalid of [{ sumMin: NaN }, { sumMin: -1 }, { sumMax: 55 }, { sumMin: 40, sumMax: 30 }, { oddCount: 7 }, { maxRepeat: 0 }, { minRanges: 4 }]) expect(() => generatePensionDigits({ filters: { ...defaultPensionFilters(), ...invalid } })).toThrow()
    for (const invalid of [{ group: 0 }, { fixedDigits: [0] }, { excludedDigits: [0, 0] }, { groupWeights: [1] }, { digitWeights: Array.from({ length: 6 }, () => Array(10).fill(0)) }, { rangeCounts: [1, 1, 1] }, { uniqueCount: 7 }, { fibonacciCount: -1 }]) expect(() => generatePensionDigits(invalid)).toThrow()
    expect(() => generatePensionDigits({ filters: { ...defaultPensionFilters(), sumMin: 1, sumMax: 1, oddCount: 0 } })).toThrow('홀짝')
  })
})
