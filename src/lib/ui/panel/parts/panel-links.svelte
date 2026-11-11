<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    layout = 'row',
    children,
  }: {
    layout?: 'row' | 'grid'
    children?: Snippet
  } = $props()
</script>

<div class={['panel-links', layout]}>
  {@render children?.()}
</div>

<style>
  .panel-links {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .panel-links.grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }
</style>
