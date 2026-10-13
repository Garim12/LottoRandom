import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { validateHistory } from '../src/utils/lottoHistory.ts'
import { readLatestRound, readLotteryResponse } from './lottery-request.mjs'

const source = 'https://www.dhlottery.co.kr/lt645/result'
const target = new URL('../src/data/lotto-history.json', import.meta.url)
const get = (url) => readLotteryResponse(url, source, (response) => response.json())
const latest = await readLatestRound(source)
let draws = []
try { draws = validateHistory(JSON.parse(await readFile(target, 'utf8'))).draws } catch (error) {
  if (error.code !== 'ENOENT') throw error
}
const previous = draws.at(-1)?.round ?? 0
if (latest < previous) throw new Error('원본의 최신 회차가 저장된 데이터보다 오래되었습니다.')
let cursor = latest + 1
const added = new Map()
while (cursor > previous + 1) {
  const url = new URL('/lt645/selectPstLt645InfoNew.do', source)
  url.search = new URLSearchParams(cursor === latest + 1
    ? { srchDir: 'center', srchLtEpsd: String(latest) }
    : { srchDir: 'older', srchCursorLtEpsd: String(cursor) })
  const body = await get(url)
  const list = body.data?.list
  if (body.resultCode || !Array.isArray(list) || !list.length) throw new Error(`회차 ${cursor} 이전 데이터를 읽지 못했습니다.`)
  const next = Math.min(...list.map((row) => row.ltEpsd))
  if (!Number.isInteger(next) || next >= cursor) throw new Error('회차 페이지가 진행되지 않습니다.')
  for (const row of list) {
    if (row.ltEpsd <= previous || row.ltEpsd > latest) continue
    const date = String(row.ltRflYmd)
    added.set(row.ltEpsd, { round: row.ltEpsd, date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
      numbers: [1, 2, 3, 4, 5, 6].map((n) => row[`tm${n}WnNo`]).sort((a, b) => a - b) })
  }
  cursor = next
}
draws = [...draws, ...added.values()].sort((a, b) => a.round - b.round)
const history = validateHistory({ source, retrievedAt: new Date().toISOString(), draws })
if (draws[0].round !== 1 || draws.at(-1).round !== latest) throw new Error('전체 회차가 수집되지 않았습니다.')
if (added.size === 0) {
  console.log(`로또 ${latest}회 (${draws.at(-1).date})까지 최신 상태, 변경 없음`)
} else {
  await mkdir(new URL('../src/data/', import.meta.url), { recursive: true })
  const metadata = JSON.stringify({ source: history.source, retrievedAt: history.retrievedAt }).slice(0, -1)
  await writeFile(new URL(`${target.href}.tmp`), `${metadata},\n"draws":[\n${draws.map((draw) => JSON.stringify(draw)).join(',\n')}\n]}\n`)
  await rename(new URL(`${target.href}.tmp`), target)
  console.log(`동행복권 1~${latest}회 (${draws.at(-1).date}), 새 회차 ${added.size}개 저장`)
}
