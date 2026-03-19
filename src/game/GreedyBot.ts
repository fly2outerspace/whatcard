import type { GameState, Move } from '../types/game'
import { getAllValidMoves, getMovingCards } from './MoveValidator'
import {
  applyMove,
  cloneState,
  drawFromStock,
  initGameState,
  reshuffleDiscard,
} from './GameState'
import type { LevelConfig } from './LevelGenerator'
import { generateFromConfig } from './LevelGenerator'

const MAX_BOT_PLIES = 200_000

// ── Helpers ────────────────────────────────────────────────

/**
 * True if moving this group will flip a face-down card to face-up on the source stack.
 */
function moveExposesHiddenCard(state: GameState, move: Move): boolean {
  if (move.source.kind !== 'tableau') return false
  const stack = state.tableau[move.source.stackIndex]
  const moving = getMovingCards(move.source, state)
  if (moving.length === 0) return false
  const idxBelow = stack.cards.length - moving.length - 1
  if (idxBelow < 0) return false
  return !stack.cards[idxBelow].faceUp
}

/**
 * Score a foundation-bound move (higher = better).
 * Rewards category elimination and placing cards onto an existing foundation slot.
 */
function scoreFoundationMove(state: GameState, move: Move): number {
  if (move.target.kind !== 'foundation') return -1
  const next = applyMove(move, state)
  if (!next) return -1
  if (next.isWon) return 1_000_000

  let score = 0
  for (let i = 0; i < state.foundations.length; i++) {
    const before = state.foundations[i]
    const after = next.foundations[i]
    const cleared =
      before.cards.length > 0 &&
      after.cards.length === 0 &&
      after.category === null
    if (cleared) score += 10_000
    else if (after.cards.length > before.cards.length) score += 100
  }
  return score
}

// ── Last-action tracker (cycle prevention) ─────────────────

interface LastAction {
  kind: 'move'
  fromStack: number
  toStack: number
}

/**
 * Determines if a move would immediately reverse the previous t2t action.
 * Reversing wastes two moves and causes infinite cycling.
 */
function isReversal(move: Move, last: LastAction | null): boolean {
  if (!last) return false
  if (move.source.kind !== 'tableau' || move.target.kind !== 'tableau') return false
  return (
    move.source.stackIndex === last.toStack &&
    move.target.stackIndex === last.fromStack
  )
}

// ── Core greedy policy ─────────────────────────────────────

/**
 * Pick one greedy action for the current state.
 *
 * Priority (the order matters critically):
 *   1. Best Foundation move — include win detection and elimination bonus
 *   2. Expose a hidden card (flips a face-down card in the source stack)
 *   3. Draw from Stock — always preferred over useless t2t cycling
 *   4. Reshuffle Discard → Stock — resets Stock when exhausted
 *   5. Any valid t2t / discard→tableau move (last resort, skip cycle reversals)
 *   6. null — genuinely stuck
 *
 * The key fix vs. original: priorities 3/4 (draw/reshuffle) moved BEFORE priority 5 (any move).
 * Without this, the bot would cycle on t2t moves indefinitely, never drawing the key card
 * from Stock.
 */
function pickGreedyAction(
  state: GameState,
  lastAction: LastAction | null
): { kind: 'move'; move: Move } | { kind: 'draw' } | { kind: 'reshuffle' } | null {
  const moves = getAllValidMoves(state)

  // 1. Best foundation move
  const toFoundation = moves.filter(m => m.target.kind === 'foundation')
  if (toFoundation.length > 0) {
    let best: Move | null = null
    let bestScore = -1
    for (const m of toFoundation) {
      const s = scoreFoundationMove(state, m)
      if (s > bestScore) {
        bestScore = s
        best = m
      }
    }
    if (best) return { kind: 'move', move: best }
  }

  // 2. Expose a hidden card
  const exposing = moves.filter(m => moveExposesHiddenCard(state, m))
  if (exposing.length > 0) {
    // Prefer non-reversals among exposing moves
    const nonRev = exposing.find(m => !isReversal(m, lastAction))
    return { kind: 'move', move: nonRev ?? exposing[0] }
  }

  // 3. Draw from Stock — always before aimless t2t to avoid cycling
  if (state.stock.length > 0) return { kind: 'draw' }

  // 4. Reshuffle Discard → Stock
  if (state.discard.length > 0) return { kind: 'reshuffle' }

  // 5. Any valid move (stock/discard exhausted — rearrange tableau)
  //    Skip moves that would immediately reverse the previous action.
  if (moves.length > 0) {
    const nonRev = moves.find(m => !isReversal(m, lastAction))
    if (nonRev) return { kind: 'move', move: nonRev }
    // All options reverse the last move → truly stuck, don't cycle
    return null
  }

  return null
}

// ── Action application ─────────────────────────────────────

function applyGreedyAction(
  state: GameState,
  action: { kind: 'move'; move: Move } | { kind: 'draw' } | { kind: 'reshuffle' }
): GameState | null {
  if (action.kind === 'move') return applyMove(action.move, state)
  if (action.kind === 'draw') return drawFromStock(state)
  return reshuffleDiscard(state)
}

function toLastAction(
  action: { kind: 'move'; move: Move } | { kind: 'draw' } | { kind: 'reshuffle' }
): LastAction | null {
  if (
    action.kind === 'move' &&
    action.move.source.kind === 'tableau' &&
    action.move.target.kind === 'tableau'
  ) {
    return {
      kind: 'move',
      fromStack: action.move.source.stackIndex,
      toStack: action.move.target.stackIndex,
    }
  }
  return null  // draw/reshuffle/foundation reset the anti-cycle tracking
}

// ── Public API ─────────────────────────────────────────────

export interface GreedyRunResult {
  won: boolean
  /** Total moves consumed (initial.movesLeft - final.movesLeft). */
  movesUsed: number
}

/**
 * Simulate one game with greedy policy until win, loss, or safety cap.
 */
export function runGreedyBotDetailed(initial: GameState): GreedyRunResult {
  let state = cloneState(initial)
  const startMovesLeft = state.movesLeft
  let lastAction: LastAction | null = null

  for (let ply = 0; ply < MAX_BOT_PLIES; ply++) {
    if (state.isWon) {
      return { won: true, movesUsed: startMovesLeft - state.movesLeft }
    }
    if (state.isLost || state.movesLeft <= 0) {
      return { won: false, movesUsed: startMovesLeft - state.movesLeft }
    }

    const action = pickGreedyAction(state, lastAction)
    if (!action) {
      return { won: false, movesUsed: startMovesLeft - state.movesLeft }
    }

    const next = applyGreedyAction(state, action)
    if (!next) {
      return { won: false, movesUsed: startMovesLeft - state.movesLeft }
    }

    lastAction = toLastAction(action)
    state = next
  }

  return { won: state.isWon, movesUsed: startMovesLeft - state.movesLeft }
}

/**
 * Returns whether the bot cleared the puzzle.
 */
export function runGreedyBot(initial: GameState): boolean {
  return runGreedyBotDetailed(initial).won
}

export interface BatchTestResult {
  sampleSize: number
  wins: number
  passRate: number
  avgMovesUsedOnWin: number | null
  minMovesUsedOnWin: number | null
  maxMovesUsedOnWin: number | null
}

/**
 * Generate `sampleSize` levels from `config` (varying seed) and run the greedy bot on each.
 */
export function batchGreedyTest(config: LevelConfig, sampleSize: number): BatchTestResult {
  let wins = 0
  const movesOnWin: number[] = []
  const baseSeed = config.seed ?? (Date.now() % 2_000_000_000)

  for (let i = 0; i < sampleSize; i++) {
    const level = generateFromConfig({ ...config, seed: baseSeed + i * 1_000_003 })
    const initial = initGameState(level)
    const { won, movesUsed: used } = runGreedyBotDetailed(initial)
    if (won) {
      wins++
      movesOnWin.push(used)
    }
  }

  const passRate = sampleSize > 0 ? wins / sampleSize : 0
  let avgMovesUsedOnWin: number | null = null
  let minMovesUsedOnWin: number | null = null
  let maxMovesUsedOnWin: number | null = null
  if (movesOnWin.length > 0) {
    avgMovesUsedOnWin = movesOnWin.reduce((a, b) => a + b, 0) / movesOnWin.length
    minMovesUsedOnWin = Math.min(...movesOnWin)
    maxMovesUsedOnWin = Math.max(...movesOnWin)
  }

  return {
    sampleSize,
    wins,
    passRate,
    avgMovesUsedOnWin,
    minMovesUsedOnWin,
    maxMovesUsedOnWin,
  }
}

