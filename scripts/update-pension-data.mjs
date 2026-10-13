import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { validatePensionHistory } from '../src/utils/pensionHistory.ts'
import { readLatestRound, readLotteryResponse } from './lottery-request.mjs'

const source = 'https://www.dhlottery.co.kr/pt720/result'
const target = new URL('../src/data/pension-history.json', import.meta.url)
const latest = await readLatestRound(source)
const body = await readLotteryResponse(new URL('/pt720/selectPstPt720WnList.do', source), source, (response) => response.json())
if (body.resultCode || !Array.isArray(body.data?.result)) throw new Error('연금복권 당첨 이력을 읽지 못했습니다.')
const draws = body.data.result.map((row) => {
  const date = String(row.psltRflYmd)
  return { round: row.psltEpsd, date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
    group: Number(row.wnBndNo), number: row.wnRnkVl }
}).sort((a, b) => a.round - b.round)
const history = validatePensionHistory({ source, retrievedAt: new Date().toISOString(), draws })
if (draws[0].round !== 1 || draws.at(-1).round !== latest) throw new Error('연금복권 전체 회차가 수집되지 않았습니다.')
let previous
try {
  previous = validatePensionHistory(JSON.parse(await readFile(target, 'utf8')))
  if (previous.draws.at(-1).round > latest) throw new Error('원본 이력이 저장된 데이터보다 오래되었습니다.')
} catch (error) { if (error.code !== 'ENOENT') throw error }
if (JSON.stringify(previous?.draws) === JSON.stringify(draws)) {
  console.log(`연금복권 ${latest}회 (${draws.at(-1).date})까지 최신 상태, 변경 없음`)
} else {
  await mkdir(new URL('../src/data/', import.meta.url), { recursive: true })
  const metadata = JSON.stringify({ source, retrievedAt: history.retrievedAt }).slice(0, -1)
  await writeFile(new URL(`${target.href}.tmp`), `${metadata},\n"draws":[\n${draws.map((draw) => JSON.stringify(draw)).join(',\n')}\n]}\n`)
  await rename(new URL(`${target.href}.tmp`), target)
  console.log(`연금복권 1~${latest}회 (${draws.at(-1).date}) 저장`)
}
