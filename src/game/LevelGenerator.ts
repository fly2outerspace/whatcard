import type { LevelData, Card } from '../types/game'

// ── Public types ───────────────────────────────────────────

export interface CategoryDef {
  name: string       // 'A', 'B', 'C' ...
  cardCount: number  // total cards including base card (min 2: base + 1 regular)
}

export interface LevelConfig {
  categories: CategoryDef[]
  movesLimit: number  // total move budget for the level (configured directly)
  seed?: number       // fixed seed for reproducible layouts; undefined = random
}

// ── Internal types ─────────────────────────────────────────

// NOTE: v3 direction change — generator is now Shuffle → Deal (forward dealing).

// ── Card factory ───────────────────────────────────────────

function makeCard(category: string, isBase: boolean, index: number): Card {
  const id = isBase ? `${category}-base` : `${category}-${index}`
  const label = isBase ? `【${category}】` : `${category}${index}`
  return { id, category, isBase, label, faceUp: false }  // initGameState sets actual faceUp
}

// (Reverse-move based generation removed in Phase 3_c refactor.)

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
 * Always returns 4 for ≥ 12 cards (canonical layout).
 * Scales down gracefully for smaller card counts.
 */
export function tableauStackCount(totalCards: number): number {
  if (totalCards >= 12) return 4
  if (totalCards >= 7)  return 3
  if (totalCards >= 3)  return 2
  return 1
}

// ── Tableau max depths per stack ───────────────────────────

/**
 * Compute per-stack maximum card depth for tableau, keeping right stacks ≥ left stacks.
 *
 * Target tableau total is derived from the 18/64 canonical ratio (the reference game uses
 * 18 cards across 4 stacks = 3+4+5+6, leaving 46 in Stock).
 *
 * Algorithm:
 *   tableauTotal = max(stackCount, floor(totalCards × 18/64))
 *   1. Try arithmetic progression [a, a+1, …, a+S-1] that sums to tableauTotal.
 *      Works when (tableauTotal − S*(S−1)/2) is divisible by S.
 *      Produces the cleanest staircase (e.g. 64 cards → [3,4,5,6]).
 *   2. Fall back: even base + distribute remainder to rightmost stacks.
 *      Produces a nearly flat non-decreasing sequence.
 *
 * NOTE: these are *ceilings*, not guarantees. With low movesBack the actual
 * tableau depth may be less than the max — see schedule.md Phase 3_b annotation.
 */
export function computeTableauTargetDepths(totalCards: number, stackCount: number): number[] {
  const tableauTotal = Math.max(stackCount, Math.floor(totalCards * 18 / 64))
  const triNum = stackCount * (stackCount - 1) / 2  // 0+1+…+(S-1)

  const remainder = tableauTotal - triNum
  if (remainder > 0 && remainder % stackCount === 0) {
    // Perfect arithmetic progression: [a, a+1, …, a+S-1]
    const a = remainder / stackCount
    return Array.from({ length: stackCount }, (_, i) => a + i)
  }

  // Even distribution with extras assigned to rightmost stacks
  const base = Math.floor(tableauTotal / stackCount)
  const extra = tableauTotal % stackCount
  return Array.from({ length: stackCount }, (_, i) =>
    base + (i >= stackCount - extra ? 1 : 0)
  )
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
  const targetDepths = computeTableauTargetDepths(totalCards, stackCount)

  // Build full deck
  const deck: Card[] = []
  for (const cat of config.categories) {
    deck.push(makeCard(cat.name, true, 0))
    for (let i = 1; i < cat.cardCount; i++) deck.push(makeCard(cat.name, false, i))
  }

  // Seeded shuffle (Fisher–Yates)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = deck[i]
    deck[i] = deck[j]
    deck[j] = tmp
  }

  // Deal tableau first (left → right), following non-decreasing target heights.
  const tableau: Card[][] = Array.from({ length: stackCount }, () => [])
  let cursor = 0
  for (let si = 0; si < stackCount; si++) {
    const depth = targetDepths[si] ?? 0
    for (let d = 0; d < depth && cursor < deck.length; d++) {
      tableau[si].push(deck[cursor++])
    }
  }

  // Remaining cards go to stock (index 0 = next to draw)
  const stock = deck.slice(cursor)
  const tableauCardCount = tableau.reduce((s, stack) => s + stack.length, 0)

  return {
    id: `gen-${config.seed ?? Date.now()}`,
    name: '随机关卡',
    movesLimit: config.movesLimit,
    tableau,
    stock,
    stats: {
      totalCards,
      stackCount,
      targetDepths,
      tableauCards: tableauCardCount,
      stockCards: stock.length,
      movesLimit: config.movesLimit,
    },
  }
}

export interface GenerationStats {
  totalCards: number
  stackCount: number
  targetDepths: number[] // per-stack tableau depths (right ≥ left, derived from 18/64 ratio)
  tableauCards: number
  stockCards: number
  movesLimit: number
}

// ── Convenience wrapper (backward compat) ─────────────────

export function generateLevel(
  categories: CategoryDef[],
  movesLimit = 120,
  seed?: number
): LevelData {
  return generateFromConfig({
    categories,
    movesLimit,
    seed,
  })
}

// ── Presets ────────────────────────────────────────────────

/** Supports up to 12 categories for Phase 3_b+ calibration (debug panel). */
export const CATEGORY_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

/** Build a CategoryDef array with uniform card counts. */
export function uniformCategories(count: number, cardCount: number): CategoryDef[] {
  return CATEGORY_NAMES.slice(0, count).map(name => ({ name, cardCount }))
}

export const DEFAULT_CONFIG: LevelConfig = {
  categories: uniformCategories(2, 3),
  movesLimit: 120,
}
