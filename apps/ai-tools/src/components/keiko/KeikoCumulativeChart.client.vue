<script setup lang="ts">
interface CumulativeSeries { name: string; color: string; data: number[] }

const props = defineProps<{
  /** 横軸のラベル（月名など） */
  months: string[]
  /** メンバーごとの月別ポイント（累積前の生値。累積計算はこのコンポーネント内で行う） */
  series: CumulativeSeries[]
  height?: number
}>()

const chartEl = ref<HTMLDivElement>()
let chart: import('echarts/core').ECharts | null = null

// echarts をフルインポートすると本番で巨大チャンク群が一気にダウンロードされ、
// Cloudflare のレートリミット(1015)を誘発するため、折れ線に必要な部分だけを読み込む
async function loadECharts() {
  const [core, charts, components, renderers] = await Promise.all([
    import('echarts/core'),
    import('echarts/charts'),
    import('echarts/components'),
    import('echarts/renderers'),
  ])
  core.use([charts.LineChart, components.GridComponent, components.TooltipComponent, components.LegendComponent, renderers.SVGRenderer])
  return core
}

function accumulate(values: number[]): number[] {
  let sum = 0
  return values.map((v) => (sum += v ?? 0))
}

async function renderChart() {
  if (!chartEl.value) return
  const EC = await loadECharts()
  if (!chartEl.value) return
  if (!chart) chart = EC.init(chartEl.value, undefined, { renderer: 'svg' })

  const { months, series } = props
  if (!months.length || !series.length) {
    chart.clear()
    return
  }
  const viewSeries = series.map((s) => ({ ...s, data: accumulate(s.data) }))

  chart.setOption(
    {
      grid: { top: 28, left: 36, right: 12, bottom: 22 },
      legend: {
        top: 0,
        data: series.map((s) => s.name),
        textStyle: { color: '#7a7d8c', fontSize: 11 },
        itemWidth: 10,
        itemHeight: 10,
        icon: 'roundRect',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        // 既定は document.body へ直接追加され z-index が非常に高いため、他のポップアップより手前に居座ってしまう
        appendToBody: false,
        backgroundColor: '#ffffff',
        borderColor: '#e6e2d8',
        borderWidth: 1,
        textStyle: { color: '#23283a', fontSize: 12 },
        formatter: (params: any[]) => {
          const idx = params[0]?.dataIndex ?? 0
          const rows = params.map((p) => `${p.marker}${p.seriesName} <b>${p.value}</b>pt`).join('<br/>')
          return `<div>${months[idx] ?? ''}<br/>${rows}</div>`
        },
      },
      xAxis: {
        type: 'category',
        data: months,
        boundaryGap: false,
        axisLabel: { color: '#7a7d8c', fontSize: 10 },
        axisLine: { lineStyle: { color: '#e6e2d8' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#7a7d8c', fontSize: 10, formatter: '{value}pt' },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#f0ede4' } },
      },
      series: viewSeries.map((s) => ({
        name: s.name,
        type: 'line',
        smooth: false,
        symbol: 'circle',
        symbolSize: 5,
        showSymbol: viewSeries[0]?.data.length ? viewSeries[0].data.length <= 24 : true,
        lineStyle: { width: 2, color: s.color },
        itemStyle: { color: s.color },
        areaStyle: { color: s.color, opacity: 0.08 },
        data: s.data,
      })),
    },
    true
  )
}

watch(() => [props.months, props.series], () => nextTick(renderChart), { deep: true })

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
  <div ref="chartEl" class="w-full relative" :style="{ height: `${height ?? 220}px` }" />
</template>
