<script lang="ts">
  import { onMount } from 'svelte'
  import type { EChartsType } from 'echarts/core'
  import type { EChartsOption } from 'echarts'
  import * as m from '#i18n/messages.js'
  import { countryFlagEmoji, getMovieStore, ui } from '#core'
  import { countColor, countryColorMap } from '../chart-colors'
  import { countryLabel } from '../country-label'
  import { loadEcharts } from '../echarts'
  import Tooltip from '../tooltip.svelte'
  import ViewHeader from '../view-header.svelte'

  interface TitleNode {
    id: string
    movieId: string
    label: string
    type: string
    countries: string[]
  }

  interface CountryNodeData {
    id: string
    name: string
    kind: 'country'
    country: string
    category: number
    value: number
    symbolSize: number
    itemStyle: { color: string }
    label?: { show?: boolean; position?: 'top' | 'right' | 'left' | 'bottom'; fontSize?: number }
    x?: number
    y?: number
  }

  interface TitleNodeData {
    id: string
    name: string
    kind: 'title'
    movieId: string
    category: number
    symbolSize: number
    itemStyle: { color: string }
    label?: { show?: boolean; position?: 'top' | 'right' | 'left' | 'bottom'; fontSize?: number }
    x?: number
    y?: number
  }

  interface ChartClickParams {
    dataType?: string
    data?: CountryNodeData | TitleNodeData
    event?: { offsetX?: number; offsetY?: number }
  }

  const store = getMovieStore()

  let container = $state<HTMLDivElement>()
  let chart: EChartsType | null = null
  let loading = $state(true)
  const MIN_ZOOM = 0.2
  const MAX_ZOOM = 12

  let zoom = $state(1)
  let renderToken = 0
  let labelsOverride = $state<boolean | null>(null)
  let popover = $state<{ id: string; left: number; top: number; below: boolean } | null>(null)

  const graph = $derived.by(() => {
    const counts: Record<string, number> = {}
    const titles: TitleNode[] = []

    for (const movie of store.currentMovies) {
      const countries = [...new Set(store.getCountries(movie))]
      for (const country of countries) counts[country] = (counts[country] ?? 0) + 1
      titles.push({
        id: `title:${movie.Id}`,
        movieId: movie.Id,
        label: movie.Name,
        type: movie.Type ?? 'Movie',
        countries,
      })
    }

    const countryIds = Object.keys(counts).sort(
      (countryA, countryB) =>
        (counts[countryB] ?? 0) - (counts[countryA] ?? 0) || countryA.localeCompare(countryB)
    )

    const neighbors = countryIds.map(() => new Set<number>())
    const indexByCountry = new Map(countryIds.map((country, index) => [country, index]))
    for (const title of titles) {
      const indexes = title.countries
        .map((country) => indexByCountry.get(country))
        .filter((index): index is number => index !== undefined)
      for (let i = 0; i < indexes.length; i += 1) {
        for (let j = i + 1; j < indexes.length; j += 1) {
          neighbors[indexes[i]!]?.add(indexes[j]!)
          neighbors[indexes[j]!]?.add(indexes[i]!)
        }
      }
    }

    return {
      counts,
      countryIds,
      titles,
      titleById: new Map(titles.map((title) => [title.id, title])),
      connections: neighbors.map((set) => set.size),
      colors: countryColorMap(counts),
    }
  })

  const titleLabelsVisible = $derived(labelsOverride ?? graph.titles.length <= 300)

  function cssVar(name: string, fallback = ''): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
  }

  function escapeHtml(value: string): string {
    if (!value) return ''
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function stableHash(value: string): number {
    let result = 2166136261
    for (let index = 0; index < value.length; index += 1) {
      result ^= value.charCodeAt(index)
      result = Math.imul(result, 16777619)
    }
    return (result >>> 0) / 4294967295
  }

  function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
  }

  function initialZoom(): number {
    const total = graph.countryIds.length + graph.titles.length
    const width = container?.clientWidth || 1000
    if (total > 150) return width < 600 ? 0.8 : 1
    if (width < 600) return 0.42
    return 0.92
  }

  function buildOption(): EChartsOption {
    const text = cssVar('--text', '#222936')
    const muted = cssVar('--text-muted', '#5c6676')
    const border = cssVar('--border', '#d8dee8')
    const card = cssVar('--card', '#ffffff')
    const surface = cssVar('--surface', '#ffffff')
    const accent = cssVar('--accent', '#713d86')
    const teal = cssVar('--teal', '#087d6b')
    const maxCount = Math.max(1, ...Object.values(graph.counts))

    const categories = [
      { name: m['graph.category.countries'](), itemStyle: { color: accent } },
      { name: m['graph.category.movies'](), itemStyle: { color: muted } },
      { name: m['graph.category.series'](), itemStyle: { color: teal } },
    ]

    const countryNodes: CountryNodeData[] = graph.countryIds.map((country) => {
      const count = graph.counts[country] ?? 1
      return {
        id: `country:${country}`,
        name: countryLabel(country),
        kind: 'country',
        country,
        category: 0,
        value: count,
        symbolSize: 8 + Math.sqrt(count / maxCount) * 16,
        itemStyle: { color: graph.colors[country] ?? countColor(0) },
        label: { show: true, position: 'right', fontSize: 11 },
      }
    })

    const titleNodes: TitleNodeData[] = graph.titles.map((title) => ({
      id: title.id,
      name: title.label,
      kind: 'title',
      movieId: title.movieId,
      category: title.type === 'Series' ? 2 : 1,
      symbolSize: title.type === 'Series' ? 5.5 : 4,
      itemStyle: { color: title.type === 'Series' ? teal : muted },
      label: { show: titleLabelsVisible, position: 'top', fontSize: 9 },
    }))

    const links = graph.titles.flatMap((title) =>
      title.countries.map((country) => ({
        source: `country:${country}`,
        target: title.id,
      }))
    )

    const totalNodes = countryNodes.length + titleNodes.length
    const manyNodes = totalNodes > 60
    // ECharts force layout blocks the main thread on big libraries. Use the
    // deterministic radial layout beyond a small graph so the UI stays fluid.
    const useStaticLayout = totalNodes > 150
    const width = container?.clientWidth || 1000
    const height = container?.clientHeight || 700

    if (useStaticLayout) {
      const countryCount = Math.max(1, countryNodes.length)
      const ring = Math.min(width, height) * 0.35
      const countryPoints = new Map<string, { x: number; y: number }>()

      graph.countryIds.forEach((country, index) => {
        const angle = (index / countryCount) * Math.PI * 2 - Math.PI / 2
        const point =
          countryCount === 1
            ? { x: width / 2, y: height / 2 }
            : {
                x: width / 2 + Math.cos(angle) * ring,
                y: height / 2 + Math.sin(angle) * ring,
              }
        countryPoints.set(country, point)
      })

      for (const node of countryNodes) {
        const point = countryPoints.get(node.country)
        if (point) {
          node.x = point.x
          node.y = point.y
        }
      }

      const titleById = new Map(titleNodes.map((node) => [node.id, node]))
      for (const title of graph.titles) {
        const points = title.countries
          .map((country) => countryPoints.get(country))
          .filter((point): point is { x: number; y: number } => Boolean(point))
        if (points.length === 0) continue
        const centerX = points.reduce((sum, point) => sum + point.x, 0) / points.length
        const centerY = points.reduce((sum, point) => sum + point.y, 0) / points.length
        const angle = stableHash(title.id) * Math.PI * 2
        const radius = 16 + stableHash(`${title.id}:r`) * 62
        const node = titleById.get(title.id)
        if (!node) continue
        node.x = clamp(centerX + Math.cos(angle) * radius, 10, width - 10)
        node.y = clamp(centerY + Math.sin(angle) * radius, 10, height - 10)
      }
    }

    return {
      backgroundColor: 'transparent',
      animationDuration: 300,
      animationDurationUpdate: 260,
      aria: { enabled: true, decal: { show: false } },
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: card,
        borderColor: border,
        borderWidth: 1,
        padding: [9, 11],
        textStyle: { color: text, fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif" },
        extraCssText: 'border-radius:10px;box-shadow:0 10px 28px rgba(0,0,0,.18);',
        formatter: (params) => {
          const data = (params as { data?: CountryNodeData | TitleNodeData }).data
          if (!data || !('kind' in data)) return ''
          if (data.kind === 'country') {
            const index = graph.countryIds.indexOf(data.country)
            const flag = countryFlagEmoji(data.country)
            return `<div style="font-weight:700;margin-bottom:3px">${flag ? `${flag} ` : ''}${escapeHtml(countryLabel(data.country))}</div><div style="font-size:11px;color:${muted}">${graph.counts[data.country] ?? 0} ${m['graph.titles']()} · ${graph.connections[index] ?? 0} ${m['graph.links']()}</div>`
          }
          const title = graph.titleById.get(data.id)
          return `<div style="font-weight:700;margin-bottom:3px">${escapeHtml(data.name)}</div><div style="font-size:11px;color:${muted}">${title?.type === 'Series' ? m['type.series']() : m['type.movie']()} · ${escapeHtml(title?.countries.map(countryLabel).join(', ') ?? '')}</div>`
        },
      },
      legend: {
        data: categories.map((category) => category.name),
        bottom: 10,
        left: 'center',
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 14,
        textStyle: { color: muted, fontSize: 11, fontFamily: "'Plus Jakarta Sans', sans-serif" },
      },
      toolbox: {
        right: 12,
        bottom: 10,
        iconStyle: { borderColor: muted },
        emphasis: { iconStyle: { borderColor: text } },
        feature: {
          restore: { title: m['graph.reset']() },
          saveAsImage: {
            title: m['graph.saveImage'](),
            pixelRatio: 2,
            backgroundColor: surface,
          },
        },
      },
      series: [
        {
          type: 'graph',
          layout: useStaticLayout ? 'none' : 'force',
          force: useStaticLayout
            ? undefined
            : {
                repulsion: manyNodes ? 35 : 75,
                edgeLength: manyNodes ? [22, 65] : [28, 90],
                gravity: manyNodes ? 0.16 : 0.14,
                friction: 0.22,
                layoutAnimation: !manyNodes,
              },
          zoom: initialZoom(),
          roam: true,
          draggable: true,
          scaleLimit: { min: MIN_ZOOM, max: MAX_ZOOM },
          categories,
          data: [...countryNodes, ...titleNodes],
          links,
          label: {
            show: true,
            position: 'right',
            color: text,
            fontSize: 11,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            formatter: (params) => {
              const data = (params as { data?: CountryNodeData | TitleNodeData }).data
              return data?.name ?? ''
            },
          },
          labelLayout: { hideOverlap: true },
          emphasis: {
            focus: 'adjacency',
            label: { show: true, color: text },
            lineStyle: { opacity: 0.95, width: 2, color: accent },
          },
          lineStyle: { color: 'source', curveness: 0.08, opacity: 0.22, width: 1 },
          itemStyle: {
            borderColor: surface,
            borderWidth: 1.5,
            shadowBlur: 8,
            shadowColor: 'rgba(0,0,0,0.18)',
          },
        },
      ],
    }
  }

  function render() {
    if (!chart) return
    loading = true
    popover = null
    zoom = initialZoom()
    const token = ++renderToken
    // Let the loading overlay paint before ECharts computes the layout.
    requestAnimationFrame(() => {
      if (token !== renderToken || !chart) return
      chart.setOption(buildOption(), { notMerge: true })
    })
  }

  function openCountryPopover(country: string, offsetX: number, offsetY: number) {
    if (!container) return
    const rect = container.getBoundingClientRect()
    const margin = Math.min(130, rect.width / 2)
    const left = Math.min(Math.max(offsetX, margin), Math.max(margin, rect.width - margin))
    const below = offsetY < 190
    popover = { id: country, left, top: offsetY, below }
  }

  function handleClick(params: ChartClickParams) {
    if (params.dataType !== 'node' || !params.data) return
    chart?.dispatchAction({ type: 'hideTip' })

    if (params.data.kind === 'country') {
      openCountryPopover(
        params.data.country,
        params.event?.offsetX ?? 0,
        params.event?.offsetY ?? 0
      )
      return
    }

    popover = null
    ui.activeCountry = null
    ui.activePerson = null
    store.setActiveMovieId(params.data.movieId)
  }

  function filterCountry(country: string) {
    if (!store.activeCountries.has(country)) store.toggleActiveCountry(country)
    popover = null
    store.setActiveMovieId(null)
    ui.sidebarTab = 'results'
    ui.sidebarOpen = true
  }

  function openCountryPanel(country: string) {
    popover = null
    store.setActiveMovieId(null)
    ui.activeCountry = country
  }

  function zoomBy(factor: number) {
    if (!chart || !container) return
    const rect = container.getBoundingClientRect()
    const next = clamp(zoom * factor, MIN_ZOOM, MAX_ZOOM)
    chart.dispatchAction({
      type: 'graphRoam',
      seriesIndex: 0,
      zoom: next,
      originX: rect.width / 2,
      originY: rect.height / 2,
    })
    zoom = next
    popover = null
  }

  function toggleLabels() {
    labelsOverride = !titleLabelsVisible
  }

  function resetView() {
    chart?.dispatchAction({ type: 'restore' })
    zoom = 1
    popover = null
  }

  onMount(() => {
    let disposed = false
    let observer: ResizeObserver | null = null

    loadEcharts().then((echarts) => {
      if (disposed || !container) return
      chart = echarts.init(container, undefined, { renderer: 'canvas' })
      chart.on('click', (params) => handleClick(params as unknown as ChartClickParams))
      chart.on('dblclick', (params: unknown) => {
        const event = (params as { event?: { offsetX?: number; offsetY?: number } }).event
        const rect = container?.getBoundingClientRect()
        if (!rect) return
        const next = clamp(zoom * 1.35, MIN_ZOOM, MAX_ZOOM)
        chart?.dispatchAction({
          type: 'graphRoam',
          seriesIndex: 0,
          zoom: next,
          originX: event?.offsetX ?? rect.width / 2,
          originY: event?.offsetY ?? rect.height / 2,
        })
        zoom = next
        popover = null
      })
      chart.on('finished', () => {
        loading = false
      })
      chart.on('restore', () => {
        zoom = 1
      })
      chart.on('graphRoam', (params: unknown) => {
        const value = (params as { zoom?: unknown }).zoom
        if (typeof value === 'number') zoom = value
      })
      render()

      observer = new ResizeObserver(() => chart?.resize())
      observer.observe(container)
    })

    return () => {
      disposed = true
      observer?.disconnect()
      chart?.dispose()
      chart = null
    }
  })

  $effect(() => {
    // Track the data and theme, then refresh the chart option.
    void graph
    void ui.theme
    void titleLabelsVisible
    if (chart) render()
  })
</script>

<section class="graph-view" aria-label={m['view.graph']()}>
  <ViewHeader
    title={m['graph.title']()}
    subtitle={m['graph.subtitle']({
      countries: graph.countryIds.length,
      titles: graph.titles.length,
    })}
  >
    <span class="view-legend">{m['graph.legend']()}</span>
  </ViewHeader>

  <div class="graph-canvas">
    <div class="echarts-host" bind:this={container}></div>

    {#if loading}
      <div class="graph-loading">
        <i class="fas fa-spinner fa-pulse"></i>
        {m['graph.calculating']()}
      </div>
    {/if}

    {#if graph.countryIds.length === 0}
      <p class="view-empty">{m['graph.empty']()}</p>
    {/if}

    <div class="graph-controls">
      <button
        type="button"
        aria-label={m['graph.zoomIn']()}
        data-tooltip
        onclick={() => zoomBy(1.35)}
      >
        <i class="fas fa-plus"></i>
        <Tooltip label={m['graph.zoomIn']()} placement="left" />
      </button>
      <button
        type="button"
        aria-label={m['graph.zoomOut']()}
        data-tooltip
        onclick={() => zoomBy(1 / 1.35)}
      >
        <i class="fas fa-minus"></i>
        <Tooltip label={m['graph.zoomOut']()} placement="left" />
      </button>
      <button type="button" aria-label={m['graph.reset']()} data-tooltip onclick={resetView}>
        <i class="fas fa-expand"></i>
        <Tooltip label={m['graph.reset']()} placement="left" />
      </button>
      <button
        type="button"
        class:active={titleLabelsVisible}
        aria-label={m['graph.toggleLabels']()}
        aria-pressed={titleLabelsVisible}
        data-tooltip
        onclick={toggleLabels}
      >
        <i class="fas fa-tags"></i>
        <Tooltip label={m['graph.toggleLabels']()} placement="left" />
      </button>
      <span class="zoom-level">{Math.round(zoom * 100)}%</span>
    </div>

    {#if popover && graph.counts[popover.id] !== undefined}
      {@const country = popover.id}
      {@const index = graph.countryIds.indexOf(country)}
      <div
        class={['node-popover', { below: popover.below }]}
        style:left="{popover.left}px"
        style:top="{popover.top}px"
        role="dialog"
        aria-label={countryLabel(country)}
      >
        <h3>{countryLabel(country)}</h3>
        <div class="node-popover-stats">
          <span>
            <i class="fas fa-film"></i>
            <b>{graph.counts[country] ?? 0}</b>
            {(graph.counts[country] ?? 0) === 1 ? m['graph.titleOne']() : m['graph.titles']()}
          </span>
          <span>
            <i class="fas fa-link"></i>
            <b>{graph.connections[index] ?? 0}</b>
            {(graph.connections[index] ?? 0) === 1 ? m['graph.linkOne']() : m['graph.links']()}
          </span>
        </div>
        <div class="node-popover-actions">
          <button class="primary" onclick={() => filterCountry(country)}>
            <i class="fas fa-filter"></i>
            {m['country.filter']()}
          </button>
          <button class="ghost" onclick={() => openCountryPanel(country)}>
            <i class="fas fa-circle-info"></i>
            {m['country.openDialog']()}
          </button>
        </div>
      </div>
    {/if}
  </div>
</section>

<style>
  .graph-view {
    position: fixed;
    top: 0;
    left: var(--rail-w);
    right: 0;
    bottom: calc(var(--filters-h) + env(safe-area-inset-bottom, 0px));
    z-index: 5;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg);
    color: var(--text);
  }

  .view-legend {
    flex-shrink: 0;
    font-size: 10px;
    color: var(--text-muted);
    text-align: right;
    max-width: 360px;
  }

  .view-empty {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
    pointer-events: none;
  }

  .graph-canvas {
    position: relative;
    flex: 1;
    min-height: 0;
    /* margin: 12px 16px calc(16px + env(safe-area-inset-bottom, 0px)); */
    /* border: 1px solid var(--border); */
    border-radius: 14px;
    background:
      radial-gradient(circle at 50% 40%, var(--accent-dim), transparent 62%), var(--surface);
    overflow: hidden;
  }

  .echarts-host {
    position: absolute;
    inset: 0;
  }

  .graph-loading {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: var(--panel-bg);
    color: var(--text-muted);
    font-size: 12px;
    pointer-events: none;
  }

  .graph-controls {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .graph-controls button {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--card);
    color: var(--text-muted);
    font-size: 11px;
    font-family: inherit;
    cursor: pointer;
  }

  .graph-controls button:hover {
    color: var(--text);
    border-color: var(--text-muted);
  }

  .graph-controls button.active {
    background: var(--accent-dim);
    border-color: var(--accent);
    color: var(--accent);
  }

  .graph-controls button:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 2px;
  }

  .zoom-level {
    font-size: 9px;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .node-popover {
    position: absolute;
    z-index: 4;
    transform: translate(-50%, calc(-100% - 10px));
    width: 220px;
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--card);
    box-shadow: var(--shadow-panel);
  }

  .node-popover.below {
    transform: translate(-50%, 10px);
  }

  .node-popover h3 {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 6px;
    overflow-wrap: anywhere;
  }

  .node-popover-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 10px;
    font-size: 11px;
    color: var(--text-muted);
  }

  .node-popover-stats span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .node-popover-stats b {
    color: var(--text);
    font-size: 12px;
  }

  .node-popover-stats i {
    font-size: 10px;
    color: var(--accent);
  }

  .node-popover-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .node-popover-actions button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 30px;
    padding: 0 9px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-family: inherit;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }

  .node-popover-actions button.primary {
    background: var(--accent-strong);
    border-color: var(--accent-strong);
    color: #fff;
  }

  .node-popover-actions button.primary:hover {
    filter: brightness(1.08);
  }

  .node-popover-actions button.ghost:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .node-popover-actions button:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    .view-legend {
      display: none;
    }

    .graph-canvas {
      margin: 8px 10px calc(12px + env(safe-area-inset-bottom, 0px));
    }

    .node-popover {
      width: 200px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .graph-controls button {
      transition: none;
    }
  }
</style>
