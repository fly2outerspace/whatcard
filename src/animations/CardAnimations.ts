import { gsap } from 'gsap'

/** Stock→discard flip: short phases keep pace snappy but long enough to read the flip. */
const STOCK_DRAW_PHASE_S = 0.075

// ── Drag animations ────────────────────────────────────────

/**
 * Scale up a dragged card group to give a "lift from table" sensation.
 */
export function animateLift(el: HTMLElement): void {
  gsap.to(el, {
    scale: 1.07,
    duration: 0.14,
    ease: 'power2.out',
  })
}

/**
 * Fly the ghost card group to the drop target position on valid drop.
 * Calls onComplete after animation finishes.
 */
export function animateFlyTo(
  el: HTMLElement,
  targetRect: DOMRect,
  onComplete: () => void,
): void {
  gsap.to(el, {
    left: targetRect.left,
    top: targetRect.top,
    scale: 1,
    duration: 0.2,
    ease: 'back.out(1.3)',
    onComplete,
  })
}

/**
 * Snap-back animation on invalid drop.
 * Uses power3.out (no overshoot) so the ghost lands exactly at originRect
 * without any visual displacement — eliminating the perceived gap between
 * where the ghost settles and where the card appears after being revealed.
 */
export function animateSnapBack(
  el: HTMLElement,
  originRect: DOMRect,
  onComplete: () => void,
): void {
  gsap.to(el, {
    left: originRect.left,
    top: originRect.top,
    scale: 1,
    duration: 0.28,
    ease: 'power3.out',
    onComplete,
  })
}

// ── Card reveal animations ─────────────────────────────────

/**
 * Y-axis flip reveal for a newly face-up card.
 * The element must already be in the face-up state before calling.
 */
export function animateCardFlip(el: HTMLElement): void {
  gsap.fromTo(
    el,
    { rotationY: -90, opacity: 0 },
    { rotationY: 0, opacity: 1, duration: 0.48, ease: 'power2.out' },
  )
}

/**
 * Flip animation for a card drawn from stock to discard.
 *
 * The card appears to fly from the stock pile (right) to the discard pile (left)
 * while flipping over mid-air:
 *   Phase 1 — face-down card compresses horizontally to a thin line  (scaleX 1→0)
 *   Mid     — card face is revealed (remove .flip-back)
 *   Phase 2 — face-up card expands and lands on the discard pile     (scaleX 0→1)
 *   Duration per phase: STOCK_DRAW_PHASE_S (~75ms).
 *
 * @param stockRect   BoundingClientRect of the stock pile (captured before syncState)
 * @param discardCardEl  The newly rendered face-up card inside #discard-pile
 */
export function animateStockDraw(stockRect: DOMRect, discardCardEl: HTMLElement): void {
  const discardRect = discardCardEl.getBoundingClientRect()

  // Horizontal offset: how far right the stock pile is relative to the discard card
  const dx = stockRect.left + stockRect.width / 2 - (discardRect.left + discardRect.width / 2)
  const dy = stockRect.top  - discardRect.top

  // Start in face-down appearance at the stock position
  discardCardEl.classList.add('flip-back')

  const tl = gsap.timeline()
  tl
    // Phase 1: face-down, fly halfway, compress to thin vertical line
    .fromTo(
      discardCardEl,
      { x: dx, y: dy, scaleX: 1 },
      {
        x: dx * 0.5,
        y: dy * 0.5,
        scaleX: 0,
        duration: STOCK_DRAW_PHASE_S,
        ease: 'power3.in',
      },
    )
    // Mid-flip: thin edge; reveal face-up card
    .add(() => discardCardEl.classList.remove('flip-back'))
    // Phase 2: face-up card expands and lands on discard
    .to(discardCardEl, {
      x: 0,
      y: 0,
      scaleX: 1,
      duration: STOCK_DRAW_PHASE_S,
      ease: 'power3.out',
    })
}

// ── Foundation elimination ─────────────────────────────────

/**
 * Burst / flash animation when a category is eliminated from a foundation slot.
 * Temporarily lifts overflow clipping on #foundation-area so the scale-up and
 * box-shadow glow are not clipped on any side.
 */
export function animateElimination(slotEl: HTMLElement): void {
  const area = document.getElementById('foundation-area')
  if (area) area.style.overflow = 'visible'

  const tl = gsap.timeline()
  tl.to(slotEl, { scale: 1.35, duration: 0.15, ease: 'power2.out' })
    .to(slotEl, { scale: 1, duration: 0.25, ease: 'elastic.out(1.2, 0.4)' })

  // Remove glow class and restore overflow after the full glow duration (600ms)
  slotEl.classList.add('eliminating')
  setTimeout(() => {
    slotEl.classList.remove('eliminating')
    if (area) area.style.overflow = ''
  }, 600)
}

// ── Game-end overlays ──────────────────────────────────────

/**
 * Win: overlay content bounces in from below.
 */
export function animateWinOverlay(contentEl: HTMLElement): void {
  gsap.set(contentEl, { opacity: 0, scale: 0.45, y: 36 })
  gsap.to(contentEl, {
    opacity: 1,
    scale: 1,
    y: 0,
    duration: 0.55,
    // Strong back.out overshoots past scale 1 — clips on short mobile viewports
    ease: 'back.out(1.25)',
  })
}

/**
 * Lose: board shakes then overlay fades in.
 */
export function animateLoseOverlay(contentEl: HTMLElement): void {
  // Horizontal shake on the whole app
  const app = document.getElementById('app')
  if (app) {
    gsap.to(app, {
      keyframes: [
        { x: -11, duration: 0.07 },
        { x: 11, duration: 0.07 },
        { x: -9, duration: 0.07 },
        { x: 9, duration: 0.07 },
        { x: -5, duration: 0.07 },
        { x: 5, duration: 0.07 },
        { x: 0, duration: 0.07 },
      ],
    })
  }

  gsap.set(contentEl, { opacity: 0, scale: 0.88, y: -24 })
  gsap.to(contentEl, {
    opacity: 1,
    scale: 1,
    y: 0,
    duration: 0.38,
    ease: 'power3.out',
    delay: 0.22,
  })
}

// ── Steps counter warning ──────────────────────────────────

/**
 * Pulse the moves counter when steps are running low (≤ 10).
 */
export function animateMovesWarning(counterEl: HTMLElement): void {
  gsap.fromTo(
    counterEl,
    { scale: 1 },
    { scale: 1.18, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' },
  )
}
