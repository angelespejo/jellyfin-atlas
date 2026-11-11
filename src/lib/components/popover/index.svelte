<script lang="ts">
  let { open = $bindable(false), title, children, class: cls = '' } = $props()

  function handleBackdrop() {
    open = false
  }
</script>

{#if open}
  <div class="popover-backdrop" onclick={handleBackdrop} role="presentation"></div>
  <div class={['popover', cls]} role="menu">
    {#if title}
      <div class="popover-header">{title}</div>
    {/if}
    {@render children()}
  </div>
{/if}

<style>
  .popover-backdrop {
    position: fixed;
    inset: 0;
    z-index: 109;
  }

  .popover {
    position: fixed;
    z-index: 120;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: var(--shadow-panel);
    overflow: hidden;
    max-height: min(72vh, 680px);
    overflow-y: auto;
    overscroll-behavior: contain;
    backdrop-filter: blur(18px);
    animation: popoverIn 0.2s ease-out;
  }

  @keyframes popoverIn {
    from {
      opacity: 0;
      transform: scale(0.96) translateY(4px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .popover-header {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: var(--text-muted);
    font-weight: 600;
    padding: 14px 16px 12px;
    border-bottom: 1px solid var(--border);
  }

  @media (max-width: 768px) {
    .popover {
      left: 12px !important;
      right: 12px !important;
      width: auto !important;
      max-width: none !important;
      max-height: calc(72dvh - env(safe-area-inset-top, 0px));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .popover {
      animation: none;
    }
  }
</style>
