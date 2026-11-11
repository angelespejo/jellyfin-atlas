<script lang="ts">
  import * as m from '#i18n/messages.js'
  import { getMovieStore, ui } from '#core'

  const store = getMovieStore()

  const filterCount = $derived(
    store.activeCountries.size +
      store.activeDirectors.size +
      store.activeTypes.size +
      (store.playedFilter !== 'all' ? 1 : 0) +
      (store.favoritesOnly ? 1 : 0) +
      (store.continueOnly ? 1 : 0)
  )
</script>

<div class="search-container">
  <i class="fas fa-search"></i>
  <input
    id="search-input"
    type="text"
    class="search-box"
    placeholder={m['search.placeholder']()}
    aria-label={m['search.placeholder']()}
    value={store.searchTerm}
    oninput={(e) => store.setSearchTerm(e.currentTarget.value)}
  />
</div>

<div class="sidebar-tabs" role="group" aria-label={m['filter.title']()}>
  <button
    class="sidebar-tab"
    aria-pressed={ui.sidebarTab === 'results'}
    onclick={() => (ui.sidebarTab = 'results')}
  >
    {m['filter.results']()}
    <span class="tab-count">{store.currentMovies.length}</span>
  </button>
  <button
    class="sidebar-tab"
    aria-pressed={ui.sidebarTab === 'filters'}
    onclick={() => (ui.sidebarTab = 'filters')}
  >
    {m['filter.title']()}
    {#if filterCount > 0}
      <span class="tab-count accent">{filterCount}</span>
    {/if}
  </button>
</div>

<style>
  .search-container {
    padding: 15px 18px 10px;
    position: relative;
  }

  .search-container > i {
    position: absolute;
    left: 32px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    font-size: 12px;
    pointer-events: none;
  }

  .search-box {
    width: 100%;
    background: var(--card);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 11px 13px 11px 36px;
    border-radius: 11px;
    font-family: inherit;
    font-size: 13px;
    outline: none;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  .search-box::placeholder {
    color: var(--text-muted);
  }

  .search-box:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-dim);
  }

  .sidebar-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    margin: 0 18px;
    padding: 3px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--card);
  }

  .sidebar-tab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 32px;
    padding: 0 8px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: var(--text-muted);
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }

  .sidebar-tab:hover {
    color: var(--text);
  }

  .sidebar-tab[aria-pressed='true'] {
    background: var(--accent-dim);
    color: var(--accent);
  }

  .sidebar-tab:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 1px;
  }

  .tab-count {
    min-width: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: var(--card-hover);
    color: var(--text-muted);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    line-height: 17px;
  }

  .sidebar-tab[aria-pressed='true'] .tab-count {
    background: var(--accent);
    color: #fff;
  }

  .tab-count.accent {
    background: var(--accent-strong);
    color: #fff;
  }

  @media (max-width: 768px) {
    .search-container {
      padding-left: 16px;
      padding-right: 16px;
    }

    .sidebar-tabs {
      margin: 0 16px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sidebar-tab {
      transition: none;
    }
  }
</style>
