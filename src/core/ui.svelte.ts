export type Theme = 'light' | 'dark'
export type ThemeMode = 'system' | 'light' | 'dark'
export type SidebarTab = 'results' | 'filters'
export type AppDialog = 'settings' | 'about' | null
export type ViewMode = 'map' | 'chart' | 'graph' | 'table'
export type ChartTab = 'bars' | 'timeline'

export type TableColumn =
  | 'year'
  | 'type'
  | 'countries'
  | 'genres'
  | 'rating'
  | 'officialRating'
  | 'runtime'
  | 'premiereDate'
  | 'status'

export const DEFAULT_TABLE_COLUMNS: TableColumn[] = [
  'year',
  'type',
  'countries',
  'rating',
  'runtime',
  'status',
]

export interface ActivePerson {
  id?: string
  name: string
  role?: string
  type?: string
}

/**
 * Small pieces of UI state that must survive the language switch, which
 * re-renders the page through `{#key i18n.locale}` in the root layout.
 */
export const ui = $state<{
  theme: Theme
  themeMode: ThemeMode
  view: ViewMode
  chartTab: ChartTab
  sidebarTab: SidebarTab
  dialog: AppDialog
  sidebarOpen: boolean
  showCities: boolean
  activeCountry: string | null
  activePerson: ActivePerson | null
  tableColumns: TableColumn[]
  initialized: boolean
}>({
  theme: 'light',
  themeMode: 'system',
  view: 'map',
  chartTab: 'bars',
  sidebarTab: 'results',
  dialog: null,
  sidebarOpen: false,
  showCities: true,
  activeCountry: null,
  activePerson: null,
  tableColumns: [...DEFAULT_TABLE_COLUMNS],
  initialized: false,
})
