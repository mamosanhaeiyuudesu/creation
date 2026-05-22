<script setup lang="ts">
import type { FarmLogData } from '~/types/farm-log'

const props = defineProps<{
  data: FarmLogData
  highlightT: number | null
}>()

const emit = defineEmits<{
  hoverTime: [t: number | null]
}>()

const chartTopEl = ref<HTMLDivElement>()
const chartBottomEl = ref<HTMLDivElement>()
const chartThirdEl = ref<HTMLDivElement>()
let chartTop: import('echarts').ECharts | null = null
let chartBottom: import('echarts').ECharts | null = null
let chartThird: import('echarts').ECharts | null = null

function tToTime(t: number): string {
  const epochMs = new Date(props.data.meta.startTime).getTime() + t * 1000
  return new Date(epochMs).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  })
}

function buildTopOptions() {
  const { motion } = props.data
  const xLabels = motion.map(m => tToTime(m.t))

  return {
    backgroundColor: 'transparent',
    grid: { left: 56, right: 16, top: 12, bottom: 24 },
    xAxis: {
      type: 'category',
      data: xLabels,
      axisLabel: { color: '#9ca3af', fontSize: 11, interval: Math.floor(xLabels.length / 8) },
      axisLine: { lineStyle: { color: '#374151' } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#9ca3af', fontSize: 10 },
      splitLine: { lineStyle: { color: '#1f2937' } },
      min: 0,
    },
    dataZoom: [{ type: 'inside', start: 0, end: 100 }],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: '#6b7280', type: 'dashed' } },
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      textStyle: { color: '#f3f4f6', fontSize: 12 },
      formatter: (params: unknown) => {
        const ps = params as Array<{ axisValue: string; value: unknown }>
        if (!ps?.length) return ''
        const idx = props.data.motion.findIndex(m => tToTime(m.t) === ps[0].axisValue)
        if (idx >= 0) emit('hoverTime', props.data.motion[idx].t)
        const v = typeof ps[0].value === 'number' ? ps[0].value : null
        if (v === null) return ''
        return `<div style="font-size:11px;line-height:1.8">${ps[0].axisValue}<br>体動: ${v.toFixed(2)}</div>`
      },
    },
    series: [{
      type: 'line',
      data: motion.map(m => m.std),
      smooth: 0.3,
      symbol: 'none',
      lineStyle: { color: '#10b981', width: 1.5 },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(16,185,129,0.4)' },
            { offset: 1, color: 'rgba(16,185,129,0.02)' },
          ],
        },
      },
    }],
  }
}

function buildBottomOptions() {
  const { track } = props.data
  const xLabels = track.map(p => tToTime(p.t))

  return {
    backgroundColor: 'transparent',
    grid: { left: 56, right: 16, top: 36, bottom: 24 },
    legend: {
      top: 4,
      right: 16,
      textStyle: { color: '#9ca3af', fontSize: 11 },
      inactiveColor: '#4b5563',
      data: [
        { name: '歩行移動', itemStyle: { color: '#059669' } },
        { name: '車移動', itemStyle: { color: '#3b82f6' } },
      ],
    },
    xAxis: {
      type: 'category',
      data: xLabels,
      axisLabel: { color: '#9ca3af', fontSize: 11, interval: Math.floor(xLabels.length / 8) },
      axisLine: { lineStyle: { color: '#374151' } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { show: false },
      splitLine: { lineStyle: { color: '#1f2937' } },
      min: 0,
    },
    dataZoom: [{ type: 'inside', start: 0, end: 100 }],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: '#6b7280', type: 'dashed' } },
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      textStyle: { color: '#f3f4f6', fontSize: 12 },
      formatter: (params: unknown) => {
        const ps = params as Array<{ value: unknown; dataIndex: number; seriesName: string }>
        if (!ps?.length) return ''
        const p = track[ps[0].dataIndex]
        if (!p) return ''
        const active = ps.find(s => typeof s.value === 'number' && s.value > 0)
        if (!active) return ''
        return `<div style="font-size:11px;line-height:1.8">${tToTime(p.t)}<br>${active.seriesName}　${(active.value as number).toFixed(1)} m/s</div>`
      },
    },
    series: [
      {
        name: '歩行移動',
        type: 'bar',
        data: track.map(p => p.act !== 2 ? p.spd : null),
        itemStyle: { color: '#059669' },
        barMaxWidth: 4,
      },
      {
        name: '車移動',
        type: 'bar',
        data: track.map(p => p.act === 2 ? p.spd : null),
        itemStyle: { color: '#3b82f6' },
        barMaxWidth: 4,
      },
    ],
  }
}

function buildThirdOptions() {
  const { track, motion } = props.data
  const xLabels = motion.map(m => tToTime(m.t))

  // 速度がほぼ0のとき = 体動の強さ、移動中は0
  const data = motion.map((m, i) => {
    const p = track[i]
    return (!p || p.spd >= 0.5) ? 0 : m.std
  })

  return {
    backgroundColor: 'transparent',
    grid: { left: 56, right: 16, top: 12, bottom: 24 },
    xAxis: {
      type: 'category',
      data: xLabels,
      axisLabel: { color: '#9ca3af', fontSize: 11, interval: Math.floor(xLabels.length / 8) },
      axisLine: { lineStyle: { color: '#374151' } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#9ca3af', fontSize: 10 },
      splitLine: { lineStyle: { color: '#1f2937' } },
      min: 0,
    },
    dataZoom: [{ type: 'inside', start: 0, end: 100 }],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: '#6b7280', type: 'dashed' } },
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      textStyle: { color: '#f3f4f6', fontSize: 12 },
      formatter: (params: unknown) => {
        const ps = params as Array<{ axisValue: string; value: unknown; data: unknown }>
        if (!ps?.length) return ''
        // bar+itemStyleオブジェクト形式では value が object になる場合があるため安全に取り出す
        const raw = ps[0]?.value
        const v = typeof raw === 'number' ? raw
          : typeof (raw as any)?.value === 'number' ? (raw as any).value
          : null
        if (v === null) return ''
        if (v === 0) return `<div style="font-size:11px">${ps[0].axisValue}<br>移動中または静止</div>`
        return `<div style="font-size:11px;line-height:1.8">${ps[0].axisValue}<br>摘蕾推定強度: ${v.toFixed(2)}</div>`
      },
    },
    series: [{
      type: 'bar',
      data: data.map(v => ({
        value: v,
        itemStyle: {
          color: v >= 3 ? '#f59e0b'
            : v >= 1 ? 'rgba(245,158,11,0.55)'
            : 'rgba(245,158,11,0.15)',
        },
      })),
      barMaxWidth: 4,
    }],
  }
}

async function renderCharts() {
  const EC = await import('echarts')
  if (chartTopEl.value) {
    if (!chartTop) chartTop = EC.init(chartTopEl.value, undefined, { renderer: 'svg' })
    chartTop.setOption(buildTopOptions())
  }
  if (chartBottomEl.value) {
    if (!chartBottom) chartBottom = EC.init(chartBottomEl.value, undefined, { renderer: 'svg' })
    chartBottom.setOption(buildBottomOptions())
  }
  if (chartThirdEl.value) {
    if (!chartThird) chartThird = EC.init(chartThirdEl.value, undefined, { renderer: 'svg' })
    chartThird.setOption(buildThirdOptions())
  }
  EC.connect([chartTop!, chartBottom!, chartThird!].filter(Boolean) as import('echarts').ECharts[])
}

onMounted(() => renderCharts())
watch(() => props.data, () => renderCharts())

watch(() => props.highlightT, (t) => {
  if (!chartTop || t === null) return
  const idx = props.data.motion.findIndex(m => m.t === t)
  if (idx >= 0) chartTop.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: idx })
})

onUnmounted(() => {
  chartTop?.dispose(); chartTop = null
  chartBottom?.dispose(); chartBottom = null
  chartThird?.dispose(); chartThird = null
})
</script>

<template>
  <div class="space-y-4">
    <div class="bg-gray-800 rounded-xl p-4">
      <div class="text-xs text-gray-500 mb-1 space-y-0.5">
        <div>体の動きの激しさ — スマホ加速度センサーから算出。値が大きいほど活発に体を動かしていたことを示します。</div>
        <div class="text-gray-600">目安：1=ゆっくり歩く　3=農作業・手作業　5=早歩き　7.5=小走り相当</div>
      </div>
      <div ref="chartTopEl" class="w-full" style="height: 200px;" />
    </div>
    <div class="bg-gray-800 rounded-xl p-4">
      <div class="text-xs text-gray-500 mb-1">移動速度 — 凡例クリックで表示/非表示</div>
      <div ref="chartBottomEl" class="w-full" style="height: 180px;" />
    </div>
    <div class="bg-gray-800 rounded-xl p-4">
      <div class="text-xs text-gray-500 mb-1 space-y-0.5">
        <div>摘蕾推定 — <span class="text-amber-400">速度がほぼ0で体動が高い</span>時間帯を強調表示。その場で腕・体幹を動かして作業していた可能性が高い箇所です。</div>
        <div class="text-gray-600">強調度：高（濃い琥珀色）→ 低（薄い）。移動中は表示なし。</div>
      </div>
      <div ref="chartThirdEl" class="w-full" style="height: 180px;" />
    </div>
  </div>
</template>
