<script setup lang="ts">
import type { FarmLogData } from '~/types/farm-log'

const props = defineProps<{
  data: FarmLogData
  highlightT: number | null
}>()

const emit = defineEmits<{
  hoverTime: [t: number | null]
}>()

const chartMotionEl = ref<HTMLDivElement>()
// const chartGyroEl = ref<HTMLDivElement>()
const chartSpeedEl = ref<HTMLDivElement>()
const chartWorkEl = ref<HTMLDivElement>()
const chartAltEl = ref<HTMLDivElement>()
let chartMotion: import('echarts').ECharts | null = null
// let chartGyro: import('echarts').ECharts | null = null
let chartSpeed: import('echarts').ECharts | null = null
let chartWork: import('echarts').ECharts | null = null
let chartAlt: import('echarts').ECharts | null = null

// 全グラフ共有のズーム状態（EC.connect により全チャートが連動）
const isZoomed = ref(false)

function tToTime(t: number): string {
  const epochMs = new Date(props.data.meta.startTime).getTime() + t * 1000
  return new Date(epochMs).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  })
}

function commonXAxis(labels: string[]) {
  return {
    type: 'category' as const,
    data: labels,
    axisLabel: { color: '#9ca3af', fontSize: 11, interval: Math.floor(labels.length / 8) },
    axisLine: { lineStyle: { color: '#374151' } },
    splitLine: { show: false },
  }
}

function commonGrid(hasLegend = false) {
  return { left: 56, right: 16, top: hasLegend ? 36 : 12, bottom: 24 }
}

function commonTooltip() {
  return {
    trigger: 'axis' as const,
    axisPointer: { type: 'line' as const, lineStyle: { color: '#6b7280', type: 'dashed' as const } },
    backgroundColor: '#1f2937',
    borderColor: '#374151',
    textStyle: { color: '#f3f4f6', fontSize: 12 },
  }
}

function areaColor(hex: string, alphaTop = 0.4, alphaBottom = 0.02) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return {
    type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [
      { offset: 0, color: `rgba(${r},${g},${b},${alphaTop})` },
      { offset: 1, color: `rgba(${r},${g},${b},${alphaBottom})` },
    ],
  }
}

// ① 体の動きの激しさ（加速度）
function buildMotionOptions() {
  const { motion } = props.data
  const xLabels = motion.map(m => tToTime(m.t))
  return {
    backgroundColor: 'transparent',
    grid: commonGrid(),
    xAxis: commonXAxis(xLabels),
    yAxis: {
      type: 'value',
      axisLabel: { color: '#9ca3af', fontSize: 10 },
      splitLine: { lineStyle: { color: '#1f2937' } },
      min: 0,
    },
    dataZoom: [{ type: 'inside', start: 0, end: 100 }],
    tooltip: {
      ...commonTooltip(),
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
      areaStyle: { color: areaColor('#10b981') },
    }],
  }
}

// ② ジャイロ強度（回転速度）— 一時コメントアウト
// function buildGyroOptions() {
//   const { gyro } = props.data
//   const xLabels = gyro.map(g => tToTime(g.t))
//   return {
//     backgroundColor: 'transparent',
//     grid: commonGrid(),
//     xAxis: commonXAxis(xLabels),
//     yAxis: {
//       type: 'value',
//       axisLabel: { color: '#9ca3af', fontSize: 10, formatter: (v: number) => `${v}` },
//       splitLine: { lineStyle: { color: '#1f2937' } },
//       min: 0,
//     },
//     dataZoom: [{ type: 'inside', start: 0, end: 100 }],
//     tooltip: {
//       ...commonTooltip(),
//       formatter: (params: unknown) => {
//         const ps = params as Array<{ axisValue: string; value: unknown }>
//         if (!ps?.length) return ''
//         const v = typeof ps[0].value === 'number' ? ps[0].value : null
//         if (v === null) return ''
//         return `<div style="font-size:11px;line-height:1.8">${ps[0].axisValue}<br>回転速度: ${v.toFixed(2)} rad/s</div>`
//       },
//     },
//     series: [{
//       type: 'line',
//       data: gyro.map(g => g.rms),
//       smooth: 0.3,
//       symbol: 'none',
//       lineStyle: { color: '#a78bfa', width: 1.5 },
//       areaStyle: { color: areaColor('#a78bfa', 0.35) },
//     }],
//   }
// }

// ③ 移動速度
function buildSpeedOptions() {
  const { track } = props.data
  const xLabels = track.map(p => tToTime(p.t))
  return {
    backgroundColor: 'transparent',
    grid: commonGrid(true),
    legend: {
      top: 4, right: 16,
      textStyle: { color: '#9ca3af', fontSize: 11 },
      inactiveColor: '#4b5563',
      data: [
        { name: '歩行移動', itemStyle: { color: '#059669' } },
        { name: '車移動', itemStyle: { color: '#3b82f6' } },
      ],
    },
    xAxis: commonXAxis(xLabels),
    yAxis: {
      type: 'value',
      axisLabel: { show: false },
      splitLine: { lineStyle: { color: '#1f2937' } },
      min: 0,
    },
    dataZoom: [{ type: 'inside', start: 0, end: 100 }],
    tooltip: {
      ...commonTooltip(),
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

// ④ 手作業推定（静止中の体動）
function buildWorkOptions() {
  const { track, motion } = props.data
  const xLabels = motion.map(m => tToTime(m.t))
  const data = motion.map((m, i) => {
    const p = track[i]
    return (!p || p.spd >= 0.5) ? 0 : m.std
  })
  return {
    backgroundColor: 'transparent',
    grid: commonGrid(),
    xAxis: commonXAxis(xLabels),
    yAxis: {
      type: 'value',
      axisLabel: { color: '#9ca3af', fontSize: 10 },
      splitLine: { lineStyle: { color: '#1f2937' } },
      min: 0,
    },
    dataZoom: [{ type: 'inside', start: 0, end: 100 }],
    tooltip: {
      ...commonTooltip(),
      formatter: (params: unknown) => {
        const ps = params as Array<{ axisValue: string; value: unknown }>
        if (!ps?.length) return ''
        const raw = ps[0]?.value
        const v = typeof raw === 'number' ? raw
          : typeof (raw as any)?.value === 'number' ? (raw as any).value
          : null
        if (v === null) return ''
        if (v === 0) return `<div style="font-size:11px">${ps[0].axisValue}<br>移動中または静止</div>`
        return `<div style="font-size:11px;line-height:1.8">${ps[0].axisValue}<br>手作業推定強度: ${v.toFixed(2)}</div>`
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

// ⑤ 標高プロフィール
function buildAltOptions() {
  const { track } = props.data
  const xLabels = track.map(p => tToTime(p.t))
  const altValues = track.map(p => p.alt)
  const minAlt = Math.min(...altValues)
  const maxAlt = Math.max(...altValues)
  const padding = Math.max(2, Math.round((maxAlt - minAlt) * 0.1))
  return {
    backgroundColor: 'transparent',
    grid: commonGrid(),
    xAxis: commonXAxis(xLabels),
    yAxis: {
      type: 'value',
      axisLabel: { color: '#9ca3af', fontSize: 10, formatter: (v: number) => `${v}m` },
      splitLine: { lineStyle: { color: '#1f2937' } },
      min: minAlt - padding,
      max: maxAlt + padding,
    },
    dataZoom: [{ type: 'inside', start: 0, end: 100 }],
    tooltip: {
      ...commonTooltip(),
      formatter: (params: unknown) => {
        const ps = params as Array<{ axisValue: string; value: unknown }>
        if (!ps?.length) return ''
        const v = ps[0]?.value
        if (typeof v !== 'number') return ''
        return `<div style="font-size:11px;line-height:1.8">${ps[0].axisValue}<br>標高: ${v} m</div>`
      },
    },
    series: [{
      type: 'line',
      data: altValues,
      smooth: 0.4,
      symbol: 'none',
      lineStyle: { color: '#f97316', width: 1.5 },
      areaStyle: { color: areaColor('#f97316', 0.35) },
    }],
  }
}

function watchZoom(chart: import('echarts').ECharts) {
  chart.on('datazoom', (e: any) => {
    const { start, end, batch } = e
    const s = batch ? batch[0]?.start : start
    const en = batch ? batch[0]?.end : end
    isZoomed.value = !(s === 0 && en === 100)
  })
}

function resetZoom() {
  // EC.connect により1つにdispatchするだけで全グラフがリセットされる
  chartMotion?.dispatchAction({ type: 'dataZoom', start: 0, end: 100 })
  isZoomed.value = false
}

async function renderCharts() {
  const EC = await import('echarts')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const init = (el: HTMLDivElement | undefined, inst: import('echarts').ECharts | null, opts: any) => {
    if (!el) return inst
    if (!inst) {
      inst = EC.init(el, undefined, { renderer: 'svg' })
      watchZoom(inst)
    }
    inst.setOption(opts, true)
    return inst
  }
  chartMotion = init(chartMotionEl.value, chartMotion, buildMotionOptions())
  // chartGyro   = init(chartGyroEl.value,   chartGyro,   buildGyroOptions())
  chartSpeed  = init(chartSpeedEl.value,  chartSpeed,  buildSpeedOptions())
  chartWork   = init(chartWorkEl.value,   chartWork,   buildWorkOptions())
  chartAlt    = init(chartAltEl.value,    chartAlt,    buildAltOptions())
  EC.connect([chartMotion, chartSpeed, chartWork, chartAlt].filter(Boolean) as import('echarts').ECharts[])
}

onMounted(() => renderCharts())
watch(() => props.data, () => {
  isZoomed.value = false
  renderCharts()
})

watch(() => props.highlightT, (t) => {
  if (!chartMotion || t === null) return
  const idx = props.data.motion.findIndex(m => m.t === t)
  if (idx >= 0) chartMotion.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: idx })
})

onUnmounted(() => {
  chartMotion?.dispose(); chartMotion = null
  // chartGyro?.dispose();   chartGyro = null
  chartSpeed?.dispose();  chartSpeed = null
  chartWork?.dispose();   chartWork = null
  chartAlt?.dispose();    chartAlt = null
})
</script>

<template>
  <div class="space-y-4">
    <!-- ① 体の動きの激しさ -->
    <div class="bg-gray-800 rounded-xl p-4 relative">
      <div class="flex items-center gap-2 mb-1">
        <span class="inline-block w-3 h-3 rounded-sm bg-emerald-500 flex-shrink-0" />
        <span class="text-xs text-gray-400 font-medium">体の動きの激しさ</span>
        <button
          v-if="isZoomed"
          @click="resetZoom"
          class="ml-auto text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded transition-colors"
        >
          ズームリセット
        </button>
      </div>
      <div class="text-xs text-gray-600 mb-2">加速度センサー由来。目安：1=ゆっくり歩く　3=農作業・手作業　5=早歩き　7.5=小走り</div>
      <div ref="chartMotionEl" class="w-full" style="height: 160px;" />
    </div>

    <!-- ② ジャイロ強度 — コメントアウト -->
    <!--
    <div class="bg-gray-800 rounded-xl p-4 relative">
      <div class="flex items-center gap-2 mb-1">
        <span class="inline-block w-3 h-3 rounded-sm bg-violet-400 flex-shrink-0" />
        <span class="text-xs text-gray-400 font-medium">回転・方向転換の激しさ</span>
        <button v-if="isZoomed" @click="resetZoom" class="ml-auto text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded transition-colors">ズームリセット</button>
      </div>
      <div class="text-xs text-gray-600 mb-2">ジャイロスコープ由来（rad/s）。腕を回す・方向転換が多いほど高くなります。</div>
      <div ref="chartGyroEl" class="w-full" style="height: 160px;" />
    </div>
    -->

    <!-- ③ 移動速度 -->
    <div class="bg-gray-800 rounded-xl p-4 relative">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs text-gray-500">移動速度 — 凡例クリックで表示/非表示</span>
        <button
          v-if="isZoomed"
          @click="resetZoom"
          class="text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded transition-colors"
        >
          ズームリセット
        </button>
      </div>
      <div ref="chartSpeedEl" class="w-full" style="height: 160px;" />
    </div>

    <!-- ④ 手作業推定 -->
    <div class="bg-gray-800 rounded-xl p-4 relative">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs text-gray-500">
          手作業推定 — <span class="text-amber-400">速度がほぼ0で体動が高い</span>時間帯。移動中は表示なし。
        </span>
        <button
          v-if="isZoomed"
          @click="resetZoom"
          class="ml-2 flex-shrink-0 text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded transition-colors"
        >
          ズームリセット
        </button>
      </div>
      <div ref="chartWorkEl" class="w-full" style="height: 160px;" />
    </div>

    <!-- ⑤ 標高プロフィール -->
    <div class="bg-gray-800 rounded-xl p-4 relative">
      <div class="flex items-center gap-2 mb-1">
        <span class="inline-block w-3 h-3 rounded-sm bg-orange-500 flex-shrink-0" />
        <span class="text-xs text-gray-400 font-medium">標高プロフィール</span>
        <button
          v-if="isZoomed"
          @click="resetZoom"
          class="ml-auto text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded transition-colors"
        >
          ズームリセット
        </button>
      </div>
      <div class="text-xs text-gray-600 mb-2">GPS計測による高度の変化（誤差含む）</div>
      <div ref="chartAltEl" class="w-full" style="height: 140px;" />
    </div>
  </div>
</template>
