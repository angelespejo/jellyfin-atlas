<script lang="ts">
  import * as m from '#i18n/messages.js'
  import {
    getMovieStore,
    i18n,
    setLocaleMode,
    setThemeMode,
    ui,
    type LocaleMode,
    type ThemeMode,
  } from '#core'
  import { notifications } from '#lib'
  import { shortcuts } from '#lib/shortcuts.js'

  let {
    showCities,
    onshowcities,
    onreload,
  }: {
    showCities: boolean
    onshowcities: (next: boolean) => void
    onreload?: () => void
  } = $props()

  const store = getMovieStore()

  const languageOptions: { mode: LocaleMode; label: () => string }[] = [
    { mode: 'auto', label: () => m['settings.lang.auto']() },
    { mode: 'en', label: () => m['settings.lang.en']() },
    { mode: 'es', label: () => m['settings.lang.es']() },
  ]

  const themeOptions: { mode: ThemeMode; label: () => string }[] = [
    { mode: 'system', label: () => m['settings.themeSystem']() },
    { mode: 'light', label: () => m['settings.themeLight']() },
    { mode: 'dark', label: () => m['settings.themeDark']() },
  ]

  function resetView() {
    store.resetView()
  }

  function reloadData() {
    if (onreload) onreload()
    else store.loadMovies(true)
  }

  function clearCache() {
    store.clearCache()
    notifications.send(m['toast.cacheCleared'](), 'success')
  }
</script>

<div class="settings-content">
  <section>
    <h3 class="pane-title">{m['settings.actions']()}</h3>
    <button class="pane-item" onclick={resetView}>
      <i class="fas fa-compress-arrows-alt"></i>
      <span>{m['settings.resetView']()}</span>
      <kbd class="shortcut">{shortcuts.resetView.label}</kbd>
    </button>
    <button class="pane-item" onclick={reloadData}>
      <i class="fas fa-sync-alt"></i>
      <span>{m['settings.reload']()}</span>
      <kbd class="shortcut">{shortcuts.reload.label}</kbd>
    </button>
    <button class="pane-item" onclick={clearCache}>
      <i class="fas fa-trash-alt"></i>
      <span>{m['settings.clearCache']()}</span>
      <kbd class="shortcut">{shortcuts.clearCache.label}</kbd>
    </button>
  </section>

  <section>
    <h3 class="pane-title">{m['settings.language']()}</h3>
    <div class="segmented" role="group" aria-label={m['settings.language']()}>
      {#each languageOptions as option (option.mode)}
        <button
          class={['segment', { active: i18n.mode === option.mode }]}
          aria-pressed={i18n.mode === option.mode}
          onclick={() => setLocaleMode(option.mode)}
        >
          {option.label()}
        </button>
      {/each}
    </div>
  </section>

  <section>
    <h3 class="pane-title">{m['settings.theme']()}</h3>
    <div class="segmented" role="group" aria-label={m['settings.theme']()}>
      {#each themeOptions as option (option.mode)}
        <button
          class={['segment', { active: ui.themeMode === option.mode }]}
          aria-pressed={ui.themeMode === option.mode}
          onclick={() => setThemeMode(option.mode)}
        >
          {option.label()}
        </button>
      {/each}
    </div>
  </section>

  <section>
    <h3 class="pane-title">{m['settings.cities']()}</h3>
    <button class="pane-item" onclick={() => onshowcities(!showCities)} aria-pressed={showCities}>
      <i class="fas fa-location-dot"></i>
      <span>{showCities ? m['settings.citiesHide']() : m['settings.citiesShow']()}</span>
      <kbd class="shortcut">{shortcuts.cities.label}</kbd>
      <span class={['switch', { on: showCities }]} aria-hidden="true"></span>
    </button>
    <p class="pane-hint">{m['settings.citiesHint']()}</p>
  </section>
</div>

<style>
  .settings-content {
    padding: 0 2px 4px;
  }

  section + section {
    margin-top: 18px;
  }

  .pane-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1.1px;
    text-transform: uppercase;
    color: var(--text-muted);
    padding: 6px 8px 8px;
  }

  .pane-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 44px;
    padding: 10px 10px;
    background: none;
    border: none;
    border-radius: 10px;
    color: var(--text);
    font-family: inherit;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s;
  }

  .pane-item:hover {
    background: var(--card-hover);
  }

  .pane-item i {
    width: 16px;
    color: var(--accent);
    font-size: 12px;
    text-align: center;
  }

  .shortcut {
    margin-left: auto;
    padding: 1px 6px;
    border: 1px solid var(--border);
    border-radius: 5px;
    background: var(--card);
    color: var(--text-muted);
    font-family: inherit;
    font-size: 10px;
    line-height: 1.5;
    white-space: nowrap;
  }

  .segmented {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 4px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 4px;
  }

  .segment {
    min-height: 36px;
    padding: 6px 8px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--text-muted);
    font-family: inherit;
    font-size: 12px;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }

  .segment:hover {
    color: var(--text);
  }

  .segment.active {
    background: var(--accent-dim);
    color: var(--accent);
    font-weight: 600;
  }

  .switch {
    margin-left: 0;
    width: 32px;
    height: 18px;
    border-radius: 999px;
    background: var(--border);
    position: relative;
    flex-shrink: 0;
    transition: background 0.15s;
  }

  .switch::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--surface);
    transition: transform 0.15s;
  }

  .switch.on {
    background: var(--accent);
  }

  .switch.on::after {
    transform: translateX(14px);
  }

  .pane-hint {
    font-size: 11px;
    line-height: 1.45;
    color: var(--text-muted);
    padding: 2px 10px 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .pane-item,
    .segment,
    .switch,
    .switch::after {
      transition: none;
    }
  }
</style>
