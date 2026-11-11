<script lang="ts">
  import * as m from '#i18n/messages.js'
  import { getMovieStore, ui } from '#core'
  import { itemTypeLabel, statusIcon, statusLabel } from '#lib/filter-labels.js'
  import { countryLabel } from './country-label'
  import YearRange from './year-range.svelte'
  import SearchField from './search-field.svelte'
  import { normalizeText } from './normalize-text'

  const store = getMovieStore()

  const playedOptions: ('all' | 'played' | 'unplayed')[] = ['all', 'played', 'unplayed']

  let countrySearch = $state('')
  let directorSearch = $state('')

  const hasYearFilter = $derived(
    store.selectedYearRange[0] !== store.yearBounds[0] ||
      store.selectedYearRange[1] !== store.yearBounds[1]
  )
  const statusCount = $derived(
    (store.playedFilter !== 'all' ? 1 : 0) +
      (store.favoritesOnly ? 1 : 0) +
      (store.continueOnly ? 1 : 0)
  )
  const filterCount = $derived(
    store.activeCountries.size + store.activeDirectors.size + store.activeTypes.size + statusCount
  )
  const hasAnyFilter = $derived(
    filterCount > 0 || hasYearFilter || store.searchTerm.trim().length > 0
  )

  const countries = $derived(
    store
      .getAllCountries()
      .filter((country) =>
        normalizeText(countryLabel(country)).includes(normalizeText(countrySearch))
      )
  )
  const directors = $derived(
    store
      .getAllDirectors()
      .filter((director) => normalizeText(director).includes(normalizeText(directorSearch)))
  )
</script>

<div class="filter-sections">
  <div class="filters-scroll">
    <details class="filter-section">
      <summary>
        <span class="section-title">{m['filter.yearRange']()}</span>
        {#if hasYearFilter}
          <span class="section-count">
            {store.selectedYearRange[0]}–{store.selectedYearRange[1]}
          </span>
        {/if}
        <i class="fas fa-chevron-down section-chevron" aria-hidden="true"></i>
      </summary>
      <div class="section-body">
        <YearRange showLabel={false} />
      </div>
    </details>

    <details class="filter-section">
      <summary>
        <span class="section-title">{m['filter.type']()}</span>
        {#if store.activeTypes.size > 0}
          <span class="section-count">{store.activeTypes.size}</span>
        {/if}
        <i class="fas fa-chevron-down section-chevron" aria-hidden="true"></i>
      </summary>
      <div class="section-body">
        <div class="choice-row">
          <button
            class={['choice', { active: store.activeTypes.size === 0 }]}
            aria-pressed={store.activeTypes.size === 0}
            onclick={() => store.clearTypes()}
          >
            {m['filter.all']()}
          </button>
          {#each store.getAllTypes() as type (type)}
            <button
              class={['choice', { active: store.activeTypes.has(type) }]}
              aria-pressed={store.activeTypes.has(type)}
              onclick={() => store.toggleActiveType(type)}
            >
              {itemTypeLabel(type)}
            </button>
          {/each}
        </div>
      </div>
    </details>

    <details class="filter-section">
      <summary>
        <span class="section-title">{m['filter.status']()}</span>
        {#if statusCount > 0}
          <span class="section-count">{statusCount}</span>
        {/if}
        <i class="fas fa-chevron-down section-chevron" aria-hidden="true"></i>
      </summary>
      <div class="section-body">
        <div class="choice-row" role="group" aria-label={m['filter.playedState']()}>
          {#each playedOptions as option (option)}
            <button
              class={['choice', { active: store.playedFilter === option }]}
              aria-pressed={store.playedFilter === option}
              onclick={() => store.setPlayedFilter(option)}
            >
              {#if option !== 'all'}
                <i class="fas fa-{statusIcon(option)}"></i>
              {/if}
              {option === 'all' ? m['filter.all']() : statusLabel(option)}
            </button>
          {/each}
        </div>

        <label class="filters-row option-row">
          <input
            type="checkbox"
            name="favorite"
            checked={store.favoritesOnly}
            onchange={(event) => store.setFavoritesOnly(event.currentTarget.checked)}
          />
          <i class="fas fa-{statusIcon('favorite')} option-icon"></i>
          <span>{statusLabel('favorite')}</span>
        </label>

        <label class="filters-row option-row">
          <input
            type="checkbox"
            name="continue-watching"
            checked={store.continueOnly}
            onchange={(event) => store.setContinueOnly(event.currentTarget.checked)}
          />
          <i class="fas fa-{statusIcon('continue')} option-icon"></i>
          <span>{statusLabel('continue')}</span>
        </label>
      </div>
    </details>

    <details class="filter-section">
      <summary>
        <span class="section-title">{m['filter.countries']()}</span>
        {#if store.activeCountries.size > 0}
          <span class="section-count">{store.activeCountries.size}</span>
        {/if}
        <i class="fas fa-chevron-down section-chevron" aria-hidden="true"></i>
      </summary>
      <div class="section-body">
        <div class="section-search">
          <SearchField
            id="country-search"
            name="country-search"
            size="sm"
            bind:value={countrySearch}
            placeholder={m['filter.searchCountries']()}
            clearLabel={m['filter.clearAll']()}
          />
        </div>
        <div class="filters-list">
          {#each countries as country (country)}
            <label class="filters-row">
              <input
                type="checkbox"
                name="country"
                checked={store.activeCountries.has(country)}
                onchange={() => store.toggleActiveCountry(country)}
              />
              <span>{countryLabel(country)}</span>
            </label>
          {:else}
            <p class="filters-empty">{m['filter.noResults']()}</p>
          {/each}
        </div>
      </div>
    </details>

    <details class="filter-section">
      <summary>
        <span class="section-title">{m['filter.directors']()}</span>
        {#if store.activeDirectors.size > 0}
          <span class="section-count">{store.activeDirectors.size}</span>
        {/if}
        <i class="fas fa-chevron-down section-chevron" aria-hidden="true"></i>
      </summary>
      <div class="section-body">
        <div class="section-search">
          <SearchField
            id="director-search"
            name="director-search"
            size="sm"
            bind:value={directorSearch}
            placeholder={m['filter.searchDirectors']()}
            clearLabel={m['filter.clearAll']()}
          />
        </div>
        <div class="filters-list">
          {#each directors as director (director)}
            <label class="filters-row">
              <input
                type="checkbox"
                name="director"
                checked={store.activeDirectors.has(director)}
                onchange={() => store.toggleActiveDirector(director)}
              />
              <span>{director}</span>
            </label>
          {:else}
            <p class="filters-empty">{m['filter.noResults']()}</p>
          {/each}
        </div>
      </div>
    </details>
  </div>

  <footer class="filters-actions">
    <button class="button ghost" onclick={() => store.resetView()} disabled={!hasAnyFilter}>
      <i class="fas fa-undo"></i>
      {m['filter.clearAll']()}
    </button>
    <!-- <button class="button primary" onclick={() => (ui.sidebarTab = 'results')}>
      <i class="fas fa-list"></i>
      {store.currentMovies.length === 1
        ? m['filter.showResult']({ n: store.currentMovies.length })
        : m['filter.showResults']({ n: store.currentMovies.length })}
    </button> -->
  </footer>
</div>

<style>
  .filter-sections {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .filters-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-bottom: 4px;
    scrollbar-gutter: stable;
  }

  .filter-section {
    border-bottom: 1px solid var(--border);
  }

  .filter-section summary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 13px 18px;
    list-style: none;
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .filter-section summary::-webkit-details-marker {
    display: none;
  }

  .filter-section summary:hover {
    background: var(--card-hover);
  }

  .filter-section[open] summary {
    color: var(--text);
  }

  .filter-section summary:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: -3px;
  }

  .section-title {
    flex: 1;
    min-width: 0;
  }

  .section-count {
    flex-shrink: 0;
    padding: 1px 7px;
    border-radius: 999px;
    background: var(--accent-dim);
    color: var(--accent);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: none;
    font-variant-numeric: tabular-nums;
  }

  .section-chevron {
    flex-shrink: 0;
    font-size: 10px;
    color: var(--text-muted);
    transition: transform 0.18s ease;
  }

  .filter-section[open] .section-chevron {
    transform: rotate(180deg);
  }

  .section-body {
    padding: 2px 18px 14px;
  }

  .section-search {
    margin: 2px 0 8px;
  }

  .choice-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .choice {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 30px;
    padding: 0 10px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--card);
    color: var(--text-muted);
    font-family: inherit;
    font-size: 11px;
    cursor: pointer;
  }

  .choice:hover {
    color: var(--text);
    border-color: var(--text-muted);
  }

  .choice.active {
    background: var(--accent-dim);
    border-color: var(--accent);
    color: var(--accent);
    font-weight: 600;
  }

  .choice i {
    font-size: 9px;
  }

  .filters-list {
    display: flex;
    flex-direction: column;
    max-height: 230px;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-right: 2px;
    scrollbar-gutter: stable;
  }

  .filters-row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 36px;
    padding: 5px 0;
    font-size: 13px;
    color: var(--text);
    cursor: pointer;
    border-radius: 6px;
  }

  .filters-row:hover {
    background: var(--card-hover);
  }

  .filters-row input {
    width: 16px;
    height: 16px;
    accent-color: var(--accent);
    flex-shrink: 0;
  }

  .filters-row span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .option-row {
    margin-top: 6px;
  }

  .option-icon {
    width: 14px;
    text-align: center;
    font-size: 11px;
    color: var(--accent);
  }

  .filters-empty {
    padding: 8px 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .filters-actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid var(--border);
    background: var(--panel-bg);
  }

  .button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding: 0 11px;
    border-radius: 8px;
    border: 1px solid var(--border);
    font-family: inherit;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }

  .button.ghost {
    background: transparent;
    color: var(--text-muted);
  }

  .button.ghost:hover:not(:disabled) {
    background: var(--card-hover);
    color: var(--text);
  }

  .button.ghost:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .button.primary {
    background: var(--accent-strong);
    border-color: var(--accent-strong);
    color: #fff;
  }

  .button.primary:hover {
    filter: brightness(1.08);
  }

  .button:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .section-chevron {
      transition: none;
    }
  }
</style>
