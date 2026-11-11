<script lang="ts">
  import * as m from '#i18n/messages.js'
  import type { JellyfinItem } from '../../../../core/types'

  let { items }: { items: JellyfinItem[] } = $props()

  const movieCount = $derived(items.filter((item) => item.Type === 'Movie').length)
  const seriesCount = $derived(items.filter((item) => item.Type === 'Series').length)
</script>

<div class="panel-stats">
  <span>
    <i class="fas fa-film"></i>
    <b>{movieCount}</b>
    {movieCount === 1 ? m['map.movie']() : m['stats.movies']()}
  </span>
  <span><i class="fas fa-tv"></i> <b>{seriesCount}</b> {m['stats.series']()}</span>
</div>

<style>
  .panel-stats {
    display: flex;
    gap: 14px;
    font-size: 12px;
    color: var(--text-muted);
    border-top: 1px solid var(--border);
    padding-top: 12px;
    margin-top: 2px;
  }

  .panel-stats b {
    color: var(--text);
  }

  .panel-stats i {
    font-size: 10px;
    color: var(--accent);
  }
</style>
