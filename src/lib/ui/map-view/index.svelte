<script lang="ts">
  import { mount, onMount, unmount } from 'svelte'
  import type L from 'leaflet'
  import 'leaflet/dist/leaflet.css'
  import * as m from '#i18n/messages.js'
  import {
    cityKey,
    cityStore,
    getCountryCoords,
    getMovieStore,
    normalizeImdb,
    resolveCountryShape,
    ui,
    type CityLocation,
    type JellyfinItem,
  } from '#core'
  import { countColor, countryColorMap, mixHex } from '#lib'
  import { countryLabel } from '../country-label'
  import CountryPopup from '../country-popup.svelte'

  let {
    theme,
    showCities = true,
    active = true,
  }: { theme: 'light' | 'dark'; showCities?: boolean; active?: boolean } = $props()

  const store = getMovieStore()

  const WORLD_BOUNDS: [[number, number], [number, number]] = [
    [-85.0511, -180],
    [85.0511, 180],
  ]

  // oxlint-disable-next-line no-unassigned-vars
  let mapContainer: HTMLDivElement
  let map: L.Map
  let borderLayer: L.LayerGroup
  let markerLayer: L.LayerGroup
  let cityLayer: L.LayerGroup
  let highlightLayer: L.LayerGroup
  let countryMarkers: L.CircleMarker[] = []
  let leaflet: typeof L
  let renderToken = 0
  let mapReady = $state(false)

  let zoom = $state(2)

  type CountryEntry = {
    outline: L.GeoJSON | null
    marker: L.CircleMarker
    halo: L.CircleMarker | null
    label: L.LatLngExpression
    radius: number
    color: string
  }

  let countryEntries = new Map<string, CountryEntry>()
  type PopupInstance = ReturnType<typeof mount>
  let popupInstances: PopupInstance[] = []

  function disposePopups() {
    for (const instance of popupInstances) unmount(instance)
    popupInstances = []
  }

  const init = async () => {
    leaflet = (await import('leaflet')).default

    const worldBounds = leaflet.latLngBounds(WORLD_BOUNDS)
    // Keep latitude clamped (no empty background above/below) but allow
    // horizontal panning across map copies, i.e. endless left/right scrolling.
    const verticalBounds = leaflet.latLngBounds([
      [-85.0511, -100000],
      [85.0511, 100000],
    ])
    map = leaflet.map(mapContainer, {
      center: [25, 10],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: true,
      maxBounds: verticalBounds,
      maxBoundsViscosity: 1,
      worldCopyJump: true,
      bounceAtZoomLimits: false,
    })

    map.attributionControl.setPrefix(false)

    leaflet
      .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        minZoom: 2,
        subdomains: 'abc',
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      })
      .addTo(map)

    leaflet.control.zoom({ position: 'topright' }).addTo(map)

    borderLayer = leaflet.layerGroup().addTo(map)
    cityLayer = leaflet.layerGroup().addTo(map)
    markerLayer = leaflet.layerGroup().addTo(map)
    highlightLayer = leaflet.layerGroup().addTo(map)

    /** Keeps the world covering the viewport so no background is ever visible. */
    const applyMinZoom = () => {
      map.invalidateSize()
      const min = Math.max(2, map.getBoundsZoom(worldBounds, true))
      map.setMinZoom(min)
      if (map.getZoom() < min) map.setZoom(min)
      zoom = map.getZoom()
    }

    map.whenReady(() => {
      applyMinZoom()
      map.setView([25, 10], map.getMinZoom())
    })
    map.on('resize', applyMinZoom)
    map.on('zoomend', () => {
      zoom = map.getZoom()
    })

    map.on('click', () => {
      if (window.innerWidth <= 768) {
        document.getElementById('sidebar')?.classList.remove('open')
      }
    })

    mapReady = true
  }

  onMount(() => {
    init()
    return () => {
      disposePopups()
      map?.remove()
    }
  })

  $effect(() => {
    if (!mapReady || !active) return
    // The map stays mounted while another view is active; recalculate its size
    // when it becomes visible again so tiles cover the viewport.
    map.invalidateSize()
  })

  $effect(() => {
    const outline =
      getComputedStyle(document.documentElement).getPropertyValue('--map-marker-outline').trim() ||
      (theme === 'dark' ? '#111820' : '#ffffff')
    for (const marker of countryMarkers) marker.setStyle({ color: outline })
  })

  $effect(() => {
    const movies = store.currentMovies
    if (!mapReady) return
    if (movies.length === 0) {
      disposePopups()
      borderLayer?.clearLayers()
      markerLayer.clearLayers()
      countryMarkers = []
      countryEntries = new Map()
      return
    }
    renderCountries(movies)
  })

  $effect(() => {
    const movies = store.currentMovies
    if (!mapReady) return
    // Cities would clutter the world view; show them once zoomed in or filtered.
    const visible = showCities && (zoom >= 4 || store.activeCountries.size > 0)
    renderCities(visible, movies)
  })

  // Filtered countries get a soft fill; the open drawer country gets focus styles.
  $effect(() => {
    if (!mapReady) return
    void store.activeCountries
    void ui.activeCountry
    applySelectionStyles()
  })

  $effect(() => {
    if (store.activeCountries.size > 0 && mapReady) {
      const first = [...store.activeCountries][0]
      if (first) {
        getCountryCoords(first).then((coords) => {
          map.flyTo(coords, 4, { duration: 1 })
        })
      }
    }
  })

  $effect(() => {
    const movieId = store.activeMovieId
    if (!mapReady || !movieId) {
      highlightLayer?.clearLayers()
      return
    }
    const movie = store.allMovies.find((item) => item.Id === movieId)
    if (!movie) return
    renderHighlights(movie)
    const countries = store.getCountries(movie)
    const target = countries[0]
    if (target) {
      getCountryCoords(target).then((coords) => {
        map.flyTo(coords, 4, { duration: 1 })
      })
    }
  })

  function getMarkerOutline(activeTheme: 'light' | 'dark') {
    return (
      getComputedStyle(document.documentElement).getPropertyValue('--map-marker-outline').trim() ||
      (activeTheme === 'dark' ? '#111820' : '#ffffff')
    )
  }

  function medianYear(movies: JellyfinItem[]): number | undefined {
    const years = movies
      .map((movie) => movie.ProductionYear)
      .filter((year): year is number => typeof year === 'number')
      .sort((a, b) => a - b)
    return years.length ? years[Math.floor(years.length / 2)] : undefined
  }

  async function renderHighlights(movie: JellyfinItem) {
    highlightLayer.clearLayers()
    const countries = store.getCountries(movie)

    for (const country of countries) {
      if (country === 'Unknown') continue
      const shape = await resolveCountryShape(country, movie.ProductionYear)
      const coords = shape?.label ?? (await getCountryCoords(country))
      if (!shape?.geometry) {
        const point = leaflet.circleMarker(coords as L.LatLngExpression, {
          radius: 18,
          color: '#aa5cc3',
          weight: 2,
          fillColor: '#aa5cc3',
          fillOpacity: 0.22,
          interactive: false,
        })
        highlightLayer.addLayer(point)
        continue
      }

      const highlight = leaflet.geoJSON(shape.geometry as never, {
        style: {
          color: '#aa5cc3',
          weight: 2,
          opacity: 0.9,
          fillColor: '#aa5cc3',
          fillOpacity: 0.16,
          dashArray: shape.historical ? '5 4' : undefined,
        },
        interactive: false,
      })
      highlightLayer.addLayer(highlight)
    }
  }

  async function renderCountries(movies: JellyfinItem[]) {
    const token = ++renderToken
    disposePopups()
    borderLayer.clearLayers()
    markerLayer.clearLayers()
    countryMarkers = []
    countryEntries = new Map()

    const moviesByCountry: Record<string, JellyfinItem[]> = Object.create(null)

    for (const movie of movies) {
      for (const country of new Set(store.getCountries(movie))) {
        const countryMovies = moviesByCountry[country] ?? []
        countryMovies.push(movie)
        moviesByCountry[country] = countryMovies
      }
    }

    const entries = Object.keys(moviesByCountry)
    const maxCount = Math.max(...entries.map((country) => moviesByCountry[country]!.length), 1)
    const markerOutline = getMarkerOutline(theme)
    const counts: Record<string, number> = Object.create(null)
    for (const country of entries) counts[country] = moviesByCountry[country]!.length
    const colorByCountry: Record<string, string> = countryColorMap(counts)
    const shapes = await Promise.all(
      entries.map(async (country) => ({
        country,
        shape: await resolveCountryShape(country, medianYear(moviesByCountry[country] ?? [])),
      }))
    )

    if (token !== renderToken) return

    for (const { country, shape } of shapes) {
      const countryMovies = moviesByCountry[country] ?? []
      const count = countryMovies.length
      const color = colorByCountry[country] ?? countColor(0)

      let outline: L.GeoJSON | null = null
      if (shape?.geometry) {
        outline = leaflet.geoJSON(shape.geometry as never, {
          style: {
            color,
            weight: 1.6,
            opacity: 0.7,
            fillColor: color,
            fillOpacity: 0.08,
            dashArray: shape.historical ? '5 4' : undefined,
          },
          interactive: false,
        })
        borderLayer.addLayer(outline)
      }

      const label = shape?.label ?? ((await getCountryCoords(country)) as [number, number])

      const radius = Math.max(8, Math.sqrt(count / maxCount) * 26)
      const marker = leaflet.circleMarker(label as L.LatLngExpression, {
        radius,
        color: markerOutline,
        weight: 2.5,
        fillColor: color,
        fillOpacity: 0.8,
      })

      marker.bindTooltip(
        country === 'Unknown' ? `${countryLabel(country)} · ${count}` : String(count),
        {
          permanent: true,
          direction: 'center',
          className: 'map-count-label',
          opacity: 1,
        }
      )

      marker.bindPopup(buildCountryPopup(country, countryMovies), {
        closeButton: true,
        minWidth: 200,
      })

      marker.on('mouseover', () => styleCountry(country, true))
      marker.on('mouseout', () => styleCountry(country))

      markerLayer.addLayer(marker)
      countryMarkers.push(marker)
      countryEntries.set(country, { outline, marker, halo: null, label, radius, color })
    }

    applySelectionStyles()
  }

  function accentColor(): string {
    return (
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#713d86'
    )
  }

  /**
   * Filtered countries only get a soft fill; the country whose drawer is open
   * is the one that gets the outline glow and the haloed marker.
   */
  function styleCountry(country: string, hover = false) {
    const entry = countryEntries.get(country)
    if (!entry) return

    const focused = ui.activeCountry === country
    const filtered = store.activeCountries.has(country)

    if (entry.outline) {
      entry.outline.setStyle({
        weight: focused ? 2.8 : 1.6,
        opacity: focused ? 1 : 0.7,
        fillOpacity: focused ? 0.24 : filtered ? 0.16 : 0.08,
      })
      entry.outline.eachLayer((layer) => {
        const element = (layer as L.Path).getElement?.()
        element?.classList.toggle('country-focused', focused)
      })
    }

    entry.marker.setStyle({
      weight: focused ? 3.5 : hover ? 3 : 2.5,
      opacity: 1,
      fillOpacity: focused ? 1 : hover ? 1 : 0.8,
    })
    entry.marker.setRadius(focused ? entry.radius * 1.12 : entry.radius)

    if (focused) {
      const haloRadius = entry.radius + 8
      if (!entry.halo) {
        entry.halo = leaflet.circleMarker(entry.label, {
          radius: haloRadius,
          color: accentColor(),
          weight: 2,
          opacity: 0.85,
          fillColor: entry.color,
          fillOpacity: 0.16,
          interactive: false,
        })
        markerLayer?.addLayer(entry.halo)
      } else {
        entry.halo.setLatLng(entry.label)
        entry.halo.setRadius(haloRadius)
        entry.halo.setStyle({ color: accentColor() })
        if (!markerLayer.hasLayer(entry.halo)) markerLayer.addLayer(entry.halo)
      }
      entry.marker.bringToFront()
    } else if (entry.halo) {
      markerLayer?.removeLayer(entry.halo)
      entry.halo = null
    }
  }

  function applySelectionStyles() {
    for (const country of countryEntries.keys()) styleCountry(country)
  }

  function renderCities(visible: boolean, movies: JellyfinItem[]) {
    cityLayer.clearLayers()
    if (!visible) return

    const groups: Record<string, { city: CityLocation; movies: string[] }> = Object.create(null)

    for (const movie of movies) {
      const imdb = normalizeImdb(movie.ProviderIds?.Imdb)
      if (!imdb) continue
      const cities = cityStore.byImdb[imdb] ?? []
      for (const city of cities) {
        const key = cityKey(city)
        const group = groups[key] ?? { city, movies: [] }
        group.movies.push(movie.Name)
        groups[key] = group
      }
    }

    const cityGroups = Object.values(groups)
    if (!cityGroups.length) return

    const fallbackColor =
      getComputedStyle(document.documentElement).getPropertyValue('--teal').trim() || '#087d6b'

    // Same scale as the country markers, so a city keeps its country hue but
    // reads as a lighter, smaller dot.
    const countryCounts: Record<string, number> = Object.create(null)
    for (const movie of movies) {
      for (const country of new Set(store.getCountries(movie))) {
        countryCounts[country] = (countryCounts[country] ?? 0) + 1
      }
    }
    const countryColors: Record<string, string> = countryColorMap(countryCounts)

    const normalizeCountry = (value: string) =>
      value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
    const aliases: Record<string, string> = {
      'united states': 'united states of america',
      usa: 'united states of america',
      us: 'united states of america',
      uk: 'united kingdom',
      'great britain': 'united kingdom',
      britain: 'united kingdom',
      'south korea': 'south korea',
      'north korea': 'north korea',
      'czech republic': 'czechia',
    }
    const countryColorFor = (name: string | undefined): string | null => {
      if (!name) return null
      const target = aliases[normalizeCountry(name)] ?? normalizeCountry(name)
      for (const [country, color] of Object.entries(countryColors)) {
        const key = aliases[normalizeCountry(country)] ?? normalizeCountry(country)
        if (key === target) return color
      }
      return null
    }

    for (const { city, movies } of cityGroups) {
      const baseColor = countryColorFor(city.country)
      const marker = leaflet.circleMarker([city.lat, city.lon], {
        radius: 4,
        color: baseColor ?? getMarkerOutline(theme),
        weight: 1.5,
        fillColor: baseColor
          ? mixHex(baseColor, '#ffffff', theme === 'dark' ? 0.22 : 0.32)
          : fallbackColor,
        fillOpacity: 1,
      })

      marker.bindTooltip(city.name, { direction: 'top', offset: [0, -4] })
      marker.bindPopup(buildCityPopup(city, movies), { closeButton: true })

      cityLayer.addLayer(marker)
    }
  }

  function filterByCountry(country: string) {
    if (!store.activeCountries.has(country)) store.toggleActiveCountry(country)
    map.closePopup()
    store.setActiveMovieId(null)
    ui.sidebarTab = 'results'
    // ui.sidebarOpen = true
  }

  function openCountryPanel(country: string) {
    map.closePopup()
    store.setActiveMovieId(null)
    ui.activeCountry = country
  }

  /**
   * Country marker popover: the shared `CountryPopup` component mounted into
   * the node Leaflet renders (Svelte owns the markup and actions).
   */
  function buildCountryPopup(country: string, movies: JellyfinItem[]): HTMLElement {
    const host = document.createElement('div')
    const instance = mount(CountryPopup, {
      target: host,
      props: {
        country,
        movies,
        onfilter: () => filterByCountry(country),
        onopen: () => openCountryPanel(country),
      },
    })
    popupInstances.push(instance)
    return host
  }

  function buildCityPopup(city: CityLocation, movies: string[]): string {
    const limit = 6
    const titles = movies
      .slice(0, limit)
      .map((title) => `<li>${escHtml(title)}</li>`)
      .join('')
    const remaining = Math.max(0, movies.length - limit)

    return `
      <div class="popup-content">
        <h3>${escHtml(city.name)}</h3>
        ${city.country ? `<div class="popup-label">${escHtml(city.country)}</div>` : ''}
        <p class="popup-note">${escHtml(m['map.cityNote']())}</p>
        <ul class="popup-titles">${titles}</ul>
        ${remaining > 0 ? `<p class="popup-more">${escHtml(m['map.moreMovies']({ n: remaining }))}</p>` : ''}
      </div>`
  }

  function escHtml(str: string) {
    if (!str) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
</script>

<div bind:this={mapContainer} class="map-wrapper"></div>

<style>
  .map-wrapper {
    position: fixed;
    inset: 0;
    z-index: 0;
    background: var(--bg);
  }

  .map-wrapper :global(.leaflet-tile-pane) {
    filter: var(--map-tile-filter, none);
  }

  .map-wrapper :global(.leaflet-popup-content-wrapper) {
    background: var(--card) !important;
    color: var(--text) !important;
    border-radius: 12px !important;
    border: 1px solid var(--border) !important;
    box-shadow: var(--shadow-panel) !important;
  }

  .map-wrapper :global(.leaflet-popup-content) {
    margin: 14px 16px;
    max-width: min(250px, calc(100vw - 80px));
  }

  .map-wrapper :global(.leaflet-popup-tip) {
    background: var(--card) !important;
  }

  .map-wrapper :global(.leaflet-popup-close-button) {
    color: var(--text-muted) !important;
    font-size: 18px !important;
    padding: 7px 7px 0 0 !important;
  }

  .map-wrapper :global(.popup-content h3) {
    font-size: 15px;
    font-weight: 700;
    margin: 0 22px 7px 0;
    color: var(--text);
  }

  .map-wrapper :global(.popup-label) {
    font-size: 11px;
    color: var(--text-muted);
  }

  .map-wrapper :global(.popup-note) {
    margin: 10px 0 8px;
    color: var(--text-muted);
    font-size: 10px;
    line-height: 1.45;
  }

  .map-wrapper :global(.popup-titles) {
    display: grid;
    gap: 3px;
    max-height: 112px;
    overflow-y: auto;
    padding-left: 16px;
    color: var(--text);
    font-size: 11px;
    line-height: 1.4;
  }

  .map-wrapper :global(.popup-titles li) {
    overflow-wrap: anywhere;
  }

  .map-wrapper :global(.popup-more) {
    margin: 5px 0 0;
    color: var(--text-muted);
    font-size: 10px;
  }

  .map-wrapper :global(.map-count-label) {
    background: transparent;
    border: none;
    box-shadow: none;
    color: #fff;
    font-family: inherit;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    padding: 0;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  }

  .map-wrapper :global(.map-count-label::before) {
    display: none;
  }

  .map-wrapper :global(path.country-focused) {
    filter: drop-shadow(0 0 6px var(--accent-glow));
  }

  .map-wrapper :global(.leaflet-control-zoom a) {
    background: var(--card) !important;
    color: var(--text) !important;
    border-color: var(--border) !important;
    transition: background 0.15s;
    width: 38px !important;
    height: 38px !important;
    line-height: 36px !important;
    font-size: 20px !important;
  }

  .map-wrapper :global(.leaflet-control-zoom a:hover) {
    background: var(--card-hover) !important;
  }

  .map-wrapper :global(.leaflet-control-attribution) {
    background: var(--panel-bg);
    color: var(--text-muted);
    border: 1px solid var(--border);
    border-radius: 6px 0 0;
    padding: 2px 6px;
    backdrop-filter: blur(8px);
  }

  .map-wrapper :global(.leaflet-control-attribution a) {
    color: var(--accent);
  }

  .map-wrapper :global(.leaflet-bottom.leaflet-right) {
    right: calc(12px + env(safe-area-inset-right, 0px));
    bottom: calc(var(--filters-h) + env(safe-area-inset-bottom, 0px));
  }

  .map-wrapper :global(.leaflet-top.leaflet-right) {
    top: calc(12px + env(safe-area-inset-top, 0px));
    right: calc(12px + env(safe-area-inset-right, 0px));
  }

  .map-wrapper :global(.leaflet-control-zoom) {
    border: 1px solid var(--border) !important;
    border-radius: 10px !important;
    overflow: hidden;
    box-shadow: var(--shadow-panel) !important;
  }

  .map-wrapper :global(.leaflet-control-zoom a:focus-visible) {
    outline: 3px solid var(--focus-ring) !important;
    outline-offset: 2px;
  }

  @media (max-width: 480px) {
    .map-wrapper :global(.leaflet-popup-content) {
      max-width: min(220px, calc(100vw - 72px));
    }

    .map-wrapper :global(.leaflet-control-attribution) {
      font-size: 9px;
    }
  }
</style>
