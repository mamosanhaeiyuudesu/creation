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

    <!-- 年度テーブル -->
    <div class="mt-6 overflow-x-auto">
      <table class="w-full text-xs border-collapse">
        <thead>
          <tr class="border-b border-slate-200">
            <th class="text-left py-2 px-3 text-slate-500 font-medium">年度</th>
            <th
              v-for="player in selectedPlayerList"
              :key="player.id"
              class="text-center py-2 px-3 font-medium whitespace-nowrap"
            >
              <span class="inline-flex items-center gap-1" :style="{ color: colors[player.id] }">
                {{ player.nameJa }}
                <a
                  :href="`https://search.yahoo.co.jp/search?p=${encodeURIComponent(player.nameJa + ' MLB')}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-slate-400 hover:text-slate-600 transition-colors"
                  title="Yahoo検索"
                  @click.stop
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9 3a6 6 0 100 12A6 6 0 009 3zM1 9a8 8 0 1114.32 4.906l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387A8 8 0 011 9z" clip-rule="evenodd"/>
                  </svg>
                </a>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="year in allYears"
            :key="year"
            class="border-b border-slate-100 hover:bg-slate-50"
          >
            <td class="py-2 px-3 font-medium text-slate-700">{{ year }}</td>
            <td
              v-for="player in selectedPlayerList"
              :key="player.id"
              class="py-2 px-3 text-center font-mono"
              :class="isOutOfRange(player.id, year) ? 'text-amber-600' : 'text-slate-700'"
            >
              {{ getYearlyValue(player.id, year) }}<span v-if="isOutOfRange(player.id, year)" class="text-[9px] align-top ml-0.5 opacity-70">※</span>
            </td>
          </tr>
          <!-- 通算行 -->
          <tr class="border-t-2 border-slate-300 bg-slate-50">
            <td class="py-2 px-3 font-bold text-slate-700">通算</td>
            <td
              v-for="player in selectedPlayerList"
              :key="player.id"
              class="py-2 px-3 text-center font-mono font-semibold text-slate-800"
            >
              {{ getCareerValue(player.id) }}
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="hasOutOfRange" class="mt-1 text-[10px] text-amber-600 opacity-80">※ グラフの表示範囲外の値</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { YearlyData } from '~/types/mlb'
import { PITCHER_PLAYERS, BATTER_PLAYERS, PITCHER_STATS, BATTER_STATS, PLAYER_COLORS } from '~/utils/japanese-mlb-player/players'

const props = defineProps<{
  selectedIds: string[]
  yearlyDataMap: Map<string, YearlyData>
  mode: 'pitcher' | 'batter' | 'mixed'
}>()

const chartEl = ref<HTMLDivElement>()
const selectedMetric = ref('era')
let chart: import('echarts').ECharts | null = null
const colors = PLAYER_COLORS

const activeMeta = computed(() =>
  props.mode === 'batter' ? BATTER_STATS : PITCHER_STATS
)

watch(() => props.mode, (mode) => {
  selectedMetric.value = mode === 'batter' ? 'avg' : 'era'
}, { immediate: true })

const selectedPlayerList = computed(() => {
  const all = [...PITCHER_PLAYERS, ...BATTER_PLAYERS]
  return props.selectedIds.map(id => all.find(p => p.id === id)).filter(Boolean) as typeof PITCHER_PLAYERS
})

const allYears = computed(() => {
  const years = new Set<number>()
  for (const id of props.selectedIds) {
    const d = props.yearlyDataMap.get(id)
    if (!d) continue
    const rows = props.mode === 'batter' ? d.yearlyBatter : d.yearlyPitcher
    rows.forEach(r => years.add(r.season))
  }
  return [...years].sort()
})

function getRawValue(playerId: string, year: number): number | null {
  const d = props.yearlyDataMap.get(playerId)
  if (!d) return null
  const rows = props.mode === 'batter' ? d.yearlyBatter : d.yearlyPitcher
  const row = rows.find(r => r.season === year)
  if (!row) return null
  return (row as Record<string, unknown>)[selectedMetric.value] as number | null
}

function isOutOfRange(playerId: string, year: number): boolean {
  const meta = activeMeta.value.find(m => m.key === selectedMetric.value)
  const val = getRawValue(playerId, year)
  if (val === null || !meta) return false
  if (meta.chartMax !== undefined && val > meta.chartMax) return true
  if (meta.chartMin !== undefined && val < meta.chartMin) return true
  return false
}

function getYearlyValue(playerId: string, year: number): string {
  const meta = activeMeta.value.find(m => m.key === selectedMetric.value)
  const val = getRawValue(playerId, year)
  if (val === null) return '—'
  return meta ? meta.format(val) : String(val)
}

function getCareerValue(playerId: string): string {
  const meta = activeMeta.value.find(m => m.key === selectedMetric.value)
  const d = props.yearlyDataMap.get(playerId)
  if (!d) return '—'
  const rows = props.mode === 'batter' ? d.yearlyBatter : d.yearlyPitcher
  const values = rows
    .map(r => (r as Record<string, unknown>)[selectedMetric.value] as number | null)
    .filter((v): v is number => v !== null)
  if (!values.length) return '—'
  if (meta?.counting) {
    const total = values.reduce((a, b) => a + b, 0)
    return meta.format(total)
  }
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  return meta ? meta.format(avg) : avg.toFixed(2)
}

const hasOutOfRange = computed(() =>
  allYears.value.some(year =>
    props.selectedIds.some(id => isOutOfRange(id, year))
  )
)

async function renderChart() {
  if (!chartEl.value) return
  const EC = await import('echarts')
  if (!chart) {
    chart = EC.init(chartEl.value, undefined, { renderer: 'svg' })
  }

  const meta = activeMeta.value.find(m => m.key === selectedMetric.value)
  const years = allYears.value
  if (!years.length) { chart.clear(); return }

  const rangeMin = meta?.chartMin
  const rangeMax = meta?.chartMax

  const series = props.selectedIds.map(id => {
    const player = [...PITCHER_PLAYERS, ...BATTER_PLAYERS].find(p => p.id === id)
    if (!player) return null

    const pts = years.map(y => {
      const raw = getRawValue(id, y)
      if (raw === null) return null
      const aboveMax = rangeMax !== undefined && raw > rangeMax
      const belowMin = rangeMin !== undefined && raw < rangeMin
      const clipped = aboveMax ? rangeMax! : belowMin ? rangeMin! : raw

      if (!aboveMax && !belowMin) {
        return { value: clipped, originalValue: raw }
      }
      return {
        value: clipped,
        originalValue: raw,
        symbol: 'triangle',
        symbolSize: 9,
        symbolRotate: aboveMax ? 0 : 180,
        itemStyle: { color: PLAYER_COLORS[id], borderColor: '#fff', borderWidth: 1.5 },
      }
    })

    return {
      name: player.nameJa,
      type: 'line',
      smooth: false,
      data: pts,
      lineStyle: { color: PLAYER_COLORS[id], width: 2 },
      itemStyle: { color: PLAYER_COLORS[id] },
      symbol: 'circle',
      symbolSize: 6,
      connectNulls: false,
    }
  }).filter(Boolean)

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown[]) => {
        const ps = params as Array<{ seriesName: string; value: number; color: string; axisValue: number; data: { originalValue?: number } | null }>
        const year = ps[0]?.axisValue ?? ''
        const lines = ps
          .filter(p => p.value !== null && p.value !== undefined)
          .map(p => {
            const raw = p.data?.originalValue ?? p.value
            const formatted = meta?.format(raw) ?? raw
            const outOfRange = p.data?.originalValue !== undefined && p.data.originalValue !== p.value
            const suffix = outOfRange ? ' <span style="opacity:.6;font-size:10px">圏外</span>' : ''
            return `<span style="color:${p.color}">●</span> ${p.seriesName}: <b>${formatted}</b>${suffix}`
          })
        return `<div class="text-xs">${year}年<br/>${lines.join('<br/>')}</div>`
      },
    },
    legend: {
      data: series.map(s => (s as { name: string }).name),
      textStyle: { fontSize: 11 },
      top: 0,
    },
    grid: { top: 40, right: 16, bottom: 40, left: 52 },
    xAxis: {
      type: 'category',
      data: years,
      axisLabel: { fontSize: 10, formatter: (v: number) => `${v}` },
    },
    yAxis: {
      type: 'value',
      inverse: meta?.direction === 'low',
      min: rangeMin,
      max: rangeMax,
      axisLabel: {
        fontSize: 10,
        formatter: (v: number) => {
          if (meta?.direction === 'low' && rangeMax !== undefined && v === rangeMax) return '圏外'
          if (meta?.direction === 'high' && rangeMin !== undefined && v === rangeMin) return '圏外'
          return meta?.format(v) ?? String(v)
        },
      },
    },
    series,
  }, true)
}

watch(
  [() => props.selectedIds, () => props.yearlyDataMap, selectedMetric],
  renderChart,
  { deep: true }
)

onMounted(renderChart)

onBeforeUnmount(() => {
  chart?.dispose()
  chart = null
})
</script>
