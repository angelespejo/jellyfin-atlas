<script lang="ts">
  import { onMount } from 'svelte'
  import type { EChartsType } from 'echarts/core'
  import type { EChartsOption } from 'echarts'
  import * as m from '#i18n/messages.js'
  import { countryFlagEmoji, getMovieStore, ui } from '#core'
  import { countryLabel } from '../country-label'
  import { loadEcharts } from '../echarts'

  const store = getMovieStore()

  let container = $state<HTMLDivElement>()
  let chart: EChartsType | null = null
  let loading = $state(true)

  const data = $derived.by(() => {
    const years = new Map<number, { movies: number; series: number }>()
    const countriesByYear = new Map<number, Map<string, number>>()
    for (const movie of store.currentMovies) {
      const year = movie.ProductionYear
      if (!year) continue
      const entry = years.get(year) ?? { movies: 0, series: 0 }
      if (movie.Type === 'Series') entry.series += 1
      else if (movie.Type === 'Movie') entry.movies += 1
      else continue
      years.set(year, entry)

      const countries = countriesByYear.get(year) ?? new Map<string, number>()
      for (const country of store.getCountries(movie)) {
        countries.set(country, (countries.get(country) ?? 0) + 1)
      }
      countriesByYear.set(year, countries)
    }
    const sorted = [...years.entries()].sort(([yearA], [yearB]) => yearA - yearB)
    return {
      years: sorted.map(([year]) => String(year)),
      movies: sorted.map(([, entry]) => entry.movies),
      series: sorted.map(([, entry]) => entry.series),
      countriesByYear,
    }
  })

  function cssVar(name: string, fallback = ''): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
  }

  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function buildOption(): EChartsOption {
    const text = cssVar('--text', '#222936')
    const muted = cssVar('--text-muted', '#5c6676')
    const border = cssVar('--border', '#d8dee8')
    const card = cssVar('--card', '#ffffff')
    const accent = cssVar('--accent', '#713d86')
    const accentDim = cssVar('--accent-dim', 'rgba(113,61,134,.1)')
    const teal = cssVar('--teal', '#087d6b')
    const manyYears = data.years.length > 40

    return {
      backgroundColor: 'transparent',
      animationDuration: 350,
      animationDurationUpdate: 300,
      aria: { enabled: true, decal: { show: false } },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: card,
        borderColor: border,
        borderWidth: 1,
        padding: [9, 11],
        textStyle: { color: text, fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif" },
        extraCssText: 'border-radius:10px;box-shadow:0 10px 28px rgba(0,0,0,.18);',
        formatter: (params) => {
          const list = Array.isArray(params) ? params : [params]
          const year = list[0]?.name ?? ''
          const rows = list
            .map((item) => {
              const value = typeof item.value === 'number' ? item.value : 0
              return `<div style="display:flex;align-items:center;gap:6px"><span style="width:7px;height:7px;border-radius:50%;background:${item.color};display:inline-block"></span><span>${item.seriesName}</span><b style="margin-left:auto">${value}</b></div>`
            })
            .join('')
          const countryMap = data.countriesByYear.get(Number(year)) ?? new Map<string, number>()
          const countries = [...countryMap.entries()].sort(
            ([countryA, countA], [countryB, countB]) =>
              countB - countA || countryA.localeCompare(countryB)
          )
          const countryRows = countries
            .slice(0, 6)
            .map(([country, count]) => {
              const flag = countryFlagEmoji(country)
              return `<div style="display:flex;align-items:center;gap:6px"><span>${flag ?? ''} ${escapeHtml(countryLabel(country))}</span><b style="margin-left:auto">${count}</b></div>`
            })
            .join('')
          const remaining = countries.length - 6
          return `<div style="font-weight:700;margin-bottom:5px">${year}</div><div style="display:grid;gap:3px;min-width:190px">${rows}</div><div style="margin-top:7px;padding-top:6px;border-top:1px solid ${border};font-size:10px;color:${muted}">${m['timeline.countries']()}${countryRows ? `<div style="display:grid;gap:2px;margin-top:3px">${countryRows}${remaining > 0 ? `<span>+${remaining}</span>` : ''}</div>` : ''}</div>`
        },
      },
      legend: {
        top: 0,
        right: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 14,
        textStyle: { color: muted, fontSize: 11, fontFamily: "'Plus Jakarta Sans', sans-serif" },
      },
      grid: { left: 38, right: 18, top: 32, bottom: manyYears ? 62 : 40 },
      xAxis: {
        type: 'category',
        data: data.years,
        axisLabel: { color: muted, fontSize: 10, hideOverlap: true },
        axisLine: { lineStyle: { color: border } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: muted, fontSize: 10 },
        splitLine: { lineStyle: { color: border, opacity: 0.4 } },
      },
      dataZoom: manyYears
        ? [
            { type: 'inside', start: 55, end: 100 },
            {
              type: 'slider',
              height: 16,
              bottom: 8,
              borderColor: 'transparent',
              backgroundColor: 'transparent',
              fillerColor: accentDim,
              handleStyle: { color: accent },
              textStyle: { color: muted, fontSize: 9 },
              dataBackground: {
                lineStyle: { color: border },
                areaStyle: { color: border, opacity: 0.4 },
              },
            },
          ]
        : [],
      series: [
        {
          name: m['timeline.movies'](),
          type: 'bar',
          stack: 'titles',
          data: data.movies,
          barMaxWidth: 22,
          itemStyle: { color: accent, borderRadius: [3, 3, 0, 0] },
          emphasis: { focus: 'series' },
        },
        {
          name: m['timeline.series'](),
          type: 'bar',
          stack: 'titles',
          data: data.series,
          barMaxWidth: 22,
          itemStyle: { color: teal, borderRadius: [3, 3, 0, 0] },
          emphasis: { focus: 'series' },
        },
      ],
    }
  }

  function render() {
    if (!chart) return
    loading = true
    chart.setOption(buildOption(), { notMerge: true })
  }

  function handleClick(params: { componentType?: string; name?: string }) {
    if (params.componentType !== 'series' || !params.name) return
    const year = Number(params.name)
    if (!Number.isFinite(year)) return
    store.setYearRange([year, year])
  }

  onMount(() => {
    let disposed = false
    let observer: ResizeObserver | null = null

    loadEcharts().then((echarts) => {
      if (disposed || !container) return
      chart = echarts.init(container, undefined, { renderer: 'canvas' })
      chart.on('finished', () => {
        loading = false
      })
      chart.on('click', (params) =>
        handleClick(params as unknown as { componentType?: string; name?: string })
      )
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
    void data
    void ui.theme
    if (chart) render()
  })
</script>

<div class="timeline">
  <div class="timeline-canvas" bind:this={container}></div>
  {#if loading}
    <div class="timeline-loading">
      <i class="fas fa-spinner fa-pulse"></i>
      {m['timeline.loading']()}
    </div>
  {/if}
  {#if data.years.length === 0}
    <p class="timeline-empty">{m['timeline.empty']()}</p>
  {/if}
</div>

<style>
  .timeline {
    position: relative;
    flex: 1;
    min-height: 0;
  }

  .timeline-canvas {
    position: absolute;
    inset: 8px 10px 0;
  }

  .timeline-loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: var(--panel-bg);
    color: var(--text-muted);
    font-size: 12px;
    pointer-events: none;
  }

  .timeline-empty {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
    pointer-events: none;
  }

  @media (max-width: 768px) {
    .timeline-canvas {
      inset: 4px 4px 0;
    }
  }
</style>
