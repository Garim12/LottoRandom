import { describe, expect, it, vi } from 'vitest'
import { randomInt, sample, shuffle } from './random'

describe('Web Crypto random helpers', () => {
  it('returns values within inclusive bounds', () => {
    for (let i = 0; i < 1000; i += 1) expect(randomInt(3, 12)).toBeGreaterThanOrEqual(3)
    for (let i = 0; i < 1000; i += 1) expect(randomInt(3, 12)).toBeLessThanOrEqual(12)
    expect(randomInt(7, 7)).toBe(7)
  })
  it('rejects out-of-range values instead of applying biased modulo', () => {
    const original = crypto.getRandomValues.bind(crypto)
    const values = [0xffff_ffff, 5]
    const spy = vi.spyOn(crypto, 'getRandomValues').mockImplementation(((array: Uint32Array) => {
      array[0] = values.shift()!
      return array
    }) as typeof crypto.getRandomValues)
    try {
      expect(randomInt(0, 9)).toBe(5)
      expect(spy).toHaveBeenCalledTimes(2)
    } finally {
      spy.mockRestore()
      void original
    }
  })
  it('samples without changing its input', () => {
    const input = [1, 2, 3, 4, 5]
    expect(new Set(shuffle(input))).toEqual(new Set(input))
    expect(new Set(sample(input, 3)).size).toBe(3)
    expect(input).toEqual([1, 2, 3, 4, 5])
    expect(() => sample(input, 6)).toThrow()
  })
})
