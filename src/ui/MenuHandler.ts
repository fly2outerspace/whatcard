let _isPaused = false
let _listenersAttached = false
let _currentLevel = 1

export function isGamePaused(): boolean {
  return _isPaused
}

function openMenu(): void {
  _isPaused = true
  document.getElementById('level-overlay')?.classList.add('hidden')
  document.getElementById('menu-overlay')?.classList.remove('hidden')
}

function closeMenu(): void {
  _isPaused = false
  document.getElementById('level-overlay')?.classList.add('hidden')
  document.getElementById('menu-overlay')?.classList.add('hidden')
}

function openLevelPage(): void {
  document.getElementById('menu-overlay')?.classList.add('hidden')
  document.getElementById('level-overlay')?.classList.remove('hidden')
}

function backToMenuPage(): void {
  document.getElementById('level-overlay')?.classList.add('hidden')
  document.getElementById('menu-overlay')?.classList.remove('hidden')
}

/**
 * Wire up menu open/close and action buttons.
 * `onRegenerate` is called when the player confirms regeneration.
 * `onSelectLevel` is called when player picks a specific level.
 * Listeners are attached only once; call `updateMenuHandlers` on new game.
 */
export function initMenuHandler(
  onRegenerate: () => void,
  onSelectLevel: (level: number) => void,
  currentLevel: number
): void {
  _currentLevel = currentLevel
  renderLevelButtons()

  if (!_listenersAttached) {
    _listenersAttached = true

    // Open menu
    document.getElementById('menu-btn')?.addEventListener('click', openMenu)

    // Click on backdrop → continue
    document.getElementById('menu-overlay')?.addEventListener('click', e => {
      if (e.target === document.getElementById('menu-overlay')) closeMenu()
    })

    // Top-left corner back button (menu page): continue game
    document.getElementById('menu-back-btn')?.addEventListener('click', closeMenu)

    // Open level page
    document.getElementById('menu-levels')?.addEventListener('click', openLevelPage)

    // Back to menu from level page (top-left corner back button)
    document.getElementById('level-back-btn')?.addEventListener('click', backToMenuPage)

    // Regenerate button — always uses latest callback via closure ref
    document.getElementById('menu-regenerate')?.addEventListener('click', () => {
      closeMenu()
      _onRegenerate()
    })
  }

  _onRegenerate = onRegenerate
  _onSelectLevel = onSelectLevel
}

// Mutable ref so initMenuHandler can be called again on new game
let _onRegenerate: () => void = () => {}
let _onSelectLevel: (level: number) => void = () => {}

function renderLevelButtons(): void {
  const grid = document.getElementById('menu-level-grid')
  if (!grid) return
  grid.innerHTML = ''
  for (let lv = 1; lv <= 10; lv++) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = `menu-level-btn${lv === _currentLevel ? ' active' : ''}`
    btn.textContent = `第 ${lv} 关`
    btn.addEventListener('click', () => {
      closeMenu()
      _onSelectLevel(lv)
    })
    grid.appendChild(btn)
  }
}
