<script lang="ts">
  import * as m from '#i18n/messages.js'
  import type { ViewMode } from '#core'
  import { type ShortcutName } from '#lib/shortcuts.js'
  import Tooltip from './tooltip.svelte'

  let { view, onchange }: { view: ViewMode; onchange: (view: ViewMode) => void } = $props()

  const options: {
    mode: ViewMode
    icon: string
    label: () => string
    shortcut: ShortcutName
  }[] = [
    { mode: 'map', icon: 'map', label: () => m['view.map'](), shortcut: 'viewMap' },
    { mode: 'chart', icon: 'chart-bar', label: () => m['view.chart'](), shortcut: 'viewChart' },
    {
      mode: 'graph',
      icon: 'diagram-project',
      label: () => m['view.graph'](),
      shortcut: 'viewGraph',
    },
    { mode: 'table', icon: 'table-list', label: () => m['view.table'](), shortcut: 'viewTable' },
  ]
</script>

<div class="view-switcher" role="group" aria-label={m['view.label']()}>
  {#each options as option (option.mode)}
    <button
      class={['view-button', { active: view === option.mode }]}
      aria-pressed={view === option.mode}
      aria-label={option.label()}
      data-tooltip
      onclick={() => onchange(option.mode)}
    >
      <i class="fas fa-{option.icon}"></i>
      <Tooltip label={option.label()} shortcut={option.shortcut} placement="right" />
    </button>
  {/each}
</div>

<style>
  .view-switcher {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 3px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--panel-bg);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  }

  .view-button {
    width: 40px;
    height: 38px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 11px;
    background: transparent;
    color: var(--text-muted);
    font-size: 15px;
    font-family: inherit;
    cursor: pointer;
    transition:
      background 0.18s ease,
      color 0.18s ease,
      box-shadow 0.18s ease,
      transform 0.14s ease;
  }

  .view-button:hover {
    background: var(--card-hover);
    color: var(--text);
  }

  .view-button:active {
    transform: scale(0.9);
  }

  .view-button.active {
    background: var(--accent-strong);
    color: #fff;
    box-shadow: 0 2px 10px var(--accent-glow);
  }

  .view-button i {
    display: block;
  }

  .view-button.active i {
    animation: view-pop 0.3s cubic-bezier(0.2, 0.8, 0.3, 1.2);
  }

  @keyframes view-pop {
    0% {
      transform: scale(0.65);
    }
    55% {
      transform: scale(1.18);
    }
    100% {
      transform: scale(1);
    }
  }

  .view-button:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 2px;
  }

  @media (max-width: 480px) {
    .view-button {
      width: 38px;
      height: 36px;
      font-size: 14px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .view-button {
      transition: none;
    }

    .view-button.active i {
      animation: none;
    }
  }
</style>
