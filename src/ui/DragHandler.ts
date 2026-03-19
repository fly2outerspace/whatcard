import type { GameState, MoveSource, MoveTarget, Card } from '../types/game'
import { isValidMove, getMovingCards } from '../game/MoveValidator'
import { applyMove } from '../game/GameState'
import { createCardEl } from './CardRenderer'
import { isGamePaused } from './MenuHandler'

// Module-level state ref — updated on each new game
let _state: GameState | null = null
let _onStateChange: ((s: GameState) => void) | null = null
let _listenersAttached = false

export function updateDragState(
  state: GameState,
  onStateChange: (s: GameState) => void
): void {
  _state = state
  _onStateChange = onStateChange
}

function getState(): GameState {
  if (!_state) throw new Error('No active game state')
  return _state
}

function emit(next: GameState): void {
  _state = next
  _onStateChange?.(next)
}

// ── Ghost card(s) during drag ──────────────────────────────

interface DragSession {
  source: MoveSource
  cards: Card[]
  ghostEl: HTMLElement     // container holding the ghost card stack
  originEl: HTMLElement    // original DOM element(s) container
  offsetX: number
  offsetY: number
}

let session: DragSession | null = null

function buildGhost(cards: Card[]): HTMLElement {
  const ghost = document.createElement('div')
  ghost.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 2000;
    transform-origin: top left;
  `
  const OVERLAP = 28
  ghost.style.width = '72px'
  ghost.style.height = `${96 + (cards.length - 1) * OVERLAP}px`

  cards.forEach((card, i) => {
    const el = createCardEl(card)
    el.style.top = `${i * OVERLAP}px`
    el.style.opacity = '0.9'
    el.classList.add('dragging')
    ghost.appendChild(el)
  })

  document.body.appendChild(ghost)
  return ghost
}

function moveGhost(x: number, y: number): void {
  if (!session) return
  session.ghostEl.style.left = `${x - session.offsetX}px`
  session.ghostEl.style.top = `${y - session.offsetY}px`
}

function removeGhost(): void {
  session?.ghostEl.remove()
}

// ── Hit testing ────────────────────────────────────────────

function findDropTarget(x: number, y: number, state: GameState): MoveTarget | null {
  if (!session) return null

  // Foundation slots
  for (const el of document.querySelectorAll<HTMLElement>('.foundation-slot')) {
    const rect = el.getBoundingClientRect()
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      const target: MoveTarget = { kind: 'foundation', slotIndex: Number(el.dataset.slotIndex) }
      if (isValidMove(session.source, target, state)) return target
    }
  }

  // Tableau stacks
  for (const el of document.querySelectorAll<HTMLElement>('.tableau-stack')) {
    const rect = el.getBoundingClientRect()
    // Expand hit area slightly for empty stacks
    const pad = 12
    if (
      x >= rect.left - pad && x <= rect.right + pad &&
      y >= rect.top - pad && y <= rect.bottom + pad
    ) {
      const target: MoveTarget = { kind: 'tableau', stackIndex: Number(el.dataset.stackIndex) }
      if (isValidMove(session.source, target, state)) return target
    }
  }

  return null
}

function highlightTarget(target: MoveTarget | null): void {
  document.querySelectorAll('.foundation-slot, .tableau-stack').forEach(el =>
    el.classList.remove('highlight')
  )
  if (!target) return

  if (target.kind === 'foundation') {
    document
      .querySelector(`.foundation-slot[data-slot-index="${target.slotIndex}"]`)
      ?.classList.add('highlight')
  } else {
    document
      .querySelector(`.tableau-stack[data-stack-index="${target.stackIndex}"]`)
      ?.classList.add('highlight')
  }
}

// ── Hide/show source cards during drag ─────────────────────

function setSourceVisibility(source: MoveSource, visible: boolean): void {
  if (source.kind === 'discard') {
    const el = document.querySelector<HTMLElement>('#discard-pile .card')
    if (el) el.style.opacity = visible ? '1' : '0'
    return
  }

  const state = getState()
  const stack = state.tableau[source.stackIndex]
  const movingCount = getMovingCards(source, state).length
  const startDepth = stack.cards.length - movingCount

  document
    .querySelectorAll<HTMLElement>(`.tableau-stack[data-stack-index="${source.stackIndex}"] .card`)
    .forEach((el, i) => {
      if (i >= startDepth) el.style.opacity = visible ? '1' : '0'
    })
}

// ── Pointer event handlers ─────────────────────────────────

function onPointerDown(e: PointerEvent): void {
  if (isGamePaused()) return
  const cardEl = (e.target as HTMLElement).closest<HTMLElement>('.card')
  if (!cardEl || cardEl.classList.contains('face-down')) return

  const state = getState()
  let source: MoveSource | null = null

  // Check if from discard
  if (cardEl.closest('#discard-pile')) {
    if (state.discard.length === 0) return
    source = { kind: 'discard' }
  }

  // Check if from tableau top
  const stackEl = cardEl.closest<HTMLElement>('.tableau-stack')
  if (stackEl) {
    const stackIndex = Number(stackEl.dataset.stackIndex)
    const stack = state.tableau[stackIndex]
    const depth = Number(cardEl.dataset.depth ?? stack.cards.length - 1)
    const isTop = depth === stack.cards.length - 1
    if (!isTop) return
    source = { kind: 'tableau', stackIndex, cardCount: 1 }
  }

  if (!source) return

  const movingCards = getMovingCards(source, state)
  if (movingCards.length === 0) return

  e.preventDefault()

  const rect = cardEl.getBoundingClientRect()
  const ghost = buildGhost(movingCards)
  ghost.style.left = `${rect.left}px`
  ghost.style.top = `${rect.top}px`

  session = {
    source,
    cards: movingCards,
    ghostEl: ghost,
    originEl: cardEl,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
  }

  setSourceVisibility(source, false)

  // Capture pointer so we keep getting events even outside the element
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent): void {
  if (!session) return
  e.preventDefault()
  moveGhost(e.clientX, e.clientY)

  const state = getState()
  const target = findDropTarget(e.clientX, e.clientY, state)
  highlightTarget(target)
}

function onPointerUp(e: PointerEvent): void {
  if (!session) return

  const state = getState()
  const target = findDropTarget(e.clientX, e.clientY, state)

  highlightTarget(null)
  removeGhost()

  if (target) {
    const next = applyMove({ source: session.source, target }, state)
    if (next) {
      session = null
      emit(next)
      return
    }
  }

  // Invalid drop — restore source visibility
  setSourceVisibility(session.source, true)
  session = null
}

// ── Init (once) ────────────────────────────────────────────

export function initDragHandler(
  initialState: GameState,
  onStateChange: (s: GameState) => void
): void {
  updateDragState(initialState, onStateChange)

  if (_listenersAttached) return
  _listenersAttached = true

  // Use document-level listeners so pointer capture works across all elements
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('pointermove', onPointerMove, { passive: false })
  document.addEventListener('pointerup', onPointerUp)
  document.addEventListener('pointercancel', onPointerUp)
}
