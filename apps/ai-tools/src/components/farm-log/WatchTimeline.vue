<script setup lang="ts">
import type { WatchLogData } from '~/types/farm-log'

const props = defineProps<{
  data: WatchLogData
  highlightT: number | null
}>()

const emit = defineEmits<{
  hoverTime: [t: number | null]
}>()

const chartActEl    = ref<HTMLDivElement>()
const chartHrEl     = ref<HTMLDivElement>()
const chartMotionEl = ref<HTMLDivElement>()
const chartPitchEl  = ref<HTMLDivElement>()

let chartAct:    import('echarts').ECharts | null = null
let chartHr:     import('echarts').ECharts | null = null
let chartMotion: import('echarts').ECharts | null = null
let chartPitch:  import('echarts').ECharts | null = null

const isZoomed = ref(false)

const ACT_COLOR: Record<string, string> = {
  stationary: '#f59e0b',
  walking:    '#059669',
  cycling:    '#3b82f6',
  unknown:    '#94a3b8',
}
const ACT_LABEL: Record<string, string> = {
  stationary: '定点作業',
  walking:    '歩行',
  cycling:    '農機/車',
  unknown:    '不明',
}

function tToTime(t: number): string {
  const epochMs = new Date(props.data.meta.startTime).getTime() + t * 1000
  return new Date(epochMs).toLocaleTimeString('ja-JP', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'Asia/Tokyo',
  })
}

function commonGrid(extra: object = {}) {
  return { left: 56, right: 24, top: 12, bottom: 24, ...extra }
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

function commonXAxis(labels: string[]) {
  return {
    type: 'category' as const,
    data: labels,
    axisLabel: { color: '#9ca3af', fontSize: 10, interval: Math.floor(labels.length / 6) },
    axisLine: { lineStyle: { color: '#374151' } },
    splitLine: { show: false },
  }
}

// ────────────────────────────────────────
// ② 活動フロータイムライン（活動バー + 心拍オーバーレイ）
// ────────────────────────────────────────
function buildActOptions() {
  const { track, hr } = props.data

  // 10sバケットのラベルを track から生成
  const labels = track.map(p => tToTime(p.t))

  // 心拍を track の t に対応させる（最も近い直前の値を使用）
  const hrMap = new Map<number, number>()
  for (const h of hr) hrMap.set(h.t, h.bpm)
  const hrByTrack = track.map(p => {
    // p.t 以下の最大 t で HR を探す
    let bpm = null as number | null
    for (const h of hr) {
      if (h.t <= p.t) bpm = h.bpm
    }
    return bpm
  })

  return {
    backgroundColor: 'transparent',
    grid: commonGrid({ top: 16 }),
    xAxis: commonXAxis(labels),
    yAxis: [
      {
        type: 'value' as const,
        min: 0, max: 1.2,
        axisLabel: { show: false },
        splitLine: { show: false },
      },
      {
        type: 'value' as const,
        min: 30, max: 160,
        position: 'right' as const,
        axisLabel: { color: '#9ca3af', fontSize: 10, formatter: (v: number) => `${v}` },
        splitLine: { show: false },
      },
    ],
    dataZoom: [{ type: 'inside', start: 0, end: 100 }],
    tooltip: {
      ...commonTooltip(),
      formatter: (params: unknown) => {
        const ps = params as Array<{ dataIndex: number; value: unknown; seriesName: string }>
        if (!ps?.length) return ''
        const idx = ps[0].dataIndex
        const p   = track[idx]
        if (!p) return ''
        const bpm = hrByTrack[idx]
        const act = ACT_LABEL[p.act] ?? p.act
        emit('hoverTime', p.t)
        return `<div style="font-size:11px;line-height:1.8">
          ${tToTime(p.t)}<br>
          活動: <span style="color:${ACT_COLOR[p.act] ?? '#fff'}">${act}</span><br>
          ${bpm !== null ? `心拍: <b style="color:#fb923c">${bpm} BPM</b>` : ''}
        </div>`
      },
    },
    series: [
      // 活動バー（活動タイプごとに色付き）
      {
        type: 'bar',
        yAxisIndex: 0,
        data: track.map(p => ({
          value: 1,
          itemStyle: { color: ACT_COLOR[p.act] ?? ACT_COLOR.unknown, opacity: 0.75 },
        })),
        barWidth: '100%',
        barMaxWidth: 100,
      },
      // 心拍オーバーレイ（右y軸）
      {
        name: '心拍数',
        type: 'line',
        yAxisIndex: 1,
        data: hrByTrack,
        connectNulls: true,
        smooth: 0.4,
        symbol: 'none',
        lineStyle: { color: '#fb923c', width: 2 },
      },
    ],
  }
}

// ────────────────────────────────────────
// ③ 身体負荷グラフ（心拍数 + 負荷ゾーン）
// ────────────────────────────────────────
function buildHrOptions() {
  const { hr } = props.data
  if (hr.length === 0) return null
  const labels = hr.map(h => tToTime(h.t))
  const bpms   = hr.map(h => h.bpm)

  // HR 負荷ゾーンの markArea
  const zones = [
    { name: '安静',    yMin: 0,   yMax: 60,  color: 'rgba(100,116,139,0.12)' },
    { name: '軽度',    yMin: 60,  yMax: 100, color: 'rgba(16,185,129,0.10)'  },
    { name: '中程度',  yMin: 100, yMax: 130, color: 'rgba(245,158,11,0.13)'  },
    { name: '高負荷',  yMin: 130, yMax: 160, color: 'rgba(239,68,68,0.15)'   },
  ]

  return {
    backgroundColor: 'transparent',
    grid: commonGrid({ top: 20 }),
    xAxis: {
      type: 'category' as const,
      data: labels,
      axisLabel: { color: '#9ca3af', fontSize: 10, interval: Math.floor(labels.length / 6) },
      axisLine: { lineStyle: { color: '#374151' } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value' as const,
      min: 40, max: 160,
      axisLabel: { color: '#9ca3af', fontSize: 10, formatter: (v: number) => `${v}` },
      splitLine: { lineStyle: { color: '#1f2937' } },
    },
    dataZoom: [{ type: 'inside', start: 0, end: 100 }],
    tooltip: {
      ...commonTooltip(),
      formatter: (params: unknown) => {
        const ps = params as Array<{ axisValue: string; value: unknown }>
        if (!ps?.length) return ''
        const v = ps[0]?.value
        if (typeof v !== 'number') return ''
        const zone = zones.slice().reverse().find(z => v >= z.yMin)
        return `<div style="font-size:11px;line-height:1.8">${ps[0].axisValue}<br>心拍数: <b style="color:#fb923c">${v} BPM</b>${zone ? `<br>負荷: ${zone.name}` : ''}</div>`
      },
    },
    series: [
      {
        type: 'line',
        data: bpms,
        smooth: 0.4,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: '#fb923c', width: 2 },
        itemStyle: { color: '#fb923c' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(251,146,60,0.35)' },
              { offset: 1, color: 'rgba(251,146,60,0.02)' },
            ],
          },
        },
        markArea: {
          silent: true,
          data: zones.map(z => [
            { yAxis: z.yMin, itemStyle: { color: z.color, borderWidth: 0 } },
            { yAxis: z.yMax },
          ]),
        },
        markLine: {
          silent: true,
          symbol: 'none',
          data: zones.map(z => ({
            yAxis: z.yMax,
            lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed', width: 1 },
            label: { show: z.yMax < 160, formatter: z.name, color: '#6b7280', fontSize: 9, position: 'end' },
          })),
        },
      },
    ],
  }
}

// ────────────────────────────────────────
// ④ 動作分類ダッシュボード（加速度強度 + ピッチ角）
// ────────────────────────────────────────
function buildMotionOptions() {
  const { motion } = props.data
  const labels = motion.map(m => tToTime(m.t))
  return {
    backgroundColor: 'transparent',
    legend: {
      top: 4, right: 16,
      textStyle: { color: '#9ca3af', fontSize: 10 },
      inactiveColor: '#4b5563',
      data: [
        { name: '体動強度', itemStyle: { color: '#10b981' } },
        { name: '最大加速度', itemStyle: { color: '#34d399' } },
      ],
    },
    grid: commonGrid({ top: 32 }),
    xAxis: commonXAxis(labels),
    yAxis: {
      type: 'value' as const,
      min: 0,
      axisLabel: { color: '#9ca3af', fontSize: 10 },
      splitLine: { lineStyle: { color: '#1f2937' } },
    },
    dataZoom: [{ type: 'inside', start: 0, end: 100 }],
    tooltip: {
      ...commonTooltip(),
      formatter: (params: unknown) => {
        const ps = params as Array<{ dataIndex: number; seriesName: string; value: unknown }>
        if (!ps?.length) return ''
        const m = motion[ps[0].dataIndex]
        if (!m) return ''
        emit('hoverTime', m.t)
        return `<div style="font-size:11px;line-height:1.8">
          ${tToTime(m.t)}<br>
          体動強度: <b style="color:#10b981">${m.std.toFixed(2)}</b><br>
          平均: ${m.mean.toFixed(2)} / 最大: ${m.max.toFixed(2)}<br>
          目安: 1=ゆっくり 3=農作業 5=早歩き
        </div>`
      },
    },
    series: [
      {
        name: '体動強度',
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
      },
      {
        name: '最大加速度',
        type: 'line',
        data: motion.map(m => m.max),
        smooth: 0.3,
        symbol: 'none',
        lineStyle: { color: '#34d399', width: 1, type: 'dashed' },
      },
    ],
  }
}

function buildPitchOptions() {
  const { motion } = props.data
  const labels = motion.map(m => tToTime(m.t))
  return {
    backgroundColor: 'transparent',
    grid: commonGrid(),
    xAxis: commonXAxis(labels),
    yAxis: {
      type: 'value' as const,
      axisLabel: {
        color: '#9ca3af', fontSize: 10,
        formatter: (v: number) => `${(v * 180 / Math.PI).toFixed(0)}°`,
      },
      splitLine: { lineStyle: { color: '#1f2937' } },
    },
    dataZoom: [{ type: 'inside', start: 0, end: 100 }],
    tooltip: {
      ...commonTooltip(),
      formatter: (params: unknown) => {
        const ps = params as Array<{ dataIndex: number; value: unknown }>
        if (!ps?.length) return ''
        const m = motion[ps[0].dataIndex]
        if (!m) return ''
        const deg = (m.pitch * 180 / Math.PI).toFixed(1)
        return `<div style="font-size:11px;line-height:1.8">${tToTime(m.t)}<br>ピッチ角: <b style="color:#a78bfa">${deg}°</b><br>（前傾：大きいほど腰を曲げた姿勢）</div>`
      },
    },
    series: [{
      type: 'line',
      data: motion.map(m => m.pitch),
      smooth: 0.3,
      symbol: 'none',
      lineStyle: { color: '#a78bfa', width: 1.5 },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(167,139,250,0.35)' },
            { offset: 1, color: 'rgba(167,139,250,0.02)' },
          ],
        },
      },
      markLine: {
        silent: true,
        symbol: 'none',
        data: [{ yAxis: 0, lineStyle: { color: 'rgba(255,255,255,0.15)', width: 1 } }],
      },
    }],
  }
}

function watchZoom(chart: import('echarts').ECharts) {
  chart.on('datazoom', (e: unknown) => {
    const ev = e as { start?: number; end?: number; batch?: Array<{ start: number; end: number }> }
    const s  = ev.batch ? ev.batch[0]?.start : ev.start
    const en = ev.batch ? ev.batch[0]?.end   : ev.end
    isZoomed.value = !(s === 0 && en === 100)
  })
}

function resetZoom() {
  chartAct?.dispatchAction({ type: 'dataZoom', start: 0, end: 100 })
  isZoomed.value = false
}

async function renderCharts() {
  const EC = await import('echarts')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const init = (el: HTMLDivElement | undefined, inst: import('echarts').ECharts | null, opts: any) => {
    if (!el || !opts) return inst
    if (!inst) { inst = EC.init(el, undefined, { renderer: 'svg' }); watchZoom(inst) }
    inst.setOption(opts, true)
    return inst
  }
  chartAct    = init(chartActEl.value,    chartAct,    buildActOptions())
  chartHr     = init(chartHrEl.value,     chartHr,     buildHrOptions())
  chartMotion = init(chartMotionEl.value, chartMotion, buildMotionOptions())
  chartPitch  = init(chartPitchEl.value,  chartPitch,  buildPitchOptions())

  EC.connect([chartAct, chartHr, chartMotion, chartPitch].filter(Boolean) as import('echarts').ECharts[])
}

onMounted(() => renderCharts())
watch(() => props.data, () => { isZoomed.value = false; renderCharts() })

onUnmounted(() => {
  chartAct?.dispose();    chartAct    = null
  chartHr?.dispose();     chartHr     = null
  chartMotion?.dispose(); chartMotion = null
  chartPitch?.dispose();  chartPitch  = null
})
</script>

<template>
  <div class="space-y-4">

    <!-- ② 活動フロータイムライン -->
    <div class="bg-gray-800 rounded-xl p-4">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-3 flex-wrap">
          <span class="text-xs text-gray-400 font-medium">活動フロー &amp; 心拍数</span>
          <div class="flex items-center gap-2 flex-wrap">
            <span v-for="[act, color] in Object.entries({ stationary: '#f59e0b', walking: '#059669', cycling: '#3b82f6', unknown: '#94a3b8' })" :key="act" class="flex items-center gap-1 text-[10px] text-gray-500">
              <span class="w-2 h-2 rounded-sm" :style="{ background: color }" />{{ { stationary: '定点作業', walking: '歩行', cycling: '農機/車', unknown: '不明' }[act] }}
            </span>
            <span class="flex items-center gap-1 text-[10px] text-gray-500">
              <span class="w-4 border-t-2 border-orange-400 inline-block" /> 心拍(右軸)
            </span>
          </div>
        </div>
        <button v-if="isZoomed" @click="resetZoom" class="text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded transition-colors flex-shrink-0">
          ズームリセット
        </button>
      </div>
      <div class="text-xs text-gray-600 mb-2">棒の色 = 活動タイプ、オレンジ線 = 心拍数（右軸）</div>
      <div ref="chartActEl" class="w-full" style="height: 140px;" />
    </div>

    <!-- ③ 身体負荷グラフ -->
    <div class="bg-gray-800 rounded-xl p-4">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2">
          <span class="inline-block w-3 h-3 rounded-sm bg-orange-400 flex-shrink-0" />
          <span class="text-xs text-gray-400 font-medium">身体負荷グラフ（心拍数）</span>
        </div>
        <button v-if="isZoomed" @click="resetZoom" class="text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded transition-colors flex-shrink-0">
          ズームリセット
        </button>
      </div>
      <div class="text-xs text-gray-600 mb-2">背景色：安静(青灰) / 軽度(緑) / 中程度(黄) / 高負荷(赤)</div>
      <div ref="chartHrEl" class="w-full" style="height: 180px;" />
    </div>

    <!-- ④ 動作分類ダッシュボード（体動強度） -->
    <div class="bg-gray-800 rounded-xl p-4">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2">
          <span class="inline-block w-3 h-3 rounded-sm bg-emerald-500 flex-shrink-0" />
          <span class="text-xs text-gray-400 font-medium">体動強度（加速度）</span>
        </div>
        <button v-if="isZoomed" @click="resetZoom" class="text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded transition-colors flex-shrink-0">
          ズームリセット
        </button>
      </div>
      <div class="text-xs text-gray-600 mb-2">目安: 0.5以下=静止 / 1=歩行 / 2〜3=農作業 / 4以上=激しい動き</div>
      <div ref="chartMotionEl" class="w-full" style="height: 160px;" />
    </div>

    <!-- ④ 動作分類ダッシュボード（ピッチ角） -->
    <div class="bg-gray-800 rounded-xl p-4">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2">
          <span class="inline-block w-3 h-3 rounded-sm bg-violet-400 flex-shrink-0" />
          <span class="text-xs text-gray-400 font-medium">姿勢（ピッチ角）</span>
        </div>
        <button v-if="isZoomed" @click="resetZoom" class="text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded transition-colors flex-shrink-0">
          ズームリセット
        </button>
      </div>
      <div class="text-xs text-gray-600 mb-2">Apple Watch 装着腕の前後傾き。前傾（腰を曲げた作業姿勢）時に変化</div>
      <div ref="chartPitchEl" class="w-full" style="height: 140px;" />
    </div>

  </div>
</template>
