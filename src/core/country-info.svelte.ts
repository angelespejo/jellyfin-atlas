import { browser } from '$app/env'
import { countryInfoKey, type CachedCountryInfo, type CountryInfo } from './country-info-types'

const CACHE_KEY = 'jelly_map_country_info_v2'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7

export const countryInfoStore = $state<{
  byKey: Record<string, CachedCountryInfo>
  loading: string | null
  error: string | null
}>({ byKey: {}, loading: null, error: null })

const inflight = new Map<string, Promise<void>>()

function readCache(): Record<string, CachedCountryInfo> {
  if (!browser) return {}
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, CachedCountryInfo>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeCache(cache: Record<string, CachedCountryInfo>) {
  if (!browser) return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Best effort only.
  }
}

function isFresh(entry: CachedCountryInfo | undefined): entry is CachedCountryInfo {
  return Boolean(entry) && Date.now() - entry!.fetchedAt < CACHE_TTL_MS
}

/** Returns cached country information immediately (if any). */
export function getCountryInfo(name: string, locale: string): CountryInfo | undefined {
  return countryInfoStore.byKey[countryInfoKey(name, locale)]
}

/** Loads (and caches) country information for the given name and locale. */
export async function loadCountryInfo(name: string, locale: 'en' | 'es' = 'en'): Promise<void> {
  if (!browser || !name.trim()) return

  const key = countryInfoKey(name, locale)
  if (isFresh(countryInfoStore.byKey[key])) return

  const cache = readCache()
  if (isFresh(cache[key]) && !countryInfoStore.byKey[key]) {
    countryInfoStore.byKey[key] = cache[key]
    return
  }

  if (inflight.has(key)) return inflight.get(key)

  countryInfoStore.loading = key
  countryInfoStore.error = null

  const request = (async () => {
    try {
      const params = new URLSearchParams({ name: name.trim(), locale })
      const response = await fetch(`/api/wikidata/country?${params.toString()}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const info = (await response.json()) as CountryInfo
      const cached: CachedCountryInfo = { ...info, fetchedAt: Date.now() }
      countryInfoStore.byKey[key] = cached

      const nextCache = { ...readCache(), [key]: cached }
      writeCache(nextCache)
    } catch {
      countryInfoStore.error = key
      // Keep whatever was cached for this key, if anything.
    } finally {
      countryInfoStore.loading = null
      inflight.delete(key)
    }
  })()

  inflight.set(key, request)
  return request
}
