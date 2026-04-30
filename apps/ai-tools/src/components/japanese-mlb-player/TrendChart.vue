<template>
  <div>
    <!-- 指標ピル -->
    <div class="flex flex-wrap gap-2 mb-4">
      <button
        v-for="stat in activeMeta"
        :key="stat.key"
        @click="selectedMetric = stat.key"
        class="px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150"
        :class="selectedMetric === stat.key
          ? 'bg-blue-600 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
      >{{ stat.label }}</button>
    </div>

    <!-- チャート -->
    <div ref="chartEl" class="w-full" style="height: 300px;" />

    <div v-if="!hasData" class="py-8 text-center text-slate-400 text-sm">
      データを読み込み中...
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SeasonData } from '~/types/mlb'
import { PITCHER_PLAYERS, BATTER_PLAYERS, PITCHER_STATS, BATTER_STATS, PLAYER_COLORS } from '~/utils/japanese-mlb-player/players'

const props = defineProps<{
  selectedIds: string[]
  seasonDataMap: Map<string, SeasonData>
  mode: 'pitcher' | 'batter' | 'mixed'
}>()

const chartEl = ref<HTMLDivElement>()
const selectedMetric = ref('era')
let chart: import('echarts').ECharts | null = null

const activeMeta = computed(() =>
  props.mode === 'batter' ? BATTER_STATS : PITCHER_STATS
)

watch(() => props.mode, (mode) => {
  selectedMetric.value = mode === 'batter' ? 'avg' : 'era'
}, { immediate: true })

const hasData = computed(() =>
  props.selectedIds.some(id => props.seasonDataMap.has(id))
)

function buildSeries() {
  const meta = activeMeta.value.find(m => m.key === selectedMetric.value)
  const rangeMin = meta?.chartMin
  const rangeMax = meta?.chartMax
  const color = (id: string) => PLAYER_COLORS[id]

  return props.selectedIds.map(id => {
    const data = props.seasonDataMap.get(id)
    const player = [...PITCHER_PLAYERS, ...BATTER_PLAYERS].find(p => p.id === id)
    if (!data || !player) return null

    const trend = props.mode === 'batter' ? data.trendBatter : data.trendPitcher
    const pts = trend
      .filter(d => (d as Record<string, unknown>)[selectedMetric.value] !== null)
      .map(d => {
        const raw = (d as Record<string, unknown>)[selectedMetric.value] as number
        const aboveMax = rangeMax !== undefined && raw > rangeMax
        const belowMin = rangeMin !== undefined && raw < rangeMin
        const clipped = aboveMax ? rangeMax! : belowMin ? rangeMin! : raw

        if (!aboveMax && !belowMin) {
          return { value: [d.date, clipped], originalValue: raw }
        }
        return {
          value: [d.date, clipped],
          originalValue: raw,
          symbol: 'triangle',
          symbolSize: 9,
          symbolRotate: aboveMax ? 0 : 180,
          itemStyle: { color: color(id), borderColor: '#fff', borderWidth: 1.5 },
        }
      })

    return {
      name: player.nameJa,
      type: 'line',
      smooth: true,
      data: pts,
      lineStyle: { color: color(id), width: 2 },
      itemStyle: { color: color(id) },
      symbol: 'circle',
      symbolSize: 5,
    }
  }).filter(Boolean)
}

async function renderChart() {
  if (!chartEl.value) return
  const EC = await import('echarts')
  if (!chartEl.value) return
  if (!chart) {
    chart = EC.init(chartEl.value, undefined, { renderer: 'svg' })
  }

  const meta = activeMeta.value.find(m => m.key === selectedMetric.value)
  const series = buildSeries()
  if (!series.length) return

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown[]) => {
        const ps = params as Array<{ seriesName: string; value: [string, number]; color: string; data: { originalValue?: number } }>
        const date = ps[0]?.value[0] ?? ''
        const lines = ps.map(p => {
          const raw = p.data?.originalValue ?? p.value[1]
          const formatted = meta?.format(raw) ?? raw
          const outOfRange = p.data?.originalValue !== undefined && p.data.originalValue !== p.value[1]
          const suffix = outOfRange ? ' <span style="opacity:.6;font-size:10px">圏外</span>' : ''
          return `<span style="color:${p.color}">●</span> ${p.seriesName}: <b>${formatted}</b>${suffix}`
        })
        return `<div class="text-xs">${date}<br/>${lines.join('<br/>')}</div>`
      },
    },
    legend: {
      data: series.map(s => (s as { name: string }).name),
      textStyle: { fontSize: 11 },
      top: 0,
    },
    grid: { top: Math.max(40, Math.ceil(series.length / 3) * 28), right: 16, bottom: 40, left: 52 },
    xAxis: {
      type: 'time',
      axisLabel: { fontSize: 10, formatter: (v: number) => new Date(v).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) },
    },
    yAxis: {
      type: 'value',
      inverse: meta?.direction === 'low',
      min: meta?.chartMin,
      max: meta?.chartMax,
      axisLabel: {
        fontSize: 10,
        formatter: (v: number) => {
          if (meta?.direction === 'low' && meta.chartMax !== undefined && v === meta.chartMax) return '圏外'
          if (meta?.direction === 'high' && meta.chartMin !== undefined && v === meta.chartMin) return '圏外'
          return meta?.format(v) ?? String(v)
        },
      },
    },
    series,
  }, true)
}

watch(
  [() => props.selectedIds, () => props.seasonDataMap, selectedMetric],
  renderChart,
  { deep: true }
)

onMounted(renderChart)

onBeforeUnmount(() => {
  chart?.dispose()
  chart = null
})
</script>
