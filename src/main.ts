import './style.css'
import { initGameState } from './game/GameState'
import { renderAll, syncState } from './ui/CardRenderer'
import { initClickHandler, updateHandlerState } from './ui/ClickHandler'
import { initDragHandler, updateDragState } from './ui/DragHandler'
import { initMenuHandler } from './ui/MenuHandler'
import { initDebugPanel, setDebugConfig, updateDebugStats } from './ui/DebugPanel'
import { generateFromConfig, DEFAULT_CONFIG } from './game/LevelGenerator'
import type { LevelConfig } from './game/LevelGenerator'
import type { LevelData } from './types/game'
import { LEVELS, LEVEL_CONFIGS } from './data/levels'

// Active config — updated by debug panel
let activeConfig: LevelConfig = DEFAULT_CONFIG
const PROGRESS_KEY = 'whatcard.currentLevel'
const LEVEL_COUNT = 10

let currentLevel = loadProgress()
let inCustomMode = false
type OverlayAction = 'restart' | 'retry' | 'next'
let overlayAction: OverlayAction = 'restart'
let pendingNextLevel: number | null = null

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

// ── State change handler ───────────────────────────────────

function onStateChange(state: ReturnType<typeof initGameState>): void {
  syncState(state)
  updateHandlerState(state, onStateChange)
  updateDragState(state, onStateChange)

  if (state.isWon) handleWin()
  if (state.isLost) handleLose()
}

// ── Overlay ────────────────────────────────────────────────

function showOverlay(message: string, buttonText: string): void {
  const overlay = document.getElementById('overlay')
  const title = document.getElementById('overlay-title')
  const btn = document.getElementById('overlay-btn') as HTMLButtonElement | null
  overlay?.classList.remove('hidden')
  if (title) title.textContent = message
  if (btn) btn.textContent = buttonText
}

function hideOverlay(): void {
  document.getElementById('overlay')?.classList.add('hidden')
}

// ── Start game ─────────────────────────────────────────────

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
  renderAll(state)
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

// ── Debug panel integration ────────────────────────────────

initDebugPanel((config: LevelConfig) => {
  activeConfig = config
  inCustomMode = true
  const result = generateFromConfig(config)
  updateDebugStats(result.stats)
  startGame(result)
})

// ── Bootstrap ──────────────────────────────────────────────

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
