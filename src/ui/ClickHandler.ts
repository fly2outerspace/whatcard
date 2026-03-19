import type { GameState, MoveSource, MoveTarget } from '../types/game'
import { isValidMove, getMovingCards } from '../game/MoveValidator'
import { applyMove, drawFromStock, reshuffleDiscard } from '../game/GameState'
import { isGamePaused } from './MenuHandler'

// Module-level refs — updated each new game, listeners attached only once
let _state: GameState | null = null
let _onStateChange: ((s: GameState) => void) | null = null
let _listenersAttached = false

const selection: { source: MoveSource | null } = { source: null }

/**
 * Update the active game state and callback (called on new game / restart).
 * Does NOT re-attach DOM listeners.
 */
export function updateHandlerState(
  state: GameState,
  onStateChange: (s: GameState) => void
): void {
  _state = state
  _onStateChange = onStateChange
  selection.source = null
}

function getState(): GameState {
  if (!_state) throw new Error('No active game state')
  return _state
}

function emit(next: GameState): void {
  _state = next
  _onStateChange?.(next)
}

// ── Selection highlight ────────────────────────────────────

function setSelectionHighlight(source: MoveSource | null, state: GameState, active: boolean): void {
  if (!source) return

  if (source.kind === 'discard') {
    document.querySelector('#discard-pile .card')?.classList.toggle('selected', active)
    return
  }

  const stack = state.tableau[source.stackIndex]
  const movingCards = getMovingCards(source, state)
  const startDepth = stack.cards.length - movingCards.length

  document
    .querySelectorAll<HTMLElement>(`.tableau-stack[data-stack-index="${source.stackIndex}"] .card`)
    .forEach((el, i) => {
      if (i >= startDepth) el.classList.toggle('selected', active)
    })
}

function highlightValidTargets(source: MoveSource, state: GameState, active: boolean): void {
  document.querySelectorAll<HTMLElement>('.foundation-slot').forEach(el => {
    const slotIndex = Number(el.dataset.slotIndex)
    const target: MoveTarget = { kind: 'foundation', slotIndex }
    el.classList.toggle('highlight', active && isValidMove(source, target, state))
  })

  document.querySelectorAll<HTMLElement>('.tableau-stack').forEach(el => {
    const stackIndex = Number(el.dataset.stackIndex)
    const target: MoveTarget = { kind: 'tableau', stackIndex }
    el.classList.toggle('highlight', active && isValidMove(source, target, state))
  })
}

function clearSelection(): void {
  const state = getState()
  setSelectionHighlight(selection.source, state, false)
  if (selection.source) highlightValidTargets(selection.source, state, false)
  selection.source = null
}

function tryMove(target: MoveTarget): void {
  const state = getState()
  if (!selection.source) return
  const next = applyMove({ source: selection.source, target }, state)
  if (next) {
    clearSelection()
    emit(next)
  }
}

// ── Attach listeners (once) ────────────────────────────────

export function initClickHandler(
  initialState: GameState,
  onStateChange: (s: GameState) => void
): void {
  updateHandlerState(initialState, onStateChange)

  if (_listenersAttached) return
  _listenersAttached = true

  // Stock
  document.getElementById('stock-pile')?.addEventListener('click', () => {
    if (isGamePaused()) return
    clearSelection()
    const state = getState()

    if (state.stock.length === 0) {
      const next = reshuffleDiscard(state)
      if (next) emit(next)
      return
    }

    const next = drawFromStock(state)
    if (next) emit(next)
  })

  // Discard
  document.getElementById('discard-pile')?.addEventListener('click', () => {
    if (isGamePaused()) return
    const state = getState()
    if (state.discard.length === 0) return

    if (selection.source?.kind === 'discard') {
      clearSelection()
      return
    }

    clearSelection()
    selection.source = { kind: 'discard' }
    setSelectionHighlight(selection.source, state, true)
    highlightValidTargets(selection.source, state, true)
  })

  // Foundation slots
  document.getElementById('foundation-area')?.addEventListener('click', e => {
    if (isGamePaused()) return
    const slotEl = (e.target as HTMLElement).closest<HTMLElement>('.foundation-slot')
    if (!slotEl || !selection.source) return
    tryMove({ kind: 'foundation', slotIndex: Number(slotEl.dataset.slotIndex) })
  })

  // Tableau
  document.getElementById('tableau-area')?.addEventListener('click', e => {
    if (isGamePaused()) return
    const state = getState()
    const stackEl = (e.target as HTMLElement).closest<HTMLElement>('.tableau-stack')
    if (!stackEl) return

    const stackIndex = Number(stackEl.dataset.stackIndex)
    const stack = state.tableau[stackIndex]
    const cardEl = (e.target as HTMLElement).closest<HTMLElement>('.card')

    // Click on empty area or card while something selected → try move there
    if (selection.source) {
      const target: MoveTarget = { kind: 'tableau', stackIndex }
      const next = applyMove({ source: selection.source, target }, state)
      if (next) {
        clearSelection()
        emit(next)
        return
      }
      // Invalid target — try to re-select if clicking a valid card
      clearSelection()
    }

    // Select top card of this stack
    if (stack.cards.length === 0) return
    if (!cardEl) return

    const depth = Number(cardEl.dataset.depth ?? stack.cards.length - 1)
    const isTop = depth === stack.cards.length - 1
    if (!isTop) return  // Face-down / buried card

    selection.source = { kind: 'tableau', stackIndex, cardCount: 1 }
    setSelectionHighlight(selection.source, state, true)
    highlightValidTargets(selection.source, state, true)
  })
}
