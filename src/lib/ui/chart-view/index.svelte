<script lang="ts">
  import { tick } from 'svelte'
  import * as m from '#i18n/messages.js'
  import { countryFlagEmoji, getMovieStore, ui } from '#core'
  import { countColor, countryColorMap } from '../chart-colors'
  import CountryPopup from '../country-popup.svelte'
  import { countryLabel } from '../country-label'
  import Timeline from './timeline.svelte'
  import ViewHeader from '../view-header.svelte'

  const store = getMovieStore()

  let popover = $state<{
    country: string
    left: number
    top: number
    below: boolean
  } | null>(null)
  let popoverEl = $state<HTMLElement | null>(null)
  let trigger: HTMLElement | null = null

  const stats = $derived.by(() => {
    const counts: Record<string, number> = {}
    for (const movie of store.currentMovies) {
      for (const country of store.getCountries(movie)) {
        counts[country] = (counts[country] ?? 0) + 1
      }
    }
    return counts
  })

  const colors = $derived(countryColorMap(stats))
  const rows = $derived(
    Object.entries(stats).sort(
      ([countryA, countA], [countryB, countB]) =>
        countB - countA || countryA.localeCompare(countryB)
    )
  )
  const max = $derived(Math.max(1, ...rows.map(([, count]) => count)))
  const titleCount = $derived(store.currentMovies.length)

  const popoverMovies = $derived(
    popover
      ? store.currentMovies.filter((movie) => store.getCountries(movie).includes(popover!.country))
      : []
  )

  function closePopover(restoreFocus = false) {
    if (!popover) return
    popover = null
    if (restoreFocus) trigger?.focus()
    trigger = null
  }

  async function openCountryPopover(country: string, event: MouseEvent) {
    if (popover?.country === country) {
      closePopover(true)
      return
    }
    const button = event.currentTarget as HTMLElement
    const row = button.closest<HTMLElement>('.bar-row') ?? button
    const rect = row.getBoundingClientRect()
    const margin = 12
    const width = Math.min(280, window.innerWidth - margin * 2)
    const below = window.innerHeight - rect.bottom > 190

    trigger = button
    popover = {
      country,
      left: Math.min(Math.max(rect.left + 30, margin), window.innerWidth - width - margin),
      top: below ? rect.bottom + 6 : rect.top - 6,
      below,
    }
    await tick()
    popoverEl?.focus()
  }

  function switchTab(tab: 'bars' | 'timeline') {
    closePopover()
    ui.chartTab = tab
  }

  function filterCountry(country: string) {
    if (!store.activeCountries.has(country)) store.toggleActiveCountry(country)
    closePopover()
    store.setActiveMovieId(null)
    ui.sidebarTab = 'results'
    // ui.sidebarOpen = true
  }

  function openCountry(country: string) {
    closePopover()
    store.setActiveMovieId(null)
    ui.activeCountry = country
  }

  // Close the floating card when clicking elsewhere or pressing Escape.
  $effect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target || !popover) return
      if (popoverEl?.contains(target) || trigger?.contains(target)) return
      closePopover()
    }
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !popover) return
      event.stopPropagation()
      closePopover(true)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeydown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeydown)
    }
  })
</script>

<section class="chart-view" aria-label={m['view.chart']()}>
  <ViewHeader
    title={ui.chartTab === 'bars' ? m['chart.title']() : m['timeline.title']()}
    subtitle={ui.chartTab === 'bars'
      ? m['chart.subtitle']({ countries: rows.length, titles: titleCount })
      : m['timeline.subtitle']()}
  >
    <div class="chart-tabs" role="group" aria-label={m['view.chart']()}>
      <button
        class={['chart-tab', { active: ui.chartTab === 'bars' }]}
        aria-pressed={ui.chartTab === 'bars'}
        onclick={() => switchTab('bars')}
      >
        <i class="fas fa-chart-bar"></i>
        {m['chart.tab.bars']()}
      </button>
      <button
        class={['chart-tab', { active: ui.chartTab === 'timeline' }]}
        aria-pressed={ui.chartTab === 'timeline'}
        onclick={() => switchTab('timeline')}
      >
        <i class="fas fa-clock-rotate-left"></i>
        {m['chart.tab.timeline']()}
      </button>
    </div>
  </ViewHeader>

  {#if ui.chartTab === 'bars'}
    {#if rows.length > 0}
      <div class="bar-list">
        {#each rows as [country, count] (country)}
          {@const flag = countryFlagEmoji(country)}
          <div class={['bar-row', { active: store.activeCountries.has(country) }]}>
            <button
              class="bar-main"
              aria-haspopup="dialog"
              aria-expanded={popover?.country === country}
              aria-label={m['chart.openCountry']({ country: countryLabel(country) })}
              onclick={(event) => openCountryPopover(country, event)}
            >
              <span class="bar-flag" aria-hidden="true">
                {#if flag}
                  {flag}
                {:else}
                  <i class="fas fa-globe"></i>
                {/if}
              </span>
              <span class="bar-name" title={countryLabel(country)}>{countryLabel(country)}</span>
              <span class="bar-track" aria-hidden="true">
                <span
                  class="bar-fill"
                  style:width="{Math.max(2, (count / max) * 100)}%"
                  style:background={colors[country] ?? countColor(0)}
                ></span>
              </span>
              <b class="bar-count">{count}</b>
            </button>
          </div>
        {/each}
      </div>
    {:else}
      <p class="view-empty">{m['chart.empty']()}</p>
    {/if}
  {:else}
    <Timeline />
  {/if}

  {#if popover}
    {@const country = popover.country}
    <div
      class={['chart-popover', { above: !popover.below }]}
      style:left="{popover.left}px"
      style:top="{popover.top}px"
      role="dialog"
      aria-label={countryLabel(country)}
      tabindex="-1"
      bind:this={popoverEl}
    >
      <CountryPopup
        {country}
        movies={popoverMovies}
        onfilter={() => filterCountry(country)}
        onopen={() => openCountry(country)}
      />
    </div>
  {/if}
</section>

<style>
  .chart-view {
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

  .chart-tabs {
    display: inline-flex;
    flex-shrink: 0;
    gap: 3px;
    padding: 3px;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--card);
  }

  .chart-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 28px;
    padding: 0 10px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    font-family: inherit;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }

  .chart-tab:hover {
    color: var(--text);
  }

  .chart-tab.active {
    background: var(--accent-dim);
    color: var(--accent);
  }

  .chart-tab:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 2px;
  }

  .chart-tab i {
    font-size: 10px;
  }

  .chart-popover {
    position: fixed;
    z-index: 20;
    width: min(280px, calc(100vw - 24px));
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--card);
    box-shadow: var(--shadow-panel);
  }

  .chart-popover.above {
    transform: translateY(-100%);
  }

  .chart-popover:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 2px;
  }

  .bar-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 10px 16px calc(18px + env(safe-area-inset-bottom, 0px)) 18px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    scrollbar-gutter: stable;
  }

  .bar-row {
    display: flex;
    align-items: stretch;
    gap: 4px;
    border-radius: 8px;
  }

  .bar-row:hover {
    background: var(--card-hover);
  }

  .bar-row.active {
    background: var(--accent-dim);
  }

  .bar-main {
    flex: 1;
    min-width: 0;
    display: grid;
    grid-template-columns: 22px minmax(80px, 160px) minmax(0, 1fr) 48px;
    align-items: center;
    gap: 10px;
    min-height: 34px;
    padding: 0 6px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--text);
    font-family: inherit;
    text-align: left;
    cursor: pointer;
  }

  .bar-main:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 1px;
  }

  .bar-flag {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    font-size: 15px;
    line-height: 1;
  }

  .bar-flag i {
    font-size: 11px;
    color: var(--text-muted);
  }

  .bar-name {
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bar-track {
    height: 10px;
    border-radius: 999px;
    background: var(--card-hover);
    overflow: hidden;
  }

  .bar-row:hover .bar-track {
    background: var(--border);
  }

  .bar-fill {
    display: block;
    height: 100%;
    border-radius: 999px;
  }

  .bar-count {
    font-size: 12px;
    font-weight: 700;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .view-empty {
    margin: 22px;
    font-size: 12px;
    color: var(--text-muted);
  }

  @media (max-width: 768px) {
    .bar-list {
      padding: 8px 10px calc(14px + env(safe-area-inset-bottom, 0px)) 12px;
    }

    .bar-main {
      grid-template-columns: 18px minmax(64px, 110px) minmax(0, 1fr) 36px;
      gap: 7px;
    }

    .bar-count {
      font-size: 11px;
    }

    .bar-flag {
      width: 18px;
      font-size: 13px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .bar-main {
      transition: none;
    }
  }
</style>
