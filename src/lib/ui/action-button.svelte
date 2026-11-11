<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements'
  import type { ShortcutName } from '#lib/shortcuts.js'
  import Tooltip from './tooltip.svelte'

  let {
    icon,
    label,
    active = false,
    tooltip,
    tooltipShortcut,
    tooltipPlacement = 'top',
    ...rest
  }: {
    icon: string
    label?: string
    active?: boolean
    tooltip?: string
    tooltipShortcut?: ShortcutName
    tooltipPlacement?: 'top' | 'right' | 'bottom' | 'left'
  } & HTMLButtonAttributes = $props()
</script>

<button class={['action-btn', { active }]} data-tooltip={tooltip ? '' : undefined} {...rest}>
  <i class="fas fa-{icon}"></i>
  {#if label}<span>{label}</span>{/if}
  {#if tooltip}
    <Tooltip label={tooltip} shortcut={tooltipShortcut} placement={tooltipPlacement} />
  {/if}
</button>

<style>
  .action-btn {
    width: 46px;
    height: 46px;
    border-radius: 14px;
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
    transition:
      background 0.18s,
      border-color 0.18s,
      color 0.18s,
      transform 0.18s;
    font-family: inherit;
    flex-shrink: 0;
  }

  .action-btn:hover {
    color: var(--text);
    background: var(--card-hover);
  }

  .action-btn.active {
    color: var(--accent);
    background: var(--accent-dim);
    border-color: var(--accent);
  }

  @media (max-width: 768px) {
    .action-btn {
      width: 44px;
      height: 44px;
      font-size: 16px;
    }
  }

  @media (max-width: 480px) {
    .action-btn {
      width: 42px;
      height: 42px;
      font-size: 15px;
      border-radius: 13px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .action-btn {
      transition: none;
    }
  }
</style>
