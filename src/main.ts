import './style.css'
import { initGameState } from './game/GameState'
import { renderAll, syncState } from './ui/CardRenderer'
import { initClickHandler, updateHandlerState } from './ui/ClickHandler'
import { initDragHandler, updateDragState } from './ui/DragHandler'
import { initMenuHandler } from './ui/MenuHandler'
import { initDebugPanel, updateDebugStats } from './ui/DebugPanel'
import { generateFromConfig, DEFAULT_CONFIG } from './game/LevelGenerator'
import type { LevelConfig } from './game/LevelGenerator'
import type { LevelData } from './types/game'

// Active config — updated by debug panel
let activeConfig: LevelConfig = DEFAULT_CONFIG

// ── State change handler ───────────────────────────────────

function onStateChange(state: ReturnType<typeof initGameState>): void {
  syncState(state)
  updateHandlerState(state, onStateChange)
  updateDragState(state, onStateChange)

  if (state.isWon) showOverlay('🎉 胜利！')
  if (state.isLost) showOverlay('😞 失败，步数耗尽')
}

// ── Overlay ────────────────────────────────────────────────

function showOverlay(message: string): void {
  const overlay = document.getElementById('overlay')
  const title = document.getElementById('overlay-title')
  overlay?.classList.remove('hidden')
  if (title) title.textContent = message
}

function hideOverlay(): void {
  document.getElementById('overlay')?.classList.add('hidden')
}

// ── Start game ─────────────────────────────────────────────

function startGame(levelData?: LevelData): void {
  hideOverlay()

  let level: LevelData
  if (levelData) {
    level = levelData
  } else {
    const result = generateFromConfig(activeConfig)
    level = result
    updateDebugStats(result.stats)
  }

  const state = initGameState(level)
  renderAll(state)
  initClickHandler(state, onStateChange)
  initDragHandler(state, onStateChange)
  initMenuHandler(startGame)
}

// ── Debug panel integration ────────────────────────────────

initDebugPanel((config: LevelConfig) => {
  activeConfig = config
  const result = generateFromConfig(config)
  updateDebugStats(result.stats)
  startGame(result)
})

// ── Bootstrap ──────────────────────────────────────────────

document.getElementById('overlay-btn')?.addEventListener('click', () => startGame())
startGame()
