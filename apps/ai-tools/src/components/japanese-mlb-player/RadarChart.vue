<template>
  <div class="relative" style="padding-right: 30px;">
    <div ref="chartEl" class="w-full" style="height: 500px;" />
    <div v-if="!hasData" class="py-8 text-center text-slate-400 text-sm">データを読み込み中...</div>

    <Teleport to="body">
      <!-- 指標ごとの全選手比較ツールチップ -->
      <div
        v-if="tooltip.visible"
        class="fixed z-50 pointer-events-none bg-white shadow-xl rounded-xl border border-slate-200 p-3 text-xs"
        :style="{
          left: tooltip.x + 'px',
          top: tooltip.y + 'px',
          transform: 'translate(-50%, calc(-100% - 12px))',
          minWidth: '210px',
          maxWidth: '290px',
        }"
      >
        <div class="font-bold text-slate-700 mb-1">{{ tooltip.axisLabel }}</div>
        <div class="text-slate-500 mb-2 pb-2 border-b border-slate-100 leading-relaxed">{{ tooltip.description }}</div>
        <div
          v-for="(item, idx) in tooltip.rankings"
          :key="item.id"
          class="flex items-center gap-1.5 py-0.5"
        >
          <span class="text-[10px] text-slate-400 w-3 text-right shrink-0">{{ idx + 1 }}</span>
          <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: item.color }"></span>
          <span class="flex-1 text-slate-700 min-w-0 truncate">{{ item.name }}</span>
          <span class="font-mono text-slate-800 font-bold shrink-0">{{ item.score.toFixed(1) }}</span>
          <span class="text-slate-400 text-[10px] shrink-0 ml-1">{{ item.source }}</span>
        </div>
      </div>
    </Teleport>
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

const tooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  axisLabel: '',
  description: '',
  rankings: [] as { id: string; name: string; color: string; score: number; source: string }[],
})


const radarData = computed(() =>
  props.selectedIds.flatMap(id => {
    const data = props.seasonDataMap.get(id)
    const player = PLAYERS.find(p => p.id === id)
    if (!data || !player) return []

    const stats = props.mode === 'batter' ? data.currentBatter : data.currentPitcher
    if (!stats) return []

    const values = axes.value.map(axis => axis.normalize(stats, player.role) ?? 0)
    return [{ id, name: player.nameJa, values, stats }]
  })
)

// ECharts option の center/radius と同じ比率でピクセル座標を計算
function getRadarGeometry() {
  if (!chartEl.value) return null
  const w = chartEl.value.clientWidth
  const h = chartEl.value.clientHeight
  const cx = w * 0.5
  const cy = h * 0.55
  // legend 分の高さを差し引いて半径を近似
  const r = Math.min(w * 0.9, (h - 24) * 0.9) * 0.62 / 2
  return { cx, cy, r }
}

// マウス位置の角度から最も近い軸インデックスを返す
function getNearestAxisIndex(mouseX: number, mouseY: number, cx: number, cy: number, n: number): number {
  const angle = Math.atan2(mouseY - cy, mouseX - cx)
  const angleStep = 2 * Math.PI / n
  let minDiff = Infinity
  let nearest = 0
  for (let i = 0; i < n; i++) {
    // axisAngle を [-π, π] に正規化してから差分を計算
    let axisAngle = -Math.PI / 2 - i * angleStep
    axisAngle = ((axisAngle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI
    let diff = Math.abs(angle - axisAngle)
    if (diff > Math.PI) diff = 2 * Math.PI - diff
    if (diff < minDiff) { minDiff = diff; nearest = i }
  }
  return nearest
}


function setupChartEvents() {
  if (!chart) return
  const zr = chart.getZr()

  zr.on('mousemove', (evt: any) => {
    if (!chartEl.value) return
    const geo = getRadarGeometry()
    if (!geo) { tooltip.value.visible = false; return }

    const { cx, cy, r } = geo
    // SVG renderer では offsetX/Y が子要素基準になるため clientX/Y を使う
    const native = evt.event as MouseEvent | undefined
    const rect = chartEl.value.getBoundingClientRect()
    const x = (native?.clientX ?? 0) - rect.left
    const y = (native?.clientY ?? 0) - rect.top
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)

    const data = radarData.value
    if (!data.length || dist < 5 || dist > r * 1.8) {
      tooltip.value.visible = false
      return
    }

    const currentAxes = axes.value
    const axisIdx = getNearestAxisIndex(x, y, cx, cy, currentAxes.length)
    const axis = currentAxes[axisIdx]

    const rankings = data
      .map(d => ({
        id: d.id,
        name: d.name,
        color: PLAYER_COLORS[d.id] ?? '#64748b',
        score: d.values[axisIdx],
        source: axis.formatSource(d.stats),
      }))
      .sort((a, b) => b.score - a.score)

    tooltip.value = { visible: true, x: native?.clientX ?? 0, y: native?.clientY ?? 0, axisLabel: axis.label, description: axis.description, rankings }
  })

  zr.on('mouseout', () => { tooltip.value.visible = false })
}

async function renderChart() {
  if (!chartEl.value) return
  const EC = await import('echarts')
  if (!chartEl.value) return
  if (!chart) {
    chart = EC.init(chartEl.value, undefined, { renderer: 'svg' })
    setupChartEvents()
  }

  const data = radarData.value
  const axesSnap = axes.value

  if (!data.length) {
    chart.setOption({
      graphic: [],
      tooltip: { show: false },
      radar: undefined,
      series: [],
      legend: undefined,
    }, true)
    return
  }

  const indicator = axesSnap.map(axis => ({ name: axis.label, max: 100 }))

  chart.setOption({
    tooltip: { show: false },
    legend: {
      data: data.map(d => d.name),
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
      data: data.map(d => ({
        name: d.name,
        value: d.values,
        itemStyle: { color: PLAYER_COLORS[d.id] ?? '#64748b' },
        lineStyle: { color: PLAYER_COLORS[d.id] ?? '#64748b', width: 2 },
        areaStyle: { color: PLAYER_COLORS[d.id] ?? '#64748b', opacity: 0.08 },
      })),
    }],
    graphic: [],
  }, true)
}

watch(
  [() => props.selectedIds, () => props.seasonDataMap, () => props.mode],
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
