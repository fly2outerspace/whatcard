import type { GameState, Move, Foundation, LevelData } from '../types/game'
import { getMovingCards, isValidMove } from './MoveValidator'

export function initGameState(level: LevelData): GameState {
  const foundations: Foundation[] = [0, 1, 2, 3].map(i => ({
    slotIndex: i,
    category: null,
    cards: [],
  }))

  return {
    tableau: level.tableau.map((cards, i) => ({ id: `stack-${i}`, cards: [...cards] })),
    stock: [...level.stock],
    discard: [],
    foundations,
    movesLeft: level.movesLimit,
    isWon: false,
    isLost: false,
  }
}

/**
 * Deep clone state to avoid mutation bugs.
 */
export function cloneState(state: GameState): GameState {
  return {
    tableau: state.tableau.map(s => ({ ...s, cards: [...s.cards] })),
    stock: [...state.stock],
    discard: [...state.discard],
    foundations: state.foundations.map(f => ({ ...f, cards: [...f.cards] })),
    movesLeft: state.movesLeft,
    isWon: state.isWon,
    isLost: state.isLost,
  }
}

/**
 * Draw the top card from Stock → Discard.
 * Returns new state, or null if stock is empty.
 */
export function drawFromStock(state: GameState): GameState | null {
  if (state.stock.length === 0) return null

  const next = cloneState(state)
  const card = next.stock.shift()!
  next.discard.push(card)
  next.movesLeft--
  return checkEndCondition(next)
}

/**
 * Draw the top card from Discard → Stock top (reverse draw).
 * Returns new state, or null if discard is empty.
 */
export function drawFromDiscard(state: GameState): GameState | null {
  if (state.discard.length === 0) return null

  const next = cloneState(state)
  const card = next.discard.pop()!
  next.stock.unshift(card)
  next.movesLeft--
  return checkEndCondition(next)
}

/**
 * Shuffle discard pile back into stock (costs 1 move).
 * Returns new state, or null if discard is empty.
 */
export function reshuffleDiscard(state: GameState): GameState | null {
  if (state.discard.length === 0) return null

  const next = cloneState(state)
  const reshuffled = [...next.discard].reverse()
  next.stock = reshuffled
  next.discard = []
  next.movesLeft--
  return checkEndCondition(next)
}

/**
 * Apply a card move. Returns new state, or null if move is invalid.
 */
export function applyMove(move: Move, state: GameState): GameState | null {
  if (!isValidMove(move.source, move.target, state)) return null

  const next = cloneState(state)
  const movingCards = getMovingCards(move.source, next)

  // Remove cards from source
  if (move.source.kind === 'discard') {
    next.discard.pop()
  } else {
    const stack = next.tableau[move.source.stackIndex]
    stack.cards.splice(stack.cards.length - movingCards.length, movingCards.length)
  }

  // Place cards at target
  if (move.target.kind === 'tableau') {
    const targetStack = next.tableau[move.target.stackIndex]
    targetStack.cards.push(...movingCards)
  } else {
    const slot = next.foundations[move.target.slotIndex]

    // Base card may appear anywhere in the group (e.g. [A1, A2, 【A】] when base is on top)
    const baseCard = movingCards.find(c => c.isBase)
    if (baseCard) {
      slot.category = baseCard.category
    }

    // Push all moving cards (supports group moves, e.g. A1+A2+【A】 → empty slot)
    slot.cards.push(...movingCards)

    tryEliminate(slot, next)
  }

  next.movesLeft--
  return checkEndCondition(next)
}

/**
 * If all cards of a category are in the foundation slot, clear it.
 */
function tryEliminate(slot: Foundation, state: GameState): void {
  if (!slot.category) return

  // Count total cards of this category in the entire game
  const allCards = [
    ...state.tableau.flatMap(s => s.cards),
    ...state.stock,
    ...state.discard,
    ...state.foundations.flatMap(f => f.cards),
  ]

  const totalInCategory = allCards.filter(c => c.category === slot.category).length
  const collectedCount = slot.cards.length

  if (collectedCount >= totalInCategory) {
    // All cards collected — eliminate
    slot.cards = []
    slot.category = null
  }
}

/**
 * Check win (all foundations empty = all eliminated) and loss (no moves left).
 */
function checkEndCondition(state: GameState): GameState {
  const allEliminated = state.foundations.every(f => f.category === null && f.cards.length === 0)
  const allCardsGone =
    state.tableau.every(s => s.cards.length === 0) &&
    state.stock.length === 0 &&
    state.discard.length === 0

  if (allEliminated && allCardsGone) {
    state.isWon = true
    return state
  }

  if (state.movesLeft <= 0) {
    state.isLost = true
  }

  return state
}
