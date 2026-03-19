import { gsap } from 'gsap'
import type { GameState, MoveSource, MoveTarget, Card } from '../types/game'
import { isValidMove, getMovingCards } from '../game/MoveValidator'
import { applyMove } from '../game/GameState'
import { createCardEl } from './CardRenderer'
import { isGamePaused } from './MenuHandler'
import { animateLift, animateFlyTo, animateSnapBack } from '../animations/CardAnimations'

const CARD_OVERLAP_PX = 42  // px, must match --card-overlap in CSS
const CARD_W_PX = 108       // px, must match --card-w in CSS
const CARD_H_PX = 144       // px, must match --card-h in CSS

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
  originRect: DOMRect      // bounding rect at drag start (for snap-back)
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
    transform-origin: top center;
  `
  const OVERLAP = CARD_OVERLAP_PX
  ghost.style.width = `${CARD_W_PX}px`
  ghost.style.height = `${CARD_H_PX + (cards.length - 1) * OVERLAP}px`

  cards.forEach((card, i) => {
    const el = createCardEl(card)
    el.style.top = `${i * OVERLAP}px`
    el.classList.add('dragging')
    // Non-top cards in the ghost stack should show the peek label, same as tableau
    if (i < cards.length - 1) el.classList.add('is-covered')
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


// ── Get rect for the drop target (where ghost should fly to) ──

function getDropTargetRect(target: MoveTarget, state: GameState): DOMRect | null {
  if (target.kind === 'foundation') {
    return document
      .querySelector<HTMLElement>(`.foundation-slot[data-slot-index="${target.slotIndex}"]`)
      ?.getBoundingClientRect() ?? null
  }

  // Tableau: the new card lands on top of the current stack
  const stackEl = document.querySelector<HTMLElement>(
    `.tableau-stack[data-stack-index="${target.stackIndex}"]`
  )
  if (!stackEl) return null

  const stackRect = stackEl.getBoundingClientRect()
  const cardCount = state.tableau[target.stackIndex].cards.length

  return new DOMRect(
    stackRect.left,
    stackRect.top + cardCount * CARD_OVERLAP_PX,
    stackRect.width,
    stackRect.height,
  )
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

  // Guard: don't start a new drag while an animation is in progress
  if (session) return

  // Clear any stale click-selection visual before starting drag
  document.querySelectorAll<HTMLElement>('.card.selected').forEach(el =>
    el.classList.remove('selected')
  )

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

  const topCardRect = cardEl.getBoundingClientRect()
  const groupSize = movingCards.length

  // movingCards is ordered bottom-to-top (cards.slice), so cards[0] is the
  // bottommost card of the group, rendered first in the ghost at top:0.
  // The ghost must be positioned at cards[0]'s screen position, NOT the top
  // card's position — otherwise the entire group is offset downward by
  // (groupSize-1)*OVERLAP pixels, causing the fly-to misalignment bug.
  const ghostLeft = topCardRect.left
  const ghostTop  = topCardRect.top - (groupSize - 1) * CARD_OVERLAP_PX

  const ghost = buildGhost(movingCards)
  ghost.style.left = `${ghostLeft}px`
  ghost.style.top  = `${ghostTop}px`

  session = {
    source,
    cards: movingCards,
    ghostEl: ghost,
    originEl: cardEl,
    originRect: new DOMRect(ghostLeft, ghostTop, topCardRect.width, topCardRect.height),
    offsetX: e.clientX - ghostLeft,
    offsetY: e.clientY - ghostTop,
  }

  setSourceVisibility(source, false)

  // Lift animation — ghost scales up slightly
  animateLift(ghost)

  // Capture pointer so we keep getting events even outside the element
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent): void {
  if (!session) return
  e.preventDefault()
  moveGhost(e.clientX, e.clientY)
}

function onPointerUp(e: PointerEvent): void {
  if (!session) return

  const state = getState()
  const target = findDropTarget(e.clientX, e.clientY, state)

  if (target) {
    const next = applyMove({ source: session.source, target }, state)
    if (next) {
      // Fly ghost to target position, then trigger state change
      const capturedSession = session
      session = null  // block new drags during flight

      const targetRect = getDropTargetRect(target, state)
      if (targetRect) {
        // Kill any in-progress lift tween so fly-to takes over cleanly
        gsap.killTweensOf(capturedSession.ghostEl)
        animateFlyTo(capturedSession.ghostEl, targetRect, () => {
          capturedSession.ghostEl.remove()
          emit(next)
        })
      } else {
        capturedSession.ghostEl.remove()
        emit(next)
      }
      return
    }
  }

  // Invalid drop — snap ghost back to origin
  const capturedSession = session
  session = null  // block new drags during snap-back

  gsap.killTweensOf(capturedSession.ghostEl)
  animateSnapBack(capturedSession.ghostEl, capturedSession.originRect, () => {
    setSourceVisibility(capturedSession.source, true)
    capturedSession.ghostEl.remove()
  })
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
