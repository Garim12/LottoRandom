import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFile, rename, writeFile } from 'node:fs/promises'

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(), readFile: vi.fn(), rename: vi.fn(), writeFile: vi.fn(),
}))

const games = [
  { name: 'lotto', source: 'lt645', run: () => import('./update-lotto-data.mjs') },
  { name: 'pension', source: 'pt720', run: () => import('./update-pension-data.mjs') },
]

describe.each(games)('$name history updater', ({ name, source, run }) => {
  const draw = (round) => ({
    round,
    date: new Date(Date.UTC(2024, 0, 1 + (round - 1) * 7)).toISOString().slice(0, 10),
    ...(name === 'lotto' ? { numbers: [1, 2, 3, 4, 5, 6] } : { group: 1, number: '001122' }),
  })
  let previous
  let request

  function respond(latest, draws) {
    request.mockResolvedValueOnce(new Response(`<input id="opt_val" value="${latest}">`))
    const rows = draws.map((entry) => name === 'lotto'
      ? { ltEpsd: entry.round, ltRflYmd: entry.date.replaceAll('-', ''),
          ...Object.fromEntries(entry.numbers.map((number, index) => [`tm${index + 1}WnNo`, number])) }
      : { psltEpsd: entry.round, psltRflYmd: entry.date.replaceAll('-', ''),
          wnBndNo: String(entry.group), wnRnkVl: entry.number })
    request.mockResolvedValueOnce(new Response(JSON.stringify({
      data: name === 'lotto' ? { list: rows } : { result: rows },
    })))
  }

  beforeEach(() => {
    vi.resetModules()
    vi.resetAllMocks()
    previous = { source: `https://www.dhlottery.co.kr/${source}/result`,
      retrievedAt: '2025-01-01T00:00:00.000Z', draws: Array.from({ length: 60 }, (_, i) => draw(i + 1)) }
    readFile.mockResolvedValue(JSON.stringify(previous))
    request = vi.fn()
    vi.stubGlobal('fetch', request)
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('does not rewrite data or the collection timestamp when unchanged', async () => {
    respond(60, previous.draws)
    await run()
    expect(writeFile).not.toHaveBeenCalled()
    expect(rename).not.toHaveBeenCalled()
  })

  it('validates and atomically saves new rounds, preserving existing numbers', async () => {
    const draws = [...previous.draws, draw(61), draw(62)]
    respond(62, draws)
    await run()
    const [temporary, text] = writeFile.mock.calls[0]
    expect(JSON.parse(text).draws).toEqual(draws)
    expect(temporary.href).toMatch(/\.json\.tmp$/)
    expect(rename).toHaveBeenCalledWith(temporary, expect.any(URL))
    expect(rename.mock.calls[0][1].href).toMatch(new RegExp(`${name}-history\\.json$`))
    expect(writeFile.mock.invocationCallOrder[0]).toBeLessThan(rename.mock.invocationCallOrder[0])
  })

  it('supports a first collection without an existing file', async () => {
    readFile.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'ENOENT' }))
    respond(60, previous.draws)
    await run()
    expect(JSON.parse(writeFile.mock.calls[0][1]).draws).toEqual(previous.draws)
  })

  it.each(['older', 'gap', 'invalid'])('preserves the file for %s source data', async (failure) => {
    let draws = [...previous.draws, draw(61), draw(62)]
    let latest = 62
    if (failure === 'older') {
      previous.draws.push(draw(61))
      readFile.mockResolvedValue(JSON.stringify(previous))
      latest = 60
      draws = previous.draws.slice(0, 60)
    } else if (failure === 'gap') {
      draws = draws.filter((entry) => entry.round !== 61)
    } else {
      Object.assign(draws.at(-1), name === 'lotto' ? { numbers: [1, 1, 2, 3, 4, 5] } : { number: '12345' })
    }
    respond(latest, draws)
    await expect(run()).rejects.toThrow()
    expect(writeFile).not.toHaveBeenCalled()
    expect(rename).not.toHaveBeenCalled()
  })

  it.each(['http', 'network', 'page'])('preserves the file on a %s failure', async (failure) => {
    if (failure === 'network') request.mockRejectedValueOnce(new Error('network unavailable'))
    else request.mockResolvedValueOnce(new Response('unavailable', { status: failure === 'http' ? 503 : 200 }))
    await expect(run()).rejects.toThrow()
    expect(writeFile).not.toHaveBeenCalled()
    expect(rename).not.toHaveBeenCalled()
  })

  if (name === 'pension') {
    it('saves corrected source numbers even when the latest round has not changed', async () => {
      const draws = structuredClone(previous.draws)
      draws[0].number = '000001'
      respond(60, draws)
      await run()
      expect(JSON.parse(writeFile.mock.calls[0][1]).draws).toEqual(draws)
    })
  }
})
