<script lang="ts">
  import * as m from '#i18n/messages.js'
  import { getMovieStore } from '#core'
  import { MovieItem } from '../movie-item'

  const store = getMovieStore()
</script>

<div class="movie-list" id="movie-list">
  {#if store.loading}
    {#each Array(8) as _, i (i)}
      <div class="skeleton-item">
        <div class="skeleton skeleton-poster"></div>
        <div class="skeleton-lines">
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line" style="width:50%"></div>
        </div>
      </div>
    {/each}
  {:else if store.error}
    <div class="error-state">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>{m['error.title']()}</h3>
      <p>{m['error.message']()}</p>
      <button class="btn btn-primary" onclick={() => store.loadMovies(true)}>
        <i class="fas fa-redo"></i>
        {m['error.retry']()}
      </button>
    </div>
  {:else if store.currentMovies.length === 0}
    <div class="empty-state">
      <i class="fas fa-search"></i>
      <p>{m['empty.message']()}</p>
    </div>
  {:else}
    {#each store.currentMovies as movie (movie.Id)}
      <MovieItem {movie} />
    {/each}
  {/if}
</div>

<style>
  .movie-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 10px 14px;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }

  .skeleton-item {
    display: flex;
    gap: 12px;
    padding: 11px 10px;
  }

  .skeleton-poster {
    width: 52px;
    height: 78px;
    flex-shrink: 0;
  }

  .skeleton {
    background: linear-gradient(90deg, var(--card) 25%, var(--card-hover) 50%, var(--card) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 9px;
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  .skeleton-lines {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 10px;
  }

  .skeleton-line {
    height: 10px;
  }

  .skeleton-line:last-child {
    width: 55%;
  }

  .empty-state {
    text-align: center;
    padding: 52px 24px;
    color: var(--text-muted);
  }

  .empty-state i {
    font-size: 30px;
    margin-bottom: 10px;
    display: block;
    opacity: 0.4;
  }

  .empty-state p {
    font-size: 14px;
    line-height: 1.5;
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 12px;
    color: var(--text-muted);
    padding: 36px 28px;
    text-align: center;
  }

  .error-state i {
    font-size: 36px;
    color: var(--red);
    opacity: 0.9;
  }

  .error-state h3 {
    color: var(--text);
    font-size: 16px;
  }

  .error-state p {
    font-size: 13px;
    max-width: 280px;
    line-height: 1.5;
  }

  .btn {
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    min-height: 42px;
    padding: 9px 16px;
    border-radius: 11px;
    border: 1px solid transparent;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition:
      background 0.18s,
      box-shadow 0.18s,
      transform 0.18s;
  }

  .btn-primary {
    background: var(--accent-strong);
    color: white;
  }

  .btn-primary:hover {
    background: var(--accent-strong);
    box-shadow: 0 0 20px var(--accent-glow);
    transform: translateY(-1px);
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton {
      animation: none;
    }

    .btn {
      transition: none;
    }
  }
</style>
