<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    variant = 'secondary',
    icon,
    trailingIcon,
    href,
    external = false,
    onclick,
    type = 'button',
    children,
  }: {
    variant?: 'primary' | 'secondary'
    icon?: string
    trailingIcon?: string
    href?: string
    external?: boolean
    onclick?: (event: MouseEvent) => void
    type?: 'button' | 'submit'
    children?: Snippet
  } = $props()
</script>

{#snippet content()}
  {#if icon}<i class={icon}></i>{/if}
  <span>{@render children?.()}</span>
  {#if trailingIcon}<i class={trailingIcon}></i>{/if}
{/snippet}

{#if href}
  <a
    class={['panel-button', variant]}
    {href}
    target={external ? '_blank' : undefined}
    rel={external ? 'noopener noreferrer' : undefined}
  >
    {@render content()}
  </a>
{:else}
  <button class={['panel-button', variant]} {type} {onclick}>
    {@render content()}
  </button>
{/if}

<style>
  .panel-button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 36px;
    padding: 0 12px;
    border-radius: 9px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition:
      filter 0.15s,
      border-color 0.15s,
      color 0.15s;
  }

  .panel-button > i:last-child:not(:first-child) {
    font-size: 9px;
    color: var(--text-muted);
  }

  .panel-button.primary {
    background: var(--accent-strong);
    border: 1px solid var(--accent-strong);
    color: #fff;
  }

  .panel-button.primary:hover {
    filter: brightness(1.08);
  }

  .panel-button.secondary {
    background: var(--card);
    border: 1px solid var(--border);
    color: var(--text);
  }

  .panel-button.secondary:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .panel-button:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 2px;
  }

  .panel-button span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
