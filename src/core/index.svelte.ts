import { APP_ID } from '#const'
import * as m from '#i18n/messages.js'
import { notifications } from '#lib'
import type { JellyfinItem, JellyfinApiResponse, JellyfinPerson } from './types'

export * from './geo'
export * from './wiki'
export * from './countries'
export * from './country-info.svelte'
export * from './country-info-types'
export * from './locations.svelte'
export * from './i18n.svelte'
export * from './project-info'
export * from './theme.svelte'
export * from './ui.svelte'
export * from './url-state'
export * from './_shared/async.svelte'
export type * from './types'

const CACHE_KEY = `${APP_ID}_movies_cache_v2`
const LEGACY_CACHE_KEY = `${APP_ID}_movies_cache`
/** `pnpm dev` runs Vite in `mock` mode: always show fresh demo data. */
const IS_DEMO = import.meta.env.MODE === 'mock'
/** Overviews are only a fallback for the detail panel; cap them to save quota. */
const OVERVIEW_CACHE_LIMIT = 600

/**
 * Only the fields the UI reads are kept in the cache. The raw Jellyfin payload
 * (image tags, media sources, paths, …) easily blows past the ~5 MB
 * localStorage quota and used to abort the whole load.
 */
function compactItem(item: JellyfinItem, includeOverview: boolean): JellyfinItem {
  const compact: JellyfinItem = {
    Id: item.Id,
    Name: item.Name,
    Type: item.Type,
    ProductionYear: item.ProductionYear,
    ProductionLocations: item.ProductionLocations,
    Genres: item.Genres,
    CommunityRating: item.CommunityRating,
    RunTimeTicks: item.RunTimeTicks,
    OfficialRating: item.OfficialRating,
    People: item.People,
    ProviderIds: item.ProviderIds,
    Taglines: item.Taglines,
    PremiereDate: item.PremiereDate,
    CriticRating: item.CriticRating,
    UserData: item.UserData,
  }
  if (includeOverview && item.Overview)
    compact.Overview = item.Overview.slice(0, OVERVIEW_CACHE_LIMIT)
  return compact
}

function serializeCache(data: JellyfinApiResponse, includeOverview: boolean): string {
  const items = data.Items ?? []
  return JSON.stringify({
    Items: items.map((item) => compactItem(item, includeOverview)),
    TotalRecordCount: data.TotalRecordCount ?? items.length,
    serverURL: data.serverURL,
    resumeIds: data.resumeIds ?? [],
  } satisfies JellyfinApiResponse)
}

class MovieStore {
  allMovies = $state<JellyfinItem[]>([])
  currentMovies = $state<JellyfinItem[]>([])
  serverURL = $state('')
  /** True when the library comes from the bundled demo snapshot. */
  mock = $state(false)
  activeCountries = $state<Set<string>>(new Set())
  activeDirectors = $state<Set<string>>(new Set())
  activeTypes = $state<Set<string>>(new Set())
  playedFilter = $state<'all' | 'played' | 'unplayed'>('all')
  favoritesOnly = $state(false)
  continueOnly = $state(false)
  resumeIds = $state<Set<string>>(new Set())
  activeMovieId = $state<string | null>(null)
  loading = $state(false)
  error = $state<string | null>(null)
  searchTerm = $state('')
  itemDetails = $state<Map<string, JellyfinItem>>(new Map())
  loadingDetails = $state<string | null>(null)
  yearBounds = $state<[number, number]>([1900, 2030])
  selectedYearRange = $state<[number, number]>([1900, 2030])

  withDetails(m: JellyfinItem) {
    return this.itemDetails.get(m.Id) ?? m
  }

  getCountries(m: JellyfinItem): string[] {
    const locs = m.ProductionLocations
    return locs?.length ? locs : ['Unknown']
  }

  getDirectors(m: JellyfinItem): string[] {
    const details = this.withDetails(m)
    return details.People?.filter((p) => p.Type === 'Director').map((p) => p.Name) ?? []
  }

  getActors(m: JellyfinItem, limit = 10): JellyfinPerson[] {
    const details = this.withDetails(m)
    return details.People?.filter((p) => p.Type === 'Actor').slice(0, limit) ?? []
  }

  getProviderIds(m: JellyfinItem): Record<string, string> {
    const details = this.withDetails(m)
    return details.ProviderIds ?? m.ProviderIds ?? {}
  }

  getOverview(m: JellyfinItem): string | null {
    const details = this.withDetails(m)
    return details.Overview ?? m.Overview ?? null
  }

  getTagline(m: JellyfinItem): string | null {
    const details = this.withDetails(m)
    return details?.Taglines?.length ? details.Taglines[0] : null
  }

  matchesSearch(m: JellyfinItem, term: string): boolean {
    if (!term) return true
    return (
      m.Name.toLowerCase().includes(term) ||
      this.getDirectors(m).some((d) => d.toLowerCase().includes(term)) ||
      this.getActors(m).some((a) => a.Name.toLowerCase().includes(term))
    )
  }

  matchesCountry(m: JellyfinItem): boolean {
    return (
      this.activeCountries.size === 0 ||
      this.getCountries(m).some((c) => this.activeCountries.has(c))
    )
  }

  matchesDirector(m: JellyfinItem): boolean {
    return (
      this.activeDirectors.size === 0 ||
      this.getDirectors(m).some((d) => this.activeDirectors.has(d))
    )
  }

  matchesYear(m: JellyfinItem): boolean {
    return (
      !m.ProductionYear ||
      (m.ProductionYear >= this.selectedYearRange[0] &&
        m.ProductionYear <= this.selectedYearRange[1])
    )
  }

  matchesType(m: JellyfinItem): boolean {
    return this.activeTypes.size === 0 || this.activeTypes.has(m.Type ?? '')
  }

  isContinueWatching(m: JellyfinItem): boolean {
    if (this.resumeIds.has(m.Id)) return true
    if (m.UserData?.Played) return false
    const position = m.UserData?.PlaybackPositionTicks ?? 0
    const percentage = m.UserData?.PlayedPercentage ?? 0
    return position > 0 || (percentage > 0 && percentage < 100)
  }

  matchesStatus(m: JellyfinItem): boolean {
    if (this.playedFilter === 'played' && m.UserData?.Played !== true) return false
    if (this.playedFilter === 'unplayed' && m.UserData?.Played === true) return false
    if (this.favoritesOnly && m.UserData?.IsFavorite !== true) return false
    if (this.continueOnly && !this.isContinueWatching(m)) return false
    return true
  }

  filterMovies() {
    const term = this.searchTerm.toLowerCase().trim()
    this.currentMovies = this.allMovies.filter(
      (m) =>
        this.matchesSearch(m, term) &&
        this.matchesCountry(m) &&
        this.matchesDirector(m) &&
        this.matchesYear(m) &&
        this.matchesType(m) &&
        this.matchesStatus(m)
    )
  }

  toggleSet(set: Set<string>, value: string) {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }

  processMovies(data: JellyfinApiResponse) {
    this.allMovies = data.Items || []
    this.serverURL = data.serverURL || ''
    this.mock = Boolean(data.mock)
    this.resumeIds = new Set(data.resumeIds ?? [])
    this.currentMovies = [...this.allMovies]
    this.activeCountries = new Set()
    this.activeDirectors = new Set()
    this.activeTypes = new Set()
    this.playedFilter = 'all'
    this.favoritesOnly = false
    this.continueOnly = false
    this.activeMovieId = null
    this.searchTerm = ''
    this.error = null
    this.computeYearBounds()
  }

  computeYearBounds() {
    let min = Infinity
    let max = -Infinity
    for (const m of this.allMovies) {
      if (m.ProductionYear) {
        if (m.ProductionYear < min) min = m.ProductionYear
        if (m.ProductionYear > max) max = m.ProductionYear
      }
    }
    if (min === Infinity) {
      min = 1900
      max = 2030
    }
    this.yearBounds = [min, max]
    this.selectedYearRange = [min, max]
  }

  async loadMovies(force = false) {
    this.loading = true
    this.error = null

    try {
      if (!force && !IS_DEMO) {
        const cached = this.readCache()
        if (cached) {
          this.processMovies(cached)
          this.loading = false
          return
        }
      }

      const res = await fetch('/api/jellyfin')
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)

      const data: JellyfinApiResponse = await res.json()
      if (!IS_DEMO && !data.mock) this.writeCache(data)
      this.processMovies(data)
      notifications.send(m['toast.moviesLoaded'](), 'success')
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Error desconocido'
      notifications.sendError(m['toast.moviesError'](), err)
    } finally {
      this.loading = false
    }
  }

  /** Reads the cached library, dropping entries that are corrupt or too old. */
  private readCache(): JellyfinApiResponse | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as JellyfinApiResponse
      if (!parsed || !Array.isArray(parsed.Items)) {
        localStorage.removeItem(CACHE_KEY)
        return null
      }
      return parsed
    } catch {
      try {
        localStorage.removeItem(CACHE_KEY)
      } catch {
        // Storage unavailable: behave as a cache miss.
      }
      return null
    }
  }

  /**
   * Persists a compact copy of the library. Caching is an optimisation only:
   * if the browser quota is exceeded (large libraries) the app keeps working
   * without a cache instead of failing the load.
   */
  private writeCache(data: JellyfinApiResponse) {
    try {
      localStorage.removeItem(LEGACY_CACHE_KEY)
    } catch {
      // Nothing to free when storage is unavailable.
    }

    for (const includeOverview of [true, false]) {
      try {
        localStorage.setItem(CACHE_KEY, serializeCache(data, includeOverview))
        return
      } catch {
        // Retry smaller by dropping overviews and the previous entry.
        try {
          localStorage.removeItem(CACHE_KEY)
        } catch {
          // Ignore: the next attempt will fail the same way.
        }
      }
    }
  }

  async loadMovieDetails(id: string) {
    if (this.itemDetails.get(id) || this.loadingDetails === id) return
    this.loadingDetails = id
    try {
      const res = await fetch(`/api/jellyfin/item/${id}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const item: JellyfinItem = await res.json()
      this.itemDetails.set(id, item)
      this.itemDetails = new Map(this.itemDetails)
    } catch (err) {
      notifications.sendError(m['toast.detailsError'](), err)
    } finally {
      this.loadingDetails = null
    }
  }

  setActiveMovieId(id: string | null) {
    this.activeMovieId = id
    if (id) this.loadMovieDetails(id)
  }

  getStats(items: JellyfinItem[] = this.allMovies) {
    const countries = new Set<string>()
    const directors = new Set<string>()
    let movies = 0
    let series = 0

    items.forEach((m) => {
      ;(m.ProductionLocations || []).forEach((c) => countries.add(c))
      this.getDirectors(m).forEach((d) => directors.add(d))
      if (m.Type === 'Series') series += 1
      else if (m.Type === 'Movie') movies += 1
    })

    return {
      total: items.length,
      movies,
      series,
      countries: countries.size,
      directors: directors.size,
    }
  }

  getAllDirectors(): string[] {
    const set = new Set<string>()
    this.allMovies.forEach((m) => this.getDirectors(m).forEach((d) => set.add(d)))
    return [...set].sort()
  }

  getAllCountries(): string[] {
    const set = new Set<string>()
    let hasUnknown = false
    this.allMovies.forEach((m) => {
      const locations = m.ProductionLocations ?? []
      if (!locations.length) hasUnknown = true
      locations.forEach((c) => set.add(c))
    })
    const countries = [...set].sort((a, b) => a.localeCompare(b))
    if (hasUnknown) countries.push('Unknown')
    return countries
  }

  setSearchTerm(term: string) {
    this.searchTerm = term
    this.filterMovies()
  }

  clearCountryFilter() {
    this.activeCountries = new Set()
    this.filterMovies()
  }

  clearDirectorFilter() {
    this.activeDirectors = new Set()
    this.filterMovies()
  }

  toggleActiveType(type: string) {
    this.activeTypes = this.toggleSet(this.activeTypes, type)
    this.filterMovies()
  }

  clearTypes() {
    this.activeTypes = new Set()
    this.filterMovies()
  }

  setPlayedFilter(filter: 'all' | 'played' | 'unplayed') {
    this.playedFilter = filter
    this.filterMovies()
  }

  setFavoritesOnly(value: boolean) {
    this.favoritesOnly = value
    this.filterMovies()
  }

  setContinueOnly(value: boolean) {
    this.continueOnly = value
    this.filterMovies()
  }

  getAllTypes(): string[] {
    const set = new Set<string>()
    this.allMovies.forEach((m) => {
      if (m.Type) set.add(m.Type)
    })
    return [...set].sort()
  }

  resetView() {
    this.clearCountryFilter()
    this.clearDirectorFilter()
    this.activeTypes = new Set()
    this.playedFilter = 'all'
    this.favoritesOnly = false
    this.continueOnly = false
    this.searchTerm = ''
    this.selectedYearRange = [...this.yearBounds]
    this.filterMovies()
  }

  clearCache() {
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem(LEGACY_CACHE_KEY)
    localStorage.removeItem('jelly_map_wikidata_cities_v1')
    localStorage.removeItem('jelly_map_country_info_v1')
    localStorage.removeItem('jelly_map_country_info_v2')
  }

  get notifications() {
    return {
      get current() {
        return notifications
      },
      send: (msg: string, type: 'success' | 'error' | 'info' | 'warn') =>
        notifications.send(msg, type),
      sendError: (title: string, err: unknown) => notifications.sendError(title, err),
    }
  }

  toggleActiveCountry = (country: string) => {
    this.activeCountries = this.toggleSet(this.activeCountries, country)
    this.filterMovies()
  }

  toggleActiveDirector = (director: string) => {
    this.activeDirectors = this.toggleSet(this.activeDirectors, director)
    this.filterMovies()
  }

  setYearRange = (range: [number, number]) => {
    this.selectedYearRange = range
    this.filterMovies()
  }
}

export const movieStore = new MovieStore()

export function getMovieStore() {
  return movieStore
}
