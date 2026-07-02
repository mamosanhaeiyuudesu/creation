<template>
  <div class="relative">
    <!-- 大きさの差分（強調）調整スライダー -->
    <div class="absolute top-1 right-1 z-10 flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-white/[0.08] rounded-lg px-2.5 py-1.5">
      <span class="text-[10px] text-slate-400 shrink-0">強調</span>
      <input
        v-model.number="emphasis"
        type="range"
        min="1"
        max="6"
        step="0.5"
        class="w-24 accent-orange-500 cursor-pointer"
      />
      <span class="text-[10px] text-slate-300 tabular-nums w-6 text-right shrink-0">{{ emphasis.toFixed(1) }}</span>
    </div>
    <div ref="chartEl" class="w-full" :style="{ height: `${height ?? 360}px` }" />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  words: { word: string; count: number }[]
  height?: number
}>()

const emit = defineEmits<{
  'word-click': [word: string]
}>()

const COLORS = [
  '#f97316', '#fb7185', '#f59e0b', '#fbbf24',
  '#fda4af', '#fdba74', '#f472b6', '#facc15',
]

const LS_EMPHASIS = 'hagemashi-wordcloud-emphasis'

// 出現回数の差を強調する指数（大きいほど回数の多い単語がより大きくなる）
const emphasis = ref(2)
if (import.meta.client) {
  const saved = Number(localStorage.getItem(LS_EMPHASIS))
  if (saved >= 1 && saved <= 6) emphasis.value = saved
}

const chartEl = ref<HTMLDivElement>()
let chart: import('echarts').ECharts | null = null

async function renderChart() {
  if (!chartEl.value) return
  const EC = await import('echarts')
  await import('echarts-wordcloud')
  if (!chartEl.value) return
  if (!chart) {
    chart = EC.init(chartEl.value, undefined, { renderer: 'canvas' })
  }

  // echarts-wordcloud は各データの textStyle.fontSize は使わず、value を sizeRange に
  // 線形マッピングして文字サイズを決める。そのため生の count を value に渡すと
  // 外れ値があると中〜低頻度の単語のサイズ差が潰れてしまう。
  // 出現回数から fontSize を自前計算し、それを value として渡すことで
  // emphasis スライダーで差を強調できるようにする。
  const MIN_SIZE = 12
  const MAX_SIZE = 80
  const counts = props.words.map(w => w.count)
  const maxCount = Math.max(...counts, 1)
  const minCount = Math.min(...counts, 1)
  const span = maxCount - minCount || 1

  const data = props.words.map(w => {
    const t = (w.count - minCount) / span // 0..1
    const scaled = Math.pow(t, emphasis.value) // emphasis が大きいほど回数が少ない単語が小さくなり差が広がる
    const fontSize = Math.round(MIN_SIZE + scaled * (MAX_SIZE - MIN_SIZE))
    return {
      name: w.word,
      value: fontSize, // sizeRange と同じスケールにして実サイズに反映させる
      rawCount: w.count,
      textStyle: { color: COLORS[Math.floor(Math.random() * COLORS.length)] },
    }
  })

  chart.setOption({
    tooltip: {
      show: true,
      formatter: (p: { name: string; data: { rawCount: number } }) => `${p.name}: ${p.data.rawCount}`,
    },
    series: [{
      type: 'wordCloud',
      shape: 'circle',
      left: 'center',
      top: 'center',
      width: '100%',
      height: '100%',
      sizeRange: [MIN_SIZE, MAX_SIZE],
      rotationRange: [0, 0],
      gridSize: 6,
      drawOutOfBound: false,
      layoutAnimation: true,
      textStyle: {
        fontFamily: 'inherit',
        fontWeight: 'bold',
      },
      emphasis: {
        textStyle: { textShadowBlur: 6, textShadowColor: 'rgba(0,0,0,0.4)' },
      },
      data,
    }],
  }, true)

  chart.off('click')
  chart.on('click', (params: { name: string }) => {
    emit('word-click', params.name)
  })
}

watch(() => props.words, renderChart, { deep: true })

watch(emphasis, (v) => {
  if (import.meta.client) localStorage.setItem(LS_EMPHASIS, String(v))
  renderChart()
})

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
