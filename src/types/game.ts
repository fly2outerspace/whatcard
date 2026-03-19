export interface Card {
  id: string
  category: string   // 'A' | 'B' | 'C' ...
  isBase: boolean    // true = 基座牌【A】
  label: string      // display text, e.g. "【A】" or "A1"
}

export interface Stack {
  id: string
  cards: Card[]      // index 0 = bottom, index length-1 = top (visible)
}

export interface Foundation {
  slotIndex: number
  category: string | null   // null = empty slot
  cards: Card[]             // index 0 = base card, rest = collected cards
}

export interface GameState {
  tableau: Stack[]          // 4 stacks (2/3/4/5 cards)
  stock: Card[]             // index 0 = next to draw
  discard: Card[]           // index length-1 = top (most recently discarded)
  foundations: Foundation[] // 4 slots
  movesLeft: number
  isWon: boolean
  isLost: boolean
}

export type MoveSource =
  | { kind: 'tableau'; stackIndex: number; cardCount: number }
  | { kind: 'discard' }

export type MoveTarget =
  | { kind: 'tableau'; stackIndex: number }
  | { kind: 'foundation'; slotIndex: number }

export interface Move {
  source: MoveSource
  target: MoveTarget
}

export interface LevelData {
  id: string
  name: string
  movesLimit: number
  tableau: Card[][]    // [stack0cards, stack1cards, ...], index 0 = bottom
  stock: Card[]        // ordered, index 0 = next to draw
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stats?: any          // optional generation stats, attached by generateFromConfig
}
