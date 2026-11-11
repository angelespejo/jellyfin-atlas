<script lang="ts">
  let { open = $bindable(true), triggerId = '', children } = $props()

  function handleBackdrop() {
    open = false
  }
</script>

{#if open}
  <div class="dropdown-backdrop" onclick={handleBackdrop} role="presentation"></div>
  <div class="dropdown" role="menu" aria-labelledby={triggerId || undefined}>
    {@render children()}
  </div>
{/if}

<style>
  .dropdown-backdrop {
    position: fixed;
    inset: 0;
    z-index: 119;
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    z-index: 120;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: var(--shadow-panel);
    min-width: 200px;
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

  @media (max-width: 768px) {
    .dropdown {
      position: fixed;
      top: calc(60px + env(safe-area-inset-top, 0px));
      left: 12px;
      right: 12px;
      max-height: calc(72dvh - env(safe-area-inset-top, 0px));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dropdown {
      animation: none;
    }
  }
</style>
