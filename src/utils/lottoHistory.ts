export interface LottoDraw {
  round: number
  date: string
  numbers: number[]
}

export interface LottoHistory {
  source: string
  retrievedAt: string
  draws: LottoDraw[]
}

/** Validate downloaded data before it becomes input to any statistics or model. */
export function validateHistory(value: unknown): LottoHistory {
  const history = value as LottoHistory
  if (!history || history.source !== 'https://www.dhlottery.co.kr/lt645/result' ||
    typeof history.retrievedAt !== 'string' || !Number.isFinite(Date.parse(history.retrievedAt)) ||
    !Array.isArray(history.draws) || history.draws.length < 60 || history.draws.length > 10_000) {
    throw new Error('당첨 이력의 출처·수집일·회차 수를 확인해 주세요.')
  }
  history.draws.forEach((draw, index) => {
    if (!draw || !Number.isInteger(draw.round) || draw.round < 1 ||
      typeof draw.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(draw.date) ||
      !Number.isFinite(Date.parse(draw.date)) || new Date(draw.date).toISOString().slice(0, 10) !== draw.date ||
      !Array.isArray(draw.numbers) || draw.numbers.length !== 6 || new Set(draw.numbers).size !== 6 ||
      draw.numbers.some((number) => !Number.isInteger(number) || number < 1 || number > 45) ||
      (index > 0 && (draw.round !== history.draws[index - 1]!.round + 1 || draw.date <= history.draws[index - 1]!.date))) {
      throw new Error(`당첨 이력 ${index + 1}번째 행의 회차·날짜·번호가 올바르지 않습니다.`)
    }
  })
  return history
}
