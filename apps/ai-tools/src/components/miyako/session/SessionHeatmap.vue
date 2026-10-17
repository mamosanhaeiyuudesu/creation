<script setup lang="ts">
interface WordScore {
  word: string
  score: number
  count?: number
}

const props = defineProps<{
  sessions: string[]
  keywords: string[]
  rawData: Record<string, WordScore[]>
  shortLabel: (key: string) => string
}>()

const emit = defineEmits<{
  'word-click': [payload: { session: string; word: string }]
}>()

const CELL_WIDTH = 38

const heatmapRef = ref<HTMLElement>()
let heatmapChart: any = null
let EC: any = null

onMounted(async () => {
  EC = await import('echarts')
  render()
})

onUnmounted(() => {
  heatmapChart?.dispose()
})

watch([() => props.sessions, () => props.keywords], render)

function render() {
  if (!heatmapRef.value || !EC) return
  const { sessions, keywords, rawData, shortLabel } = props
  const rowHeight = 22
  const chartHeight = keywords.length * rowHeight + 54
  const chartWidth = sessions.length * CELL_WIDTH + 37

  // session×keyword の (score, count) マップを構築
  type CellMeta = { score: number; count: number }
  const metaMap = new Map<string, CellMeta>()
  for (let si = 0; si < sessions.length; si++) {
    const wordMap = new Map(
      (rawData[sessions[si]] ?? []).map(w => [w.word, w])
    )
    for (let ki = 0; ki < keywords.length; ki++) {
      const w = wordMap.get(keywords[ki])
      if (w) metaMap.set(`${si},${ki}`, { score: w.score, count: w.count ?? 0 })
    }
  }

  // ヒートマップ全体のスコア最小・最大を求める（0-10正規化用）
  const allScores = [...metaMap.values()].map(m => m.score)
  const minScore = Math.min(...allScores)
  const maxScore = Math.max(...allScores)
  const normalizeScore = (s: number) =>
    maxScore === minScore ? 5 : Math.min(10, Math.max(1, Math.round(((s - minScore) / (maxScore - minScore)) * 10)))

  const data: [number, number, number][] = []
  for (let si = 0; si < sessions.length; si++) {
    for (let ki = 0; ki < keywords.length; ki++) {
      const meta = metaMap.get(`${si},${ki}`)
      data.push([si, ki, meta !== undefined ? meta.score : -1])
    }
  }

  heatmapChart?.dispose()
  heatmapRef.value.style.width = chartWidth + 'px'
  heatmapRef.value.style.height = chartHeight + 'px'
  heatmapChart = EC.init(heatmapRef.value, null, { renderer: 'canvas' })

  heatmapChart.setOption({
    animation: false,
    grid: { top: 40, right: 7, bottom: 4, left: 80 },
    xAxis: {
      type: 'category',
      data: sessions.map(shortLabel),
      position: 'top',
      axisLabel: { rotate: 45, fontSize: 10, align: 'left', margin: 10, padding: [0, 0, 0, -20] },
      splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.08)' } },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    yAxis: {
      type: 'category',
      data: keywords,
      inverse: true,
      axisLabel: { fontSize: 11 },
      splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.08)' } },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    visualMap: {
      show: false,
      min: 0,
      max: 0.45,
      inRange: { color: ['#e6f0fb', '#6aa3e6', '#134c9c'] },
      outOfRange: { color: '#EEEEEE' },
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.value[2] < 0) return ''
        const si = params.value[0]
        const ki = params.value[1]
        const year = sessions[si].replace(/〜[\d-]+$/, '〜')
        const meta = metaMap.get(`${si},${ki}`)
        const norm = meta ? normalizeScore(meta.score) : 0
        return `<b>${keywords[ki]}（${year}）</b><br/>バズ度 <b>${norm}</b>`
      },
    },
    series: [{
      type: 'heatmap',
      data,
      cursor: 'pointer',
      itemStyle: { borderWidth: 0.5, borderColor: '#FAFAFA' },
      emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.2)' } },
    }],
  })

  heatmapChart.on('click', (params: any) => {
    if (params.value[2] < 0) return
    emit('word-click', {
      session: sessions[params.value[0]],
      word: keywords[params.value[1]],
    })
  })
}

defineExpose({ render })
</script>

<template>
  <div class="bg-white border border-[#dbe4ef] rounded-[10px] shadow-[0_2px_10px_rgba(20,60,120,0.06)] overflow-hidden w-full min-w-0">
    <div class="flex items-center gap-2 px-3.5 py-2 border-b border-[#dbe4ef] bg-white">
      <span class="text-[12px] font-bold text-[#4b5868] shrink-0 pr-2.5 border-r border-[#dbe4ef]">絞り込み</span>
      <slot name="label" />
    </div>
    <div class="w-full overflow-x-auto overflow-y-auto max-h-[45vh] md:max-h-[600px] p-0.5 md:p-1.5" style="-webkit-overflow-scrolling: touch">
      <div ref="heatmapRef" class="inline-block" style="min-width: min-content" />
    </div>
    <div class="flex md:hidden items-center justify-end px-3 py-1 border-t border-[#dbe4ef]">
      <span class="text-[11px] text-[#8593a3]">← 横にスクロール</span>
    </div>
  </div>
</template>
