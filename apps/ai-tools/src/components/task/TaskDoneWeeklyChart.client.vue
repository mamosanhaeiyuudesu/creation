<script setup lang="ts">
interface WeekSeries { name: string; color: string; data: number[] }
interface ChartData { weekLabels: string[]; axisLabels: string[]; series: WeekSeries[]; firstThreeEffort?: number[] }

const props = defineProps<{
  data: ChartData
  height?: number
  /** true で「週ごと」ではなく期間の頭からの累積推移（積み上げ折れ線）にする */
  cumulative?: boolean
}>()

/** 週の棒（積み上げ区間）をクリックしたとき、weekLabels/axisLabels 上のインデックスを渡す */
const emit = defineEmits<{ (e: 'week-click', index: number): void }>()

const MARKER_NAME = '先頭3ボード合計'

const chartEl = ref<HTMLDivElement>()
let chart: import('echarts/core').ECharts | null = null

// echarts をフルインポートすると本番で巨大チャンク群が一気にダウンロードされ、
// Cloudflare のレートリミット(1015)を誘発するため、積み上げ棒／折れ線に必要な部分だけを読み込む
async function loadECharts() {
  const [core, charts, components, renderers] = await Promise.all([
    import('echarts/core'),
    import('echarts/charts'),
    import('echarts/components'),
    import('echarts/renderers'),
  ])
  core.use([
    charts.BarChart,
    charts.LineChart,
    charts.CustomChart,
    components.GridComponent,
    components.TooltipComponent,
    components.LegendComponent,
    renderers.SVGRenderer,
  ])
  return core
}

/** 先頭からの累計に変換（小数の誤差が出ないよう0.1単位に丸める） */
function accumulate(values: number[]): number[] {
  let sum = 0
  return values.map((v) => {
    sum += v ?? 0
    return Math.round(sum * 10) / 10
  })
}

async function renderChart() {
  if (!chartEl.value) return
  const EC = await loadECharts()
  if (!chartEl.value) return
  if (!chart) chart = EC.init(chartEl.value, undefined, { renderer: 'svg' })

  const { weekLabels, axisLabels, series, firstThreeEffort } = props.data
  const cumulative = props.cumulative === true
  const viewSeries = cumulative ? series.map(s => ({ ...s, data: accumulate(s.data) })) : series
  const markerData = cumulative ? accumulate(firstThreeEffort ?? []) : (firstThreeEffort ?? [])

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
      axisPointer: { type: cumulative ? 'line' : 'shadow' },
      // 既定は document.body へ直接追加され z-index が非常に高いため、ポップアップ（z-[200]）より
      // 手前に居座ってしまう。チャートのコンテナ内に留めて通常のスタッキング順に従わせる
      appendToBody: false,
      backgroundColor: '#1e293b',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params: any[]) => {
        const boardParams = params.filter(p => p.seriesName !== MARKER_NAME)
        const idx = boardParams[0]?.dataIndex ?? 0
        const rows = [...boardParams].reverse().filter(p => p.value > 0).map(p => `${p.marker}${p.seriesName} ${p.value}h`).join('<br/>')
        const total = Math.round(boardParams.reduce((s, p) => s + (p.value ?? 0), 0) * 10) / 10
        const empty = cumulative ? 'まだ完了タスクなし' : '完了タスクなし'
        return `<b>${weekLabels[idx] ?? ''}</b><br/>${rows || empty}<br/><b>${cumulative ? '累計' : '合計'} ${total}h</b>`
      },
    },
    xAxis: {
      type: 'category',
      data: axisLabels,
      boundaryGap: !cumulative,
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
      ...viewSeries.map(s => (cumulative
        ? {
            name: s.name,
            type: 'line',
            stack: 'total',
            symbol: 'circle',
            symbolSize: 4,
            showSymbol: (viewSeries[0]?.data.length ?? 0) <= 20,
            lineStyle: { width: 1.5, color: s.color },
            itemStyle: { color: s.color },
            areaStyle: { color: s.color, opacity: 0.25 },
            data: s.data,
          }
        : {
            name: s.name,
            type: 'bar',
            stack: 'total',
            barMaxWidth: 28,
            data: s.data,
            itemStyle: { color: s.color },
          })),
      cumulative
        ? {
            // 累積では棒の上のヒゲが描けないので、白い破線で先頭3ボードの累計を重ねる
            name: MARKER_NAME,
            type: 'line',
            silent: true,
            z: 10,
            symbol: 'none',
            lineStyle: { color: '#ffffff', width: 1.5, type: 'dashed' },
            itemStyle: { color: '#ffffff' },
            data: markerData,
            tooltip: { show: false },
          }
        : {
            name: MARKER_NAME,
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
            data: markerData.map((v, i) => [i, v]),
            tooltip: { show: false },
          },
    ],
  }, true)

  // 週の棒（マーカー用の透明シリーズは除く）をクリックしたら親に通知する
  chart.off('click')
  chart.on('click', (params: any) => {
    if (params.seriesName === MARKER_NAME || typeof params.dataIndex !== 'number') return
    // タップ操作だとツールチップが出しっぱなしのままポップアップが開いてしまうため、開く前に閉じる
    chart?.dispatchAction({ type: 'hideTip' })
    emit('week-click', params.dataIndex)
  })
}

watch(() => [props.data, props.cumulative], () => nextTick(renderChart), { deep: true })

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
  <div ref="chartEl" class="w-full relative" :style="{ height: `${height ?? 182}px` }" />
</template>
