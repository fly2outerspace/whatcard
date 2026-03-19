import type { LevelConfig, GenerationStats } from '../game/LevelGenerator'
import { CATEGORY_NAMES } from '../game/LevelGenerator'

/**
 * Debug panel — only rendered in dev mode (import.meta.env.DEV).
 * Provides controls for LevelConfig parameters and shows generation stats.
 */

let _onApply: ((config: LevelConfig) => void) | null = null
let _currentConfig: LevelConfig | null = null

// ── DOM creation ───────────────────────────────────────────

function createPanel(): void {
  const panel = document.createElement('div')
  panel.id = 'debug-panel'
  panel.innerHTML = `
    <button id="debug-toggle" title="调试面板">🔧</button>
    <div id="debug-content" class="debug-hidden">
      <div class="debug-header">
        <span>调试面板</span>
        <button id="debug-close">✕</button>
      </div>

      <div class="debug-row">
        <label>类别数量 <b id="dv-cat-count">2</b></label>
        <input type="range" id="d-cat-count" min="2" max="5" value="2" step="1">
      </div>

      <div id="d-cat-rows"></div>

      <div class="debug-row">
        <label>movesBack <b id="dv-moves-back">18</b></label>
        <input type="range" id="d-moves-back" min="8" max="50" value="18" step="1">
      </div>

      <div class="debug-row">
        <label>步数倍率</label>
        <input type="number" id="d-moves-mult" value="1.6" min="1.0" max="4.0" step="0.1"
               style="width:64px;padding:2px 4px;border-radius:4px;border:1px solid #ccc">
      </div>

      <div class="debug-row">
        <label>随机种子</label>
        <input type="number" id="d-seed" placeholder="空=随机"
               style="width:90px;padding:2px 4px;border-radius:4px;border:1px solid #ccc">
      </div>

      <button id="debug-apply">⚡ 生成并应用</button>

      <div id="debug-stats" class="debug-stats"></div>
    </div>
  `
  document.body.appendChild(panel)
}

// ── Per-category card count rows ───────────────────────────

function renderCatRows(catCount: number, currentCounts: number[]): void {
  const container = document.getElementById('d-cat-rows')!
  container.innerHTML = ''

  for (let i = 0; i < catCount; i++) {
    const name = CATEGORY_NAMES[i]
    const val = currentCounts[i] ?? 3
    const row = document.createElement('div')
    row.className = 'debug-row debug-cat-row'
    row.innerHTML = `
      <label>${name} 牌数 <b id="dv-cat-${i}">${val}</b></label>
      <input type="range" id="d-cat-${i}" min="2" max="7" value="${val}" step="1"
             data-cat-index="${i}">
    `
    container.appendChild(row)

    row.querySelector<HTMLInputElement>(`#d-cat-${i}`)!.addEventListener('input', e => {
      const el = e.target as HTMLInputElement
      document.getElementById(`dv-cat-${i}`)!.textContent = el.value
    })
  }
}

// ── Stats display ──────────────────────────────────────────

export function updateDebugStats(stats: GenerationStats): void {
  const el = document.getElementById('debug-stats')
  if (!el) return
  el.innerHTML = `
    <div class="stat-row"><span>总牌数</span><b>${stats.totalCards}</b></div>
    <div class="stat-row"><span>Tableau / Stock</span><b>${stats.tableauCards} / ${stats.stockCards}</b></div>
    <div class="stat-row"><span>实际反推步数</span><b>${stats.appliedMoves}</b></div>
    <div class="stat-row"><span>步数上限</span><b>${stats.movesLimit}</b></div>
    <div class="stat-row"><span>理论余量</span><b>${stats.movesLimit - stats.appliedMoves} 步</b></div>
  `
}

// ── Read current form values → LevelConfig ─────────────────

function readConfig(): LevelConfig {
  const catCount = Number((document.getElementById('d-cat-count') as HTMLInputElement).value)
  const movesBack = Number((document.getElementById('d-moves-back') as HTMLInputElement).value)
  const mult = Number((document.getElementById('d-moves-mult') as HTMLInputElement).value)
  const seedRaw = (document.getElementById('d-seed') as HTMLInputElement).value.trim()
  const seed = seedRaw ? Number(seedRaw) : undefined

  const categories = CATEGORY_NAMES.slice(0, catCount).map((name, i) => {
    const slider = document.getElementById(`d-cat-${i}`) as HTMLInputElement | null
    return { name, cardCount: slider ? Number(slider.value) : 3 }
  })

  return { categories, movesBack, movesLimitMultiplier: mult, seed }
}

// ── Wire events ────────────────────────────────────────────

function wireEvents(): void {
  const toggle = document.getElementById('debug-toggle')!
  const content = document.getElementById('debug-content')!
  const closeBtn = document.getElementById('debug-close')!
  const catCountSlider = document.getElementById('d-cat-count') as HTMLInputElement
  const movesBackSlider = document.getElementById('d-moves-back') as HTMLInputElement
  const applyBtn = document.getElementById('debug-apply')!

  // Toggle panel
  toggle.addEventListener('click', () => content.classList.toggle('debug-hidden'))
  closeBtn.addEventListener('click', () => content.classList.add('debug-hidden'))

  // Category count change → rebuild rows
  let catCounts: number[] = [3, 3, 3, 3, 3]
  catCountSlider.addEventListener('input', () => {
    const n = Number(catCountSlider.value)
    document.getElementById('dv-cat-count')!.textContent = String(n)
    // Save current counts before re-render
    for (let i = 0; i < 5; i++) {
      const el = document.getElementById(`d-cat-${i}`) as HTMLInputElement | null
      if (el) catCounts[i] = Number(el.value)
    }
    renderCatRows(n, catCounts)
  })

  movesBackSlider.addEventListener('input', () => {
    document.getElementById('dv-moves-back')!.textContent = movesBackSlider.value
  })

  applyBtn.addEventListener('click', () => {
    const config = readConfig()
    _currentConfig = config
    _onApply?.(config)
  })

  // Initial cat rows
  renderCatRows(2, catCounts)
}

// ── Public API ─────────────────────────────────────────────

/**
 * Initialize the debug panel (DEV only).
 * `onApply` is called with the current LevelConfig when "生成并应用" is clicked.
 */
export function initDebugPanel(onApply: (config: LevelConfig) => void): void {
  if (!import.meta.env.DEV) return

  _onApply = onApply
  createPanel()
  injectStyles()
  wireEvents()
}

export function getDebugConfig(): LevelConfig | null {
  return _currentConfig
}

// ── Inline styles (dev only, no production impact) ─────────

function injectStyles(): void {
  const style = document.createElement('style')
  style.textContent = `
    #debug-panel {
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 9999;
      font-family: system-ui, sans-serif;
      font-size: 13px;
    }

    #debug-toggle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: rgba(0,0,0,0.7);
      color: #fff;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }

    #debug-content {
      position: absolute;
      bottom: 50px;
      right: 0;
      width: 240px;
      background: #1e1e2e;
      color: #cdd6f4;
      border-radius: 12px;
      padding: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    #debug-content.debug-hidden { display: none; }

    .debug-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 700;
      font-size: 14px;
      color: #cba6f7;
      margin-bottom: 4px;
    }

    #debug-close {
      background: none;
      border: none;
      color: #6c7086;
      cursor: pointer;
      font-size: 14px;
    }

    .debug-row {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .debug-row label {
      display: flex;
      justify-content: space-between;
      color: #a6adc8;
      font-size: 12px;
    }

    .debug-row label b { color: #89b4fa; }

    .debug-row input[type=range] {
      width: 100%;
      accent-color: #89b4fa;
    }

    .debug-cat-row { margin-left: 8px; border-left: 2px solid #313244; padding-left: 8px; }

    #debug-apply {
      margin-top: 4px;
      padding: 8px;
      background: #a6e3a1;
      color: #1e1e2e;
      border: none;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
      font-size: 13px;
    }

    #debug-apply:hover { background: #94e2a1; }

    .debug-stats {
      background: #181825;
      border-radius: 8px;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #a6adc8;
    }

    .stat-row b { color: #f9e2af; }
  `
  document.head.appendChild(style)
}
