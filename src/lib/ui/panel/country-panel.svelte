<script lang="ts">
  import * as m from '#i18n/messages.js'
  import {
    countryInfoKey,
    countryInfoStore,
    getMovieStore,
    i18n,
    loadCountryInfo,
    resolveCountryShape,
    ui,
  } from '#core'
  import { MovieItem } from '../movie-item'
  import PanelSection from './parts/panel-section.svelte'
  import PanelActions from './parts/panel-actions.svelte'
  import PanelButton from './parts/panel-button.svelte'
  import PanelStats from './parts/panel-stats.svelte'
  import SearchField from '../search-field.svelte'
  import EmptyState from '../empty-state.svelte'
  import { normalizeText } from '../normalize-text'
  import { countryLabel, isUnknownCountry } from '../country-label'
  import Tooltip from '../tooltip.svelte'
  import { modalFocus } from '../modal-focus'

  const store = getMovieStore()

  let historical = $state(false)
  /** Measured header height so the title search can stick right below it. */
  let headHeight = $state(0)

  const country = $derived(ui.activeCountry)
  const unknown = $derived(isUnknownCountry(country ?? ''))
  const key = $derived(country && !unknown ? countryInfoKey(country, i18n.locale) : '')
  const info = $derived(key ? countryInfoStore.byKey[key] : undefined)
  const loading = $derived(Boolean(key) && countryInfoStore.loading === key)
  const failed = $derived(Boolean(key) && countryInfoStore.error === key)

  // Apply the global filters (search, year, type, status, countries, directors)
  // first, then keep the titles of this country.
  const movies = $derived(
    country
      ? store.currentMovies.filter((movie) => store.getCountries(movie).includes(country))
      : []
  )
  /** Dialog-only title search; never touches the global store filters. */
  let query = $state('')
  const filteredMovies = $derived.by(() => {
    const term = normalizeText(query)
    if (!term) return movies
    return movies.filter(
      (movie) =>
        normalizeText(movie.Name).includes(term) ||
        String(movie.ProductionYear ?? '').includes(term) ||
        (unknown && normalizeText(m['country.unknown']()).includes(term)) ||
        (movie.ProductionLocations ?? []).some((country) => normalizeText(country).includes(term))
    )
  })

  const image = $derived(info?.flagUrl ?? info?.thumbnail ?? null)
  const coatOfArms = $derived(info?.coatOfArmsUrl ?? null)
  const numberFormat = $derived(new Intl.NumberFormat(i18n.locale))

  const facts = $derived.by(() => {
    const rows: { label: string; value: string }[] = []
    if (!info) return rows

    if (info.capital) rows.push({ label: m['country.capital'](), value: info.capital })

    if (info.population) {
      const year = info.population.year ? ` (${info.population.year})` : ''
      rows.push({
        label: m['country.population'](),
        value: `${numberFormat.format(info.population.value)}${year}`,
      })
    }

    if (typeof info.areaKm2 === 'number') {
      rows.push({
        label: m['country.area'](),
        value: `${numberFormat.format(Math.round(info.areaKm2))} km²`,
      })
    }

    if (info.languages?.length) {
      rows.push({ label: m['country.languages'](), value: info.languages.join(', ') })
    }

    if (info.currency) rows.push({ label: m['country.currency'](), value: info.currency })
    if (info.continent) rows.push({ label: m['country.continent'](), value: info.continent })

    const iso = [info.iso2, info.iso3].filter(Boolean).join(' · ')
    if (iso) rows.push({ label: m['country.iso'](), value: iso })

    if (info.inceptionYear || info.dissolvedYear) {
      const start = info.inceptionYear ? String(info.inceptionYear) : '?'
      const end = info.dissolvedYear ? String(info.dissolvedYear) : m['country.present']()
      rows.push({ label: m['country.period'](), value: `${start} – ${end}` })
    }

    return rows
  })

  $effect(() => {
    const name = ui.activeCountry
    query = ''
    if (name && !isUnknownCountry(name)) loadCountryInfo(name, i18n.locale)
  })

  $effect(() => {
    const name = ui.activeCountry
    if (!name || isUnknownCountry(name)) {
      historical = false
      return
    }
    let cancelled = false
    resolveCountryShape(name).then((shape) => {
      if (!cancelled) historical = Boolean(shape?.historical)
    })
    return () => {
      cancelled = true
    }
  })

  function close() {
    ui.activeCountry = null
  }

  function filterCountry() {
    if (!country) return
    if (!store.activeCountries.has(country)) store.toggleActiveCountry(country)
    ui.activeCountry = null
    ui.sidebarTab = 'results'
    ui.sidebarOpen = true
  }
</script>

{#if country}
  <div class="country-overlay" onclick={close} role="presentation"></div>

  <div
    class="country-panel"
    role="dialog"
    aria-modal="true"
    aria-labelledby="country-title"
    use:modalFocus
  >
    <div class={['country-hero', { 'with-banner': Boolean(image) }]}>
      {#if image}
        <div class="country-hero-media">
          <img class="country-banner-blur" src={image} alt="" aria-hidden="true" loading="lazy" />
          <img class="country-banner" src={image} alt="" loading="lazy" />
        </div>
      {:else}
        <div class="country-hero-empty"><i class="fas fa-earth-americas"></i></div>
      {/if}
    </div>

    <header class="country-head" bind:offsetHeight={headHeight}>
      <div class="country-badge">
        {#if coatOfArms}
          <img src={coatOfArms} alt={m['country.coatOfArms']()} loading="lazy" />
        {:else if info?.flagEmoji}
          <span>{info.flagEmoji}</span>
        {:else}
          <i class="fas fa-earth-americas"></i>
        {/if}
      </div>

      <div class="country-heading">
        <h2 id="country-title">{info?.name ?? countryLabel(country)}</h2>
        {#if historical}
          <span class="country-historical">{m['country.historical']()}</span>
        {/if}
      </div>

      <button
        class="country-close-btn"
        onclick={close}
        aria-label={m['detail.close']()}
        data-tooltip
      >
        <i class="fas fa-times"></i>
        <Tooltip label={m['detail.close']()} shortcut="close" placement="left" />
      </button>
    </header>

    <div class="country-body">
      {#if unknown}
        <p class="country-note">{m['map.unknownNote']()}</p>
      {/if}

      {#if info?.description}
        <p class="country-description">{info.description}</p>
      {/if}

      {#if loading}
        <p class="country-note"><i class="fas fa-spinner fa-pulse"></i> {m['country.loading']()}</p>
      {:else if failed}
        <p class="country-note">{m['country.error']()}</p>
      {/if}

      {#if facts.length}
        <PanelSection title={m['country.data']()}>
          <dl class="country-facts">
            {#each facts as fact (fact.label)}
              <div>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            {/each}
          </dl>
        </PanelSection>
      {/if}

      {#if info?.extract}
        <p class="country-extract">{info.extract}</p>
      {/if}

      <PanelActions>
        <PanelButton variant="primary" icon="fas fa-filter" onclick={filterCountry}>
          {m['country.filter']()}
        </PanelButton>
        {#if info?.wikipediaUrl}
          <PanelButton
            href={info.wikipediaUrl}
            external
            trailingIcon="fas fa-arrow-up-right-from-square"
          >
            {m['country.wikipedia']()}
          </PanelButton>
        {/if}
      </PanelActions>

      <PanelStats items={movies} />

      {#if movies.length > 0}
        <div class="country-search-bar" style:top="{headHeight}px">
          <SearchField
            id="country-title-search"
            name="country-title-search"
            bind:value={query}
            placeholder={m['country.searchTitles']()}
            clearLabel={m['filter.clearAll']()}
          />
        </div>
      {/if}

      {#if filteredMovies.length > 0}
        <div class="country-movies">
          {#each filteredMovies as movie (movie.Id)}
            <MovieItem {movie} />
          {/each}
        </div>
      {:else if movies.length > 0}
        <EmptyState icon="fa-magnifying-glass" message={m['country.noTitles']()} />
      {:else}
        <EmptyState icon="fa-filter" message={m['country.noFilteredTitles']()} />
      {/if}
    </div>
  </div>
{/if}

<style>
  .country-overlay {
    position: fixed;
    inset: 0;
    background: var(--backdrop);
    backdrop-filter: blur(4px);
    z-index: 510;
  }

  .country-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 460px;
    max-width: 94vw;
    background: var(--surface);
    border-left: 1px solid var(--border);
    box-shadow: -20px 0 56px rgba(0, 0, 0, 0.3);
    z-index: 511;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
    animation: country-in 0.24s cubic-bezier(0.2, 0.75, 0.25, 1);
  }

  @keyframes country-in {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  .country-head {
    position: sticky;
    top: 0;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 18px 12px 22px;
    background: var(--panel-bg);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--border);
  }

  .country-close-btn {
    flex: 0 0 auto;
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    margin-left: auto;
    border-radius: 9px;
    border: 1px solid var(--border);
    background: var(--card);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    color: var(--text-muted);
    cursor: pointer;
    font-family: inherit;
  }

  .country-close-btn:hover {
    color: var(--text);
    border-color: var(--text-muted);
  }

  .country-hero {
    position: relative;
    flex: 0 0 auto;
    height: 132px;
    background: var(--card);
    border-bottom: 1px solid var(--border);
  }

  .country-hero-media {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    overflow: hidden;
  }

  .country-banner-blur {
    position: absolute;
    inset: -18px;
    width: calc(100% + 36px);
    height: calc(100% + 36px);
    object-fit: cover;
    filter: blur(20px) saturate(1.1);
    opacity: 0.38;
    transform: scale(1.08);
  }

  .country-banner {
    position: relative;
    max-width: 78%;
    /* Fixed height: percentage max-height cannot resolve inside the auto grid row. */
    max-height: 92px;
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: 3px;
    border: 1px solid rgba(0, 0, 0, 0.12);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
  }

  .country-hero.with-banner::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 58%, rgba(0, 0, 0, 0.26));
    pointer-events: none;
  }

  .country-hero-empty {
    display: grid;
    place-items: center;
    height: 100%;
    font-size: 42px;
    color: var(--text-muted);
    opacity: 0.4;
  }

  .country-badge {
    position: relative;
    flex: 0 0 auto;
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    padding: 5px;
    border-radius: 11px;
    border: 1px solid var(--border);
    background: var(--surface);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .country-badge img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    aspect-ratio: 1;
  }

  .country-badge span {
    font-size: 24px;
    line-height: 1;
  }

  .country-badge i {
    font-size: 19px;
    color: var(--text-muted);
  }

  .country-body {
    padding: 14px 22px calc(28px + env(safe-area-inset-bottom, 0px));
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .country-heading {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    min-width: 0;
  }

  .country-heading h2 {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.3px;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  .country-historical {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--yellow);
    border: 1px solid var(--yellow);
    border-radius: 999px;
    padding: 2px 8px;
    background: var(--card);
  }

  .country-description {
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.45;
  }

  .country-note {
    font-size: 11px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .country-facts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(104px, 1fr));
    gap: 6px;
    margin: 2px 0;
  }

  .country-facts div {
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--card);
    padding: 6px 8px;
  }

  .country-facts dt {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
    margin-bottom: 2px;
  }

  .country-facts dd {
    font-size: 11px;
    font-weight: 600;
    color: var(--text);
    overflow-wrap: anywhere;
  }

  .country-extract {
    font-size: 12px;
    line-height: 1.6;
    color: var(--text);
    opacity: 0.88;
  }

  .country-search-bar {
    position: sticky;
    z-index: 2;
    /* Full-bleed inside `.country-body` padding so nothing scrolls behind the
       input while it is pinned below the sticky header. */
    margin: -4px -22px;
    padding: 6px 22px;
    background: var(--surface);
  }

  .country-movies {
    display: flex;
    flex-direction: column;
    margin: 0 -6px;
  }

  @media (max-width: 768px) {
    .country-panel {
      width: 100vw;
      max-width: 100vw;
      border-left: 0;
    }

    .country-hero {
      height: 118px;
    }

    .country-banner {
      max-height: 82px;
    }

    .country-head {
      padding: 10px 14px 10px 16px;
      gap: 8px;
    }

    .country-badge {
      width: 42px;
      height: 42px;
      padding: 4px;
    }

    .country-heading h2 {
      font-size: 17px;
    }

    .country-body {
      padding: 12px 16px calc(24px + env(safe-area-inset-bottom, 0px));
    }

    .country-search-bar {
      margin-inline: -16px;
      padding-inline: 16px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .country-panel {
      animation: none;
    }
  }
</style>
