<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    title,
    children,
  }: {
    title: string
    children?: Snippet
  } = $props()
</script>

<section class="panel-section">
  <h3>{title}</h3>
  {@render children?.()}
</section>

<style>
  .panel-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
  }

  .panel-section h3 {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1.1px;
    text-transform: uppercase;
    color: var(--text-muted);
  }
</style>
