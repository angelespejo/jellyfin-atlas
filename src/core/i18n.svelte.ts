import { browser } from '$app/env'
import { defineCustomClientStrategy } from '#i18n/runtime.js'
import { LOCALE_STRATEGY_ID } from '#const'

export type Locale = 'en' | 'es'
export type LocaleMode = 'auto' | Locale

const STORAGE_KEY = 'jelly_map_locale_mode'
const SUPPORTED: Locale[] = ['en', 'es']

export const i18n = $state<{ mode: LocaleMode; locale: Locale }>({ mode: 'auto', locale: 'en' })

function normalizeMode(value: string | null | undefined): LocaleMode | null {
  return value === 'auto' || value === 'en' || value === 'es' ? value : null
}

function readSavedMode(): LocaleMode | null {
  if (!browser) return null
  try {
    return normalizeMode(localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

function pathLocale(): Locale | null {
  if (!browser) return null
  const segment = window.location.pathname.split('/').filter(Boolean)[0]
  return segment === 'es' || segment === 'en' ? segment : null
}

/** Browser language when it is English or Spanish, otherwise English. */
export function detectBrowserLocale(): Locale {
  if (!browser) return 'en'
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const language of languages) {
    if (!language) continue
    const base = language.toLowerCase().split('-')[0]
    if (base === 'es') return 'es'
    if (base === 'en') return 'en'
  }
  return 'en'
}

function resolveLocale(mode: LocaleMode): Locale {
  // An explicit choice always wins and never rewrites the URL.
  if (mode === 'en' || mode === 'es') return mode
  // An explicit locale prefix in the URL wins over browser detection.
  return pathLocale() ?? detectBrowserLocale()
}

function applyDocumentLang(locale: Locale) {
  if (browser) document.documentElement.lang = locale
}

let strategyRegistered = false

/**
 * Registers a Paraglide client strategy that resolves the locale from
 * (1) the stored choice, (2) the URL prefix, (3) the browser languages,
 * falling back to the base locale (English).
 */
function registerStrategy() {
  if (!browser || strategyRegistered) return
  strategyRegistered = true
  defineCustomClientStrategy(LOCALE_STRATEGY_ID, {
    getLocale: () => resolveLocale(readSavedMode() ?? 'auto'),
    setLocale: () => {
      // Persisting is handled by setLocaleMode so the URL is never touched.
    },
  })
}

registerStrategy()

/** Call once during app start-up (client) before rendering translated text. */
export function initI18n() {
  if (!browser) return
  const mode = readSavedMode() ?? 'auto'
  i18n.mode = mode
  i18n.locale = resolveLocale(mode)
  applyDocumentLang(i18n.locale)
}

export function setLocaleMode(mode: LocaleMode) {
  i18n.mode = mode
  if (!browser) return
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // The choice still applies for this session when storage is unavailable.
  }
  i18n.locale = resolveLocale(mode)
  applyDocumentLang(i18n.locale)
}

export function isSupportedLocale(value: string): value is Locale {
  return SUPPORTED.includes(value as Locale)
}
