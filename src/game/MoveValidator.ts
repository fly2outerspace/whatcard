import type { GameState, MoveSource, MoveTarget, Card, Stack } from '../types/game'

/**
 * Returns the movable card group for a given source.
 *
 * Two cases for tableau:
 *  A) Top card is non-base  → consecutive same-category non-base cards from top (existing rule)
 *  B) Top card is a base card → base card + consecutive same-category non-base cards below it
 *     e.g. stack bottom→top: [X, A1, A2, 【A】] → moving group = [A1, A2, 【A】]
 *
 * For discard: always just the top card.
 */
export function getMovingCards(source: MoveSource, state: GameState): Card[] {
  if (source.kind === 'discard') {
    const top = state.discard.at(-1)
    return top ? [top] : []
  }

  const stack = state.tableau[source.stackIndex]
  if (!stack || stack.cards.length === 0) return []

  return getMovableGroup(stack)
}

/**
 * Pure helper — same logic used by both MoveValidator and CardRenderer.
 * Returns the contiguous movable group at the top of a stack.
 */
export function getMovableGroup(stack: Stack): Card[] {
  const cards = stack.cards
  if (cards.length === 0) return []

  const topCard = cards.at(-1)!

  if (topCard.isBase) {
    // Base card on top: include it + consecutive same-category non-base cards below
    let count = 1  // the base card itself
    for (let i = cards.length - 2; i >= 0; i--) {
      if (cards[i].category === topCard.category && !cards[i].isBase) count++
      else break
    }
    return cards.slice(cards.length - count)
  } else {
    // Non-base card on top: count consecutive same-category non-base cards from top
    let count = 0
    for (let i = cards.length - 1; i >= 0; i--) {
      if (cards[i].category === topCard.category && !cards[i].isBase) count++
      else break
    }
    return cards.slice(cards.length - count)
  }
}

/**
 * Checks whether moving the group from `source` to `target` is legal.
 */
export function isValidMove(
  source: MoveSource,
  target: MoveTarget,
  state: GameState
): boolean {
  const movingCards = getMovingCards(source, state)
  if (movingCards.length === 0) return false

  const bottomCard = movingCards[0]
  const hasBaseCard = movingCards.some(c => c.isBase)

  if (target.kind === 'foundation') {
    const slot = state.foundations[target.slotIndex]

    if (hasBaseCard) {
      // Group containing a base card → only valid target is an empty slot
      // All cards in the group must be same category
      const baseCard = movingCards.find(c => c.isBase)!
      return (
        slot.category === null &&
        movingCards.every(c => c.category === baseCard.category)
      )
    } else {
      // Pure non-base group → matching foundation slot
      return (
        slot.category === bottomCard.category &&
        movingCards.every(c => c.category === bottomCard.category && !c.isBase)
      )
    }
  }

  if (target.kind === 'tableau') {
    const targetStack = state.tableau[target.stackIndex]

    if (source.kind === 'tableau' && source.stackIndex === target.stackIndex) return false

    const targetTop = targetStack.cards.at(-1)

    // Empty stack: any group can go there
    if (!targetTop) return true

    // Cannot stack anything on a base card in tableau
    if (targetTop.isBase) return false

    // Same category: allowed (merge)
    if (targetTop.category === bottomCard.category) return true

    return false
  }

  return false
}

/**
 * Enumerate all legal moves available from the current state.
 */
export function getAllValidMoves(state: GameState): { source: MoveSource; target: MoveTarget }[] {
  const moves: { source: MoveSource; target: MoveTarget }[] = []

  const sources: MoveSource[] = []

  for (let i = 0; i < state.tableau.length; i++) {
    if (state.tableau[i].cards.length > 0) {
      const group = getMovableGroup(state.tableau[i])
      sources.push({ kind: 'tableau', stackIndex: i, cardCount: group.length })
    }
  }

  if (state.discard.length > 0) {
    sources.push({ kind: 'discard' })
  }

  const targets: MoveTarget[] = [
    ...state.tableau.map((_, i) => ({ kind: 'tableau' as const, stackIndex: i })),
    ...state.foundations.map((_, i) => ({ kind: 'foundation' as const, slotIndex: i })),
  ]

  for (const source of sources) {
    for (const target of targets) {
      if (isValidMove(source, target, state)) {
        moves.push({ source, target })
      }
    }
  }

  return moves
}
