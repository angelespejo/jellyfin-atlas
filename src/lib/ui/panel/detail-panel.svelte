<script lang="ts">
  import * as m from '#i18n/messages.js'
  import { getWikipediaUrl, getMovieStore, ui } from '#core'
  import PersonChip from '../person-chip.svelte'
  import CountryChip from '../country-chip.svelte'
  import ExternalLink from '../external-link.svelte'
  import PanelSection from './parts/panel-section.svelte'
  import PanelLinks from './parts/panel-links.svelte'
  import Tooltip from '../tooltip.svelte'
  import { modalFocus } from '../modal-focus'

  const store = getMovieStore()

  let movie = $derived(store.allMovies.find((m) => m.Id === store.activeMovieId) || null)

  const posterUrl = $derived(movie?.Id ? `/api/jellyfin/image/${movie.Id}?maxWidth=420` : null)

  const year = $derived(movie?.ProductionYear || null)
  const runtime = $derived(movie?.RunTimeTicks ? Math.round(movie.RunTimeTicks / 600000000) : null)
  const rating = $derived(movie?.CommunityRating != null ? movie.CommunityRating.toFixed(1) : null)
  const criticRating = $derived(movie?.CriticRating != null ? movie.CriticRating : null)
  const countries = $derived(movie ? store.getCountries(movie) : [])
  const genres = $derived(movie?.Genres || [])
  const overview = $derived(movie ? store.getOverview(movie) : null)
  const tagline = $derived(movie ? store.getTagline(movie) : null)
  const directorPeople = $derived.by(() => {
    if (!movie) return []
    const details = store.withDetails(movie)
    const people = details.People?.filter((person) => person.Type === 'Director') ?? []
    if (people.length) {
      return people.map((person) => ({
        id: person.Id,
        name: person.Name,
        type: 'Director' as const,
      }))
    }
    return store.getDirectors(movie).map((name) => ({
      id: undefined,
      name,
      type: 'Director' as const,
    }))
  })
  const actors = $derived(movie ? store.getActors(movie, 8) : [])
  const providerIds = $derived(movie ? store.getProviderIds(movie) : {})
  const loadingDetails = $derived(store.loadingDetails === movie?.Id)

  const ratingUrl = $derived(
    providerIds.Imdb
      ? `https://www.imdb.com/title/${providerIds.Imdb}/ratings`
      : providerIds.Tmdb
        ? `https://www.themoviedb.org/movie/${providerIds.Tmdb}`
        : null
  )
  const criticUrl = $derived(
    movie?.Name
      ? `https://www.rottentomatoes.com/search?search=${encodeURIComponent(movie.Name)}`
      : null
  )

  /** Jellyfin server base URL without a trailing slash. */
  const jellyfinBase = $derived(store.serverURL.replace(/\/+$/, ''))

  /** Jellyfin Web deep link for this item (movies and series). */
  const jellyfinWatchUrl = $derived.by(() => {
    if (!movie || !jellyfinBase || (movie.Type !== 'Movie' && movie.Type !== 'Series')) return null
    return `${jellyfinBase}/web/#/details?id=${encodeURIComponent(movie.Id)}`
  })
  let posterError = $state(false)
  let wikipediaUrl = $state<string | null>(null)
  let wikipediaLoading = $state(false)

  $effect(() => {
    const imdbId = providerIds.Imdb || undefined
    const movieName = movie?.Name || undefined
    posterError = false
    wikipediaUrl = null
    wikipediaLoading = false
    if (imdbId || movieName) {
      wikipediaLoading = true
      getWikipediaUrl({ imdbId, title: movieName }).then((url) => {
        wikipediaUrl = url
        wikipediaLoading = false
      })
    }
  })

  function handleClose() {
    store.setActiveMovieId(null)
  }

  function handleOverlayClick() {
    handleClose()
  }

  function handlePosterError() {
    posterError = true
  }

  function filterByDirector(name: string) {
    if (!store.activeDirectors.has(name)) store.toggleActiveDirector(name)
    store.setActiveMovieId(null)
    ui.sidebarTab = 'results'
    ui.sidebarOpen = true
  }

  function filterByActor(name: string) {
    store.setSearchTerm(name)
    store.setActiveMovieId(null)
    ui.sidebarTab = 'results'
    ui.sidebarOpen = true
  }

  function filterByCountry(name: string) {
    if (!store.activeCountries.has(name)) store.toggleActiveCountry(name)
    store.setActiveMovieId(null)
    ui.sidebarTab = 'results'
    // ui.sidebarOpen = true
  }
</script>

{#if movie}
  <div
    class={['detail-overlay', { visible: store.activeMovieId !== null }]}
    onclick={handleOverlayClick}
    role="presentation"
  ></div>

  <div
    class={['detail-panel', { visible: store.activeMovieId !== null }]}
    role="dialog"
    aria-modal="true"
    aria-labelledby="detail-title"
    use:modalFocus
  >
    <div class="detail-close">
      <button onclick={handleClose} aria-label={m['detail.close']()} data-tooltip>
        <i class="fas fa-times"></i>
        <Tooltip label={m['detail.close']()} shortcut="close" placement="left" />
      </button>
    </div>

    <div class="detail-poster-wrap">
      {#if posterUrl && !posterError}
        <img class="detail-poster" src={posterUrl} alt={movie.Name} onerror={handlePosterError} />
      {:else}
        <div class="poster-fallback"><i class="fas fa-film"></i></div>
      {/if}
      <div class="detail-poster-grad"></div>
    </div>

    <div class="detail-body">
      {#if jellyfinWatchUrl}
        <a
          class="detail-watch"
          href={jellyfinWatchUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={m['detail.watch']()}
          aria-label={m['detail.watch']()}
        >
          <i class="fas fa-play"></i>
        </a>
      {/if}
      <h2 id="detail-title">{movie.Name}</h2>

      {#if loadingDetails}
        <div class="loading-details">
          <i class="fas fa-spinner fa-pulse"></i>
          {m['detail.loading']()}
        </div>
      {/if}

      {#if tagline}
        <p class="detail-tagline">"{tagline}"</p>
      {/if}

      <div class="detail-meta-row">
        {#if year}
          <div class="meta-badge"><i class="fas fa-calendar"></i> {year}</div>
        {/if}
        {#if runtime}
          <div class="meta-badge"><i class="fas fa-clock"></i> {runtime} min</div>
        {/if}
        {#if rating}
          {#if ratingUrl}
            <a
              class="meta-badge rating link"
              href={ratingUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={m['detail.ratingLink']()}
            >
              <i class="fas fa-star"></i>
              {rating}
            </a>
          {:else}
            <div class="meta-badge rating"><i class="fas fa-star"></i> {rating}</div>
          {/if}
        {/if}
        {#if criticRating != null}
          {#if criticUrl}
            <a
              class="meta-badge critic link"
              href={criticUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={m['detail.criticLink']()}
            >
              <i class="fas fa-star-half-alt"></i>
              {criticRating}%
            </a>
          {:else}
            <div class="meta-badge critic">
              <i class="fas fa-star-half-alt"></i>
              {criticRating}%
            </div>
          {/if}
        {/if}
        {#if movie.OfficialRating}
          <div class="meta-badge"><i class="fas fa-certificate"></i> {movie.OfficialRating}</div>
        {/if}
      </div>

      {#if overview}
        <PanelSection title={m['detail.synopsis']()}>
          <p class="detail-overview">{overview}</p>
        </PanelSection>
      {/if}

      {#if directorPeople.length}
        <PanelSection title={m['detail.direction']()}>
          <div class="detail-people-row">
            {#each directorPeople as director (director.id ?? director.name)}
              <PersonChip person={director} onfilter={() => filterByDirector(director.name)} />
            {/each}
          </div>
        </PanelSection>
      {/if}

      {#if actors.length}
        <PanelSection title={m['detail.cast']()}>
          <div class="detail-people-row">
            {#each actors as actor (actor.Id)}
              <PersonChip
                person={{ id: actor.Id, name: actor.Name, role: actor.Role, type: actor.Type }}
                onfilter={() => filterByActor(actor.Name)}
              />
            {/each}
          </div>
        </PanelSection>
      {/if}

      {#if countries.length}
        <PanelSection title={m['detail.countries']()}>
          <div class="detail-people-row">
            {#each countries as country (country)}
              <CountryChip {country} onfilter={() => filterByCountry(country)} />
            {/each}
          </div>
        </PanelSection>
      {/if}

      {#if genres.length}
        <PanelSection title={m['detail.genres']()}>
          <div class="detail-genres">
            {#each genres as genre (genre)}
              <span class="genre-tag">{genre}</span>
            {/each}
          </div>
        </PanelSection>
      {/if}

      <PanelSection title={m['detail.links']()}>
        <PanelLinks>
          {#if jellyfinBase}
            <ExternalLink
              href="{jellyfinBase}/web/#/details/{movie.Id}"
              icon="fas fa-server"
              label={m['detail.jellyfin']()}
              variant="jellyfin"
            />
          {/if}
          {#if providerIds.Imdb}
            <ExternalLink
              href="https://www.imdb.com/title/{providerIds.Imdb}"
              icon="fab fa-imdb"
              label={m['detail.imdb']()}
              variant="imdb"
            />
          {/if}
          {#if providerIds.Tmdb}
            <ExternalLink
              href="https://www.themoviedb.org/movie/{providerIds.Tmdb}"
              icon="fas fa-film"
              label={m['detail.tmdb']()}
              variant="tmdb"
            />
          {/if}
          {#if wikipediaLoading}
            <ExternalLink
              icon="fas fa-spinner"
              label={m['detail.wikipedia']()}
              variant="wikipedia"
              loading
            />
          {:else if wikipediaUrl}
            <ExternalLink
              href={wikipediaUrl}
              icon="fab fa-wikipedia-w"
              label={m['detail.wikipedia']()}
              variant="wikipedia"
            />
          {/if}
        </PanelLinks>
      </PanelSection>
    </div>
  </div>
{/if}

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape' && store.activeMovieId) handleClose()
  }}
/>

<style>
  .detail-overlay {
    position: fixed;
    inset: 0;
    background: var(--backdrop);
    backdrop-filter: blur(5px);
    z-index: 500;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.24s ease;
  }

  .detail-overlay.visible {
    opacity: 1;
    pointer-events: all;
  }

  .detail-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 460px;
    max-width: 92vw;
    background: var(--surface);
    border-left: 1px solid var(--border);
    box-shadow: var(--shadow-panel);
    z-index: 501;
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.2, 0.75, 0.25, 1);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }

  .detail-panel.visible {
    transform: translateX(0);
  }

  .detail-close {
    position: sticky;
    top: 10px;
    margin-right: 10px;
    display: flex;
    justify-content: flex-end;
    z-index: 2;
  }

  .detail-close button {
    background: var(--card);
    border: 1px solid var(--border);
    color: var(--text-muted);
    width: 42px;
    height: 42px;
    border-radius: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    font-size: 14px;
  }

  .detail-close button:hover {
    color: var(--text);
    border-color: var(--text-muted);
  }

  .detail-poster-wrap {
    width: 100%;
    aspect-ratio: 2/3;
    max-height: 380px;
    overflow: hidden;
    position: relative;
    margin-top: -40px;
  }

  .detail-poster {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .poster-fallback {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, var(--card), var(--card-hover));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 44px;
    color: var(--text-muted);
    opacity: 0.25;
  }

  .detail-poster-grad {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 110px;
    background: linear-gradient(transparent, var(--surface));
  }

  .detail-body {
    padding: 0 28px calc(32px + env(safe-area-inset-bottom, 0px));
    margin-top: -16px;
    position: relative;
  }

  .detail-body h2 {
    font-size: clamp(21px, 5vw, 27px);
    font-weight: 700;
    letter-spacing: -0.4px;
    line-height: 1.2;
    margin-bottom: 4px;
  }

  .detail-tagline {
    font-size: 12px;
    font-style: italic;
    color: var(--text-muted);
    margin-bottom: 12px;
    opacity: 0.7;
  }

  .loading-details {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .detail-meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-bottom: 20px;
  }

  .detail-watch {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 50px;
    width: 50px;
    padding: 0;
    margin-bottom: 20px;
    border: 1px solid var(--text);
    border-radius: 50%;
    background: var(--text);
    color: var(--bg);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    transition:
      opacity 0.15s,
      box-shadow 0.15s,
      transform 0.15s;
  }

  .detail-watch:hover {
    opacity: 0.86;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.24);
  }

  .detail-watch:active {
    transform: scale(0.96);
  }

  .detail-watch:focus-visible {
    outline: 3px solid var(--text);
    outline-offset: 2px;
  }

  .detail-watch i {
    font-size: 14px;
  }

  .meta-badge {
    background: var(--card);
    border: 1px solid var(--border);
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .meta-badge i {
    font-size: 11px;
  }

  .meta-badge.rating {
    color: var(--yellow);
    border-color: rgba(255, 217, 61, 0.25);
  }

  .meta-badge.critic {
    color: var(--green);
    border-color: rgba(76, 217, 100, 0.25);
  }

  .meta-badge.link {
    text-decoration: none;
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s;
  }

  .meta-badge.link:hover {
    background: var(--card-hover);
    border-color: currentColor;
  }

  .detail-people-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .detail-genres {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .genre-tag {
    background: var(--accent-dim);
    color: var(--accent);
    padding: 3px 9px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
  }

  .detail-overview {
    font-size: 13px;
    line-height: 1.7;
    color: var(--text);
    opacity: 0.85;
  }

  @media (max-width: 768px) {
    .detail-panel {
      width: 100vw;
      max-width: 100vw;
      left: 0;
      border-left: 0;
    }

    .detail-body {
      padding: 0 20px calc(28px + env(safe-area-inset-bottom, 0px));
    }

    .detail-body h2 {
      font-size: 22px;
    }

    .detail-watch {
      width: 44px;
      height: 44px;
    }

    .detail-poster-wrap {
      max-height: 300px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .detail-overlay,
    .detail-panel,
    .detail-watch {
      transition: none;
    }
  }
</style>
