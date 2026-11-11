<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    title,
    subtitle,
    children,
  }: {
    title: string
    subtitle?: string
    children?: Snippet
  } = $props()
</script>

<header class="view-header">
  <div class="view-heading">
    <h2>{title}</h2>
    {#if subtitle}<p>{subtitle}</p>{/if}
  </div>
  {#if children}
    <div class="view-actions">{@render children()}</div>
  {/if}
</header>

<style>
  .view-header {
    position: relative;
    /* Keeps header dropdowns above sticky table headers and map/chart content. */
    z-index: 3;
    flex-shrink: 0;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    padding: calc(18px + env(safe-area-inset-top, 0px)) 22px 12px;
    border-bottom: 1px solid var(--border);
    background: var(--panel-bg);
    backdrop-filter: blur(14px);
  }

  .view-heading {
    min-width: 0;
  }

  .view-header h2 {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.2px;
  }

  .view-header p {
    margin-top: 3px;
    font-size: 11px;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .view-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    .view-header {
      padding: calc(14px + env(safe-area-inset-top, 0px)) 16px 10px;
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .view-actions {
      width: 100%;
      justify-content: flex-start;
    }
  }
</style>
