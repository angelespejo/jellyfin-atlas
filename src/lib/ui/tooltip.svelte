<script lang="ts">
  import type { ShortcutName } from '#lib/shortcuts.js'
  import { shortcuts } from '#lib/shortcuts.js'

  type Placement = 'top' | 'right' | 'bottom' | 'left'

  let {
    label,
    shortcut,
    placement = 'top',
  }: {
    label: string
    shortcut?: ShortcutName
    placement?: Placement
  } = $props()
</script>

<span class="tooltip" data-placement={placement} role="tooltip" aria-hidden="true">
  <span class="tooltip-label">{label}</span>
  {#if shortcut}
    <kbd>{shortcuts[shortcut].label}</kbd>
  {/if}
</span>

<style>
  .tooltip {
    position: absolute;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 8px;
    width: max-content;
    max-width: min(340px, calc(100vw - 16px));
    padding: 7px 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--tooltip-bg);
    color: var(--text);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
    backdrop-filter: blur(14px) saturate(1.2);
    -webkit-backdrop-filter: blur(14px) saturate(1.2);
    font-size: 12px;
    font-weight: 600;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-style: normal;
    line-height: 1.3;
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
    transition:
      opacity 0.12s ease,
      visibility 0.12s;
  }

  :global([data-tooltip]) > .tooltip {
    opacity: 0;
    visibility: hidden;
  }

  :global([data-tooltip]:hover) > .tooltip,
  :global([data-tooltip]:focus-visible) > .tooltip {
    opacity: 1;
    visibility: visible;
  }

  .tooltip-label {
    min-width: 0;
  }

  .tooltip kbd {
    flex-shrink: 0;
    padding: 2px 6px;
    border: 1px solid var(--border);
    border-radius: 5px;
    background: var(--card);
    color: var(--text-muted);
    font-family: inherit;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.2px;
    white-space: nowrap;
  }

  .tooltip::after {
    content: '';
    position: absolute;
    width: 0;
    height: 0;
    border: 5px solid transparent;
  }

  .tooltip[data-placement='top'] {
    bottom: calc(100% + 10px);
    left: 50%;
    transform: translateX(-50%);
  }

  .tooltip[data-placement='top']::after {
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-top-color: var(--tooltip-bg);
  }

  .tooltip[data-placement='bottom'] {
    top: calc(100% + 10px);
    left: 50%;
    transform: translateX(-50%);
  }

  .tooltip[data-placement='bottom']::after {
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-bottom-color: var(--tooltip-bg);
  }

  .tooltip[data-placement='left'] {
    top: 50%;
    right: calc(100% + 10px);
    transform: translateY(-50%);
  }

  .tooltip[data-placement='left']::after {
    top: 50%;
    left: 100%;
    transform: translateY(-50%);
    border-left-color: var(--tooltip-bg);
  }

  .tooltip[data-placement='right'] {
    top: 50%;
    left: calc(100% + 10px);
    transform: translateY(-50%);
  }

  .tooltip[data-placement='right']::after {
    top: 50%;
    right: 100%;
    transform: translateY(-50%);
    border-right-color: var(--tooltip-bg);
  }

  @media (hover: none) {
    .tooltip {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .tooltip {
      transition: none;
    }
  }
</style>
