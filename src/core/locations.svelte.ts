import { browser } from '$app/env'
import type { JellyfinItem } from './types'

export interface CityLocation {
  name: string
  lat: number
  lon: number
  country?: string
}

interface CacheEntry {
  at: number
  cities: CityLocation[]
}

const CACHE_KEY = 'jelly_map_wikidata_cities_v1'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30
const BATCH_SIZE = 40
const MAX_MOVIES = 240

export const cityStore = $state<{
  byImdb: Record<string, CityLocation[]>
  loading: boolean
  loaded: boolean
}>({ byImdb: {}, loading: false, loaded: false })

let inflight: Promise<void> | null = null

export function normalizeImdb(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const withPrefix = trimmed.startsWith('tt') ? trimmed : `tt${trimmed}`
  return /^tt\d{5,10}$/.test(withPrefix) ? withPrefix : null
}

function readCache(): Record<string, CacheEntry> {
  if (!browser) return {}
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, CacheEntry>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeCache(cache: Record<string, CacheEntry>) {
  if (!browser) return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Cache is best effort; the map still works without it.
  }
}

function isFresh(entry: CacheEntry | undefined): entry is CacheEntry {
  return Boolean(entry) && Date.now() - entry!.at < CACHE_TTL_MS
}

function movieImdbIds(items: JellyfinItem[]): string[] {
  const ids = new Set<string>()
  for (const item of items) {
    const id = normalizeImdb(item.ProviderIds?.Imdb)
    if (id) ids.add(id)
    if (ids.size >= MAX_MOVIES) break
  }
  return [...ids]
}

/**
 * Loads filming locations for the given items from the local cache and, when
 * needed, from `/api/wikidata/locations` in small batches.
 */
export async function loadMovieCities(
  items: JellyfinItem[],
  locale: 'en' | 'es' = 'en'
): Promise<void> {
  if (!browser || inflight) return

  const ids = movieImdbIds(items)
  if (!ids.length) {
    cityStore.loaded = true
    return
  }

  const cache = readCache()
  let cacheDirty = false

  for (const id of ids) {
    const entry = cache[id]
    if (isFresh(entry)) cityStore.byImdb[id] = entry.cities
  }

  const missing = ids.filter((id) => !isFresh(cache[id]))
  if (!missing.length) {
    cityStore.loaded = true
    return
  }

  cityStore.loading = true
  inflight = (async () => {
    try {
      for (let index = 0; index < missing.length; index += BATCH_SIZE) {
        const batch = missing.slice(index, index + BATCH_SIZE)
        try {
          const response = await fetch('/api/wikidata/locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imdbIds: batch, locale }),
          })
          if (!response.ok) continue

          const data = (await response.json()) as Record<string, CityLocation[]>
          const at = Date.now()
          for (const id of batch) {
            const cities = Array.isArray(data[id]) ? data[id] : []
            cityStore.byImdb[id] = cities
            cache[id] = { at, cities }
            cacheDirty = true
          }
        } catch {
          // Keep whatever was cached; the next load will retry the rest.
        }
      }
    } finally {
      cityStore.loading = false
      cityStore.loaded = true
      if (cacheDirty) writeCache(cache)
      inflight = null
    }
  })()

  return inflight
}

/** Returns a stable key for de-duplicating the same city across movies. */
export function cityKey(city: CityLocation): string {
  return `${city.name}|${city.lat.toFixed(3)}|${city.lon.toFixed(3)}`
}
