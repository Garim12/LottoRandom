import { setTimeout as wait } from 'node:timers/promises'

export async function readLotteryResponse(url, source, parse) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    let response
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(20_000),
        headers: { AJAX: 'true', requestMenuUri: new URL(source).pathname } })
      if (!response.ok) {
        await response.body?.cancel()
        throw new Error(`HTTP ${response.status}`)
      }
      if (response.headers.get('content-type')?.includes('text/html')) {
        const page = await response.clone().text()
        if (/<title[^>]*>\s*시스템 점검 페이지\s*<\/title>/i.test(page)) {
          await response.body?.cancel()
          throw Object.assign(new Error('동행복권 시스템 정기 점검 중으로 당첨 이력 조회를 보류합니다.'), { code: 'LOTTERY_MAINTENANCE' })
        }
      }
      // 응답 본문 읽기와 파싱도 재시도 범위에 포함합니다.
      return await parse(response)
    } catch (error) {
      if (error?.code === 'LOTTERY_MAINTENANCE') throw error
      const reason = error instanceof Error ? error.message : String(error)
      const context = `${new URL(url).pathname}, HTTP ${response?.status ?? '응답 없음'}, 시도 ${attempt}/3`
      if (attempt === 3 || (response && !response.ok && response.status < 500 && response.status !== 408)) {
        throw new Error(`동행복권 조회 실패 (${context}): ${reason}`, { cause: error })
      }
      console.warn(`동행복권 조회 재시도 (${context}): ${reason}. ${attempt * 5}초 후 다시 확인합니다.`)
      await wait(attempt * 5_000)
    }
  }
}

export function readLatestRound(source) {
  return readLotteryResponse(source, source, async (response) => {
    const page = await response.text()
    const latest = Number(page.match(/id="opt_val"\s+value="(\d+)"/)?.[1])
    if (!Number.isInteger(latest) || latest < 60) {
      throw new Error(`최신 회차를 찾지 못했습니다 (응답 형식: ${response.headers.get('content-type') ?? '없음'}, 본문 ${page.length}자).`)
    }
    return latest
  })
}
