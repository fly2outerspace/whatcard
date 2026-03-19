import type { GameState, Card } from '../types/game'

const CARD_OVERLAP = 28  // px, must match --card-overlap in CSS

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

    const labelEl = document.createElement('span')
    labelEl.className = 'card-label'
    labelEl.textContent = card.label

    const catEl = document.createElement('span')
    catEl.className = 'card-category'
    catEl.textContent = card.category

    el.appendChild(labelEl)
    if (!card.isBase) el.appendChild(catEl)
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
      ? 96
      : 96 + (cardCount - 1) * CARD_OVERLAP
    el.style.minHeight = `${height}px`

    stack.cards.forEach((card, depth) => {
      const cardEl = createCardEl(card, !card.faceUp)
      cardEl.style.top = `${depth * CARD_OVERLAP}px`
      cardEl.dataset.stackIndex = String(stackIndex)
      cardEl.dataset.depth = String(depth)
      el.appendChild(cardEl)
    })
  })
}

// ── Foundations ────────────────────────────────────────────

function renderFoundations(state: GameState): void {
  state.foundations.forEach((slot, slotIndex) => {
    const el = document.querySelector<HTMLElement>(
      `.foundation-slot[data-slot-index="${slotIndex}"]`
    )
    if (!el) return
    el.innerHTML = ''

    if (slot.cards.length > 0) {
      const topCard = slot.cards.at(-1)!
      const cardEl = createCardEl(topCard)
      cardEl.style.position = 'relative'
      cardEl.style.cursor = 'default'

      // Show collected count
      const countEl = document.createElement('span')
      countEl.style.cssText = 'position:absolute;bottom:4px;right:6px;font-size:11px;opacity:0.5'
      countEl.textContent = `${slot.cards.length}`
      cardEl.appendChild(countEl)

      el.appendChild(cardEl)
    } else {
      el.textContent = '空'
      el.style.opacity = '0.3'
      el.style.fontSize = '12px'
    }

    if (slot.cards.length > 0) el.style.opacity = '1'
  })
}

// ── Stock ──────────────────────────────────────────────────

function renderStock(state: GameState): void {
  const el = document.getElementById('stock-pile')
  if (!el) return

  const countEl = el.querySelector('.stock-count')

  if (state.stock.length === 0) {
    el.innerHTML = '<span style="font-size:24px;opacity:0.4">↺</span>'
    const newCount = document.createElement('span')
    newCount.className = 'stock-count'
    newCount.textContent = '0'
    el.appendChild(newCount)
  } else {
    el.innerHTML = ''
    // Show card back on top of stock
    const backEl = document.createElement('div')
    backEl.className = 'card face-down'
    backEl.style.position = 'relative'
    backEl.style.cursor = 'pointer'
    el.appendChild(backEl)

    const count = document.createElement('span')
    count.className = 'stock-count'
    count.textContent = String(state.stock.length)
    el.appendChild(count)
  }

  void countEl  // suppress unused warning
}

// ── Discard ────────────────────────────────────────────────

function renderDiscard(state: GameState): void {
  const el = document.getElementById('discard-pile')
  if (!el) return
  el.innerHTML = ''

  const top = state.discard.at(-1)
  if (top) {
    const cardEl = createCardEl(top)
    cardEl.style.position = 'relative'
    cardEl.dataset.source = 'discard'
    el.appendChild(cardEl)
  }
}

// ── Moves counter ──────────────────────────────────────────

function renderMovesCounter(state: GameState): void {
  const el = document.getElementById('moves-value')
  if (el) el.textContent = String(state.movesLeft)
}
