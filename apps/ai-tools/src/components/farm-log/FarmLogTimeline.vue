<script setup lang="ts">
import type { FarmLogData } from '~/types/farm-log'

const props = defineProps<{
  data: FarmLogData
  highlightT: number | null
}>()

const emit = defineEmits<{
  hoverTime: [t: number | null]
}>()

const chartEl = ref<HTMLDivElement>()
let chart: import('echarts').ECharts | null = null

const ACTIVITY_COLORS = ['#4b5563', '#059669', '#3b82f6'] // gray, emerald, blue

function tToTime(t: number): string {
  const epochMs = new Date(props.data.meta.startTime).getTime() + t * 1000
  return new Date(epochMs).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  })
}

function buildOptions() {
  const { track, motion } = props.data

  const xLabels = motion.map(m => tToTime(m.t))

  const intensityData = motion.map(m => m.std)
  const speedData = track.map(p => p.spd)
  const activityData = track.map(p => p.act)

  return {
    backgroundColor: 'transparent',
    grid: [
      { left: 48, right: 16, top: 16, bottom: '55%' },
      { left: 48, right: 16, top: '50%', bottom: 60 },
    ],
    xAxis: [
      {
        type: 'category',
        data: xLabels,
        gridIndex: 0,
        axisLabel: { show: false },
        axisLine: { lineStyle: { color: '#374151' } },
        splitLine: { show: false },
      },
      {
        type: 'category',
        data: xLabels,
        gridIndex: 1,
        axisLabel: { color: '#9ca3af', fontSize: 11, interval: Math.floor(xLabels.length / 8) },
        axisLine: { lineStyle: { color: '#374151' } },
        splitLine: { show: false },
      },
    ],
    yAxis: [
      {
        type: 'value',
        name: '体動強度',
        nameTextStyle: { color: '#9ca3af', fontSize: 11 },
        gridIndex: 0,
        axisLabel: { color: '#9ca3af', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1f2937' } },
        min: 0,
      },
      {
        type: 'value',
        name: '速度(m/s)',
        nameTextStyle: { color: '#9ca3af', fontSize: 11 },
        gridIndex: 1,
        axisLabel: { color: '#9ca3af', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1f2937' } },
        min: 0,
      },
    ],
    dataZoom: [
      { type: 'inside', xAxisIndex: [0, 1], start: 0, end: 100 },
      {
        type: 'slider',
        xAxisIndex: [0, 1],
        bottom: 8,
        height: 20,
        borderColor: '#374151',
        backgroundColor: '#111827',
        fillerColor: 'rgba(16,185,129,0.15)',
        handleStyle: { color: '#059669' },
        textStyle: { color: '#9ca3af' },
      },
    ],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: '#6b7280', type: 'dashed' } },
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      textStyle: { color: '#f3f4f6', fontSize: 12 },
      formatter: (params: unknown) => {
        const ps = params as Array<{ axisValue: string; value: number; seriesName: string }>
        if (!ps?.length) return ''
        const idx = motion.findIndex(m => tToTime(m.t) === ps[0].axisValue)
        if (idx >= 0) emit('hoverTime', motion[idx].t)
        const lines = ps.map(p => {
          if (p.seriesName === '体動強度') return `体動: ${p.value.toFixed(2)}`
          if (p.seriesName === '速度') return `速度: ${p.value.toFixed(1)} m/s`
          return ''
        }).filter(Boolean)
        return `<div style="font-size:11px;line-height:1.8">${ps[0].axisValue}<br>${lines.join('<br>')}</div>`
      },
    },
    series: [
      {
        name: '体動強度',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: intensityData,
        smooth: 0.3,
        symbol: 'none',
        lineStyle: { color: '#10b981', width: 1.5 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(16,185,129,0.4)' }, { offset: 1, color: 'rgba(16,185,129,0.02)' }] } },
      },
      {
        name: '速度',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: speedData.map((v, i) => ({
          value: v,
          itemStyle: { color: ACTIVITY_COLORS[activityData[i]] },
        })),
        barMaxWidth: 4,
      },
    ],
  }
}

async function renderChart() {
  if (!chartEl.value) return
  const EC = await import('echarts')
  if (!chartEl.value) return
  if (!chart) chart = EC.init(chartEl.value, undefined, { renderer: 'svg' })
  chart.setOption(buildOptions())
}

onMounted(() => renderChart())

watch(() => props.data, () => renderChart())

watch(() => props.highlightT, (t) => {
  if (!chart || t === null) return
  const idx = props.data.motion.findIndex(m => m.t === t)
  if (idx >= 0) chart.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: idx })
})

onUnmounted(() => { chart?.dispose(); chart = null })
</script>

<template>
  <div>
    <div class="text-xs text-gray-500 mb-2 px-1 flex gap-4">
      <span>上: 体動強度（加速度の分散）</span>
      <span>下: 移動速度（色＝活動種別）</span>
    </div>
    <div ref="chartEl" class="w-full" style="height: 340px;" />
  </div>
</template>
