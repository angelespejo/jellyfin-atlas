/**
 * Central keyboard shortcut registry. `code` matches KeyboardEvent.code so it
 * keeps working on macOS, where Option/Alt changes the produced character.
 */
const platform =
  typeof navigator !== 'undefined'
    ? ((navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
        ?.platform ?? navigator.platform)
    : ''
const isMac = /Mac|iPhone|iPad|iPod/i.test(platform)

const mod = isMac ? '⌘' : 'Ctrl'
const alt = isMac ? '⌥' : 'Alt'

export interface Shortcut {
  code: string
  mod?: boolean
  alt?: boolean
  shift?: boolean
  label: string
}

const definitions = {
  search: { code: 'KeyK', mod: true, label: `${mod}K` },
  paneSearch: { code: 'Digit1', alt: true, label: `${alt}1` },
  paneSettings: { code: 'Digit2', alt: true, label: `${alt}2` },
  paneAbout: { code: 'Digit3', alt: true, label: `${alt}3` },
  viewMap: { code: 'KeyM', alt: true, label: `${alt}M` },
  viewChart: { code: 'KeyG', alt: true, label: `${alt}G` },
  viewGraph: { code: 'KeyJ', alt: true, label: `${alt}J` },
  viewTable: { code: 'KeyT', alt: true, label: `${alt}T` },
  close: { code: 'Escape', label: 'Esc' },
  filters: { code: 'KeyF', alt: true, label: `${alt}F` },
  clearFilters: { code: 'Backspace', alt: true, label: `${alt}⌫` },
  resetView: { code: 'KeyR', alt: true, label: `${alt}R` },
  reload: { code: 'KeyL', alt: true, label: `${alt}L` },
  clearCache: { code: 'KeyL', alt: true, shift: true, label: `${alt}⇧L` },
  cities: { code: 'KeyC', alt: true, label: `${alt}C` },
} satisfies Record<string, Shortcut>

export const shortcuts: Record<keyof typeof definitions, Shortcut> = definitions

export type ShortcutName = keyof typeof shortcuts

export function matchesShortcut(event: KeyboardEvent, name: ShortcutName): boolean {
  const shortcut = shortcuts[name]
  return (
    event.code === shortcut.code &&
    Boolean(event.metaKey || event.ctrlKey) === Boolean(shortcut.mod) &&
    event.altKey === Boolean(shortcut.alt) &&
    event.shiftKey === Boolean(shortcut.shift)
  )
}
