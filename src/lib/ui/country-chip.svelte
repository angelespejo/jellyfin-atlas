<script lang="ts">
  import * as m from '#i18n/messages.js'
  import { countryFlagEmoji, ui } from '#core'
  import { countryLabel } from './country-label'

  let {
    country,
    onfilter,
  }: {
    country: string
    onfilter?: () => void
  } = $props()

  const flag = $derived(countryFlagEmoji(country))

  function openDetails() {
    ui.activeCountry = country
  }

  function filter() {
    onfilter?.()
  }
</script>

<div class="country-chip-wrap">
  <button
    class="country-chip"
    type="button"
    onclick={openDetails}
    aria-label={countryLabel(country)}
  >
    {#if flag}
      <span class="flag">{flag}</span>
    {:else}
      <i class="fas fa-map-marker-alt"></i>
    {/if}
    {countryLabel(country)}
  </button>

  <div class="country-options">
    {#if onfilter}
      <button type="button" onclick={filter}>
        <i class="fas fa-filter"></i>
        {m['country.filter']()}
      </button>
    {/if}
    <button type="button" onclick={openDetails}>
      <i class="fas fa-circle-info"></i>
      {m['country.openDialog']()}
    </button>
  </div>
</div>

<style>
  .country-chip-wrap {
    position: relative;
    display: inline-flex;
  }

  .country-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 11px;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--card);
    color: var(--text);
    font-family: inherit;
    font-size: 12px;
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s,
      color 0.15s;
  }

  .country-chip:hover,
  .country-chip:focus-visible {
    background: var(--teal-dim);
    border-color: var(--teal);
    color: var(--teal);
    outline: none;
  }

  .country-chip > i {
    font-size: 10px;
    opacity: 0.7;
  }

  .flag {
    font-size: 14px;
    line-height: 1;
  }

  .country-options {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 20;
    display: none;
    flex-direction: column;
    gap: 2px;
    min-width: 175px;
    padding: 4px;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--card);
    box-shadow: var(--shadow-panel);
  }

  .country-chip-wrap:hover .country-options,
  .country-chip-wrap:focus-within .country-options {
    display: flex;
  }

  .country-options button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 9px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--text);
    font-family: inherit;
    font-size: 11px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }

  .country-options button:hover,
  .country-options button:focus-visible {
    background: var(--card-hover);
    color: var(--teal);
    outline: none;
  }

  .country-options i {
    width: 12px;
    text-align: center;
    color: var(--text-muted);
    font-size: 10px;
  }

  @media (prefers-reduced-motion: reduce) {
    .country-chip {
      transition: none;
    }
  }
</style>
