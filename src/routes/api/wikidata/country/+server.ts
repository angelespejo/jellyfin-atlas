import { json } from '@sveltejs/kit'
import type { RequestEvent } from '@sveltejs/kit'
import countryFacts from './country-facts.json'
import { APP_USER_AGENT } from '#const'
import { createRateLimiter } from '#api/_shared/index.js'
import type { CountryInfo } from '../../../../core/country-info-types'

interface WikipediaSummary {
  type?: string
  title?: string
  description?: string
  extract?: string
  wikibase_item?: string
  thumbnail?: { source?: string }
  content_urls?: { desktop?: { page?: string } }
}

interface WikidataClaim {
  rank?: 'preferred' | 'normal' | 'deprecated'
  mainsnak?: {
    datavalue?: {
      value?: unknown
    }
  }
  qualifiers?: Record<string, Array<{ datavalue?: { value?: unknown } }>>
}

interface WikidataEntity {
  labels?: Record<string, { value?: string }>
  descriptions?: Record<string, { value?: string }>
  claims?: Record<string, WikidataClaim[]>
}

interface LocalCountry {
  c2?: string
  c3?: string
  n: string
  o: string
  nn?: string[]
  capital?: string[]
  population?: number
  area?: number
  region?: string
  subregion?: string
  flag?: string
  languages?: Record<string, string>
  currencies?: Record<string, { name?: string; symbol?: string }>
}

interface CacheEntry {
  at: number
  info: CountryInfo
}

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7
const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 })
const cache = new Map<string, CacheEntry>()

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const localIndex = new Map<string, LocalCountry>()
for (const country of countryFacts as unknown as LocalCountry[]) {
  const add = (value: string | undefined) => {
    if (!value) return
    const key = normalize(value)
    if (key && !localIndex.has(key)) localIndex.set(key, country)
  }
  add(country.n)
  add(country.o)
  add(country.c2)
  add(country.c3)
  for (const native of country.nn ?? []) add(native)
}

async function fetchJson<T>(url: string, timeoutMs = 15_000): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': APP_USER_AGENT,
    },
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json() as Promise<T>
}

async function fetchWikipediaSummary(
  titles: string[],
  locale: 'en' | 'es'
): Promise<{ summary: WikipediaSummary; lang: string } | null> {
  const languages = locale === 'es' ? ['es', 'en'] : ['en', 'es']
  for (const lang of languages) {
    for (const title of titles) {
      if (!title.trim()) continue
      try {
        const summary = await fetchJson<WikipediaSummary>(
          `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
            title.replace(/ /g, '_')
          )}?redirect=true`
        )
        if (summary?.type === 'disambiguation') continue
        if (summary?.wikibase_item) return { summary, lang }
      } catch {
        // Try the next title/language.
      }
    }
  }
  return null
}

async function fetchEntity(qid: string): Promise<WikidataEntity | null> {
  try {
    const data = await fetchJson<{ entities?: Record<string, WikidataEntity> }>(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(
        qid
      )}&props=claims|labels|descriptions&languages=en|es&format=json&origin=*`
    )
    return data.entities?.[qid] ?? null
  } catch {
    return null
  }
}

function claimValues(entity: WikidataEntity | null, property: string): unknown[] {
  const claims = entity?.claims?.[property] ?? []
  const usable = claims.filter((claim) => claim.rank !== 'deprecated')
  const preferred = usable.filter((claim) => claim.rank === 'preferred')
  return (preferred.length ? preferred : usable)
    .map((claim) => claim.mainsnak?.datavalue?.value)
    .filter((value) => value !== undefined)
}

function itemIds(values: unknown[]): string[] {
  return values
    .map((value) =>
      value && typeof value === 'object' && 'id' in value
        ? String((value as { id: unknown }).id)
        : null
    )
    .filter((value): value is string => Boolean(value))
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function quantity(value: unknown): number | undefined {
  if (!value || typeof value !== 'object' || !('amount' in value)) return undefined
  const amount = Number(String((value as { amount: unknown }).amount).replace(/^\+/, ''))
  return Number.isFinite(amount) ? amount : undefined
}

function timeYear(value: unknown): number | undefined {
  if (!value || typeof value !== 'object' || !('time' in value)) return undefined
  const time = String((value as { time: unknown }).time)
  const match = /^([+-])(\d+)-/.exec(time)
  if (!match) return undefined
  const year = Number(match[2])
  return match[1] === '-' ? -year : year
}

function qualifierYear(claim: WikidataClaim): number | undefined {
  const time = claim.qualifiers?.P585?.[0]?.datavalue?.value
  return timeYear(time)
}

function populationInfo(
  entity: WikidataEntity | null
): { value: number; year?: number } | undefined {
  const claims = (entity?.claims?.P1082 ?? []).filter((claim) => claim.rank !== 'deprecated')
  if (!claims.length) return undefined
  const sorted = [...claims].sort((a, b) => {
    const rankA = a.rank === 'preferred' ? 2 : 1
    const rankB = b.rank === 'preferred' ? 2 : 1
    if (rankA !== rankB) return rankB - rankA
    return (qualifierYear(b) ?? 0) - (qualifierYear(a) ?? 0)
  })
  const claim = sorted[0]!
  const value = quantity(claim.mainsnak?.datavalue?.value)
  if (value === undefined) return undefined
  return { value, year: qualifierYear(claim) }
}

async function fetchLabels(ids: string[], locale: 'en' | 'es'): Promise<Map<string, string>> {
  const labels = new Map<string, string>()
  const unique = [...new Set(ids)].filter(Boolean).slice(0, 50)
  if (!unique.length) return labels

  try {
    const data = await fetchJson<{ entities?: Record<string, WikidataEntity> }>(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${unique
        .map(encodeURIComponent)
        .join('|')}&props=labels&languages=${locale}|en&format=json&origin=*`
    )
    for (const id of unique) {
      const entity = data.entities?.[id]
      const label = entity?.labels?.[locale]?.value ?? entity?.labels?.en?.value
      if (label) labels.set(id, label)
    }
  } catch {
    // Labels are optional.
  }
  return labels
}

function localFallback(name: string, info: CountryInfo): CountryInfo {
  const local = localIndex.get(normalize(name))
  if (!local) return info

  info.capital ??= local.capital?.[0]
  if (!info.population && local.population) info.population = { value: local.population }
  if (!info.areaKm2 && typeof local.area === 'number') info.areaKm2 = local.area
  if (!info.languages?.length && local.languages) {
    info.languages = Object.values(local.languages).slice(0, 4)
  }
  if (!info.currency && local.currencies) {
    info.currency = Object.values(local.currencies)
      .map((currency) => currency.name)
      .filter(Boolean)
      .join(', ')
  }
  if (!info.continent) {
    info.continent = [local.region, local.subregion].filter(Boolean).join(' · ') || undefined
  }
  info.iso2 ??= local.c2
  info.iso3 ??= local.c3
  info.flagEmoji ??= local.flag
  return info
}

function commonsFileUrl(fileName: string, width: number): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
    fileName
  )}?width=${width}`
}

async function buildCountryInfo(name: string, locale: 'en' | 'es'): Promise<CountryInfo> {
  const local = localIndex.get(normalize(name))
  const titles = local ? [local.n, local.o, name] : [name]
  const summaryHit = await fetchWikipediaSummary(titles, locale)
  const summary = summaryHit?.summary
  const qid = summary?.wikibase_item

  const info: CountryInfo = {
    name: local?.n ?? summary?.title ?? name.trim(),
  }

  if (summary) {
    info.description = summary.description
    info.extract = summary.extract
    info.thumbnail = summary.thumbnail?.source
    info.wikipediaUrl =
      summary.content_urls?.desktop?.page ??
      (summaryHit
        ? `https://${summaryHit.lang}.wikipedia.org/wiki/${encodeURIComponent(
            (summary.title ?? name).replace(/ /g, '_')
          )}`
        : undefined)
  }

  const entity = qid ? await fetchEntity(qid) : null
  if (entity) {
    info.description =
      info.description ?? entity.descriptions?.[locale]?.value ?? entity.descriptions?.en?.value

    const capitalIds = itemIds(claimValues(entity, 'P36'))
    const languageIds = itemIds(claimValues(entity, 'P37')).slice(0, 4)
    const currencyIds = itemIds(claimValues(entity, 'P38')).slice(0, 1)
    const continentIds = itemIds(claimValues(entity, 'P30')).slice(0, 1)
    const labels = await fetchLabels(
      [...capitalIds, ...languageIds, ...currencyIds, ...continentIds],
      locale
    )

    const capital = capitalIds.map((id) => labels.get(id)).find(Boolean)
    if (capital) info.capital = capital

    const languages = languageIds
      .map((id) => labels.get(id))
      .filter((value): value is string => Boolean(value))
    if (languages.length) info.languages = languages

    const currency = currencyIds.map((id) => labels.get(id)).find(Boolean)
    if (currency) info.currency = currency

    const continent = continentIds.map((id) => labels.get(id)).find(Boolean)
    if (continent) info.continent = continent

    const population = populationInfo(entity)
    if (population) info.population = population

    const area = quantity(claimValues(entity, 'P2046')[0])
    if (area !== undefined) info.areaKm2 = area

    const inception = timeYear(claimValues(entity, 'P571')[0])
    if (inception !== undefined) info.inceptionYear = inception

    const dissolved = timeYear(claimValues(entity, 'P576')[0])
    if (dissolved !== undefined) info.dissolvedYear = dissolved

    info.iso2 = stringValue(claimValues(entity, 'P297')[0]) ?? info.iso2
    info.iso3 = stringValue(claimValues(entity, 'P298')[0]) ?? info.iso3

    const flagFile = stringValue(claimValues(entity, 'P41')[0])
    if (flagFile) info.flagUrl = commonsFileUrl(flagFile, 640)

    const coatFile = stringValue(claimValues(entity, 'P94')[0])
    if (coatFile) info.coatOfArmsUrl = commonsFileUrl(coatFile, 320)
  }

  return localFallback(name, info)
}

export async function GET({ url, getClientAddress }: RequestEvent) {
  const { allowed, headers } = limiter.getHeaders(getClientAddress())
  if (!allowed) {
    return new Response('Too Many Requests', { status: 429, headers })
  }

  const name = (url.searchParams.get('name') ?? '').trim()
  if (!name || name.length > 120) {
    return json({ error: 'Invalid country name' }, { status: 400, headers })
  }

  const locale = url.searchParams.get('locale') === 'es' ? 'es' : 'en'
  const key = `${locale}:${normalize(name)}`
  const cached = cache.get(key)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return json(cached.info, { headers })
  }

  try {
    const info = await buildCountryInfo(name, locale)
    cache.set(key, { at: Date.now(), info })
    return json(info, { headers })
  } catch (error) {
    console.warn('Country info lookup failed:', error)
    return json(localFallback(name, { name }), { headers })
  }
}
