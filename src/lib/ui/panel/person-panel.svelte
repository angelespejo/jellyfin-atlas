<script lang="ts">
  import * as m from '#i18n/messages.js'
  import { getMovieStore, getWikipediaUrl, i18n, resolveCountryName, ui } from '#core'
  import type { JellyfinItem } from '../../../core/types'
  import { MovieItem } from '../movie-item'
  import ExternalLink from '../external-link.svelte'
  import PanelSection from './parts/panel-section.svelte'
  import PanelLinks from './parts/panel-links.svelte'
  import PanelActions from './parts/panel-actions.svelte'
  import PanelButton from './parts/panel-button.svelte'
  import PanelStats from './parts/panel-stats.svelte'
  import SearchField from '../search-field.svelte'
  import EmptyState from '../empty-state.svelte'
  import { normalizeText } from '../normalize-text'
  import { countryLabel } from '../country-label'
  import Tooltip from '../tooltip.svelte'
  import { modalFocus } from '../modal-focus'

  const store = getMovieStore()

  let remoteCredits = $state<JellyfinItem[]>([])
  let details = $state<JellyfinItem | null>(null)
  let wikipediaUrl = $state<string | null>(null)
  let birthplaceCountry = $state<string | null>(null)
  let loading = $state(false)
  let imageError = $state(false)
  /** Filmography search; local to the dialog. */
  let creditQuery = $state('')

  const person = $derived(ui.activePerson)
  const jellyfinBase = $derived(store.serverURL.replace(/\/+$/, ''))
  const jellyfinUrl = $derived(
    person?.id && jellyfinBase ? `${jellyfinBase}/web/#/details?id=${person.id}` : null
  )
  const imdbId = $derived(details?.ProviderIds?.Imdb)
  const imdbUrl = $derived(
    imdbId ? `https://www.imdb.com/${imdbId.startsWith('nm') ? 'name' : 'title'}/${imdbId}` : null
  )
  const tmdbUrl = $derived(person?.id ? `https://www.themoviedb.org/person/${person.id}` : null)
  const birthday = $derived.by(() => {
    const value = details?.PremiereDate
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return new Intl.DateTimeFormat(i18n.locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  })
  const birthplace = $derived(details?.ProductionLocations?.[0] ?? null)
  const description = $derived(details?.Overview ?? null)

  const localCredits = $derived.by(() => {
    if (!person) return []
    const result: JellyfinItem[] = []
    for (const [id, details] of store.itemDetails) {
      const match = details.People?.some(
        (member) =>
          (person.id && member.Id === person.id) ||
          member.Name.toLowerCase() === person.name.toLowerCase()
      )
      if (!match) continue
      const movie = store.allMovies.find((item) => item.Id === id)
      if (movie) result.push(movie)
    }
    return result
  })

  const credits = $derived.by(() => {
    const byId = new Map<string, JellyfinItem>()
    for (const movie of [...localCredits, ...remoteCredits]) byId.set(movie.Id, movie)
    return [...byId.values()].sort(
      (movieA, movieB) =>
        (movieB.ProductionYear ?? 0) - (movieA.ProductionYear ?? 0) ||
        movieA.Name.localeCompare(movieB.Name)
    )
  })

  const filteredCredits = $derived.by(() => {
    const term = normalizeText(creditQuery)
    if (!term) return credits
    return credits.filter(
      (movie) =>
        normalizeText(movie.Name).includes(term) ||
        String(movie.ProductionYear ?? '').includes(term) ||
        (movie.ProductionLocations ?? []).some((country) => normalizeText(country).includes(term))
    )
  })

  $effect(() => {
    const active = ui.activePerson
    remoteCredits = []
    details = null
    wikipediaUrl = null
    imageError = false
    loading = false
    creditQuery = ''
    if (!active) return

    let cancelled = false
    const loadWikipedia = (imdbId?: string) =>
      getWikipediaUrl({ imdbId, title: active.name }).then((url) => {
        if (!cancelled) wikipediaUrl = url
      })

    if (!active.id) {
      loadWikipedia()
      return
    }

    loading = true
    fetch(`/api/jellyfin/person/${encodeURIComponent(active.id)}`)
      .then((response) => (response.ok ? response.json() : { Items: [], person: null }))
      .then((data: { Items?: JellyfinItem[]; person?: JellyfinItem | null }) => {
        if (cancelled) return
        remoteCredits = data.Items ?? []
        details = data.person ?? null
        loadWikipedia(data.person?.ProviderIds?.Imdb)
      })
      .catch(() => {
        // The local credits are enough when the request fails.
        loadWikipedia()
      })
      .finally(() => {
        if (!cancelled) loading = false
      })

    return () => {
      cancelled = true
    }
  })

  $effect(() => {
    const place = birthplace
    birthplaceCountry = null
    if (!place) return

    let cancelled = false
    resolveCountryName(place).then((country) => {
      if (!cancelled) birthplaceCountry = country
    })
    return () => {
      cancelled = true
    }
  })

  function close() {
    ui.activePerson = null
  }

  function openBirthplace() {
    if (birthplaceCountry) ui.activeCountry = birthplaceCountry
  }

  function filterPerson() {
    if (!person) return
    if (person.type === 'Director') {
      if (!store.activeDirectors.has(person.name)) store.toggleActiveDirector(person.name)
    } else {
      store.setSearchTerm(person.name)
    }
    ui.activePerson = null
    store.setActiveMovieId(null)
    ui.sidebarTab = 'results'
    ui.sidebarOpen = true
  }
</script>

{#if person}
  <div class="person-overlay" onclick={close} role="presentation"></div>

  <div
    class="person-panel"
    role="dialog"
    aria-modal="true"
    aria-labelledby="person-title"
    use:modalFocus
  >
    <header class="person-head">
      <div class="person-heading">
        <h2 id="person-title">{person.name}</h2>
        <div class="person-tags">
          {#if person.type}<span>{person.type}</span>{/if}
          {#if person.role}<span>{person.role}</span>{/if}
        </div>
      </div>
      <button class="person-close" onclick={close} aria-label={m['detail.close']()} data-tooltip>
        <i class="fas fa-times"></i>
        <Tooltip label={m['detail.close']()} shortcut="close" placement="left" />
      </button>
    </header>

    <div class="person-body">
      {#if person.id}
        <div class="person-hero">
          {#if !imageError}
            <img
              src="/api/jellyfin/image/{person.id}?maxWidth=300"
              alt={person.name}
              loading="lazy"
              onerror={() => (imageError = true)}
            />
          {:else}
            <i class="fas fa-user"></i>
          {/if}
        </div>
      {/if}

      <div class="person-meta">
        {#if birthday}
          <span><i class="fas fa-cake-candles"></i> {birthday}</span>
        {/if}
        {#if birthplace}
          {#if birthplaceCountry}
            <button
              type="button"
              class="person-meta-link"
              onclick={openBirthplace}
              title={m['country.openDialog']()}
              data-tooltip
            >
              <i class="fas fa-location-dot"></i>
              {birthplace}
              <Tooltip label={m['country.openDialog']()} placement="top" />
            </button>
          {:else}
            <span><i class="fas fa-location-dot"></i> {birthplace}</span>
          {/if}
        {:else}
          <span><i class="fas fa-location-dot"></i> {countryLabel('Unknown')}</span>
        {/if}
      </div>

      {#if description}
        <PanelSection title={m['person.biography']()}>
          <p class="person-description">{description}</p>
        </PanelSection>
      {/if}

      {#if jellyfinUrl || imdbUrl || tmdbUrl || wikipediaUrl}
        <PanelSection title={m['person.links']()}>
          <PanelLinks>
            {#if jellyfinUrl}
              <ExternalLink
                href={jellyfinUrl}
                icon="fas fa-server"
                label={m['detail.jellyfin']()}
                variant="jellyfin"
              />
            {/if}
            {#if imdbUrl}
              <ExternalLink
                href={imdbUrl}
                icon="fab fa-imdb"
                label={m['detail.imdb']()}
                variant="imdb"
              />
            {/if}
            {#if tmdbUrl}
              <ExternalLink
                href={tmdbUrl}
                icon="fas fa-film"
                label={m['detail.tmdb']()}
                variant="tmdb"
              />
            {/if}
            {#if wikipediaUrl}
              <ExternalLink
                href={wikipediaUrl}
                icon="fab fa-wikipedia-w"
                label={m['detail.wikipedia']()}
                variant="wikipedia"
              />
            {/if}
          </PanelLinks>
        </PanelSection>
      {/if}

      <PanelActions>
        <PanelButton variant="primary" icon="fas fa-filter" onclick={filterPerson}>
          {m['person.filter']()}
        </PanelButton>
      </PanelActions>

      <PanelSection title={m['person.credits']()}>
        {#if credits.length > 0}
          <PanelStats items={credits} />
          <SearchField
            id="person-credit-search"
            name="person-credit-search"
            bind:value={creditQuery}
            placeholder={m['person.searchCredits']()}
            clearLabel={m['filter.clearAll']()}
          />
          {#if creditQuery.trim()}
            <p class="person-results">
              {m['person.results']({ shown: filteredCredits.length, total: credits.length })}
            </p>
          {/if}
        {/if}
        {#if loading && credits.length === 0}
          <p class="person-note"><i class="fas fa-spinner fa-pulse"></i> {m['person.loading']()}</p>
        {:else if credits.length > 0}
          {#if filteredCredits.length > 0}
            <div class="person-credits">
              {#each filteredCredits as movie (movie.Id)}
                <MovieItem {movie} />
              {/each}
            </div>
          {:else}
            <EmptyState icon="fa-magnifying-glass" message={m['person.noMatches']()} />
          {/if}
        {:else}
          <EmptyState icon="fa-film" message={m['person.noCredits']()} />
        {/if}
      </PanelSection>
    </div>
  </div>
{/if}

<style>
  .person-overlay {
    position: fixed;
    inset: 0;
    background: var(--backdrop);
    backdrop-filter: blur(4px);
    z-index: 508;
  }

  .person-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 420px;
    max-width: 94vw;
    background: var(--surface);
    border-left: 1px solid var(--border);
    box-shadow: -20px 0 56px rgba(0, 0, 0, 0.3);
    z-index: 509;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
    animation: person-in 0.24s cubic-bezier(0.2, 0.75, 0.25, 1);
  }

  @keyframes person-in {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  .person-head {
    position: sticky;
    top: 0;
    z-index: 3;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    padding: 16px 18px 12px;
    background: var(--panel-bg);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--border);
  }

  .person-heading {
    min-width: 0;
  }

  .person-heading h2 {
    font-size: 18px;
    font-weight: 700;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  .person-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 5px;
  }

  .person-tags span {
    padding: 1px 7px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--text-muted);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .person-close {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--card);
    color: var(--text-muted);
    font-family: inherit;
    cursor: pointer;
  }

  .person-close:hover {
    color: var(--text);
    border-color: var(--text-muted);
  }

  .person-body {
    padding: 14px 18px calc(24px + env(safe-area-inset-bottom, 0px));
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .person-hero {
    width: 150px;
    height: 150px;
    align-self: flex-start;
    display: grid;
    place-items: center;
    overflow: hidden;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--card);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.16);
    color: var(--text-muted);
    font-size: 46px;
  }

  .person-hero img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .person-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .person-meta span,
  .person-meta-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 9px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--card);
    color: var(--text-muted);
    font-family: inherit;
    font-size: 11px;
  }

  .person-meta-link {
    cursor: pointer;
    transition:
      border-color 0.15s,
      color 0.15s;
  }

  .person-meta-link:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .person-meta-link:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 2px;
  }

  .person-meta i {
    font-size: 10px;
    color: var(--accent);
  }

  .person-description {
    font-size: 12px;
    line-height: 1.6;
    color: var(--text);
    opacity: 0.88;
    white-space: pre-line;
  }

  .person-credits {
    display: flex;
    flex-direction: column;
    margin: 0 -6px;
  }

  .person-results {
    font-size: 10px;
    color: var(--text-muted);
    padding: 0 2px;
  }

  .person-note {
    font-size: 12px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  @media (max-width: 768px) {
    .person-panel {
      width: 100vw;
      max-width: 100vw;
      border-left: 0;
    }

    .person-hero {
      width: 128px;
      height: 128px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .person-panel {
      animation: none;
    }
  }
</style>
