import { describe, expect, it } from 'vitest'
import { parseLotteryStore } from './useLotteryStorage'

describe('versioned local data', () => {
  it('recovers from unknown versions and malformed entries', () => {
    expect(parseLotteryStore({ version: 99, favorites: [], history: [] })).toEqual({ version: 1, favorites: [], history: [] })
    expect(parseLotteryStore({ version: 1, favorites: [{ type: 'lotto', numbers: [1, 1, 2, 3, 4, 5] }], history: [] }).favorites).toEqual([])
  })
  it('preserves leading zeroes and caps recent history at 30', () => {
    const ticket = { id: 'a', type: 'pension', mode: 'single', createdAt: '2026-01-01', ticket: { group: 3, number: '003817' } }
    const data = parseLotteryStore({ version: 1, favorites: [ticket], history: Array.from({ length: 35 }, (_, i) => ({ ...ticket, id: String(i) })) })
    expect(data.favorites).toHaveLength(1)
    expect(data.history).toHaveLength(30)
    expect(data.favorites[0]?.type === 'pension' && data.favorites[0].mode === 'single' ? data.favorites[0].ticket.number : '').toBe('003817')
  })
})
