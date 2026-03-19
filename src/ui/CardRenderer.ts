import type { GameState, Card } from '../types/game'

const CARD_OVERLAP = 42  // px, must match --card-overlap in CSS
const CARD_H = 144       // px, must match --card-h in CSS
const CARD_FAN = 38      // px, must match --card-fan in CSS
/** Vertical offset per stock back layer; must match `.stock-back-layer` top step in CSS */
const STOCK_LAYER_STEP_PX = 4

/**
 * Create a card DOM element.
 */
export function createCardEl(card: Card, faceDown = false): HTMLElement {
  const el = document.createElement('div')
  el.className = 'card'
  el.dataset.cardId = card.id
  el.dataset.category = card.category

  if (faceDown) {
    el.classList.add('face-down')
    el.draggable = false
  } else {
    if (card.isBase) el.classList.add('base-card')

    // Peek label shown at top of card when covered vertically in tableau
    const peekEl = document.createElement('span')
    peekEl.className = 'card-peek'
    peekEl.textContent = card.label
    el.appendChild(peekEl)

    // Fan label shown rotated on right edge when covered horizontally in discard fan
    const fanLabelEl = document.createElement('span')
    fanLabelEl.className = 'card-fan-label'
    fanLabelEl.textContent = card.label
    el.appendChild(fanLabelEl)

    const labelEl = document.createElement('span')
    labelEl.className = 'card-label'
    labelEl.textContent = card.label
    el.appendChild(labelEl)

  }

  return el
}

/**
 * Full re-render of the entire game board from state.
 * Called once on init; subsequent updates call syncState.
 */
export function renderAll(state: GameState): void {
  renderTableau(state)
  renderFoundations(state)
  renderStock(state)
  renderDiscard(state)
  renderMovesCounter(state)
}

export function syncState(state: GameState): void {
  renderAll(state)
}

// ── Tableau ────────────────────────────────────────────────

function renderTableau(state: GameState): void {
  state.tableau.forEach((stack, stackIndex) => {
    const el = document.querySelector<HTMLElement>(
      `.tableau-stack[data-stack-index="${stackIndex}"]`
    )
    if (!el) return
    el.innerHTML = ''

    // Set container height to fit all cards
    const cardCount = stack.cards.length
    const height = cardCount === 0
      ? CARD_H
      : CARD_H + (cardCount - 1) * CARD_OVERLAP
    el.style.minHeight = `${height}px`

    stack.cards.forEach((card, depth) => {
      const cardEl = createCardEl(card, !card.faceUp)
      cardEl.style.top = `${depth * CARD_OVERLAP}px`
      cardEl.dataset.stackIndex = String(stackIndex)
      cardEl.dataset.depth = String(depth)
      // Mark face-up cards that are covered by another card on top
      if (card.faceUp && depth < cardCount - 1) {
        cardEl.classList.add('is-covered')
      }
      el.appendChild(cardEl)
    })
  })
}

// ── Foundations ────────────────────────────────────────────

/** Count all non-base cards of a category across the entire game state. */
function computeCategoryTotal(state: GameState, category: string): number {
  const allCards = [
    ...state.tableau.flatMap(s => s.cards),
    ...state.stock,
    ...state.discard,
    ...state.foundations.flatMap(f => f.cards),
  ]
  return allCards.filter(c => c.category === category && !c.isBase).length
}

function renderFoundations(state: GameState): void {
  state.foundations.forEach((slot, slotIndex) => {
    const el = document.querySelector<HTMLElement>(
      `.foundation-slot[data-slot-index="${slotIndex}"]`
    )
    if (!el) return
    el.innerHTML = ''

    if (slot.cards.length > 0) {
      const hasNonBase = slot.cards.length > 1

      if (hasNonBase) {
        // Base card peeks as a small category badge at the top-left of the slot
        const baseCard = slot.cards[0]
        const catBadge = document.createElement('span')
        catBadge.className = 'foundation-cat-badge'
        catBadge.textContent = baseCard.category
        catBadge.style.background = `var(--cat-${baseCard.category}-color)`
        el.appendChild(catBadge)
      }

      // Show the top card (base card when alone; top non-base card otherwise)
      const topCard = slot.cards.at(-1)!
      const cardEl = createCardEl(topCard)
      cardEl.style.position = 'relative'
      cardEl.style.cursor = 'default'

      if (hasNonBase && slot.category) {
        // Progress badge "collected / total" at top-right of the top card
        const collected = slot.cards.length - 1
        const total = computeCategoryTotal(state, slot.category)
        const progressEl = document.createElement('span')
        progressEl.className = 'foundation-progress'
        progressEl.textContent = `${collected}/${total}`
        cardEl.appendChild(progressEl)
      }

      el.appendChild(cardEl)
      el.style.opacity = '1'
    } else {
      // Empty slot placeholder
      const placeholder = document.createElement('span')
      placeholder.className = 'slot-placeholder'
      placeholder.textContent = '空槽'
      el.appendChild(placeholder)
      el.style.opacity = '1'
    }
  })
}

// ── Stock ──────────────────────────────────────────────────

function renderStock(state: GameState): void {
  const el = document.getElementById('stock-pile')
  if (!el) return

  if (state.stock.length === 0) {
    el.style.minHeight = ''
    el.innerHTML = '<span style="font-size:26px;opacity:0.45;pointer-events:none">↺</span>'
    const newCount = document.createElement('span')
    newCount.className = 'stock-count'
    newCount.textContent = '0'
    el.appendChild(newCount)
  } else {
    el.innerHTML = ''
    // Show stock thickness with up to 4 visible back layers.
    // As count drops to 3/2/1, visible thickness reduces accordingly.
    const layerCount = Math.min(4, state.stock.length)
    // Grow pile box so bottom includes the lowest back layer (flex bottom-align works)
    const extraBottom = (layerCount - 1) * STOCK_LAYER_STEP_PX
    el.style.minHeight = `${CARD_H + extraBottom}px`

    for (let i = layerCount - 1; i >= 0; i--) {
      const backEl = document.createElement('div')
      backEl.className = 'card face-down stock-back-layer'
      backEl.style.setProperty('--stock-layer-index', String(i))
      backEl.style.cursor = i === 0 ? 'pointer' : 'default'
      if (i > 0) backEl.style.pointerEvents = 'none'
      el.appendChild(backEl)
    }

    const count = document.createElement('span')
    count.className = 'stock-count'
    count.textContent = String(state.stock.length)
    el.appendChild(count)
  }
}

// ── Discard ────────────────────────────────────────────────

function renderDiscard(state: GameState): void {
  const el = document.getElementById('discard-pile')
  if (!el) return
  el.innerHTML = ''

  if (state.discard.length === 0) {
    return
  }

  // Show up to 3 top cards fanned horizontally.
  // Newest card (top of stack) is leftmost; older cards extend to the right.
  // Each older card is offset by CARD_FAN px and sits behind the newer card.
  const visibleCount = Math.min(state.discard.length, 3)
  const visibleCards = state.discard.slice(-visibleCount).reverse()
  // visibleCards[0] = newest (leftmost, on top), [1] = second, [2] = oldest visible

  visibleCards.forEach((card, i) => {
    const cardEl = createCardEl(card)
    cardEl.style.position = 'absolute'
    cardEl.style.left = `${i * CARD_FAN}px`
    cardEl.style.top = '0'
    cardEl.style.zIndex = String(visibleCount - i)  // newest has highest z-index

    if (i === 0) {
      // Only the top (newest) card is interactive
      cardEl.dataset.source = 'discard'
    } else {
      // Older cards in the fan: show rotated label, no interaction
      cardEl.classList.add('fan-covered')
      cardEl.style.pointerEvents = 'none'
    }

    el.appendChild(cardEl)
  })
}

// ── Moves counter ──────────────────────────────────────────

function renderMovesCounter(state: GameState): void {
  const el = document.getElementById('moves-value')
  if (el) el.textContent = String(state.movesLeft)

  // Update warning class on the counter container
  const counter = document.getElementById('moves-counter')
  if (counter) {
    counter.classList.toggle('low-steps', state.movesLeft <= 10 && state.movesLeft > 5)
    counter.classList.toggle('critical-steps', state.movesLeft <= 5)
  }
}
