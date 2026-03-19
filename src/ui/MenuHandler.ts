let _isPaused = false
let _listenersAttached = false

export function isGamePaused(): boolean {
  return _isPaused
}

function openMenu(): void {
  _isPaused = true
  document.getElementById('menu-overlay')?.classList.remove('hidden')
}

function closeMenu(): void {
  _isPaused = false
  document.getElementById('menu-overlay')?.classList.add('hidden')
}

/**
 * Wire up menu open/close and action buttons.
 * `onRegenerate` is called when the player confirms regeneration.
 * Listeners are attached only once; call `updateMenuHandlers` on new game.
 */
export function initMenuHandler(onRegenerate: () => void): void {
  if (!_listenersAttached) {
    _listenersAttached = true

    // Open menu
    document.getElementById('menu-btn')?.addEventListener('click', openMenu)

    // Click on backdrop → continue
    document.getElementById('menu-overlay')?.addEventListener('click', e => {
      if (e.target === document.getElementById('menu-overlay')) closeMenu()
    })

    // Continue button
    document.getElementById('menu-continue')?.addEventListener('click', closeMenu)

    // Regenerate button — always uses latest callback via closure ref
    document.getElementById('menu-regenerate')?.addEventListener('click', () => {
      closeMenu()
      _onRegenerate()
    })
  }

  _onRegenerate = onRegenerate
}

// Mutable ref so initMenuHandler can be called again on new game
let _onRegenerate: () => void = () => {}
