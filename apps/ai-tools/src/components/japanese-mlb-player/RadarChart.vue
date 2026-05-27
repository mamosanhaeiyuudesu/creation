<template>
  <div>
    <div ref="chartEl" class="w-full" style="height: 540px;" />
    <div v-if="!hasData" class="py-8 text-center text-slate-400 text-sm">データを読み込み中...</div>
  </div>
</template>

<script setup lang="ts">
import type { SeasonData } from '~/types/mlb'
import { PLAYERS, PITCHER_RADAR_AXES, BATTER_RADAR_AXES, PLAYER_COLORS } from '~/utils/japanese-mlb-player/players'

const props = defineProps<{
  selectedIds: string[]
  seasonDataMap: Map<string, SeasonData>
  mode: 'pitcher' | 'batter' | 'mixed'
}>()

const chartEl = ref<HTMLDivElement>()
let chart: import('echarts').ECharts | null = null

const axes = computed(() => props.mode === 'batter' ? BATTER_RADAR_AXES : PITCHER_RADAR_AXES)

const hasData = computed(() =>
  props.selectedIds.some(id => props.seasonDataMap.has(id))
)

function buildRadarData() {
  return props.selectedIds.flatMap(id => {
    const data = props.seasonDataMap.get(id)
    const player = PLAYERS.find(p => p.id === id)
    if (!data || !player) return []

    const stats = props.mode === 'batter' ? data.currentBatter : data.currentPitcher
    if (!stats) return []

    const values = axes.value.map(axis => axis.normalize(stats, player.role) ?? 0)
    return [{ id, name: player.nameJa, values, stats }]
  })
}

async function renderChart() {
  if (!chartEl.value) return
  const EC = await import('echarts')
  if (!chartEl.value) return
  if (!chart) {
    chart = EC.init(chartEl.value, undefined, { renderer: 'svg' })
  }

  const radarData = buildRadarData()

  if (!radarData.length) {
    chart.setOption({
      graphic: [{ type: 'text', left: 'center', top: 'middle', style: { text: '選手を選択してください', fill: '#94a3b8', fontSize: 14 } }],
      radar: undefined,
      series: [],
      legend: undefined,
    }, true)
    return
  }

  const indicator = axes.value.map(axis => ({ name: axis.label, max: 100 }))
  const axesSnap = axes.value

  chart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const d = radarData.find(r => r.name === params.name)
        if (!d) return params.name
        const lines = axesSnap.map((axis, i) => {
          const score = d.values[i].toFixed(1)
          const src = axis.formatSource(d.stats)
          return `<div style="white-space:nowrap">${axis.label}: <b>${score}</b> <span style="opacity:.55;font-size:10px">(${src})</span></div>`
        })
        return `<div style="font-size:12px"><b>${params.name}</b><br/>${lines.join('')}</div>`
      },
    },
    legend: {
      data: radarData.map(d => d.name),
      textStyle: { fontSize: 11 },
      top: 0,
    },
    radar: {
      indicator,
      shape: 'polygon',
      center: ['50%', '55%'],
      radius: '62%',
      nameGap: 8,
      name: { textStyle: { fontSize: 11, color: '#475569' } },
      splitLine: { lineStyle: { color: '#e2e8f0', width: 1 } },
      splitArea: { areaStyle: { color: ['rgba(241,245,249,0.6)', 'rgba(255,255,255,0)'] } },
      axisLine: { lineStyle: { color: '#cbd5e1' } },
    },
    series: [{
      type: 'radar',
      data: radarData.map(d => ({
        name: d.name,
        value: d.values,
        itemStyle: { color: PLAYER_COLORS[d.id] ?? '#64748b' },
        lineStyle: { color: PLAYER_COLORS[d.id] ?? '#64748b', width: 2 },
        areaStyle: { color: PLAYER_COLORS[d.id] ?? '#64748b', opacity: 0.08 },
      })),
    }],
  }, true)
}

watch(
  [() => props.selectedIds, () => props.seasonDataMap],
  renderChart,
  { deep: true },
)

let ro: ResizeObserver | null = null

onMounted(async () => {
  await renderChart()
  if (chartEl.value) {
    ro = new ResizeObserver(() => { chart?.resize() })
    ro.observe(chartEl.value)
  }
})

onBeforeUnmount(() => {
  ro?.disconnect()
  chart?.dispose()
  chart = null
})
</script>
