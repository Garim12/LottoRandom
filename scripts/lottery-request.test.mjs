import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setTimeout as wait } from 'node:timers/promises'
import { readLotteryResponse } from './lottery-request.mjs'

vi.mock('node:timers/promises', () => ({ setTimeout: vi.fn() }))
const source = 'https://www.dhlottery.co.kr/lt645/result'
const url = new URL('/lt645/selectPstLt645InfoNew.do', source)
const parse = (response) => response.json()
let request

beforeEach(() => {
  vi.clearAllMocks()
  request = vi.fn()
  vi.stubGlobal('fetch', request)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('official lottery requests', () => {
  it('recovers from network and server failures with bounded delays', async () => {
    request.mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
      .mockResolvedValueOnce(Response.json({ data: { list: [] } }))
    await expect(readLotteryResponse(url, source, parse)).resolves.toEqual({ data: { list: [] } })
    expect(request).toHaveBeenCalledTimes(3)
    expect(wait.mock.calls).toEqual([[5_000], [10_000]])
    expect(request.mock.calls[2][1].headers.requestMenuUri).toBe('/lt645/result')
  })

  it('retries an HTTP 200 HTML page where JSON was expected', async () => {
    request.mockResolvedValueOnce(new Response('<html>Temporary error</html>'))
      .mockResolvedValueOnce(Response.json({ data: { list: [1] } }))
    await expect(readLotteryResponse(url, source, parse)).resolves.toEqual({ data: { list: [1] } })
    expect(wait).toHaveBeenCalledExactlyOnceWith(5_000)
  })

  it('retries an interrupted body read after receiving response headers', async () => {
    const response = new Response()
    vi.spyOn(response, 'json').mockRejectedValueOnce(new TypeError('terminated'))
    request.mockResolvedValueOnce(response).mockResolvedValueOnce(Response.json({ recovered: true }))
    await expect(readLotteryResponse(url, source, parse)).resolves.toEqual({ recovered: true })
    expect(wait).toHaveBeenCalledExactlyOnceWith(5_000)
  })

  it.each([403, 404, 429])('does not repeat a rejected request with HTTP %s', async (status) => {
    request.mockResolvedValueOnce(new Response('rejected', { status }))
    await expect(readLotteryResponse(url, source, parse)).rejects.toThrow(`HTTP ${status}, 시도 1/3`)
    expect(request).toHaveBeenCalledTimes(1)
    expect(wait).not.toHaveBeenCalled()
  })
})
