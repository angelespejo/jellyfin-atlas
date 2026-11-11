<script lang="ts">
  import { onMount, tick } from 'svelte'
  import * as m from '#i18n/messages.js'

  import {
    getMovieStore,
    i18n,
    loadMovieCities,
    ui,
    type ViewMode,
    type UrlState,
    parseUrlState,
    buildUrlParams,
    writeUrlState,
  } from '#core'
  import {
    Sidebar,
    MapView,
    ChartView,
    GraphView,
    TableView,
    DetailPanel,
    CountryPanel,
    PersonPanel,
    NotificationToaster,
    ActionButton,
    ViewSwitcher,
    AboutDialog,
    SettingsDialog,
    FiltersFooter,
    Tooltip,
    notifications,
  } from '#lib'
  import { APP_ID, APP_NAME } from '#const'
  import { matchesShortcut } from '#lib/shortcuts.js'

  const store = getMovieStore()
  const CITIES_KEY = `${APP_ID}_show_cities`
  const VIEW_KEY = `${APP_ID}_view`
  const VIEW_MODES: ViewMode[] = ['map', 'chart', 'graph', 'table']
  const viewTitles: Record<ViewMode, () => string> = {
    map: () => m['meta.map'](),
    chart: () => m['meta.chart'](),
    graph: () => m['meta.graph'](),
    table: () => m['meta.table'](),
  }
  const pageTitle = $derived(`${APP_NAME} · ${viewTitles[ui.view]()}`)
  let urlReady = $state(false)

  function applyUrlFilters(state: UrlState) {
    store.searchTerm = state.search
    store.activeCountries = new Set(state.countries)
    store.activeDirectors = new Set(state.directors)
    store.activeTypes = new Set(state.types)
    store.playedFilter = state.played
    store.favoritesOnly = state.favorites
    store.continueOnly = state.continueWatching

    const [minYear, maxYear] = store.yearBounds
    const start = Math.min(maxYear, Math.max(minYear, state.years?.[0] ?? minYear))
    const end = Math.min(maxYear, Math.max(start, state.years?.[1] ?? maxYear))
    store.selectedYearRange = [start, end]
    store.filterMovies()
  }

  $effect(() => {
    if (!urlReady) return
    writeUrlState(
      buildUrlParams({
        view: ui.view,
        chartTab: ui.chartTab,
        sidebarOpen: ui.sidebarOpen,
        search: store.searchTerm,
        countries: store.activeCountries,
        directors: store.activeDirectors,
        types: store.activeTypes,
        played: store.playedFilter,
        favorites: store.favoritesOnly,
        continueWatching: store.continueOnly,
        years: store.selectedYearRange,
        yearBounds: store.yearBounds,
        columns: ui.tableColumns,
      })
    )
  })

  // Close the sidebar when interacting with the content behind it (the
  // mobile backdrop only covers small screens).
  $effect(() => {
    if (!ui.sidebarOpen) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (!target) return
      if (
        target.closest(
          '#sidebar, .action-rail, .modal-shell, .detail-panel, .person-panel, .country-panel, .sidebar-backdrop'
        )
      )
        return
      ui.sidebarOpen = false
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  })

  async function refreshCities() {
    await loadMovieCities(store.allMovies, i18n.locale)
  }

  onMount(() => {
    const initialState = parseUrlState(window.location.search)
    if (initialState.view) ui.view = initialState.view
    if (initialState.chartTab) ui.chartTab = initialState.chartTab
    if (initialState.sidebarOpen !== undefined) ui.sidebarOpen = initialState.sidebarOpen
    ui.tableColumns = initialState.columns

    if (!ui.initialized) {
      ui.initialized = true
      if (initialState.sidebarOpen === undefined) ui.sidebarOpen = window.innerWidth > 768
      try {
        const savedCities = localStorage.getItem(CITIES_KEY)
        if (savedCities === 'true' || savedCities === 'false')
          ui.showCities = savedCities === 'true'
        if (!initialState.view) {
          const savedView = localStorage.getItem(VIEW_KEY)
          if (savedView && VIEW_MODES.includes(savedView as ViewMode))
            ui.view = savedView as ViewMode
        }
      } catch {
        // Keep the defaults when storage is unavailable.
      }
    }

    store
      .loadMovies()
      .then(() => applyUrlFilters(initialState))
      .finally(() => {
        urlReady = true
        refreshCities()
      })
  })

  function setView(next: ViewMode) {
    ui.view = next
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // The view still applies for this session.
    }
    // Charts and graphs use the full width; the sidebar would cover their labels.
    if (next !== 'map' && ui.sidebarOpen) ui.sidebarOpen = false
  }

  function setShowCities(next: boolean) {
    ui.showCities = next
    try {
      localStorage.setItem(CITIES_KEY, String(next))
    } catch {
      // The toggle still applies for this session.
    }
  }

  let dialogTrigger: HTMLElement | null = null

  async function openSearch() {
    const compact = window.matchMedia('(max-width: 768px)').matches
    if (compact && ui.sidebarOpen && ui.sidebarTab === 'results') {
      ui.sidebarOpen = false
      return
    }
    ui.sidebarTab = 'results'
    ui.sidebarOpen = true
    await tick()
    document.getElementById('search-input')?.focus()
  }

  function openFilters() {
    ui.sidebarTab = 'filters'
    ui.sidebarOpen = true
  }

  function openDialog(next: 'settings' | 'about') {
    const trigger = document.querySelector<HTMLElement>(`[data-dialog="${next}"]`)
    const active = document.activeElement
    dialogTrigger =
      active instanceof HTMLElement && active.matches(`[data-dialog="${next}"]`) ? active : trigger
    ui.sidebarOpen = false
    ui.dialog = next
  }

  async function closeDialog() {
    ui.dialog = null
    await tick()
    dialogTrigger?.focus()
    dialogTrigger = null
  }

  function handleReload() {
    store.loadMovies(true).then(refreshCities)
  }

  function clearCache() {
    store.clearCache()
    notifications.send(m['toast.cacheCleared'](), 'success')
  }

  function isEditableTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null
    return Boolean(
      element &&
      (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable)
    )
  }

  async function handleKeydown(event: KeyboardEvent) {
    if (matchesShortcut(event, 'search')) {
      event.preventDefault()
      await openSearch()
      return
    }

    if (event.key === 'Escape') {
      if (ui.dialog) await closeDialog()
      else if (ui.activePerson) ui.activePerson = null
      else if (ui.activeCountry) ui.activeCountry = null
      else if (store.activeMovieId) store.setActiveMovieId(null)
      else ui.sidebarOpen = false
      return
    }

    // Modal dialogs own the keyboard while open.
    if (ui.dialog) return

    // Alt-based shortcuts must not steal characters while typing.
    if (isEditableTarget(event.target)) return

    if (matchesShortcut(event, 'paneSearch')) {
      event.preventDefault()
      await openSearch()
    } else if (matchesShortcut(event, 'paneSettings')) {
      event.preventDefault()
      openDialog('settings')
    } else if (matchesShortcut(event, 'paneAbout')) {
      event.preventDefault()
      openDialog('about')
    } else if (matchesShortcut(event, 'viewMap')) {
      event.preventDefault()
      setView('map')
    } else if (matchesShortcut(event, 'viewChart')) {
      event.preventDefault()
      setView('chart')
    } else if (matchesShortcut(event, 'viewGraph')) {
      event.preventDefault()
      setView('graph')
    } else if (matchesShortcut(event, 'viewTable')) {
      event.preventDefault()
      setView('table')
    } else if (matchesShortcut(event, 'filters')) {
      event.preventDefault()
      openFilters()
    } else if (matchesShortcut(event, 'clearFilters')) {
      event.preventDefault()
      store.resetView()
    } else if (matchesShortcut(event, 'resetView')) {
      event.preventDefault()
      store.resetView()
    } else if (matchesShortcut(event, 'reload')) {
      event.preventDefault()
      handleReload()
    } else if (matchesShortcut(event, 'clearCache')) {
      event.preventDefault()
      clearCache()
    } else if (matchesShortcut(event, 'cities')) {
      event.preventDefault()
      setShowCities(!ui.showCities)
    }
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={m['info.description']()} />
</svelte:head>
<a class="skip-link" href="#main-content">{m['a11y.skip']()}</a>
<div class="app-layout">
  <main id="main-content" aria-label={m['a11y.main']()} tabindex="-1">
    <h1 class="sr-only">{APP_NAME} · {viewTitles[ui.view]()}</h1>
    <div class="map-layer" class:hidden={ui.view !== 'map'}>
      <MapView theme={ui.theme} showCities={ui.showCities} active={ui.view === 'map'} />
    </div>

    {#if ui.view === 'chart'}
      <ChartView />
    {/if}

    {#if ui.view === 'graph'}
      <GraphView />
    {/if}

    {#if ui.view === 'table'}
      <TableView />
    {/if}
  </main>

  <nav class="action-rail" aria-label={m['a11y.actions']()}>
    <div class="rail-top">
      <div class="rail-brand" aria-hidden="true" data-tooltip>
        <!-- <i class="fas fa-globe"></i> -->
        <img src="/favicon.ico" alt={APP_NAME} />
        <Tooltip label={APP_NAME} placement="right" />
      </div>
      <ActionButton
        icon="search"
        active={ui.sidebarOpen}
        aria-label={m['search.placeholder']()}
        aria-pressed={ui.sidebarOpen}
        tooltip={m['search.placeholder']()}
        tooltipShortcut="search"
        tooltipPlacement="right"
        onclick={openSearch}
      />
    </div>

    <div class="rail-center">
      <ViewSwitcher view={ui.view} onchange={setView} />
    </div>

    <div class="rail-bottom">
      <ActionButton
        icon="cog"
        active={ui.dialog === 'settings'}
        aria-label={m['settings.label']()}
        aria-pressed={ui.dialog === 'settings'}
        data-dialog="settings"
        tooltip={m['settings.label']()}
        tooltipShortcut="paneSettings"
        tooltipPlacement="right"
        onclick={() => openDialog('settings')}
      />
      <ActionButton
        icon="info-circle"
        active={ui.dialog === 'about'}
        aria-label={m['info.title']()}
        aria-pressed={ui.dialog === 'about'}
        data-dialog="about"
        tooltip={m['info.title']()}
        tooltipShortcut="paneAbout"
        tooltipPlacement="right"
        onclick={() => openDialog('about')}
      />
    </div>
  </nav>

  <FiltersFooter />

  <button
    class={['sidebar-backdrop', { visible: ui.sidebarOpen }]}
    onclick={() => (ui.sidebarOpen = false)}
    aria-label={m['sidebar.close']()}
    tabindex="-1"
  ></button>

  <div class={['sidebar-wrapper', { open: ui.sidebarOpen }]}>
    <Sidebar open={ui.sidebarOpen} onclose={() => (ui.sidebarOpen = false)} />
  </div>
</div>

{#if ui.dialog === 'settings'}
  <SettingsDialog
    showCities={ui.showCities}
    onshowcities={setShowCities}
    onreload={handleReload}
    onclose={closeDialog}
  />
{/if}

{#if ui.dialog === 'about'}
  <AboutDialog onclose={closeDialog} />
{/if}

<CountryPanel />
<PersonPanel />
<DetailPanel />
<NotificationToaster />

<svelte:window onkeydown={handleKeydown} />

<style>
  .app-layout {
    width: 100%;
    height: 100vh;
    height: 100dvh;
    min-height: 320px;
    overflow: hidden;
    position: relative;
    isolation: isolate;
  }

  .map-layer {
    position: fixed;
    inset: 0;
  }

  .map-layer.hidden {
    visibility: hidden;
    pointer-events: none;
  }

  .action-rail {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    width: var(--rail-w);
    z-index: 120;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: calc(14px + env(safe-area-inset-top, 0px)) 0
      calc(14px + env(safe-area-inset-bottom, 0px));
    background: var(--panel-bg);
    border-right: 1px solid var(--border);
    backdrop-filter: blur(16px);
  }

  .rail-top,
  .rail-bottom {
    flex: 0 0 auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .rail-center {
    flex: 1;
    min-height: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .rail-brand {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    /* background: var(--accent-dim);
    border: 1px solid var(--accent-glow); */
    color: var(--accent);
    font-size: 15px;
    flex-shrink: 0;
  }

  .sidebar-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 100;
    background: var(--backdrop);
    border: none;
    padding: 0;
  }

  .sidebar-wrapper {
    position: fixed;
    top: 0;
    left: var(--rail-w);
    bottom: calc(var(--filters-h) + env(safe-area-inset-bottom, 0px));
    width: min(var(--sidebar-w), calc(100vw - var(--rail-w)));
    z-index: 110;
    transform: translateX(-100%);
    transition: transform 0.28s cubic-bezier(0.2, 0.75, 0.25, 1);
  }

  .sidebar-wrapper.open {
    transform: translateX(0);
  }

  @media (max-width: 768px) {
    .sidebar-backdrop {
      display: block;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
    }

    .sidebar-backdrop.visible {
      opacity: 1;
      pointer-events: all;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sidebar-wrapper,
    .sidebar-backdrop {
      transition: none;
    }
  }
</style>
