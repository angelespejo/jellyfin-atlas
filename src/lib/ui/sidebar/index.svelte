<script lang="ts">
  import * as m from '#i18n/messages.js'
  import { APP_NAME } from '#const'
  import { ui } from '#core'
  import { FilterPanel, FilterSections, MovieList } from '#lib'
  import Tooltip from '../tooltip.svelte'

  let {
    open = true,
    onclose = () => {},
  }: {
    open?: boolean
    onclose?: () => void
  } = $props()
</script>

<aside id="sidebar" class={['sidebar', { open }]} aria-label={m['sidebar.search']()}>
  <header class="sidebar-header">
    <div class="brand-text">
      <span class="brand-name">{APP_NAME}</span>
      <span class="brand-pane">{m['sidebar.search']()}</span>
    </div>
    <button class="sidebar-close" onclick={onclose} aria-label={m['sidebar.close']()} data-tooltip>
      <i class="fas fa-times"></i>
      <Tooltip label={m['sidebar.close']()} shortcut="close" placement="left" />
    </button>
  </header>

  <FilterPanel />

  {#if ui.sidebarTab === 'results'}
    <MovieList />
  {:else}
    <FilterSections />
  {/if}
</aside>

<style>
  .sidebar {
    background: var(--sidebar-bg);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: visible;
    position: relative;
    z-index: 10;
    height: 100%;
    width: 100%;
    backdrop-filter: blur(18px) saturate(1.15);
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 16px 14px 14px;
    border-bottom: 1px solid var(--border);
    /* background: linear-gradient(135deg, var(--accent-dim), transparent 70%); */
    flex-shrink: 0;
  }

  .brand-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1.25;
  }

  .brand-name {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .brand-pane {
    font-size: 11px;
    color: var(--text-muted);
  }

  .sidebar-close {
    display: flex;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    align-items: center;
    justify-content: center;
    font-family: inherit;
    font-size: 15px;
    flex-shrink: 0;
  }

  .sidebar-close:hover {
    color: var(--text);
    background: var(--card-hover);
  }

  @media (max-width: 768px) {
    .sidebar-header {
      padding-top: calc(14px + env(safe-area-inset-top, 0px));
    }
  }
</style>
