export type LotteryTab = 'lotto' | 'pension'
export type GameCount = 1 | 3 | 5

export interface LottoSelection {
  fixed: number[]
  excluded: number[]
}

export interface PensionTicket {
  group: number
  number: string
}

export interface PensionSet {
  number: string
  tickets: PensionTicket[]
}

export type StoredLottery =
  | { id: string; type: 'lotto'; createdAt: string; numbers: number[] }
  | { id: string; type: 'pension'; createdAt: string; mode: 'single'; ticket: PensionTicket }
  | { id: string; type: 'pension'; createdAt: string; mode: 'set'; number: string }
  | { id: string; type: 'pension'; createdAt: string; mode: 'spread'; tickets: PensionTicket[] }

export interface LotteryStore {
  version: 1
  favorites: StoredLottery[]
  history: StoredLottery[]
}
