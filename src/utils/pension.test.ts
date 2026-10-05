import { describe, expect, it, vi } from 'vitest'
import { formatPension, generatePensionDigits, generatePensionNumber, generatePensionSet, generatePensionSpread, regenerateGroup } from './pension'
import * as random from './random'

describe('pension 720+', () => {
  it('keeps a six-character number and valid group across 1000 draws', () => {
    for (let i = 0; i < 1000; i += 1) {
      const ticket = generatePensionNumber()
      expect(ticket.group).toBeGreaterThanOrEqual(1)
      expect(ticket.group).toBeLessThanOrEqual(5)
      expect(ticket.number).toMatch(/^\d{6}$/)
      expect(formatPension(ticket)).toMatch(/^[1-5]조 \d{6}$/)
    }
    expect(generatePensionDigits()).toMatch(/^\d{6}$/)
    expect(formatPension({ group: 3, number: '081527' })).toBe('3조 081527')
  })
  it('uses the same digits in each of the five groups', () => {
    for (let i = 0; i < 100; i += 1) {
      const set = generatePensionSet()
      expect(set.tickets.map((ticket) => ticket.group)).toEqual([1, 2, 3, 4, 5])
      expect(set.tickets.every((ticket) => ticket.number === set.number)).toBe(true)
    }
  })
  it('regenerates only the group', () => {
    const original = { group: 3, number: '003817' }
    const next = regenerateGroup(original)
    expect(next.group).not.toBe(3)
    expect(next.number).toBe(original.number)
  })
  it('creates five valid tickets with distinct last digits, including leading zeroes', () => {
    for (let i = 0; i < 100; i += 1) {
      const tickets = generatePensionSpread()
      expect(tickets).toHaveLength(5)
      expect(new Set(tickets.map((ticket) => ticket.number.slice(-1))).size).toBe(5)
      expect(tickets.every((ticket) => /^[1-5]조 \d{6}$/.test(formatPension(ticket)))).toBe(true)
    }
    const integer = vi.spyOn(random, 'randomInt').mockImplementation((min) => min)
    try {
      expect(generatePensionSpread().every((ticket) => /^00000\d$/.test(ticket.number))).toBe(true)
    } finally { integer.mockRestore() }
  })
})
