export interface PensionDraw { round: number; date: string; group: number; number: string }
export interface PensionHistory { source: string; retrievedAt: string; draws: PensionDraw[] }

export function validatePensionHistory(value: unknown): PensionHistory {
  const history = value as PensionHistory
  if (!history || history.source !== 'https://www.dhlottery.co.kr/pt720/result' ||
    typeof history.retrievedAt !== 'string' || !Number.isFinite(Date.parse(history.retrievedAt)) ||
    !Array.isArray(history.draws) || history.draws.length < 60 || history.draws.length > 10_000) {
    throw new Error('연금복권 이력의 출처·수집일·회차 수가 올바르지 않습니다.')
  }
  history.draws.forEach((draw, index) => {
    if (!draw || !Number.isInteger(draw.round) || draw.round < 1 ||
      typeof draw.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(draw.date) || !Number.isFinite(Date.parse(draw.date)) ||
      new Date(draw.date).toISOString().slice(0, 10) !== draw.date ||
      !Number.isInteger(draw.group) || draw.group < 1 || draw.group > 5 ||
      typeof draw.number !== 'string' || !/^\d{6}$/.test(draw.number) ||
      (index > 0 && (draw.round !== history.draws[index - 1]!.round + 1 || draw.date <= history.draws[index - 1]!.date))) {
      throw new Error(`연금복권 이력 ${index + 1}번째 행의 회차·날짜·조·번호가 올바르지 않습니다.`)
    }
  })
  return history
}
