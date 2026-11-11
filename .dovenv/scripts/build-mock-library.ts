/**
 * Builds the demo library used by `pnpm dev` (mock mode).
 *
 * It reads `.env`, takes a snapshot of the configured Jellyfin server and
 * writes `src/routes/api/_shared/mock/library.json` plus optional poster and
 * portrait images under `.dovenv/mock/images/` (git-ignored, never built).
 *
 * Nothing personal is exported: watch state is synthetic, the server URL and
 * the user id are dropped, overviews are truncated and only public metadata
 * fields are kept.
 *
 * Usage:
 *   pnpm mock:build                     # 200 movies + 50 series + images
 *   pnpm mock:build --movies=100        # smaller snapshot
 *   pnpm mock:build --no-images         # metadata only
 */
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'

const ROOT = process.cwd()
const ENV_FILE = join(ROOT, '.env')
const OUTPUT = join(ROOT, 'src/routes/api/_shared/mock/library.json')
const IMAGE_DIR = join(ROOT, '.dovenv/mock/images')

const IMAGE_CONCURRENCY = 8
const PORTRAIT_LIMIT = 600
const PERSON_BATCH = 40
const OVERVIEW_LIMIT = 320

interface ApiPerson {
  Id?: string
  Name?: string
  Role?: string
  Type?: string
  PremiereDate?: string
  ProductionLocations?: string[]
  Overview?: string
  ProviderIds?: Record<string, string>
}

interface ApiItem {
  Id: string
  Name: string
  Type?: string
  ProductionYear?: number
  ProductionLocations?: string[]
  Genres?: string[]
  Overview?: string
  CommunityRating?: number
  CriticRating?: number
  RunTimeTicks?: number
  OfficialRating?: string
  PremiereDate?: string
  Taglines?: string[]
  ProviderIds?: Record<string, string>
  People?: ApiPerson[]
  ImageTags?: { Primary?: string }
  UserData?: UserData
}

interface UserData {
  Played?: boolean
  IsFavorite?: boolean
  PlayedPercentage?: number
  PlaybackPositionTicks?: number
}

interface SanitizedPerson {
  Id: string
  Name: string
  Type: string
  Role?: string
  PremiereDate?: string
  ProductionLocations?: string[]
  Overview?: string
  ProviderIds?: Record<string, string>
}

interface SanitizedItem {
  Id: string
  Name: string
  Type?: string
  ProductionYear?: number
  ProductionLocations?: string[]
  Genres?: string[]
  Overview?: string
  CommunityRating?: number
  CriticRating?: number
  RunTimeTicks?: number
  OfficialRating?: string
  PremiereDate?: string
  Taglines?: string[]
  ProviderIds?: Record<string, string>
  People: SanitizedPerson[]
  HasPrimaryImage: boolean
  UserData?: UserData
}

interface ImageStats {
  downloaded: number
  cached: number
  failed: number
}

interface Library {
  source: 'jellyfin'
  generatedAt: string
  counts: {
    items: number
    movies: number
    series: number
    people: number
  }
  resumeIds: string[]
  items: SanitizedItem[]
  people: SanitizedPerson[]
}

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

function loadEnv(): NodeJS.ProcessEnv {
  if (!existsSync(ENV_FILE)) return process.env
  process.loadEnvFile(ENV_FILE)
  return process.env
}

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    if (!key) continue
    args[key] = value ?? 'true'
  }
  return args
}

const env = loadEnv()
const args = parseArgs(process.argv.slice(2))
const baseUrl = (env.JELLYFIN_URL ?? '').replace(/\/+$/, '')
const apiKey = env.JELLYFIN_API_KEY ?? ''
const movieLimit = Math.max(1, Math.min(200, Number(args.movies ?? 200) || 200))
const seriesLimit = Math.max(1, Math.min(50, Number(args.series ?? 50) || 50))
const withImages = args['no-images'] !== 'true'

if (!baseUrl || !apiKey) {
  fail('JELLYFIN_URL and JELLYFIN_API_KEY must be set in .env to build the demo library.')
}

const headers = { Authorization: `MediaBrowser Token=${apiKey}` }

async function request(
  path: string,
  params: Record<string, string | number> = {},
  attempt = 1
): Promise<Response> {
  const url = new URL(`${baseUrl}${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value))
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(60_000) })
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`)
    return response
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    if (attempt >= 3) throw new Error(`${path}: ${message}`)
    console.warn(`  ↻ retry ${attempt + 1}/3 ${path}`)
    return request(path, params, attempt + 1)
  }
}

async function requestJson<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  return (await request(path, params)).json() as Promise<T>
}

function chunk<T>(values: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < values.length; index += size)
    result.push(values.slice(index, index + size))
  return result
}

function hash(value: string): number {
  let result = 2166136261
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return result >>> 0
}

function truncate(value: unknown, limit: number): string | undefined {
  if (!value) return undefined
  const text = String(value).replace(/\s+/g, ' ').trim()
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text
}

function providerIds(
  value: Record<string, string> | undefined
): Record<string, string> | undefined {
  const result: Record<string, string> = {}
  if (value?.Imdb) result.Imdb = value.Imdb
  if (value?.Tmdb) result.Tmdb = value.Tmdb
  return Object.keys(result).length ? result : undefined
}

const ITEM_FIELDS = [
  'People',
  'ProviderIds',
  'ProductionLocations',
  'Genres',
  'Overview',
  'PremiereDate',
  'OfficialRating',
  'RunTimeTicks',
  'CommunityRating',
  'CriticRating',
  'Taglines',
].join(',')

async function fetchItems(type: 'Movie' | 'Series', limit: number): Promise<ApiItem[]> {
  // Jellyfin may include BoxSets in the page, so ask for a few extra entries.
  const data = await requestJson<{ Items?: ApiItem[] }>('/Items', {
    IncludeItemTypes: type,
    Recursive: 'true',
    Limit: limit + 20,
    SortBy: 'Random',
    Fields: ITEM_FIELDS,
  })
  return (data.Items ?? []).filter((item) => item.Type === type).slice(0, limit)
}

function sanitizeItem(item: ApiItem): SanitizedItem {
  return {
    Id: item.Id,
    Name: item.Name,
    Type: item.Type,
    ProductionYear: item.ProductionYear ?? undefined,
    ProductionLocations: item.ProductionLocations?.length ? item.ProductionLocations : undefined,
    Genres: item.Genres?.length ? item.Genres : undefined,
    Overview: truncate(item.Overview, OVERVIEW_LIMIT),
    CommunityRating: item.CommunityRating ?? undefined,
    CriticRating: item.CriticRating ?? undefined,
    RunTimeTicks: item.RunTimeTicks ?? undefined,
    OfficialRating: item.OfficialRating ?? undefined,
    PremiereDate: item.PremiereDate ?? undefined,
    Taglines: item.Taglines?.length ? [truncate(item.Taglines[0], 160)!] : undefined,
    ProviderIds: providerIds(item.ProviderIds),
    People: (item.People ?? [])
      .filter((person): person is ApiPerson & { Id: string; Name: string } =>
        Boolean(person.Id && person.Name)
      )
      .map((person) => ({
        Id: person.Id,
        Name: person.Name,
        Role: person.Role || undefined,
        Type: person.Type || 'Actor',
      })),
    HasPrimaryImage: Boolean(item.ImageTags?.Primary),
  }
}

function sanitizePerson(person: ApiPerson & { Id: string; Name: string }): SanitizedPerson {
  return {
    Id: person.Id,
    Name: person.Name,
    Type: 'Person',
    PremiereDate: person.PremiereDate ?? undefined,
    ProductionLocations: person.ProductionLocations?.length
      ? person.ProductionLocations
      : undefined,
    Overview: truncate(person.Overview, OVERVIEW_LIMIT),
    ProviderIds: providerIds(person.ProviderIds),
  }
}

/** Deterministic, non-personal watch state so the demo exercises the filters. */
function addSyntheticUserData(items: SanitizedItem[]): string[] {
  const resumeIds: string[] = []
  for (const item of items) {
    const seed = hash(item.Id)
    const userData: UserData = {}
    if (seed % 100 < 38) userData.Played = true
    if (seed % 100 >= 86) userData.IsFavorite = true
    if (!userData.Played && resumeIds.length < 6 && seed % 7 === 0 && item.RunTimeTicks) {
      userData.PlayedPercentage = 20 + (seed % 55)
      userData.PlaybackPositionTicks = Math.round(
        item.RunTimeTicks * (userData.PlayedPercentage / 100)
      )
      resumeIds.push(item.Id)
    }
    item.UserData = Object.keys(userData).length ? userData : undefined
  }
  return resumeIds
}

async function fetchPeople(items: SanitizedItem[]): Promise<SanitizedPerson[]> {
  const ids = [...new Set(items.flatMap((item) => item.People.map((person) => person.Id)))]
  const people = new Map<string, SanitizedPerson>()
  for (const [index, batch] of chunk(ids, PERSON_BATCH).entries()) {
    process.stdout.write(`  people ${index + 1}/${Math.ceil(ids.length / PERSON_BATCH)}\r`)
    const data = await requestJson<{ Items?: ApiItem[] }>('/Items', {
      Ids: batch.join(','),
      Fields: 'Overview,PremiereDate,ProductionLocations,ProviderIds',
    })
    for (const person of data.Items ?? []) {
      if (person.Type === 'Person' && person.Id && person.Name) {
        people.set(person.Id, sanitizePerson({ ...person, Id: person.Id, Name: person.Name }))
      }
    }
  }
  // Keep a minimal record for the people Jellyfin did not return details for.
  for (const item of items) {
    for (const person of item.People) {
      if (!people.has(person.Id)) {
        people.set(person.Id, { Id: person.Id, Name: person.Name, Type: 'Person' })
      }
    }
  }
  process.stdout.write('\n')
  return [...people.values()]
}

async function imageExtension(id: string): Promise<string | null> {
  for (const extension of ['jpg', 'png', 'webp']) {
    if (existsSync(join(IMAGE_DIR, `${id}.${extension}`))) return extension
  }
  return null
}

async function downloadImage(
  id: string,
  maxWidth: number,
  force = false
): Promise<'cached' | 'downloaded'> {
  if (!force && (await imageExtension(id))) return 'cached'
  const response = await request(`/Items/${id}/Images/Primary`, { maxWidth })
  const buffer = Buffer.from(await response.arrayBuffer())
  const type = response.headers.get('content-type') ?? ''
  const extension = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg'
  await writeFile(join(IMAGE_DIR, `${id}.${extension}`), buffer)
  return 'downloaded'
}

async function downloadImages(items: SanitizedItem[]): Promise<ImageStats> {
  await mkdir(IMAGE_DIR, { recursive: true })

  // Portraits are limited to the people that appear most often: the full cast
  // of every title would add hundreds of megabytes for little value.
  const appearances = new Map<string, number>()
  for (const item of items) {
    for (const person of item.People) {
      appearances.set(person.Id, (appearances.get(person.Id) ?? 0) + 1)
    }
  }
  const featured = [...appearances.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, PORTRAIT_LIMIT)
    .map(([id]) => id)

  const queue: Array<[string, number]> = [
    ...items.filter((item) => item.HasPrimaryImage).map((item): [string, number] => [item.Id, 300]),
    ...featured.map((id): [string, number] => [id, 160]),
  ]
  const stats: ImageStats = { downloaded: 0, cached: 0, failed: 0 }
  let cursor = 0

  async function worker(): Promise<void> {
    while (cursor < queue.length) {
      const entry = queue[cursor++]
      if (!entry) continue
      const [id, width] = entry
      try {
        const result = await downloadImage(id, width)
        stats[result] += 1
      } catch {
        stats.failed += 1
      }
    }
  }

  await Promise.all(Array.from({ length: IMAGE_CONCURRENCY }, worker))
  return stats
}

async function main(): Promise<void> {
  console.log(`\n▶ Building demo library from ${baseUrl}`)
  console.log(
    `  movies: ${movieLimit} · series: ${seriesLimit} · images: ${withImages ? 'yes' : 'no'}`
  )

  const movies = await fetchItems('Movie', movieLimit)
  const series = await fetchItems('Series', seriesLimit)
  console.log(`  fetched ${movies.length} movies and ${series.length} series`)

  const items = [...movies, ...series].map(sanitizeItem)
  const resumeIds = addSyntheticUserData(items)
  const people = await fetchPeople(items)
  console.log(`  people: ${people.length}`)

  const library: Library = {
    source: 'jellyfin',
    generatedAt: new Date().toISOString(),
    counts: {
      items: items.length,
      movies: movies.length,
      series: series.length,
      people: people.length,
    },
    resumeIds,
    items,
    people,
  }

  await mkdir(join(ROOT, 'src/routes/api/_shared/mock'), { recursive: true })
  await writeFile(OUTPUT, JSON.stringify(library))
  const size = Buffer.byteLength(JSON.stringify(library)) / 1024
  console.log(`  ✔ ${basename(OUTPUT)} (${size.toFixed(0)} kB)`)

  if (withImages) {
    const stats = await downloadImages(items)
    console.log(
      `  ✔ images: ${stats.downloaded} downloaded, ${stats.cached} cached, ${stats.failed} unavailable`
    )
  } else {
    console.log('  · images skipped (the image route falls back to generated artwork)')
  }

  console.log('\nDone. Run `pnpm dev` to use the demo library.\n')
}

main().catch((error: unknown) =>
  fail(error instanceof Error ? (error.stack ?? error.message) : String(error))
)
