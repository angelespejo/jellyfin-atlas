<script lang="ts">
  import * as m from '#i18n/messages.js'
  import { getMovieStore } from '#core'

  let { showLabel = true }: { showLabel?: boolean } = $props()

  const store = getMovieStore()

  const yearCount = $derived(store.selectedYearRange[1] - store.selectedYearRange[0] + 1)
  const fill = $derived.by(() => {
    const span = Math.max(1, store.yearBounds[1] - store.yearBounds[0])
    const left = ((store.selectedYearRange[0] - store.yearBounds[0]) / span) * 100
    const right = ((store.selectedYearRange[1] - store.yearBounds[0]) / span) * 100
    return { left: `${left}%`, right: `${100 - right}%` }
  })
</script>

<div class="year-range">
  <div class="year-range-header" class:no-label={!showLabel}>
    {#if showLabel}
      <span>{m['filter.yearRange']()}</span>
    {/if}
    <span class="year-range-values">
      {store.selectedYearRange[0]} &ndash; {store.selectedYearRange[1]}
      <span class="year-range-count">
        ({yearCount === 1
          ? m['filter.year']({ n: yearCount })
          : m['filter.years']({ n: yearCount })})
      </span>
    </span>
  </div>

  <div class="year-sliders">
    <div class="year-slider-track" aria-hidden="true"></div>
    <div
      class="year-slider-fill"
      style:left={fill.left}
      style:right={fill.right}
      aria-hidden="true"
    ></div>
    <input
      type="range"
      name="year-min"
      min={store.yearBounds[0]}
      max={store.yearBounds[1]}
      value={store.selectedYearRange[0]}
      oninput={(e) => {
        const val = parseInt(e.currentTarget.value)
        store.setYearRange([
          Math.min(val, store.selectedYearRange[1] - 1),
          store.selectedYearRange[1],
        ])
      }}
      class="year-slider year-slider-min"
      aria-label={m['filter.fromYear']()}
    />
    <input
      type="range"
      name="year-max"
      min={store.yearBounds[0]}
      max={store.yearBounds[1]}
      value={store.selectedYearRange[1]}
      oninput={(e) => {
        const val = parseInt(e.currentTarget.value)
        store.setYearRange([
          store.selectedYearRange[0],
          Math.max(val, store.selectedYearRange[0] + 1),
        ])
      }}
      class="year-slider year-slider-max"
      aria-label={m['filter.toYear']()}
    />
  </div>

  <div class="year-bounds" aria-hidden="true">
    <span>{store.yearBounds[0]}</span>
    <span>{store.yearBounds[1]}</span>
  </div>
</div>

<style>
  .year-range-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 10px;
  }

  .year-range-header.no-label {
    justify-content: flex-end;
  }

  .year-range-values {
    color: var(--text);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .year-range-count {
    color: var(--text-muted);
    font-weight: 400;
    margin-left: 4px;
    font-size: 11px;
  }

  .year-sliders {
    position: relative;
    height: 24px;
    margin: 0 9px;
  }

  .year-slider-track {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    height: 6px;
    border-radius: 999px;
    background: var(--card-hover);
    border: 1px solid var(--border);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.16);
  }

  .year-slider-fill {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    height: 6px;
    border-radius: 999px;
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent-glow);
  }

  .year-slider {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 24px;
    margin: 0;
    padding: 0;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    pointer-events: none;
    outline: none;
  }

  /* Transparent native tracks: the visual track is drawn above. */
  .year-slider::-webkit-slider-runnable-track {
    height: 6px;
    background: transparent;
    border: none;
  }

  .year-slider::-moz-range-track {
    height: 6px;
    background: transparent;
    border: none;
  }

  .year-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    margin-top: -6px;
    border-radius: 50%;
    background: var(--surface);
    border: 3px solid var(--accent);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.28);
    cursor: grab;
    pointer-events: auto;
    transition:
      transform 0.12s ease,
      box-shadow 0.12s ease;
  }

  .year-slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--surface);
    border: 3px solid var(--accent);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.28);
    cursor: grab;
    pointer-events: auto;
    transition:
      transform 0.12s ease,
      box-shadow 0.12s ease;
  }

  .year-slider:hover::-webkit-slider-thumb {
    transform: scale(1.08);
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.32);
  }

  .year-slider:hover::-moz-range-thumb {
    transform: scale(1.08);
  }

  .year-slider:active::-webkit-slider-thumb {
    cursor: grabbing;
    transform: scale(1.14);
  }

  .year-slider:active::-moz-range-thumb {
    cursor: grabbing;
    transform: scale(1.14);
  }

  .year-slider:focus-visible::-webkit-slider-thumb {
    box-shadow:
      0 0 0 4px var(--accent-dim),
      0 2px 6px rgba(0, 0, 0, 0.28);
  }

  .year-slider:focus-visible::-moz-range-thumb {
    box-shadow:
      0 0 0 4px var(--accent-dim),
      0 2px 6px rgba(0, 0, 0, 0.28);
  }

  .year-bounds {
    display: flex;
    justify-content: space-between;
    margin: 2px 9px 0;
    font-size: 10px;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  @media (prefers-reduced-motion: reduce) {
    .year-slider::-webkit-slider-thumb,
    .year-slider::-moz-range-thumb {
      transition: none;
    }
  }
</style>
