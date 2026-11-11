import { DEFAULT_TABLE_COLUMNS, type ChartTab, type TableColumn, type ViewMode } from './ui.svelte'

const VIEWS: ViewMode[] = ['map', 'chart', 'graph', 'table']
const CHART_TABS: ChartTab[] = ['bars', 'timeline']
const PLAYED_VALUES = ['all', 'played', 'unplayed'] as const
const ALL_COLUMNS: TableColumn[] = [
  'year',
  'type',
  'countries',
  'genres',
  'rating',
  'officialRating',
  'runtime',
  'premiereDate',
  'status',
]

export interface UrlState {
  view?: ViewMode
  chartTab?: ChartTab
  sidebarOpen?: boolean
  search: string
  countries: string[]
  directors: string[]
  types: string[]
  played: 'all' | 'played' | 'unplayed'
  favorites: boolean
  continueWatching: boolean
  years?: [number, number]
  columns: TableColumn[]
  hasColumns: boolean
}

export function parseUrlState(search: string): UrlState {
  const params = new URLSearchParams(search)
  const view = params.get('view')

  const years = parseYears(params.get('years'))
  const columns = params.has('cols')
    ? params
        .get('cols')!
        .split(',')
        .map((column) => column.trim())
        .filter((column): column is TableColumn => ALL_COLUMNS.includes(column as TableColumn))
    : [...DEFAULT_TABLE_COLUMNS]

  return {
    view: VIEWS.includes(view as ViewMode) ? (view as ViewMode) : undefined,
    chartTab: CHART_TABS.includes(params.get('chart') as ChartTab)
      ? (params.get('chart') as ChartTab)
      : undefined,
    sidebarOpen:
      params.get('sidebar') === 'open'
        ? true
        : params.get('sidebar') === 'closed'
          ? false
          : undefined,
    search: params.get('q')?.trim() ?? '',
    countries: params.getAll('country').filter(Boolean),
    directors: params.getAll('director').filter(Boolean),
    types: params.getAll('type').filter(Boolean),
    played: PLAYED_VALUES.includes(params.get('played') as (typeof PLAYED_VALUES)[number])
      ? (params.get('played') as 'all' | 'played' | 'unplayed')
      : 'all',
    favorites: params.get('favorite') === '1',
    continueWatching: params.get('continue') === '1',
    years,
    columns,
    hasColumns: params.has('cols'),
  }
}

function parseYears(value: string | null): [number, number] | undefined {
  if (!value) return undefined
  const match = /^(\d{3,4})-(\d{3,4})$/.exec(value)
  if (!match) return undefined
  const start = Number(match[1])
  const end = Number(match[2])
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return undefined
  return [start, end]
}

export interface UrlStateSource {
  view: ViewMode
  chartTab: ChartTab
  sidebarOpen: boolean
  search: string
  countries: Set<string>
  directors: Set<string>
  types: Set<string>
  played: 'all' | 'played' | 'unplayed'
  favorites: boolean
  continueWatching: boolean
  years: [number, number]
  yearBounds: [number, number]
  columns: TableColumn[]
}

export function buildUrlParams(state: UrlStateSource): URLSearchParams {
  const params = new URLSearchParams()

  if (state.view !== 'map') params.set('view', state.view)
  if (state.view === 'chart' && state.chartTab !== 'bars') params.set('chart', state.chartTab)
  params.set('sidebar', state.sidebarOpen ? 'open' : 'closed')
  if (state.search.trim()) params.set('q', state.search.trim())
  for (const country of [...state.countries].sort()) params.append('country', country)
  for (const director of [...state.directors].sort()) params.append('director', director)
  for (const type of [...state.types].sort()) params.append('type', type)
  if (state.played !== 'all') params.set('played', state.played)
  if (state.favorites) params.set('favorite', '1')
  if (state.continueWatching) params.set('continue', '1')
  if (state.years[0] !== state.yearBounds[0] || state.years[1] !== state.yearBounds[1]) {
    params.set('years', `${state.years[0]}-${state.years[1]}`)
  }
  if (!sameColumns(state.columns, DEFAULT_TABLE_COLUMNS)) {
    params.set('cols', state.columns.join(','))
  }

  return params
}

function sameColumns(left: TableColumn[], right: TableColumn[]): boolean {
  if (left.length !== right.length) return false
  return ALL_COLUMNS.every((column) => left.includes(column) === right.includes(column))
}

export function writeUrlState(params: URLSearchParams) {
  const query = params.toString()
  const next = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (next !== current) window.history.replaceState(window.history.state, '', next)
}
