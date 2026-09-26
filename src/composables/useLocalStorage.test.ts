import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLocalStorage } from './useLocalStorage'

afterEach(() => vi.unstubAllGlobals())

describe('safe localStorage binding', () => {
  it('uses a fallback when saved JSON is damaged', () => {
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { getItem: () => '{broken', setItem })
    const state = useLocalStorage('test', { version: 1 }, (value) => value as { version: number })
    expect(state.value).toEqual({ version: 1 })
    state.value = { version: 2 }
    expect(setItem).toHaveBeenCalledWith('test', '{"version":2}')
  })
  it('stays usable when browser storage is unavailable', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
    const state = useLocalStorage('test', 1, (value) => Number(value))
    state.value = 2
    expect(state.value).toBe(2)
  })
})
