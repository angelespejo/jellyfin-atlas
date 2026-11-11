<script lang="ts">
  import * as m from '#i18n/messages.js'
  import type { JellyfinItem } from '#core'
  import { countryLabel } from './country-label'

  let {
    country,
    movies,
    onfilter,
    onopen,
  }: {
    country: string
    movies: JellyfinItem[]
    onfilter: () => void
    onopen: () => void
  } = $props()

  const movieCount = $derived(movies.filter((movie) => movie.Type === 'Movie').length)
  const seriesCount = $derived(movies.filter((movie) => movie.Type === 'Series').length)
</script>

<div class="country-popup">
  <h3>{countryLabel(country)}</h3>

  <div class="popup-stats">
    <span class="popup-stat">
      <i class="fas fa-film" aria-hidden="true"></i>
      <b>{movieCount}</b>
      {movieCount === 1 ? m['map.movie']() : m['map.movies']()}
    </span>
    <span class="popup-stat">
      <i class="fas fa-tv" aria-hidden="true"></i>
      <b>{seriesCount}</b>
      {m['map.series']()}
    </span>
  </div>

  <div class="popup-actions">
    <button type="button" class="popup-action primary" onclick={onfilter}>
      <i class="fas fa-filter" aria-hidden="true"></i>
      {m['country.filter']()}
    </button>
    <button type="button" class="popup-action ghost" onclick={onopen}>
      <i class="fas fa-circle-info" aria-hidden="true"></i>
      {m['country.openDialog']()}
    </button>
  </div>
</div>

<style>
  .country-popup h3 {
    font-size: 15px;
    font-weight: 700;
    margin: 0 22px 7px 0;
    color: var(--text);
  }

  .popup-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 10px;
    color: var(--text-muted);
    font-size: 11px;
  }

  .popup-stat {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .popup-stat b {
    color: var(--text);
    font-size: 13px;
  }

  .popup-stat i {
    font-size: 10px;
    color: var(--accent);
  }

  .popup-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .popup-action {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 32px;
    padding: 0 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font-family: inherit;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }

  .popup-action.primary {
    background: var(--accent-strong);
    border-color: var(--accent-strong);
    color: #fff;
  }

  .popup-action.primary:hover {
    filter: brightness(1.08);
  }

  .popup-action.ghost:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .popup-action:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 2px;
  }
</style>
