<script lang="ts">
  import Tooltip from './tooltip.svelte'

  interface Props {
    /** Required for the input/label association. */
    id: string
    name: string
    /** Bound query string. */
    value: string
    placeholder: string
    /** Accessible name; defaults to the placeholder. */
    label?: string
    /** Tooltip/label of the clear button. */
    clearLabel: string
    size?: 'sm' | 'md'
    class?: string
  }

  let {
    id,
    name,
    value = $bindable(''),
    placeholder,
    label,
    clearLabel,
    size = 'md',
    class: className = '',
  }: Props = $props()
</script>

<div class={['search-field', size, className]}>
  <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
  <input {id} {name} type="search" bind:value {placeholder} aria-label={label ?? placeholder} />
  {#if value}
    <button type="button" onclick={() => (value = '')} aria-label={clearLabel} data-tooltip>
      <i class="fas fa-times"></i>
      <Tooltip label={clearLabel} placement="left" />
    </button>
  {/if}
</div>

<style>
  .search-field {
    display: flex;
    align-items: center;
    gap: 7px;
    min-height: 34px;
    padding: 0 8px 0 10px;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--card);
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }

  .search-field.sm {
    min-height: 30px;
    padding: 0 6px 0 9px;
  }

  .search-field:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-dim);
  }

  .search-field > i {
    flex: 0 0 auto;
    font-size: 11px;
    color: var(--text-muted);
  }

  .search-field input {
    flex: 1;
    min-width: 0;
    height: 32px;
    border: 0;
    background: transparent;
    color: var(--text);
    font-family: inherit;
    font-size: 12px;
    outline: none;
  }

  .search-field.sm input {
    height: 28px;
    font-size: 11px;
  }

  .search-field input::placeholder {
    color: var(--text-muted);
  }

  .search-field input::-webkit-search-cancel-button {
    display: none;
  }

  .search-field button {
    flex: 0 0 auto;
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    font-size: 11px;
    cursor: pointer;
  }

  .search-field button:hover {
    background: var(--card-hover);
    color: var(--text);
  }

  .search-field button:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 1px;
  }
</style>
