<template>
  <div ref="chartEl" class="w-full" :style="{ height: `${height ?? 360}px` }" />
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

  const data = props.words.map(w => ({
    name: w.word,
    value: w.count,
    textStyle: { color: COLORS[Math.floor(Math.random() * COLORS.length)] },
  }))

  chart.setOption({
    tooltip: {
      show: true,
      formatter: (p: { name: string; value: number }) => `${p.name}: ${p.value}`,
    },
    series: [{
      type: 'wordCloud',
      shape: 'circle',
      left: 'center',
      top: 'center',
      width: '100%',
      height: '100%',
      sizeRange: [14, 64],
      rotationRange: [0, 0],
      gridSize: 8,
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
