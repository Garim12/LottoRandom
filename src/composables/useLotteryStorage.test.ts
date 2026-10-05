import { describe, expect, it, vi } from 'vitest'
import { createPensionSpreadEntry, parseLotteryStore, useLotteryStorage } from './useLotteryStorage'

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
  it('round-trips spread bundles alongside existing data and rejects damaged bundles', () => {
    const tickets = Array.from({ length: 5 }, (_, i) => ({ group: i + 1, number: `00000${i}` }))
    const entry = createPensionSpreadEntry(tickets)
    const legacy = { id: 'old', type: 'pension', mode: 'set', createdAt: '2026-01-01', number: '003817' }
    const favorites = [entry, legacy]
    expect(parseLotteryStore(JSON.parse(JSON.stringify({ version: 1, favorites, history: [entry] })))).toEqual({ version: 1, favorites, history: [entry] })
    const invalid = [null, tickets.slice(1), [...tickets.slice(0, 4), tickets[0]],
      [...tickets.slice(0, 4), { group: 6, number: '123459' }],
      [...tickets.slice(0, 4), { group: 2, number: '12345' }],
      [...tickets.slice(0, 4), null]]
    expect(parseLotteryStore({ version: 1, favorites: invalid.map((tickets) => ({ ...entry, tickets })), history: [] }).favorites).toEqual([])
    tickets[0]!.number = '999999'
    expect(entry.type === 'pension' && entry.mode === 'spread' && entry.tickets[0]!.number).toBe('000000')
  })
  it('deduplicates reordered spread bundles and restores saved data', () => {
    let saved: string | null = null
    vi.stubGlobal('localStorage', { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value } })
    try {
      const tickets = Array.from({ length: 5 }, (_, i) => ({ group: 3, number: `00000${i}` }))
      const entry = createPensionSpreadEntry(tickets)
      const storage = useLotteryStorage()
      expect(storage.save(entry)).toBe(true)
      expect(storage.save(createPensionSpreadEntry([...tickets].reverse()))).toBe(false)
      storage.remember(entry)
      const restored = useLotteryStorage()
      expect(restored.favorites.value).toEqual([entry])
      expect(restored.history.value).toEqual([entry])
    } finally { vi.unstubAllGlobals() }
  })
})
