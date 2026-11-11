<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements'

  let {
    icon,
    children,
    ...rest
  }: { icon?: string; children?: import('svelte').Snippet } & HTMLButtonAttributes = $props()
</script>

<button class="popover-item" role="menuitem" {...rest}>
  {#if icon}<i class="fas fa-{icon}"></i>{/if}
  {#if children}{@render children()}{/if}
</button>

<style>
  .popover-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 46px;
    padding: 11px 16px;
    background: none;
    border: none;
    color: var(--text);
    font-family: inherit;
    font-size: 13px;
    cursor: pointer;
    transition:
      background 0.16s,
      color 0.16s;
    text-align: left;
  }

  .popover-item:hover {
    background: var(--card-hover);
    color: var(--text);
  }

  .popover-item i {
    width: 14px;
    font-size: 12px;
    color: var(--accent);
  }

  @media (prefers-reduced-motion: reduce) {
    .popover-item {
      transition: none;
    }
  }
</style>
