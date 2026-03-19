import type { GameState, Move, Foundation, LevelData, Card } from '../types/game'
import { getMovingCards, isValidMove } from './MoveValidator'

export function initGameState(level: LevelData): GameState {
  const foundations: Foundation[] = [0, 1, 2, 3].map(i => ({
    slotIndex: i,
    category: null,
    cards: [],
  }))

  // Deep-copy cards and set initial faceUp:
  //   Tableau → only top card of each stack is face-up; rest face-down
  //   Stock   → all face-down (revealed one at a time when drawn)
  const tableau = level.tableau.map((cards, i) => {
    const copied: Card[] = cards.map(c => ({ ...c, faceUp: false }))
    if (copied.length > 0) copied[copied.length - 1].faceUp = true
    return { id: `stack-${i}`, cards: copied }
  })

  const stock: Card[] = level.stock.map(c => ({ ...c, faceUp: false }))

  return {
    tableau,
    stock,
    discard: [],
    foundations,
    movesLeft: level.movesLimit,
    isWon: false,
    isLost: false,
  }
}

export function cloneState(state: GameState): GameState {
  return {
    tableau: state.tableau.map(s => ({ ...s, cards: s.cards.map(c => ({ ...c })) })),
    stock: state.stock.map(c => ({ ...c })),
    discard: state.discard.map(c => ({ ...c })),
    foundations: state.foundations.map(f => ({ ...f, cards: f.cards.map(c => ({ ...c })) })),
    movesLeft: state.movesLeft,
    isWon: state.isWon,
    isLost: state.isLost,
  }
}

export function drawFromStock(state: GameState): GameState | null {
  if (state.stock.length === 0) return null

  const next = cloneState(state)
  const card = next.stock.shift()!
  card.faceUp = true   // revealed when drawn to discard
  next.discard.push(card)
  next.movesLeft--
  return checkEndCondition(next)
}

export function drawFromDiscard(state: GameState): GameState | null {
  if (state.discard.length === 0) return null

  const next = cloneState(state)
  const card = next.discard.pop()!
  card.faceUp = false  // goes back to stock face-down
  next.stock.unshift(card)
  next.movesLeft--
  return checkEndCondition(next)
}

export function reshuffleDiscard(state: GameState): GameState | null {
  if (state.discard.length === 0) return null

  const next = cloneState(state)
  // Discard order matches original stock draw order (oldest at index 0, newest at end).
  // Stock index 0 is "next to draw", so copy discard forward — do NOT reverse.
  next.stock = next.discard.map(c => ({ ...c, faceUp: false }))
  next.discard = []
  next.movesLeft--
  return checkEndCondition(next)
}

export function applyMove(move: Move, state: GameState): GameState | null {
  if (!isValidMove(move.source, move.target, state)) return null

  const next = cloneState(state)
  const movingCards = getMovingCards(move.source, next)

  // Remove from source
  if (move.source.kind === 'discard') {
    next.discard.pop()
  } else {
    const stack = next.tableau[move.source.stackIndex]
    stack.cards.splice(stack.cards.length - movingCards.length, movingCards.length)
    // The card now on top of the source stack is revealed
    if (stack.cards.length > 0) stack.cards[stack.cards.length - 1].faceUp = true
  }

  // Place at target
  if (move.target.kind === 'tableau') {
    next.tableau[move.target.stackIndex].cards.push(...movingCards)
  } else {
    const slot = next.foundations[move.target.slotIndex]
    const baseCard = movingCards.find(c => c.isBase)
    if (baseCard) slot.category = baseCard.category
    slot.cards.push(...movingCards)
    tryEliminate(slot, next)
  }

  next.movesLeft--
  return checkEndCondition(next)
}

function tryEliminate(slot: Foundation, state: GameState): void {
  if (!slot.category) return

  const allCards = [
    ...state.tableau.flatMap(s => s.cards),
    ...state.stock,
    ...state.discard,
    ...state.foundations.flatMap(f => f.cards),
  ]

  if (slot.cards.length >= allCards.filter(c => c.category === slot.category).length) {
    slot.cards = []
    slot.category = null
  }
}

function checkEndCondition(state: GameState): GameState {
  const allEliminated = state.foundations.every(f => f.category === null && f.cards.length === 0)
  const allCardsGone =
    state.tableau.every(s => s.cards.length === 0) &&
    state.stock.length === 0 &&
    state.discard.length === 0

  if (allEliminated && allCardsGone) { state.isWon = true; return state }
  if (state.movesLeft <= 0) state.isLost = true
  return state
}
