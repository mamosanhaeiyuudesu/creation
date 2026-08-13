<script setup lang="ts">
interface WeekSeries { name: string; color: string; data: number[] }
interface ChartData { weekLabels: string[]; axisLabels: string[]; series: WeekSeries[]; firstThreeEffort?: number[] }

const props = defineProps<{
  data: ChartData
  height?: number
}>()

const chartEl = ref<HTMLDivElement>()
let chart: import('echarts/core').ECharts | null = null

// echarts をフルインポートすると本番で巨大チャンク群が一気にダウンロードされ、
// Cloudflare のレートリミット(1015)を誘発するため、積み上げ棒に必要な部分だけを読み込む
async function loadECharts() {
  const [core, charts, components, renderers] = await Promise.all([
    import('echarts/core'),
    import('echarts/charts'),
    import('echarts/components'),
    import('echarts/renderers'),
  ])
  core.use([
    charts.BarChart,
    charts.CustomChart,
    components.GridComponent,
    components.TooltipComponent,
    components.LegendComponent,
    renderers.SVGRenderer,
  ])
  return core
}

async function renderChart() {
  if (!chartEl.value) return
  const EC = await loadECharts()
  if (!chartEl.value) return
  if (!chart) chart = EC.init(chartEl.value, undefined, { renderer: 'svg' })

  const { weekLabels, axisLabels, series, firstThreeEffort } = props.data

  chart.setOption({
    grid: { top: 28, left: 32, right: 8, bottom: 20 },
    legend: {
      top: 0,
      data: series.map(s => s.name),
      textStyle: { color: '#94a3b8', fontSize: 10 },
      itemWidth: 10,
      itemHeight: 10,
      icon: 'roundRect',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#1e293b',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params: any[]) => {
        const barParams = params.filter(p => p.seriesType === 'bar')
        const idx = barParams[0]?.dataIndex ?? 0
        const rows = [...barParams].reverse().filter(p => p.value > 0).map(p => `${p.marker}${p.seriesName} ${p.value}h`).join('<br/>')
        const total = barParams.reduce((s, p) => s + (p.value ?? 0), 0)
        return `<b>${weekLabels[idx] ?? ''}</b><br/>${rows || '完了タスクなし'}<br/><b>合計 ${total}h</b>`
      },
    },
    xAxis: {
      type: 'category',
      data: axisLabels,
      axisLabel: { color: '#94a3b8', fontSize: 10 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8', fontSize: 10, formatter: '{value}h' },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: [
      ...series.map(s => ({
        name: s.name,
        type: 'bar',
        stack: 'total',
        barMaxWidth: 28,
        data: s.data,
        itemStyle: { color: s.color },
      })),
      {
        name: '先頭3ボード合計',
        type: 'custom',
        silent: true,
        z: 10,
        renderItem: (_params: any, api: any) => {
          const value = api.value(1)
          if (!value) return { type: 'group', children: [] }
          const point = api.coord([api.value(0), value])
          const halfWidth = 14
          return {
            type: 'line',
            shape: { x1: point[0] - halfWidth, y1: point[1], x2: point[0] + halfWidth, y2: point[1] },
            style: { stroke: '#ffffff', lineWidth: 1.5 },
          }
        },
        data: (firstThreeEffort ?? []).map((v, i) => [i, v]),
        tooltip: { show: false },
      },
    ],
  }, true)
}

watch(() => props.data, () => nextTick(renderChart), { deep: true })

let ro: ResizeObserver | null = null
onMounted(async () => {
  await renderChart()
  if (chartEl.value) {
    ro = new ResizeObserver(() => chart?.resize())
    ro.observe(chartEl.value)
  }
})
onBeforeUnmount(() => {
  ro?.disconnect()
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div ref="chartEl" class="w-full" :style="{ height: `${height ?? 182}px` }" />
</template>
