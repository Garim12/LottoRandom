import { randomInt, sample } from './random'
import type { PensionSet, PensionTicket } from '../types/lottery'

export function generatePensionDigits(): string {
  return String(randomInt(0, 999_999)).padStart(6, '0')
}

export function generatePensionNumber(): PensionTicket {
  return { group: randomInt(1, 5), number: generatePensionDigits() }
}

export function generatePensionSet(): PensionSet {
  const number = generatePensionDigits()
  return { number, tickets: Array.from({ length: 5 }, (_, index) => ({ group: index + 1, number })) }
}

export function generatePensionSpread(): PensionTicket[] {
  return sample(Array.from({ length: 10 }, (_, digit) => digit), 5).map((lastDigit) => ({
    group: randomInt(1, 5),
    number: `${String(randomInt(0, 99_999)).padStart(5, '0')}${lastDigit}`,
  }))
}

export function regenerateGroup(ticket: PensionTicket): PensionTicket {
  if (!Number.isInteger(ticket.group) || ticket.group < 1 || ticket.group > 5) {
    throw new RangeError('조 번호가 올바르지 않습니다.')
  }
  const others = [1, 2, 3, 4, 5].filter((group) => group !== ticket.group)
  return { ...ticket, group: others[randomInt(0, others.length - 1)]! }
}

export const formatPension = (ticket: PensionTicket) => `${ticket.group}조 ${ticket.number}`
