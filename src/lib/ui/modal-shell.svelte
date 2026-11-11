<script lang="ts">
  import type { Snippet } from 'svelte'
  import * as m from '#i18n/messages.js'
  import Tooltip from './tooltip.svelte'

  let {
    title,
    width = 520,
    onclose,
    children,
  }: {
    title: string
    width?: number
    onclose: () => void
    children: Snippet
  } = $props()

  let panel = $state<HTMLDivElement>()

  const focusableSelector =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

  $effect(() => {
    panel?.focus()
  })

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onclose()
      return
    }
    if (event.key !== 'Tab' || !panel) return

    const focusable = [...panel.querySelectorAll<HTMLElement>(focusableSelector)]
    if (focusable.length === 0) {
      event.preventDefault()
      panel.focus()
      return
    }

    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
</script>

<svelte:window onkeydowncapture={handleKeydown} />

<div class="modal-backdrop" onclick={onclose} role="presentation"></div>

<div
  class="modal-shell"
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  tabindex="-1"
  bind:this={panel}
  style:--modal-w="{width}px"
>
  <header class="modal-header">
    <h2 id="modal-title">{title}</h2>
    <button class="modal-close" onclick={onclose} aria-label={m['detail.close']()} data-tooltip>
      <i class="fas fa-times"></i>
      <Tooltip label={m['detail.close']()} shortcut="close" placement="left" />
    </button>
  </header>
  <div class="modal-body">
    {@render children()}
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 519;
    background: var(--backdrop);
    backdrop-filter: blur(5px);
  }

  .modal-shell {
    position: fixed;
    z-index: 520;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(var(--modal-w, 520px), calc(100vw - 32px));
    max-height: min(86dvh, 780px);
    display: flex;
    flex-direction: column;
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: var(--shadow-panel);
    overflow: hidden;
    outline: none;
    animation: modal-in 0.18s ease-out;
  }

  @keyframes modal-in {
    from {
      opacity: 0;
      transform: translate(-50%, -48%) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }

  .modal-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
  }

  .modal-header h2 {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.2px;
  }

  .modal-close {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text-muted);
    font-family: inherit;
    font-size: 14px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .modal-close:hover {
    background: var(--card-hover);
    color: var(--text);
  }

  .modal-close:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 2px;
  }

  .modal-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 16px 20px calc(20px + env(safe-area-inset-bottom, 0px));
    scrollbar-gutter: stable;
  }

  @media (max-width: 768px) {
    .modal-shell {
      top: auto;
      bottom: 0;
      left: 0;
      right: 0;
      transform: none;
      width: 100%;
      max-width: none;
      max-height: 88dvh;
      border-radius: 16px 16px 0 0;
      border-bottom: none;
      animation: sheet-in 0.2s ease-out;
    }

    @keyframes sheet-in {
      from {
        opacity: 0;
        transform: translateY(16px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .modal-shell {
      animation: none;
    }
  }
</style>
