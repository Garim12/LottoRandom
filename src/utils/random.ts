const UINT32_RANGE = 0x1_0000_0000

/** Inclusive bounds, uniform for spans up to 2^32 via rejection sampling. */
export function randomInt(min: number, max: number): number {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || max < min) {
    throw new RangeError('올바른 정수 범위를 입력해 주세요.')
  }
  const span = max - min + 1
  if (span <= 0 || span > UINT32_RANGE) throw new RangeError('범위가 너무 큽니다.')
  const limit = Math.floor(UINT32_RANGE / span) * span
  const buffer = new Uint32Array(1)
  let value: number
  do {
    crypto.getRandomValues(buffer)
    value = buffer[0]!
  } while (value >= limit)
  return min + (value % span)
}

export function shuffle<T>(values: readonly T[]): T[] {
  const result = [...values]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i)
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}

export function sample<T>(values: readonly T[], count: number): T[] {
  if (!Number.isInteger(count) || count < 0 || count > values.length) {
    throw new RangeError('선택할 개수가 올바르지 않습니다.')
  }
  return shuffle(values).slice(0, count)
}

export function randomId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
