let loading: Promise<typeof import('echarts/core')> | null = null

/**
 * ECharts is loaded on demand (graph and timeline only) with tree-shaken
 * modules, so the initial bundle doesn't pay for it.
 */
export function loadEcharts(): Promise<typeof import('echarts/core')> {
  loading ??= (async () => {
    const [core, charts, components, renderers] = await Promise.all([
      import('echarts/core'),
      import('echarts/charts'),
      import('echarts/components'),
      import('echarts/renderers'),
    ])

    core.use([
      charts.GraphChart,
      charts.BarChart,
      components.TooltipComponent,
      components.LegendComponent,
      components.ToolboxComponent,
      components.AriaComponent,
      components.GridComponent,
      components.DataZoomComponent,
      renderers.CanvasRenderer,
    ])

    return core
  })()

  return loading
}
