import './style.css'
import { initGameState } from './game/GameState'
import { renderAll, syncState } from './ui/CardRenderer'
import { initClickHandler, updateHandlerState } from './ui/ClickHandler'
import { initDragHandler, updateDragState } from './ui/DragHandler'
import { initMenuHandler } from './ui/MenuHandler'
import { initDebugPanel, setDebugConfig, updateDebugStats } from './ui/DebugPanel'
import { generateFromConfig, DEFAULT_CONFIG } from './game/LevelGenerator'
import type { LevelConfig } from './game/LevelGenerator'
import type { LevelData, GameState } from './types/game'
import { LEVELS, LEVEL_CONFIGS } from './data/levels'
import {
  animateCardFlip,
  animateStockDraw,
  animateElimination,
  animateWinOverlay,
  animateLoseOverlay,
  animateMovesWarning,
} from './animations/CardAnimations'

// Active config — updated by debug panel
let activeConfig: LevelConfig = DEFAULT_CONFIG
const PROGRESS_KEY = 'whatcard.currentLevel'
const LEVEL_COUNT = 10

let currentLevel = loadProgress()
let inCustomMode = false
type OverlayAction = 'restart' | 'retry' | 'next'
let overlayAction: OverlayAction = 'restart'
let pendingNextLevel: number | null = null

// Previous game state snapshot for change detection
let _prevState: GameState | null = null

function clampLevel(level: number): number {
  return Math.max(1, Math.min(LEVEL_COUNT, level))
}

function loadProgress(): number {
  const raw = window.localStorage.getItem(PROGRESS_KEY)
  const parsed = raw ? Number(raw) : 1
  return clampLevel(Number.isFinite(parsed) ? parsed : 1)
}

function saveProgress(level: number): void {
  window.localStorage.setItem(PROGRESS_KEY, String(clampLevel(level)))
}

// ── Change detection helpers ────────────────────────────────

/** Return card IDs that became face-up between prevState and nextState. */
function getNewlyFlippedIds(prev: GameState | null, next: GameState): Set<string> {
  if (!prev) return new Set()

  const prevFaceUp = new Set<string>()
  for (const stack of prev.tableau) {
    for (const card of stack.cards) {
      if (card.faceUp) prevFaceUp.add(card.id)
    }
  }
  for (const card of prev.discard) {
    if (card.faceUp) prevFaceUp.add(card.id)
  }

  const flipped = new Set<string>()
  for (const stack of next.tableau) {
    for (const card of stack.cards) {
      if (card.faceUp && !prevFaceUp.has(card.id)) flipped.add(card.id)
    }
  }
  for (const card of next.discard) {
    if (card.faceUp && !prevFaceUp.has(card.id)) flipped.add(card.id)
  }

  return flipped
}

/** Return foundation slot indices where a category was just eliminated. */
function getEliminatedSlots(prev: GameState | null, next: GameState): number[] {
  if (!prev) return []
  const slots: number[] = []
  prev.foundations.forEach((prevSlot, i) => {
    const nextSlot = next.foundations[i]
    if (prevSlot.category !== null && nextSlot.category === null) {
      slots.push(i)
    }
  })
  return slots
}

/** True if discard pile just gained a new top card. */
function discardGainedCard(prev: GameState | null, next: GameState): boolean {
  if (!prev) return false
  return next.discard.length > prev.discard.length
}

// ── Overlay helpers ─────────────────────────────────────────

function handleWin(): void {
  if (!inCustomMode && currentLevel < LEVEL_COUNT) {
    pendingNextLevel = currentLevel + 1
    overlayAction = 'next'
    showOverlay(`🎉 通关！是否进入第 ${pendingNextLevel} 关？`, '进入下一关')
  } else if (!inCustomMode && currentLevel >= LEVEL_COUNT) {
    pendingNextLevel = null
    overlayAction = 'restart'
    showOverlay('🏆 全部 10 关已完成！', '再来一局')
  } else {
    pendingNextLevel = null
    overlayAction = 'restart'
    showOverlay('🎉 胜利！', '再来一局')
  }
}

function handleLose(): void {
  pendingNextLevel = null
  overlayAction = 'retry'
  showOverlay('😞 失败，步数耗尽', '重试本关')
}

// ── State change handler ────────────────────────────────────

function onStateChange(state: GameState): void {
  const prev = _prevState
  _prevState = state

  // Detect changes before re-render
  const flippedIds = getNewlyFlippedIds(prev, state)
  const eliminatedSlots = getEliminatedSlots(prev, state)
  const stockDraw = discardGainedCard(prev, state)

  // Capture stock pile position BEFORE re-render (needed for flip animation origin)
  const stockRect = stockDraw
    ? document.getElementById('stock-pile')?.getBoundingClientRect() ?? null
    : null

  // Re-render the entire board
  syncState(state)

  // Post-render: animate newly flipped cards
  if (flippedIds.size > 0) {
    document.querySelectorAll<HTMLElement>('.card:not(.face-down)').forEach(el => {
      if (flippedIds.has(el.dataset.cardId ?? '')) {
        animateCardFlip(el)
      }
    })
  }

  // Post-render: animate stock draw — card flips from stock (right) to discard (left)
  if (stockDraw && stockRect) {
    const discardCard = document.querySelector<HTMLElement>('#discard-pile .card')
    if (discardCard) animateStockDraw(stockRect, discardCard)
  }

  // Post-render: animate foundation slot for each elimination
  eliminatedSlots.forEach(i => {
    const slotEl = document.querySelector<HTMLElement>(
      `.foundation-slot[data-slot-index="${i}"]`
    )
    if (slotEl) animateElimination(slotEl)
  })

  // Warn when steps are low (≤ 10)
  if (prev && state.movesLeft <= 10 && state.movesLeft !== prev.movesLeft) {
    const counter = document.getElementById('moves-counter')
    if (counter) animateMovesWarning(counter)
  }

  updateHandlerState(state, onStateChange)
  updateDragState(state, onStateChange)

  if (state.isWon) handleWin()
  if (state.isLost) handleLose()
}

// ── Overlay ─────────────────────────────────────────────────

function showOverlay(message: string, buttonText: string): void {
  const overlay = document.getElementById('overlay')
  const content = document.getElementById('overlay-content')
  const title = document.getElementById('overlay-title')
  const btn = document.getElementById('overlay-btn') as HTMLButtonElement | null
  overlay?.classList.remove('hidden')
  if (title) title.textContent = message
  if (btn) btn.textContent = buttonText

  // Animate overlay content entrance
  if (content) {
    if (overlayAction === 'retry') {
      animateLoseOverlay(content)
    } else {
      animateWinOverlay(content)
    }
  }
}

function hideOverlay(): void {
  document.getElementById('overlay')?.classList.add('hidden')
}

// ── Start game ──────────────────────────────────────────────

function startGame(levelData?: LevelData): void {
  hideOverlay()
  pendingNextLevel = null

  let level: LevelData
  if (levelData) {
    level = levelData
  } else {
    const result = generateFromConfig(activeConfig)
    level = result
    updateDebugStats(result.stats)
  }

  const state = initGameState(level)
  _prevState = null  // Reset change-detection snapshot on new game
  renderAll(state)
  _prevState = state  // Set initial snapshot after first render
  initClickHandler(state, onStateChange)
  initDragHandler(state, onStateChange)
  initMenuHandler(
    () => {
      if (inCustomMode) startGame()
      else startCampaignLevel(currentLevel)
    },
    (selectedLevel: number) => startCampaignLevel(selectedLevel),
    currentLevel
  )
}

function startCampaignLevel(level: number): void {
  inCustomMode = false
  currentLevel = clampLevel(level)
  saveProgress(currentLevel)
  // Align debug panel baseline to this campaign level config (DEV only).
  setDebugConfig(LEVEL_CONFIGS[currentLevel - 1])
  startGame(LEVELS[currentLevel - 1])
}

// ── Debug panel integration ─────────────────────────────────

initDebugPanel((config: LevelConfig) => {
  activeConfig = config
  inCustomMode = true
  const result = generateFromConfig(config)
  updateDebugStats(result.stats)
  startGame(result)
})

// ── Bootstrap ───────────────────────────────────────────────

document.getElementById('overlay-btn')?.addEventListener('click', () => {
  if (overlayAction === 'next' && !inCustomMode && pendingNextLevel) {
    startCampaignLevel(pendingNextLevel)
    return
  }
  if (overlayAction === 'retry' && !inCustomMode) {
    startCampaignLevel(currentLevel)
    return
  }
  // restart/custom
  if (inCustomMode) startGame()
  else startCampaignLevel(currentLevel)
})

// Debug force win/lose (DEV only UI triggers)
window.addEventListener('whatcard:forceWin', () => {
  handleWin()
})

window.addEventListener('whatcard:forceLose', () => {
  handleLose()
})

startCampaignLevel(currentLevel)
