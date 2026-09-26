import { computed } from 'vue'
import { useLocalStorage } from './useLocalStorage'
import { randomId } from '../utils/random'
import type { LotteryStore, PensionTicket, StoredLottery } from '../types/lottery'

const KEY = 'lotto-random:v1'
const empty = (): LotteryStore => ({ version: 1, favorites: [], history: [] })

function validEntry(value: unknown): value is StoredLottery {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  if (typeof item.id !== 'string' || typeof item.createdAt !== 'string') return false
  if (item.type === 'lotto') {
    const numbers = item.numbers
    return Array.isArray(numbers) && numbers.length === 6 && new Set(numbers).size === 6 &&
      numbers.every((number) => Number.isInteger(number) && number >= 1 && number <= 45) &&
      numbers.every((number, index) => index === 0 || number > numbers[index - 1])
  }
  if (item.type === 'pension') {
    if (item.mode === 'set') return typeof item.number === 'string' && /^\d{6}$/.test(item.number)
    if (item.mode === 'single' && item.ticket && typeof item.ticket === 'object') {
      const ticket = item.ticket as Record<string, unknown>
      return Number.isInteger(ticket.group) && Number(ticket.group) >= 1 && Number(ticket.group) <= 5 &&
        typeof ticket.number === 'string' && /^\d{6}$/.test(ticket.number)
    }
  }
  return false
}

export function parseLotteryStore(value: unknown): LotteryStore {
  if (!value || typeof value !== 'object') return empty()
  const store = value as Record<string, unknown>
  if (store.version !== 1 || !Array.isArray(store.favorites) || !Array.isArray(store.history)) return empty()
  return {
    version: 1,
    favorites: store.favorites.filter(validEntry).slice(0, 200),
    history: store.history.filter(validEntry).slice(0, 30),
  }
}

export const createLottoEntry = (numbers: number[]): StoredLottery => ({
  id: randomId(), type: 'lotto', createdAt: new Date().toISOString(), numbers: [...numbers],
})
export const createPensionEntry = (ticket: PensionTicket): StoredLottery => ({
  id: randomId(), type: 'pension', mode: 'single', createdAt: new Date().toISOString(),
  ticket: { ...ticket },
})
export const createPensionSetEntry = (number: string): StoredLottery => ({
  id: randomId(), type: 'pension', mode: 'set', createdAt: new Date().toISOString(), number,
})

function signature(item: StoredLottery): string {
  if (item.type === 'lotto') return `lotto:${item.numbers.join('-')}`
  return item.mode === 'set' ? `set:${item.number}` : `single:${item.ticket.group}:${item.ticket.number}`
}

export function useLotteryStorage() {
  const store = useLocalStorage(KEY, empty(), parseLotteryStore)
  const favorites = computed(() => store.value.favorites)
  const history = computed(() => store.value.history)

  function save(item: StoredLottery): boolean {
    if (store.value.favorites.some((current) => signature(current) === signature(item))) return false
    store.value.favorites.unshift(item)
    store.value.favorites.splice(200)
    return true
  }
  function remember(item: StoredLottery): void {
    store.value.history.unshift(item)
    store.value.history.splice(30)
  }
  function removeFavorite(id: string): void {
    store.value.favorites = store.value.favorites.filter((item) => item.id !== id)
  }
  function clearFavorites(): void { store.value.favorites = [] }
  function clearHistory(): void { store.value.history = [] }
  return { store, favorites, history, save, remember, removeFavorite, clearFavorites, clearHistory }
}
