import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ files: new Map(), output: '', summary: '', failure: null, restoreFailure: false, writes: 0 }))
const name = (url) => new URL(url).pathname.split('/').at(-1)
vi.mock('node:fs/promises', () => ({
  mkdir: async () => {},
  readFile: async (url) => Buffer.from(state.files.get(name(url))),
  writeFile: async (url, data) => {
    if (state.restoreFailure && ++state.writes > 1) throw new Error('disk full')
    state.files.set(name(url), Buffer.from(data))
  },
  rename: async (temporary, target) => {
    state.files.set(name(target), state.files.get(name(temporary)))
    state.files.delete(name(temporary))
  },
  appendFile: async (path, text) => { state[path] += text },
}))
vi.mock('node:timers/promises', () => ({ setTimeout: async () => {} }))

const draw = (round) => ({ round, date: new Date(Date.UTC(2024, 0, 1 + (round - 1) * 7)).toISOString().slice(0, 10) })
const lottoDraws = Array.from({ length: 61 }, (_, i) => ({ ...draw(i + 1), numbers: [1, 2, 3, 4, 5, 6] }))
const pensionDraws = Array.from({ length: 61 }, (_, i) => ({ ...draw(i + 1), group: 1, number: '001122' }))
const originalLotto = Buffer.from(JSON.stringify({ source: 'https://www.dhlottery.co.kr/lt645/result', retrievedAt: '2025-01-01T00:00:00.000Z', draws: lottoDraws.slice(0, 60) }) + '\r\n')
const originalPension = Buffer.from(JSON.stringify({ source: 'https://www.dhlottery.co.kr/pt720/result', retrievedAt: '2025-01-01T00:00:00.000Z', draws: pensionDraws.slice(0, 60) }) + '\n')
beforeEach(() => {
  vi.resetModules()
  state.files = new Map([['lotto-history.json', originalLotto], ['pension-history.json', originalPension]])
  state.output = ''; state.summary = ''; state.failure = null; state.restoreFailure = false; state.writes = 0
  vi.stubGlobal('fetch', async (url) => {
    const path = new URL(url).pathname
    if (path.startsWith('/pt720') && state.failure === 'maintenance') {
      return new Response('<title>시스템 점검 페이지</title>', { headers: { 'content-type': 'text/html' } })
    }
    if (path.endsWith('/result')) return new Response('<input id="opt_val" value="61">')
    if (path.startsWith('/lt645')) return Response.json({ data: { list: lottoDraws.slice(-2).map((entry) => ({
      ltEpsd: entry.round, ltRflYmd: entry.date.replaceAll('-', ''),
      ...Object.fromEntries(entry.numbers.map((number, i) => [`tm${i + 1}WnNo`, number])),
    })) } })
    return Response.json({ data: { result: pensionDraws.map((entry) => ({ psltEpsd: entry.round,
      psltRflYmd: entry.date.replaceAll('-', ''), wnBndNo: state.failure === 'invalid' ? '0' : String(entry.group), wnRnkVl: entry.number,
    })) } })
  })
  vi.stubEnv('GITHUB_OUTPUT', 'output')
  vi.stubEnv('GITHUB_STEP_SUMMARY', 'summary')
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe('updating both histories', () => {
  it('restores both original files if pension maintenance follows a lotto update', async () => {
    state.failure = 'maintenance'
    await import('./update-histories.mjs')
    expect(state.files.get('lotto-history.json')).toEqual(originalLotto)
    expect(state.files.get('pension-history.json')).toEqual(originalPension)
    expect(state.output).toBe('deferred=true\n')
    expect(state.summary).toContain('점검')
  })

  it('keeps successful updates available for commit and deployment', async () => {
    await import('./update-histories.mjs')
    expect(JSON.parse(state.files.get('lotto-history.json')).draws).toEqual(lottoDraws)
    expect(JSON.parse(state.files.get('pension-history.json')).draws).toEqual(pensionDraws)
    expect(state.output).toBe('deferred=false\n')
  })

  it('fails and restores the files for a data validation error', async () => {
    state.failure = 'invalid'
    await expect(import('./update-histories.mjs')).rejects.toThrow('조·번호')
    expect(state.files.get('lotto-history.json')).toEqual(originalLotto)
    expect(state.files.get('pension-history.json')).toEqual(originalPension)
    expect(state.output).toBe('')
  })

  it('fails instead of reporting deferral if restoring the files fails', async () => {
    state.failure = 'maintenance'
    state.restoreFailure = true
    await expect(import('./update-histories.mjs')).rejects.toThrow('disk full')
    expect(state.output).toBe('')
  })
})
