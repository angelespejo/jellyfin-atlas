<script lang="ts">
  import * as m from '#i18n/messages.js'
  import { getMovieStore, ui } from '#core'
  import { countryLabel } from '../country-label'
  import type { MovieItemProps } from './types'

  let {
    movie,
    showPoster = true,
    showYear = true,
    showCountries = true,
    showGenres = true,
    showType = true,
    compact = false,
  }: MovieItemProps = $props()

  const store = getMovieStore()

  // Details loaded by the dialog may be richer than the cached list entry:
  // merge them so every list (sidebar, country, filmography) shows the same.
  const details = $derived(store.itemDetails.get(movie.Id))
  const data = $derived(details ?? movie)
  const year = $derived(data.ProductionYear ?? '')
  const locations = $derived(
    data.ProductionLocations?.length ? data.ProductionLocations : undefined
  )
  const countries = $derived(locations?.length ? locations : store.getCountries(movie))
  const genres = $derived((data.Genres ?? movie.Genres ?? []).slice(0, 2))
  const posterUrl = $derived(
    movie.Id ? `/api/jellyfin/image/${movie.Id}?maxWidth=96&maxHeight=144` : null
  )
  const isActive = $derived(store.activeMovieId === movie.Id)

  const typeLabel = $derived(
    data.Type === 'Movie'
      ? m['type.movie']()
      : data.Type === 'Series'
        ? m['type.series']()
        : data.Type === 'Person'
          ? m['type.person']()
          : data.Type || null
  )
  const typeIcon = $derived(
    data.Type === 'Series' ? 'tv' : data.Type === 'Person' ? 'user' : 'film'
  )
  const typeClass = $derived(
    data.Type === 'Series' ? 'series' : data.Type === 'Person' ? 'person' : 'movie'
  )

  let posterError = $state(false)

  function handleClick() {
    ui.activeCountry = null
    ui.activePerson = null
    store.setActiveMovieId(movie.Id)
  }
</script>

<div
  class={['movie-item', { active: isActive, compact }]}
  onclick={handleClick}
  role="button"
  tabindex="0"
  aria-current={isActive ? 'true' : undefined}
  onkeydown={(event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
    }
  }}
>
  {#if showPoster}
    {#if posterUrl && !posterError}
      <img
        class="movie-poster"
        src={posterUrl}
        alt={movie.Name}
        loading="lazy"
        onerror={() => (posterError = true)}
      />
    {:else}
      <div class="movie-poster-placeholder"><i class="fas fa-film"></i></div>
    {/if}
  {/if}

  <div class="movie-info">
    <div class="movie-title" title={movie.Name}>{movie.Name}</div>
    {#if (showYear && year) || (showCountries && countries.length)}
      <div class="movie-meta">
        {#if showYear && year}<span>{year}</span>{/if}
        {#if showCountries && countries.length}
          <span
            ><i class="fas fa-map-marker-alt"></i>
            {countries.map(countryLabel).join(', ')}</span
          >
        {/if}
      </div>
    {/if}
    {#if showGenres && genres.length}
      <div class="movie-genres">
        {#each genres as genre (genre)}
          <span>{genre}</span>
        {/each}
      </div>
    {/if}
    {#if showType && typeLabel}
      <div class="movie-meta">
        <span class={['type-badge', typeClass]}>
          <i class="fas fa-{typeIcon}"></i>
          {typeLabel}
        </span>
      </div>
    {/if}
  </div>
</div>

<style>
  .movie-item {
    display: flex;
    gap: 13px;
    padding: 10px;
    border-radius: 12px;
    cursor: pointer;
    transition:
      background 0.16s,
      border-color 0.16s,
      transform 0.16s;
    border: 1px solid transparent;
    margin-bottom: 4px;
  }

  .movie-item.compact {
    gap: 10px;
    padding: 7px 8px;
  }

  .movie-item:hover {
    background: var(--card);
    border-color: var(--border);
    transform: translateY(-1px);
  }

  .movie-item:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 1px;
    background: var(--card);
  }

  .movie-item.active {
    background: var(--accent-dim);
    border-color: rgba(208, 148, 225, 0.35);
    border-left-color: var(--accent);
  }

  .movie-poster {
    width: 52px;
    height: 78px;
    border-radius: 7px;
    object-fit: cover;
    background: var(--card);
    flex-shrink: 0;
  }

  .movie-poster-placeholder {
    width: 52px;
    height: 78px;
    border-radius: 7px;
    background: var(--card);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 15px;
    opacity: 0.5;
  }

  .movie-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
  }

  .movie-title {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.35;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .movie-meta {
    font-size: 11px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 9px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .movie-meta i {
    font-size: 9px;
  }

  .type-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 7px;
    border-radius: 999px;
    border: 1px solid var(--border);
    font-size: 9px;
    font-weight: 600;
    line-height: 1.6;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .movie-genres {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .movie-genres span {
    background: var(--card);
    border: 1px solid var(--border);
    padding: 3px 7px;
    border-radius: 5px;
    font-size: 10px;
    color: var(--text-muted);
  }

  @media (prefers-reduced-motion: reduce) {
    .movie-item {
      transition: none;
    }
  }
</style>
