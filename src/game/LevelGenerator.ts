import type { LevelData, Card } from '../types/game'

// ── Public types ───────────────────────────────────────────

export interface CategoryDef {
  name: string       // 'A', 'B', 'C' ...
  cardCount: number  // total cards including base card (min 2: base + 1 regular)
}

export interface LevelConfig {
  categories: CategoryDef[]
  movesBack: number             // reverse steps ≈ theoretical min moves to solve
  movesLimitMultiplier: number  // movesLimit = ceil(movesBack * multiplier) + buffer
  seed?: number                 // fixed seed for reproducible layouts; undefined = random
}

// ── Internal types ─────────────────────────────────────────

interface GenState {
  tableau: Card[][]
  stock: Card[]
  foundations: Map<string, Card[]>  // category → [baseCard, ...regular], last = top
}

type ReverseMove =
  | { kind: 'f2t'; category: string; stackIndex: number }
  | { kind: 'f2s'; category: string }
  | { kind: 't2t'; from: number; to: number }

// ── Card factory ───────────────────────────────────────────

function makeCard(category: string, isBase: boolean, index: number): Card {
  const id = isBase ? `${category}-base` : `${category}-${index}`
  const label = isBase ? `【${category}】` : `${category}${index}`
  return { id, category, isBase, label }
}

// ── Movable group (mirrors MoveValidator — no import to avoid circular dep) ──

function getMovableGroup(stack: Card[]): Card[] {
  if (stack.length === 0) return []
  const top = stack[stack.length - 1]

  if (top.isBase) {
    let count = 1
    for (let i = stack.length - 2; i >= 0; i--) {
      if (stack[i].category === top.category && !stack[i].isBase) count++
      else break
    }
    return stack.slice(stack.length - count)
  } else {
    let count = 0
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].category === top.category && !stack[i].isBase) count++
      else break
    }
    return stack.slice(stack.length - count)
  }
}

// ── Reverse move enumeration ───────────────────────────────

function getValidReverseMoves(state: GenState): ReverseMove[] {
  const moves: ReverseMove[] = []

  for (const [cat, cards] of state.foundations) {
    if (cards.length === 0) continue

    for (let si = 0; si < state.tableau.length; si++) {
      // Any stack is valid — simulates the initial random deal where cards
      // can be placed on top of any card regardless of category or base status.
      // (t2t keeps same-category rules because it reverses actual game moves.)
      moves.push({ kind: 'f2t', category: cat, stackIndex: si })
    }
    moves.push({ kind: 'f2s', category: cat })
  }

  for (let from = 0; from < state.tableau.length; from++) {
    const fromStack = state.tableau[from]
    if (fromStack.length === 0) continue

    const group = getMovableGroup(fromStack)
    const bottom = group[0]

    for (let to = 0; to < state.tableau.length; to++) {
      if (from === to) continue
      const toStack = state.tableau[to]
      if (toStack.length === 0) {
        moves.push({ kind: 't2t', from, to })
      } else {
        const toTop = toStack[toStack.length - 1]
        if (!toTop.isBase && toTop.category === bottom.category) {
          moves.push({ kind: 't2t', from, to })
        }
      }
    }
  }

  return moves
}

// ── Apply reverse move ─────────────────────────────────────

function applyReverseMove(move: ReverseMove, state: GenState): GenState {
  const next: GenState = {
    tableau: state.tableau.map(s => [...s]),
    stock: [...state.stock],
    foundations: new Map([...state.foundations].map(([k, v]) => [k, [...v]])),
  }

  if (move.kind === 'f2t') {
    const card = next.foundations.get(move.category)!.pop()!
    next.tableau[move.stackIndex].push(card)
  } else if (move.kind === 'f2s') {
    const card = next.foundations.get(move.category)!.pop()!
    next.stock.unshift(card)
  } else {
    const fromStack = next.tableau[move.from]
    const group = getMovableGroup(fromStack)
    fromStack.splice(fromStack.length - group.length, group.length)
    next.tableau[move.to].push(...group)
  }

  return next
}

// ── Seeded PRNG (LCG) ─────────────────────────────────────

function seededRng(seed: number): () => number {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// ── Tableau slot count based on total cards ────────────────

/**
 * Decide how many tableau stacks to use based on total card count.
 * Always returns 4 for ≥ 14 cards (the canonical 2/3/4/5 layout).
 * Scales down gracefully for smaller card counts.
 */
export function tableauStackCount(totalCards: number): number {
  if (totalCards >= 12) return 4
  if (totalCards >= 7)  return 3
  if (totalCards >= 3)  return 2
  return 1
}

// ── Core generation function ───────────────────────────────

/**
 * Generate a solvable level from a LevelConfig.
 * Returns LevelData + stats for debugging.
 */
export function generateFromConfig(config: LevelConfig): LevelData & { stats: GenerationStats } {
  const rng = seededRng(config.seed ?? (Date.now() % 2147483647))

  const totalCards = config.categories.reduce((s, c) => s + c.cardCount, 0)
  const stackCount = tableauStackCount(totalCards)

  // Build foundations (all cards start here)
  const foundations = new Map<string, Card[]>()
  for (const cat of config.categories) {
    const cards: Card[] = []
    cards.push(makeCard(cat.name, true, 0))
    for (let i = 1; i < cat.cardCount; i++) {
      cards.push(makeCard(cat.name, false, i))
    }
    foundations.set(cat.name, cards)
  }

  let state: GenState = {
    tableau: Array.from({ length: stackCount }, () => []),
    stock: [],
    foundations,
  }

  // Apply reverse moves
  let appliedMoves = 0
  for (let i = 0; i < config.movesBack; i++) {
    const moves = getValidReverseMoves(state)
    if (moves.length === 0) break
    const move = moves[Math.floor(rng() * moves.length)]
    state = applyReverseMove(move, state)
    appliedMoves++
  }

  // Flush remaining foundation cards to stock
  for (const [, cards] of state.foundations) {
    while (cards.length > 0) {
      state.stock.unshift(cards.pop()!)
    }
  }

  const movesLimit = Math.ceil(appliedMoves * config.movesLimitMultiplier) + 8
  const tableauCardCount = state.tableau.reduce((s, stack) => s + stack.length, 0)

  return {
    id: `gen-${config.seed ?? Date.now()}`,
    name: '随机关卡',
    movesLimit,
    tableau: state.tableau,
    stock: state.stock,
    stats: {
      totalCards,
      stackCount,
      tableauCards: tableauCardCount,
      stockCards: state.stock.length,
      appliedMoves,
      movesLimit,
    },
  }
}

export interface GenerationStats {
  totalCards: number
  stackCount: number
  tableauCards: number
  stockCards: number
  appliedMoves: number   // actual reverse steps applied (may be < movesBack if stuck)
  movesLimit: number
}

// ── Convenience wrapper (backward compat) ─────────────────

export function generateLevel(
  categories: CategoryDef[],
  movesBack = 20,
  seed?: number
): LevelData {
  return generateFromConfig({
    categories,
    movesBack,
    movesLimitMultiplier: 1.6,
    seed,
  })
}

// ── Presets ────────────────────────────────────────────────

export const CATEGORY_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

/** Build a CategoryDef array with uniform card counts. */
export function uniformCategories(count: number, cardCount: number): CategoryDef[] {
  return CATEGORY_NAMES.slice(0, count).map(name => ({ name, cardCount }))
}

export const DEFAULT_CONFIG: LevelConfig = {
  categories: uniformCategories(2, 3),
  movesBack: 18,
  movesLimitMultiplier: 1.6,
}
