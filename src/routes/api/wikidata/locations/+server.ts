import { json } from '@sveltejs/kit'
import type { RequestEvent } from '@sveltejs/kit'
import { APP_USER_AGENT } from '#const'
import { createRateLimiter } from '#api/_shared/index.js'
import { MOCK_MODE } from '#api/_shared/jellyfin.js'

/**
 * Resolves filming locations for Jellyfin items through Wikidata.
 *
 * Flow: IMDb id (P345) -> filming location (P915) -> coordinate (P625).
 * Results are batched, kept in an in-memory cache and rate limited so the
 * public Wikidata Query Service is not hammered.
 */

export interface WikiCity {
  name: string
  lat: number
  lon: number
  country?: string
}

interface CacheEntry {
  at: number
  cities: WikiCity[]
}

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7
const MAX_IDS = 60
const IMDB_PATTERN = /^tt\d{5,10}$/
const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 })
const cache = new Map<string, CacheEntry>()

function parsePoint(value: string): { lat: number; lon: number } | null {
  const match = /Point\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/.exec(value)
  if (!match) return null
  const lon = Number(match[1])
  const lat = Number(match[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  return { lat, lon }
}

function normalizeImdb(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const withPrefix = trimmed.startsWith('tt') ? trimmed : `tt${trimmed}`
  return IMDB_PATTERN.test(withPrefix) ? withPrefix : null
}

async function queryWikidata(
  imdbIds: string[],
  locale: 'en' | 'es'
): Promise<Map<string, WikiCity[]>> {
  const values = imdbIds.map((id) => `"${id}"`).join(' ')
  const languages = locale === 'es' ? 'es,en' : 'en,es'
  const query = `
    SELECT ?imdb ?location ?locationLabel ?coord ?countryLabel WHERE {
      VALUES ?imdb { ${values} }
      ?film wdt:P345 ?imdb .
      ?film wdt:P915 ?location .
      ?location wdt:P625 ?coord .
      OPTIONAL { ?location wdt:P17 ?country . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "${languages}". }
    }
    LIMIT 1500
  `

  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`
  const response = await fetch(url, {
    headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': APP_USER_AGENT,
    },
    signal: AbortSignal.timeout(20_000),
  })

  if (!response.ok) {
    throw new Error(`Wikidata responded with ${response.status}`)
  }

  const data = (await response.json()) as {
    results?: {
      bindings?: Array<{
        imdb?: { value?: string }
        locationLabel?: { value?: string }
        coord?: { value?: string }
        countryLabel?: { value?: string }
      }>
    }
  }

  const result = new Map<string, WikiCity[]>()
  const seen = new Map<string, Set<string>>()

  for (const binding of data.results?.bindings ?? []) {
    const imdb = binding.imdb?.value
    const name = binding.locationLabel?.value
    const coord = binding.coord?.value
    if (!imdb || !name || !coord) continue
    const point = parsePoint(coord)
    if (!point) continue

    const key = `${name}|${point.lat.toFixed(4)}|${point.lon.toFixed(4)}`
    const seenForMovie = seen.get(imdb) ?? new Set<string>()
    if (seenForMovie.has(key)) continue
    seenForMovie.add(key)
    seen.set(imdb, seenForMovie)

    const list = result.get(imdb) ?? []
    list.push({
      name,
      lat: point.lat,
      lon: point.lon,
      country: binding.countryLabel?.value || undefined,
    })
    result.set(imdb, list)
  }

  return result
}

export async function POST({ request, getClientAddress }: RequestEvent) {
  if (MOCK_MODE) {
    let mockPayload: unknown
    try {
      mockPayload = await request.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const mockIds = (mockPayload as { imdbIds?: unknown })?.imdbIds
    const requested = Array.isArray(mockIds)
      ? mockIds.filter((value): value is string => typeof value === 'string')
      : []
    const { mockCities } = await import('#api/_shared/mock/cities.js')
    return json(mockCities(requested))
  }

  const { allowed, headers } = limiter.getHeaders(getClientAddress())
  if (!allowed) {
    return new Response('Too Many Requests', { status: 429, headers })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400, headers })
  }

  const body = payload as { imdbIds?: unknown; locale?: unknown }
  const ids = Array.isArray(body?.imdbIds) ? body.imdbIds : []
  const locale = body?.locale === 'es' ? 'es' : 'en'

  const requested = [
    ...new Set(
      ids
        .filter((value): value is string => typeof value === 'string')
        .map(normalizeImdb)
        .filter((value): value is string => value !== null)
    ),
  ].slice(0, MAX_IDS)

  if (!requested.length) {
    return json({}, { headers })
  }

  const now = Date.now()
  const missing = requested.filter((id) => {
    const entry = cache.get(id)
    return !entry || now - entry.at > CACHE_TTL_MS
  })

  if (missing.length) {
    try {
      const fetched = await queryWikidata(missing, locale)
      for (const id of missing) {
        cache.set(id, { at: now, cities: fetched.get(id) ?? [] })
      }
    } catch (error) {
      // Partial cache hits are still returned; the client may retry later.
      console.warn('Wikidata locations query failed:', error)
    }
  }

  const response: Record<string, WikiCity[]> = {}
  for (const id of requested) {
    response[id] = cache.get(id)?.cities ?? []
  }

  return json(response, { headers })
}
