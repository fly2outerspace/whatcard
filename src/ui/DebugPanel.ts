import type { LevelConfig, GenerationStats } from '../game/LevelGenerator'
import { CATEGORY_NAMES } from '../game/LevelGenerator'
import { batchGreedyTest } from '../game/GreedyBot'

/**
 * Debug panel — only rendered in dev mode (import.meta.env.DEV).
 * Provides controls for LevelConfig parameters and shows generation stats.
 */

let _onApply: ((config: LevelConfig) => void) | null = null
let _currentConfig: LevelConfig | null = null
let _lastCatCounts: number[] = Array.from({ length: CATEGORY_NAMES.length }, () => 4)

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
        <input type="range" id="d-cat-count" min="2" max="12" value="2" step="1">
      </div>

      <div id="d-cat-rows"></div>

      <div class="debug-row">
        <label>总步数上限（movesLimit）</label>
        <input type="number" id="d-moves-limit" value="120" min="1" max="999" step="1"
               style="width:90px;padding:2px 4px;border-radius:4px;border:1px solid #ccc">
      </div>

      <div class="debug-row">
        <label>随机种子</label>
        <input type="number" id="d-seed" placeholder="空=随机"
               style="width:90px;padding:2px 4px;border-radius:4px;border:1px solid #ccc">
      </div>

      <button id="debug-apply">⚡ 生成并应用</button>
      <button id="debug-bot-100" type="button">🤖 贪心 Bot ×100（当前参数）</button>
      <div class="debug-row" style="margin-top:6px">
        <label>测试快捷操作</label>
        <div style="display:flex;gap:8px">
          <button id="debug-force-win" type="button" style="flex:1;padding:8px;border-radius:8px;border:none;background:#a6e3a1;color:#1e1e2e;font-weight:800;cursor:pointer">强制胜利</button>
          <button id="debug-force-lose" type="button" style="flex:1;padding:8px;border-radius:8px;border:none;background:#f38ba8;color:#1e1e2e;font-weight:800;cursor:pointer">强制失败</button>
        </div>
      </div>

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
      <input type="range" id="d-cat-${i}" min="2" max="8" value="${val}" step="1"
             data-cat-index="${i}">
    `
    container.appendChild(row)

    row.querySelector<HTMLInputElement>(`#d-cat-${i}`)!.addEventListener('input', e => {
      const el = e.target as HTMLInputElement
      document.getElementById(`dv-cat-${i}`)!.textContent = el.value
      _lastCatCounts[i] = Number(el.value)
    })
  }
}

// ── Stats display ──────────────────────────────────────────

export function updateDebugStats(stats: GenerationStats): void {
  const el = document.getElementById('debug-stats')
  if (!el) return
  el.innerHTML = `
    <div class="stat-row"><span>总牌数</span><b>${stats.totalCards}</b></div>
    <div class="stat-row"><span>Tableau 目标深度 (L→R)</span><b>${stats.targetDepths.join(' / ')}</b></div>
    <div class="stat-row"><span>Tableau 实际 / Stock</span><b>${stats.tableauCards} / ${stats.stockCards}</b></div>
    <div class="stat-row"><span>步数上限（movesLimit）</span><b>${stats.movesLimit}</b></div>
  `
}

// ── Read current form values → LevelConfig ─────────────────

function readConfig(): LevelConfig {
  const catCount = Number((document.getElementById('d-cat-count') as HTMLInputElement).value)
  const movesLimit = Number((document.getElementById('d-moves-limit') as HTMLInputElement).value)
  const seedRaw = (document.getElementById('d-seed') as HTMLInputElement).value.trim()
  const seed = seedRaw ? Number(seedRaw) : undefined

  const categories = CATEGORY_NAMES.slice(0, catCount).map((name, i) => {
    const slider = document.getElementById(`d-cat-${i}`) as HTMLInputElement | null
    return { name, cardCount: slider ? Number(slider.value) : 3 }
  })

  return { categories, movesLimit, seed }
}

// ── Wire events ────────────────────────────────────────────

function wireEvents(): void {
  const toggle = document.getElementById('debug-toggle')!
  const content = document.getElementById('debug-content')!
  const closeBtn = document.getElementById('debug-close')!
  const catCountSlider = document.getElementById('d-cat-count') as HTMLInputElement
  const applyBtn = document.getElementById('debug-apply')!
  const botBtn = document.getElementById('debug-bot-100') as HTMLButtonElement
  const forceWinBtn = document.getElementById('debug-force-win') as HTMLButtonElement
  const forceLoseBtn = document.getElementById('debug-force-lose') as HTMLButtonElement

  // Toggle panel
  toggle.addEventListener('click', () => content.classList.toggle('debug-hidden'))
  closeBtn.addEventListener('click', () => content.classList.add('debug-hidden'))

  // Category count change → rebuild rows
  let catCounts: number[] = [..._lastCatCounts]
  catCountSlider.addEventListener('input', () => {
    const n = Number(catCountSlider.value)
    document.getElementById('dv-cat-count')!.textContent = String(n)
    // Save current counts before re-render
    for (let i = 0; i < CATEGORY_NAMES.length; i++) {
      const el = document.getElementById(`d-cat-${i}`) as HTMLInputElement | null
      if (el) catCounts[i] = Number(el.value)
    }
    _lastCatCounts = [...catCounts]
    renderCatRows(n, catCounts)
  })

  applyBtn.addEventListener('click', () => {
    const config = readConfig()
    _currentConfig = config
    _onApply?.(config)
  })

  botBtn.addEventListener('click', () => {
    const config = readConfig()
    botBtn.disabled = true
    botBtn.textContent = '⏳ Bot 运行中…'
    // Defer so the button can repaint before heavy work
    queueMicrotask(() => {
      try {
        const r = batchGreedyTest(config, 100)
        const pct = (r.passRate * 100).toFixed(1)
        const avg =
          r.avgMovesUsedOnWin != null ? r.avgMovesUsedOnWin.toFixed(1) : '—'
        const min = r.minMovesUsedOnWin ?? '—'
        const max = r.maxMovesUsedOnWin ?? '—'
        window.alert(
          `贪心 Bot 批量测试完成（${r.sampleSize} 局）\n` +
            `通关：${r.wins}\n` +
            `通关率：${pct}%\n` +
            `胜局用步（平均 / 最小 / 最大）：${avg} / ${min} / ${max}\n\n` +
            `请将通关率填入排期 / difficultyPresets 标定表。`
        )
      } finally {
        botBtn.disabled = false
        botBtn.textContent = '🤖 贪心 Bot ×100（当前参数）'
      }
    })
  })

  forceWinBtn.addEventListener('click', () => {
    window.dispatchEvent(new Event('whatcard:forceWin'))
  })

  forceLoseBtn.addEventListener('click', () => {
    window.dispatchEvent(new Event('whatcard:forceLose'))
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

/**
 * Sync the debug panel form UI to a given config (DEV only).
 * This is used to align the panel with the currently active campaign level,
 * so you can tweak from that baseline without changing product logic.
 */
export function setDebugConfig(config: LevelConfig): void {
  if (!import.meta.env.DEV) return
  _currentConfig = config

  const catCount = config.categories.length
  const catCountSlider = document.getElementById('d-cat-count') as HTMLInputElement | null
  const movesLimitEl = document.getElementById('d-moves-limit') as HTMLInputElement | null
  const seedEl = document.getElementById('d-seed') as HTMLInputElement | null

  if (catCountSlider) {
    catCountSlider.value = String(catCount)
    const v = document.getElementById('dv-cat-count')
    if (v) v.textContent = String(catCount)
  }

  // Update per-category counts
  _lastCatCounts = Array.from({ length: CATEGORY_NAMES.length }, (_, i) => config.categories[i]?.cardCount ?? 4)
  renderCatRows(catCount, _lastCatCounts)
  for (let i = 0; i < catCount; i++) {
    const slider = document.getElementById(`d-cat-${i}`) as HTMLInputElement | null
    if (slider) slider.value = String(_lastCatCounts[i])
    const label = document.getElementById(`dv-cat-${i}`)
    if (label) label.textContent = String(_lastCatCounts[i])
  }

  if (movesLimitEl) movesLimitEl.value = String(config.movesLimit)
  if (seedEl) seedEl.value = config.seed != null ? String(config.seed) : ''
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
      width: 288px;
      max-height: 85vh;
      overflow-y: auto;
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

    #debug-bot-100 {
      padding: 8px;
      background: #89b4fa;
      color: #1e1e2e;
      border: none;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
      font-size: 12px;
    }

    #debug-bot-100:hover:not(:disabled) { background: #74c7ec; }
    #debug-bot-100:disabled { opacity: 0.6; cursor: wait; }

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
