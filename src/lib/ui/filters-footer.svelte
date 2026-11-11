<script lang="ts">
  import * as m from '#i18n/messages.js'
  import { getMovieStore } from '#core'
  import { itemTypeIcon, itemTypeLabel, statusIcon, statusLabel } from '#lib/filter-labels.js'
  import { countryLabel } from './country-label'
  import Tooltip from './tooltip.svelte'

  const store = getMovieStore()

  const filterCount = $derived(
    store.activeCountries.size +
      store.activeDirectors.size +
      store.activeTypes.size +
      (store.playedFilter !== 'all' ? 1 : 0) +
      (store.favoritesOnly ? 1 : 0) +
      (store.continueOnly ? 1 : 0)
  )
  const hasYearFilter = $derived(
    store.selectedYearRange[0] !== store.yearBounds[0] ||
      store.selectedYearRange[1] !== store.yearBounds[1]
  )
  const yearCount = $derived(store.selectedYearRange[1] - store.selectedYearRange[0] + 1)
  const hasSearch = $derived(store.searchTerm.trim().length > 0)
  const hasAnyFilter = $derived(filterCount > 0 || hasYearFilter || hasSearch)
  const totalStats = $derived(store.getStats(store.allMovies))
  const filteredStats = $derived(store.getStats(store.currentMovies))

  function clearAll() {
    store.resetView()
  }

  function resetYear() {
    store.setYearRange([store.yearBounds[0], store.yearBounds[1]])
  }
</script>

<footer class="filters-footer" aria-label={m['filter.title']()}>
  <div class="footer-stats">
    <span class="footer-stat" title={m['stats.movies']()}>
      <i class="fas fa-film"></i>
      <b>{filteredStats.movies}/{totalStats.movies}</b>
      <span class="footer-stat-label">{m['stats.movies']()}</span>
    </span>
    <span class="footer-stat" title={m['stats.series']()}>
      <i class="fas fa-tv"></i>
      <b>{filteredStats.series}/{totalStats.series}</b>
      <span class="footer-stat-label">{m['stats.series']()}</span>
    </span>
    <span class="footer-stat" title={m['stats.countries']()}>
      <i class="fas fa-globe"></i>
      <b>{filteredStats.countries}/{totalStats.countries}</b>
      <span class="footer-stat-label">{m['stats.countries']()}</span>
    </span>
  </div>

  <div class="filters-scroll">
    {#if hasSearch}
      <button
        class="filter-chip search"
        onclick={() => store.setSearchTerm('')}
        title={m['filter.remove']()}
      >
        <i class="fas fa-search"></i>
        <span>{store.searchTerm}</span>
        <i class="fas fa-times"></i>
      </button>
    {/if}

    {#if hasYearFilter}
      <button class="filter-chip year" onclick={resetYear} title={m['filter.remove']()}>
        <i class="fas fa-calendar"></i>
        <span>
          {store.selectedYearRange[0]}–{store.selectedYearRange[1]}
          · {yearCount === 1
            ? m['filter.year']({ n: yearCount })
            : m['filter.years']({ n: yearCount })}
        </span>
        <i class="fas fa-times"></i>
      </button>
    {/if}

    {#each [...store.activeTypes] as type (type)}
      <button
        class="filter-chip type"
        onclick={() => store.toggleActiveType(type)}
        title={m['filter.remove']()}
      >
        <i class="fas fa-{itemTypeIcon(type)}"></i>
        <span>{itemTypeLabel(type)}</span>
        <i class="fas fa-times"></i>
      </button>
    {/each}

    {#if store.playedFilter !== 'all'}
      <button
        class="filter-chip status"
        onclick={() => store.setPlayedFilter('all')}
        title={m['filter.remove']()}
      >
        <i class="fas fa-{statusIcon(store.playedFilter)}"></i>
        <span>{statusLabel(store.playedFilter)}</span>
        <i class="fas fa-times"></i>
      </button>
    {/if}

    {#if store.favoritesOnly}
      <button
        class="filter-chip status"
        onclick={() => store.setFavoritesOnly(false)}
        title={m['filter.remove']()}
      >
        <i class="fas fa-{statusIcon('favorite')}"></i>
        <span>{statusLabel('favorite')}</span>
        <i class="fas fa-times"></i>
      </button>
    {/if}

    {#if store.continueOnly}
      <button
        class="filter-chip status"
        onclick={() => store.setContinueOnly(false)}
        title={m['filter.remove']()}
      >
        <i class="fas fa-{statusIcon('continue')}"></i>
        <span>{statusLabel('continue')}</span>
        <i class="fas fa-times"></i>
      </button>
    {/if}

    {#each [...store.activeCountries] as country (country)}
      <button
        class="filter-chip country"
        onclick={() => store.toggleActiveCountry(country)}
        title={m['filter.remove']()}
      >
        <i class="fas fa-map-marker-alt"></i>
        <span>{countryLabel(country)}</span>
        <i class="fas fa-times"></i>
      </button>
    {/each}

    {#each [...store.activeDirectors] as director (director)}
      <button
        class="filter-chip director"
        onclick={() => store.toggleActiveDirector(director)}
        title={m['filter.remove']()}
      >
        <i class="fas fa-video"></i>
        <span>{director}</span>
        <i class="fas fa-times"></i>
      </button>
    {/each}

    {#if !hasAnyFilter}
      <span class="filters-empty">{m['filter.none']()}</span>
    {/if}
  </div>

  {#if hasAnyFilter}
    <button
      class="filters-clear"
      onclick={clearAll}
      aria-label={m['filter.clearAll']()}
      data-tooltip
    >
      <i class="fas fa-undo"></i>
      <Tooltip label={m['filter.clearAll']()} shortcut="clearFilters" placement="left" />
    </button>
  {/if}
</footer>

<style>
  .filters-footer {
    position: fixed;
    left: var(--rail-w);
    right: 0;
    bottom: 0;
    z-index: 115;
    height: calc(var(--filters-h) + env(safe-area-inset-bottom, 0px));
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px calc(6px + env(safe-area-inset-bottom, 0px));
    background: var(--panel-bg);
    border-top: 1px solid var(--border);
    backdrop-filter: blur(14px);
  }

  .filters-scroll {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
    padding: 2px 0;
  }

  .footer-stats {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
    padding: 0 4px;
    font-size: 11px;
    color: var(--text-muted);
  }

  .footer-stat {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }

  .footer-stat i {
    font-size: 10px;
    color: var(--accent);
  }

  .footer-stat b {
    color: var(--text);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 900px) {
    .footer-stat-label {
      display: none;
    }

    .footer-stats {
      gap: 8px;
    }
  }

  .filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--text);
    font-family: inherit;
    font-size: 11px;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .filter-chip span {
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .filter-chip i:first-child {
    color: var(--text-muted);
    font-size: 9px;
  }

  .filter-chip i:last-child {
    color: var(--text-muted);
    font-size: 9px;
  }

  .filter-chip:hover {
    border-color: var(--text-muted);
  }

  .filter-chip.country {
    border-color: var(--teal);
    color: var(--teal);
    background: var(--teal-dim);
  }

  .filter-chip.director {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-dim);
  }

  .filter-chip.country i,
  .filter-chip.director i {
    color: currentColor;
  }

  .filter-chip.type {
    border-color: var(--border);
    background: var(--card);
    color: var(--text);
  }

  .filter-chip.status {
    border-color: var(--accent);
    background: var(--accent-dim);
    color: var(--accent);
  }

  .filter-chip.type i,
  .filter-chip.status i {
    color: currentColor;
  }

  .filters-empty {
    font-size: 11px;
    color: var(--text-muted);
    white-space: nowrap;
    padding-left: 4px;
  }

  .filters-clear {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 12px;
    flex-shrink: 0;
  }

  .filters-clear:hover {
    color: var(--text);
    background: var(--card-hover);
  }

  @media (max-width: 480px) {
    .filters-footer {
      gap: 4px;
    }
  }
</style>
