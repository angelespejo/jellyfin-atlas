<script lang="ts">
  let {
    href,
    icon,
    label,
    variant = 'neutral',
    loading = false,
  }: {
    href?: string
    icon: string
    label: string
    variant?: 'jellyfin' | 'imdb' | 'tmdb' | 'wikipedia' | 'neutral'
    loading?: boolean
  } = $props()
</script>

{#if loading}
  <span class={['external-link', variant, 'loading']}>
    <i class="fas fa-spinner fa-pulse"></i>
    <span>{label}</span>
  </span>
{:else if href}
  <a class={['external-link', variant]} {href} target="_blank" rel="noopener noreferrer">
    <i class={icon}></i>
    <span>{label}</span>
  </a>
{/if}

<style>
  .external-link {
    display: flex;
    align-items: center;
    gap: 7px;
    min-height: 34px;
    padding: 3px 8px;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: var(--card);
    color: var(--text);
    font-size: 10px;
    font-weight: 600;
    line-height: 1.1;
    text-decoration: none;
    transition:
      border-color 0.15s,
      background 0.15s,
      box-shadow 0.15s;
  }

  .external-link > i:first-child {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border-radius: 5px;
    background: var(--card-hover);
    color: var(--text-muted);
    font-size: 10px;
  }

  .external-link::after {
    content: '↗';
    margin-left: auto;
    color: currentColor;
    opacity: 0.55;
    font-size: 9px;
    line-height: 1;
  }

  .external-link:hover {
    border-color: currentColor;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  }

  .external-link:hover > i:first-child {
    background: var(--surface);
  }

  .external-link:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 2px;
  }

  .external-link.jellyfin {
    border-color: var(--accent);
    background: var(--accent-dim);
    color: var(--accent);
  }

  .external-link.jellyfin > i:first-child {
    background: var(--surface);
    color: var(--accent);
  }

  .external-link.imdb {
    border-color: var(--yellow);
    background: rgba(245, 197, 24, 0.12);
    color: var(--yellow);
  }

  .external-link.imdb > i:first-child {
    background: rgba(245, 197, 24, 0.18);
    color: var(--yellow);
  }

  .external-link.tmdb {
    border-color: var(--teal);
    background: var(--teal-dim);
    color: var(--teal);
  }

  .external-link.tmdb > i:first-child {
    background: var(--surface);
    color: var(--teal);
  }

  .external-link.wikipedia {
    border-color: var(--border);
    background: var(--card);
    color: var(--text);
  }

  .external-link.wikipedia > i:first-child {
    background: var(--card-hover);
    color: var(--text);
  }

  .external-link.loading {
    opacity: 0.55;
    cursor: default;
    box-shadow: none;
  }

  .external-link.loading::after {
    content: none;
  }

  .external-link span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
