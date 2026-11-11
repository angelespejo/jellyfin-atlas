<script lang="ts">
  import * as m from '#i18n/messages.js'
  import { countryFlagEmoji, getMovieStore, i18n, ui, type TableColumn } from '#core'
  import { itemTypeIcon, itemTypeLabel } from '#lib/filter-labels.js'
  import { countryLabel } from '../country-label'
  import type { JellyfinItem } from '../../../core/types'
  import { downloadCsv, downloadJson, downloadPdf, type ExportTable } from '../table-export'
  import ViewHeader from '../view-header.svelte'
  import Tooltip from '../tooltip.svelte'

  const PAGE_SIZE = 50

  type SortKey = 'title' | TableColumn
  type SortDirection = 'asc' | 'desc'

  interface Row {
    movie: JellyfinItem
    title: string
    year?: number
    type: string
    countries: string[]
    genres: string[]
    rating?: number
    officialRating?: string
    premiereDate?: string
    runtime?: number
    played: boolean
    favorite: boolean
    continueWatching: boolean
    statusRank: number
  }

  interface ColumnDef {
    key: TableColumn
    label: () => string
    value: (row: Row) => string
  }

  const store = getMovieStore()

  let sortKey = $state<SortKey>('title')
  let sortDirection = $state<SortDirection>('asc')
  let visibleCount = $state(PAGE_SIZE)
  let exporting = $state<string | null>(null)
  let viewEl = $state<HTMLElement | null>(null)

  // Native <details> menus stay open when clicking elsewhere; close them.
  $effect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target || !viewEl) return
      for (const menu of viewEl.querySelectorAll<HTMLDetailsElement>('details.table-menu[open]')) {
        if (!menu.contains(target)) menu.open = false
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  })

  const columns: ColumnDef[] = [
    {
      key: 'year',
      label: () => m['table.columns.year'](),
      value: (row) => (row.year ? String(row.year) : ''),
    },
    {
      key: 'type',
      label: () => m['table.columns.type'](),
      value: (row) => itemTypeLabel(row.type),
    },
    {
      key: 'countries',
      label: () => m['table.columns.countries'](),
      value: (row) => row.countries.join(', '),
    },
    {
      key: 'genres',
      label: () => m['table.columns.genres'](),
      value: (row) => row.genres.join(', '),
    },
    {
      key: 'rating',
      label: () => m['table.columns.rating'](),
      value: (row) => row.rating?.toFixed(1) ?? '',
    },
    {
      key: 'officialRating',
      label: () => m['table.columns.officialRating'](),
      value: (row) => row.officialRating ?? '',
    },
    {
      key: 'runtime',
      label: () => m['table.columns.runtime'](),
      value: (row) => (row.runtime ? `${row.runtime} min` : ''),
    },
    {
      key: 'premiereDate',
      label: () => m['table.columns.premiereDate'](),
      value: (row) => dateLabel(row.premiereDate),
    },
    { key: 'status', label: () => m['table.columns.status'](), value: (row) => statusText(row) },
  ]

  const rows = $derived.by(() =>
    store.currentMovies.map((movie) => {
      const played = movie.UserData?.Played === true
      const favorite = movie.UserData?.IsFavorite === true
      const continueWatching = store.isContinueWatching(movie)
      const statusRank = continueWatching ? 3 : favorite ? 2 : played ? 1 : 0
      return {
        movie,
        title: movie.Name,
        year: movie.ProductionYear,
        type: movie.Type ?? '',
        countries: store.getCountries(movie),
        genres: movie.Genres ?? [],
        rating: movie.CommunityRating,
        officialRating: movie.OfficialRating,
        premiereDate: movie.PremiereDate,
        runtime: movie.RunTimeTicks ? Math.round(movie.RunTimeTicks / 600000000) : undefined,
        played,
        favorite,
        continueWatching,
        statusRank,
      }
    })
  )

  const sortedRows = $derived.by(() => {
    const compare = (rowA: Row, rowB: Row): number => {
      switch (sortKey) {
        case 'year':
          return (rowA.year ?? 0) - (rowB.year ?? 0)
        case 'type':
          return rowA.type.localeCompare(rowB.type)
        case 'countries':
          return rowA.countries.join(', ').localeCompare(rowB.countries.join(', '))
        case 'genres':
          return rowA.genres.join(', ').localeCompare(rowB.genres.join(', '))
        case 'rating':
          return (rowA.rating ?? -1) - (rowB.rating ?? -1)
        case 'officialRating':
          return (rowA.officialRating ?? '').localeCompare(rowB.officialRating ?? '')
        case 'runtime':
          return (rowA.runtime ?? -1) - (rowB.runtime ?? -1)
        case 'premiereDate':
          return dateTimestamp(rowA.premiereDate) - dateTimestamp(rowB.premiereDate)
        case 'status':
          return rowA.statusRank - rowB.statusRank
        default:
          return rowA.title.localeCompare(rowB.title)
      }
    }

    return [...rows].sort((rowA, rowB) => {
      const result = compare(rowA, rowB)
      return sortDirection === 'asc' ? result : -result
    })
  })

  const visibleRows = $derived(sortedRows.slice(0, visibleCount))
  const from = $derived(sortedRows.length > 0 ? 1 : 0)
  const to = $derived(Math.min(sortedRows.length, visibleCount))
  const hasMore = $derived(visibleCount < sortedRows.length)
  const visibleColumns = $derived(columns.filter((column) => ui.tableColumns.includes(column.key)))

  const exportTable = $derived<ExportTable>({
    headers: [m['table.columns.title'](), ...visibleColumns.map((column) => column.label())],
    rows: sortedRows.map((row) => [
      row.title,
      ...visibleColumns.map((column) => column.value(row)),
    ]),
  })

  $effect(() => {
    void store.currentMovies
    void sortKey
    void sortDirection
    visibleCount = PAGE_SIZE
  })

  function statusText(row: Row): string {
    return [
      row.played ? m['filter.played']() : null,
      row.favorite ? m['filter.favorite']() : null,
      row.continueWatching ? m['filter.continueWatching']() : null,
    ]
      .filter(Boolean)
      .join(' · ')
  }

  function dateLabel(value?: string): string {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat(i18n.locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  }

  function dateTimestamp(value?: string): number {
    if (!value) return 0
    const time = Date.parse(value)
    return Number.isFinite(time) ? time : 0
  }

  function isVisible(key: TableColumn): boolean {
    return ui.tableColumns.includes(key)
  }

  function sortBy(key: SortKey) {
    if (sortKey === key) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'
    } else {
      sortKey = key
      sortDirection = 'asc'
    }
  }

  function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    if (sortKey !== key) return 'none'
    return sortDirection === 'asc' ? 'ascending' : 'descending'
  }

  function sortIcon(key: SortKey): string {
    if (sortKey !== key) return 'fa-sort'
    return sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down'
  }

  function toggleColumn(key: TableColumn, checked: boolean) {
    ui.tableColumns = checked
      ? [...new Set([...ui.tableColumns, key])]
      : ui.tableColumns.filter((column) => column !== key)
  }

  function handleScroll(event: Event) {
    if (!hasMore) return
    const element = event.currentTarget as HTMLElement
    if (element.scrollHeight - element.scrollTop - element.clientHeight < 240) {
      visibleCount = Math.min(sortedRows.length, visibleCount + PAGE_SIZE)
    }
  }

  function openMovie(movie: JellyfinItem) {
    ui.activeCountry = null
    ui.activePerson = null
    store.setActiveMovieId(movie.Id)
  }

  function posterUrl(movie: JellyfinItem): string {
    return `/api/jellyfin/image/${movie.Id}?maxWidth=80&maxHeight=120`
  }

  function countryCellLabel(countries: string[]): string {
    return countries
      .slice(0, 2)
      .map((country) => {
        const flag = countryFlagEmoji(country)
        const label = countryLabel(country)
        return `${flag ? `${flag} ` : ''}${label}`
      })
      .join(', ')
  }

  function countryTitle(countries: string[]): string {
    return countries.map((country) => countryLabel(country)).join(', ')
  }

  function genreLabel(genres: string[]): string {
    const visible = genres.slice(0, 2).join(', ')
    return genres.length > 2 ? `${visible} +${genres.length - 2}` : visible
  }

  async function exportData(format: 'csv' | 'json' | 'pdf') {
    exporting = format
    try {
      if (format === 'csv') downloadCsv(exportTable)
      else if (format === 'json') downloadJson(exportTable)
      else await downloadPdf(exportTable)
    } finally {
      exporting = null
    }
  }
</script>

<section class="table-view" aria-label={m['view.table']()} bind:this={viewEl}>
  <ViewHeader
    title={m['table.title']()}
    subtitle={m['table.subtitle']({ filtered: rows.length, total: store.allMovies.length })}
  >
    <span class="view-range">{m['table.range']({ from, to, total: sortedRows.length })}</span>

    <details class="table-menu">
      <summary>
        <i class="fas fa-table-columns"></i>
        {m['table.columns.button']()}
      </summary>
      <div class="menu-panel">
        {#each columns as column (column.key)}
          <label>
            <input
              id="table-column-{column.key}"
              name="table-column"
              type="checkbox"
              checked={isVisible(column.key)}
              onchange={(event) => toggleColumn(column.key, event.currentTarget.checked)}
            />
            {column.label()}
          </label>
        {/each}
      </div>
    </details>

    <details class="table-menu">
      <summary>
        <i class="fas fa-download"></i>
        {m['table.download']()}
      </summary>
      <div class="menu-panel">
        <button type="button" disabled={exporting !== null} onclick={() => exportData('csv')}>
          <i class="fas fa-file-csv"></i> CSV
        </button>
        <button type="button" disabled={exporting !== null} onclick={() => exportData('json')}>
          <i class="fas fa-file-code"></i> JSON
        </button>
        <button type="button" disabled={exporting !== null} onclick={() => exportData('pdf')}>
          <i class="fas fa-file-pdf"></i>
          {exporting === 'pdf' ? m['table.exporting']() : 'PDF'}
        </button>
      </div>
    </details>
  </ViewHeader>

  {#if sortedRows.length > 0}
    <div class="table-scroll" onscroll={handleScroll}>
      <table>
        <thead>
          <tr>
            <th class="col-title" aria-sort={ariaSort('title')}>
              <button onclick={() => sortBy('title')}>
                {m['table.columns.title']()}
                <i class="fas fa-{sortIcon('title')}"></i>
              </button>
            </th>
            {#if isVisible('year')}
              <th class="col-year" aria-sort={ariaSort('year')}>
                <button onclick={() => sortBy('year')}>
                  {m['table.columns.year']()}
                  <i class="fas fa-{sortIcon('year')}"></i>
                </button>
              </th>
            {/if}
            {#if isVisible('type')}
              <th class="col-type" aria-sort={ariaSort('type')}>
                <button onclick={() => sortBy('type')}>
                  {m['table.columns.type']()}
                  <i class="fas fa-{sortIcon('type')}"></i>
                </button>
              </th>
            {/if}
            {#if isVisible('countries')}
              <th class="col-countries" aria-sort={ariaSort('countries')}>
                <button onclick={() => sortBy('countries')}>
                  {m['table.columns.countries']()}
                  <i class="fas fa-{sortIcon('countries')}"></i>
                </button>
              </th>
            {/if}
            {#if isVisible('genres')}
              <th class="col-genres" aria-sort={ariaSort('genres')}>
                <button onclick={() => sortBy('genres')}>
                  {m['table.columns.genres']()}
                  <i class="fas fa-{sortIcon('genres')}"></i>
                </button>
              </th>
            {/if}
            {#if isVisible('rating')}
              <th class="col-rating" aria-sort={ariaSort('rating')}>
                <button onclick={() => sortBy('rating')}>
                  {m['table.columns.rating']()}
                  <i class="fas fa-{sortIcon('rating')}"></i>
                </button>
              </th>
            {/if}
            {#if isVisible('officialRating')}
              <th class="col-official-rating" aria-sort={ariaSort('officialRating')}>
                <button onclick={() => sortBy('officialRating')}>
                  {m['table.columns.officialRating']()}
                  <i class="fas fa-{sortIcon('officialRating')}"></i>
                </button>
              </th>
            {/if}
            {#if isVisible('runtime')}
              <th class="col-runtime" aria-sort={ariaSort('runtime')}>
                <button onclick={() => sortBy('runtime')}>
                  {m['table.columns.runtime']()}
                  <i class="fas fa-{sortIcon('runtime')}"></i>
                </button>
              </th>
            {/if}
            {#if isVisible('premiereDate')}
              <th class="col-premiere" aria-sort={ariaSort('premiereDate')}>
                <button onclick={() => sortBy('premiereDate')}>
                  {m['table.columns.premiereDate']()}
                  <i class="fas fa-{sortIcon('premiereDate')}"></i>
                </button>
              </th>
            {/if}
            {#if isVisible('status')}
              <th class="col-status" aria-sort={ariaSort('status')}>
                <button onclick={() => sortBy('status')}>
                  {m['table.columns.status']()}
                  <i class="fas fa-{sortIcon('status')}"></i>
                </button>
              </th>
            {/if}
          </tr>
        </thead>
        <tbody>
          {#each visibleRows as row (row.movie.Id)}
            <tr onclick={() => openMovie(row.movie)}>
              <td class="col-title">
                <button
                  type="button"
                  class="title-cell"
                  onclick={(event) => {
                    event.stopPropagation()
                    openMovie(row.movie)
                  }}
                >
                  <span class="poster">
                    <i class="fas fa-film"></i>
                    <img
                      src={posterUrl(row.movie)}
                      alt=""
                      loading="lazy"
                      onerror={(event) =>
                        ((event.currentTarget as HTMLImageElement).style.display = 'none')}
                    />
                  </span>
                  <span class="title-text" title={row.title}>{row.title}</span>
                </button>
              </td>
              {#if isVisible('year')}<td class="col-year">{row.year ?? '—'}</td>{/if}
              {#if isVisible('type')}
                <td class="col-type">
                  <span class="type-cell">
                    <i class="fas fa-{itemTypeIcon(row.type)}"></i>
                    {itemTypeLabel(row.type)}
                  </span>
                </td>
              {/if}
              {#if isVisible('countries')}
                <td class="col-countries" title={countryTitle(row.countries)}>
                  {countryCellLabel(row.countries)}
                </td>
              {/if}
              {#if isVisible('genres')}
                <td class="col-genres" title={row.genres.join(', ')}>{genreLabel(row.genres)}</td>
              {/if}
              {#if isVisible('rating')}
                <td class="col-rating">{row.rating?.toFixed(1) ?? '—'}</td>
              {/if}
              {#if isVisible('officialRating')}
                <td class="col-official-rating">{row.officialRating ?? '—'}</td>
              {/if}
              {#if isVisible('runtime')}
                <td class="col-runtime">{row.runtime ? `${row.runtime} min` : '—'}</td>
              {/if}
              {#if isVisible('premiereDate')}
                <td class="col-premiere">{dateLabel(row.premiereDate) || '—'}</td>
              {/if}
              {#if isVisible('status')}
                <td class="col-status">
                  <span class="status-cell">
                    {#if row.played}
                      <i
                        class="fas fa-circle-check played"
                        data-tooltip
                        role="img"
                        aria-label={m['table.status.played']()}
                      >
                        <Tooltip label={m['table.status.played']()} placement="left" />
                      </i>
                    {/if}
                    {#if row.favorite}
                      <i
                        class="fas fa-heart favorite"
                        data-tooltip
                        role="img"
                        aria-label={m['table.status.favorite']()}
                      >
                        <Tooltip label={m['table.status.favorite']()} placement="left" />
                      </i>
                    {/if}
                    {#if row.continueWatching}
                      <i
                        class="fas fa-play continue"
                        data-tooltip
                        role="img"
                        aria-label={m['table.status.continue']()}
                      >
                        <Tooltip label={m['table.status.continue']()} placement="left" />
                      </i>
                    {/if}
                    {#if !row.played && !row.favorite && !row.continueWatching}
                      <span class="status-none">—</span>
                    {/if}
                  </span>
                </td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>

      {#if hasMore}
        <p class="load-more"><i class="fas fa-chevron-down"></i> {m['table.loadMore']()}</p>
      {/if}
    </div>
  {:else}
    <p class="view-empty">{m['table.empty']()}</p>
  {/if}
</section>

<style>
  .table-view {
    position: fixed;
    top: 0;
    left: var(--rail-w);
    right: 0;
    bottom: calc(var(--filters-h) + env(safe-area-inset-bottom, 0px));
    z-index: 5;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg);
    color: var(--text);
  }

  .view-range {
    font-size: 11px;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .table-menu {
    position: relative;
  }

  .table-menu summary {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 32px;
    padding: 0 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--card);
    color: var(--text);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    list-style: none;
  }

  .table-menu summary::-webkit-details-marker {
    display: none;
  }

  .table-menu summary:hover {
    border-color: var(--text-muted);
  }

  .table-menu[open] summary {
    border-color: var(--accent);
    color: var(--accent);
  }

  .menu-panel {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 5;
    min-width: 170px;
    padding: 5px;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--card);
    box-shadow: var(--shadow-panel);
  }

  .menu-panel label,
  .menu-panel button {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 7px 8px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--text);
    font-family: inherit;
    font-size: 12px;
    text-align: left;
    cursor: pointer;
  }

  .menu-panel label:hover,
  .menu-panel button:hover:not(:disabled) {
    background: var(--card-hover);
  }

  .menu-panel input {
    accent-color: var(--accent);
  }

  .menu-panel button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .menu-panel i {
    width: 13px;
    text-align: center;
    color: var(--text-muted);
  }

  .table-scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }

  table {
    width: 100%;
    min-width: 700px;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 12px;
  }

  thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 0;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    text-align: left;
    font-weight: 600;
    white-space: nowrap;
  }

  thead th button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 10px 12px;
    border: 0;
    background: transparent;
    color: var(--text-muted);
    font-family: inherit;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    cursor: pointer;
  }

  thead th button:hover {
    color: var(--text);
    background: var(--card-hover);
  }

  thead th button:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: -3px;
  }

  thead th i {
    font-size: 9px;
    opacity: 0.7;
  }

  tbody tr {
    cursor: pointer;
    outline: none;
  }

  tbody tr:nth-child(even) {
    background: var(--card);
  }

  tbody tr:hover {
    background: var(--card-hover);
  }

  td {
    padding: 7px 12px;
    border-bottom: 1px solid var(--border);
    color: var(--text);
    vertical-align: middle;
  }

  .col-title {
    min-width: 250px;
  }

  .col-year {
    width: 70px;
    font-variant-numeric: tabular-nums;
  }

  .col-type {
    width: 100px;
    white-space: nowrap;
  }

  .col-countries {
    min-width: 150px;
    max-width: 230px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .col-genres {
    min-width: 130px;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .col-rating {
    width: 66px;
    font-variant-numeric: tabular-nums;
  }

  .col-official-rating {
    width: 88px;
    white-space: nowrap;
  }

  .col-runtime {
    width: 90px;
    font-variant-numeric: tabular-nums;
  }

  .col-premiere {
    width: 110px;
    white-space: nowrap;
  }

  .col-status {
    width: 90px;
  }

  .title-cell {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .title-cell:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 2px;
    border-radius: 6px;
  }

  .poster {
    position: relative;
    width: 28px;
    height: 42px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    overflow: hidden;
    border-radius: 4px;
    background: var(--card-hover);
    color: var(--text-muted);
    font-size: 10px;
  }

  .poster img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .title-text {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .type-cell {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .type-cell i {
    font-size: 10px;
    color: var(--text-muted);
  }

  .status-cell {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }

  .status-cell i {
    font-size: 11px;
    cursor: help;
  }

  .status-cell .played {
    color: var(--green);
  }

  .status-cell .favorite {
    color: var(--red);
  }

  .status-cell .continue {
    color: var(--accent);
  }

  .status-none {
    color: var(--text-muted);
  }

  .load-more {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 14px;
    font-size: 11px;
    color: var(--text-muted);
  }

  .view-empty {
    margin: 22px;
    font-size: 12px;
    color: var(--text-muted);
  }

  @media (max-width: 768px) {
    .view-range {
      order: -1;
    }

    table {
      min-width: 580px;
    }

    .col-title {
      min-width: 200px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    thead th button {
      transition: none;
    }
  }
</style>
