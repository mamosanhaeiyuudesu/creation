<script setup lang="ts">
interface WeekSeries { name: string; color: string; data: number[] }
interface ChartData { weekLabels: string[]; axisLabels: string[]; series: WeekSeries[] }

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

  const { weekLabels, axisLabels, series } = props.data

  chart.setOption({
    grid: { top: 28, left: 32, right: 8, bottom: 20 },
    legend: {
      top: 0,
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
        const idx = params[0]?.dataIndex ?? 0
        const rows = params.filter(p => p.value > 0).map(p => `${p.marker}${p.seriesName} ${p.value}h`).join('<br/>')
        const total = params.reduce((s, p) => s + (p.value ?? 0), 0)
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
    series: series.map(s => ({
      name: s.name,
      type: 'bar',
      stack: 'total',
      barMaxWidth: 28,
      data: s.data,
      itemStyle: { color: s.color },
    })),
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
