import { browser } from '$app/env'
import { APP_ID } from '#const'
import { ui, type ThemeMode } from './ui.svelte'

const THEME_KEY = `${APP_ID}_theme_mode`

let listenerAttached = false

function systemTheme(): 'light' | 'dark' {
  if (!browser) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? systemTheme() : mode
}

function applyTheme(mode: ThemeMode) {
  ui.themeMode = mode
  ui.theme = resolveTheme(mode)
  if (browser) document.documentElement.dataset.theme = ui.theme
}

function readSavedMode(): ThemeMode | null {
  if (!browser) return null
  try {
    const saved = localStorage.getItem(THEME_KEY)
    return saved === 'system' || saved === 'light' || saved === 'dark' ? saved : null
  } catch {
    return null
  }
}

function ensureSystemListener() {
  if (!browser || listenerAttached) return
  listenerAttached = true
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (ui.themeMode === 'system') applyTheme('system')
  })
}

/** Applies the stored theme (default: system) and follows OS changes. */
export function initTheme() {
  if (!browser) return
  applyTheme(readSavedMode() ?? 'system')
  ensureSystemListener()
}

export function setThemeMode(mode: ThemeMode) {
  applyTheme(mode)
  if (!browser) return
  try {
    localStorage.setItem(THEME_KEY, mode)
  } catch {
    // The choice still applies for this session when storage is unavailable.
  }
}
