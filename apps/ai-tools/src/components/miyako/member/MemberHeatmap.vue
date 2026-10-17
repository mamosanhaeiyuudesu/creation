<script setup lang="ts">
import { CATEGORY_SHORT } from '~/utils/miyako/categories'

interface SpeakerMeta {
  id: string
  name: string
}

const props = defineProps<{
  speakers: SpeakerMeta[]
  categories: readonly string[]
  catMap: Record<string, Record<string, { score: number; top_words: string }>>
  catRange: { min: number; max: number }
  displayNames: Record<string, string>
  termOptions: { term: number; count: number }[]
  filterTerm: number
}>()

const emit = defineEmits<{
  'cell-click': [speakerId: string, category: string]
  'update:filterTerm': [term: number]
}>()

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

watch([() => props.speakers, () => props.categories, () => props.catMap], render)

function render() {
  if (!heatmapRef.value || !EC) return
  const { speakers, categories, catMap, catRange, displayNames } = props

  const CELL_W = 46
  const CELL_H = 28
  const LEFT_MARGIN = 70
  const chartWidth = speakers.length * CELL_W + LEFT_MARGIN
  const chartHeight = categories.length * CELL_H + 60

  // data: [si, ci, score]  (x=speaker, y=category)
  const data: [number, number, number][] = []
  for (let si = 0; si < speakers.length; si++) {
    for (let ci = 0; ci < categories.length; ci++) {
      const entry = catMap[speakers[si].id]?.[categories[ci]]
      data.push([si, ci, entry ? entry.score : -1])
    }
  }

  heatmapChart?.dispose()
  heatmapRef.value.style.width = chartWidth + 'px'
  heatmapRef.value.style.height = chartHeight + 'px'
  heatmapChart = EC.init(heatmapRef.value, null, { renderer: 'canvas' })

  heatmapChart.setOption({
    animation: false,
    grid: { top: 60, right: 7, bottom: 4, left: LEFT_MARGIN + 2 },
    xAxis: {
      type: 'category',
      data: speakers.map(s => displayNames[s.id] ?? s.name),
      position: 'top',
      axisLabel: { rotate: 35, fontSize: 10, align: 'left', margin: 20, padding: [0, 0, 0, -17] },
      splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.08)' } },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    yAxis: {
      type: 'category',
      data: (categories as string[]).map(c => CATEGORY_SHORT[c] ?? c),
      inverse: true,
      axisLabel: { fontSize: 11, color: '#4b5868' },
      splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.08)' } },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    visualMap: {
      show: false,
      min: catRange.min,
      max: catRange.max,
      inRange: { color: ['#e6f0fb', '#6aa3e6', '#134c9c'] },
      outOfRange: { color: '#e6f0fb' },
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.value[2] < 0) return ''
        const si = params.value[0]
        const ci = params.value[1]
        const speaker = speakers[si]
        if (!speaker) return ''
        const cat = categories[ci]
        const entry = catMap[speaker.id]?.[cat]
        if (!entry) return ''
        const shortCat = CATEGORY_SHORT[cat] ?? cat
        const level = Math.min(10, Math.max(1, Math.round((entry.score / catRange.max) * 10)))
        return `<b>${displayNames[speaker.id]}（${shortCat}）</b><br/>バズ度 <b>${level}</b>`
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
    const si = params.value[0]
    const ci = params.value[1]
    if (speakers[si]) {
      emit('cell-click', speakers[si].id, categories[ci])
    }
  })
}

defineExpose({ render })
</script>

<template>
  <div class="bg-white border border-[#dbe4ef] rounded-[10px] shadow-[0_2px_10px_rgba(20,60,120,0.06)] overflow-hidden w-full min-w-0">
    <div class="flex items-center flex-wrap gap-2 px-3.5 py-2 border-b border-[#dbe4ef] bg-white">
      <span class="text-[12px] font-bold text-[#4b5868] shrink-0 pr-2.5 border-r border-[#dbe4ef]">単語</span>
      <div class="flex items-center gap-1 flex-wrap">
        <button
          v-for="opt in termOptions"
          :key="opt.term"
          class="text-[10.5px] font-medium px-2 py-[2px] rounded-[3px] transition-all leading-5"
          :class="opt.term === filterTerm
            ? 'bg-[#1d6fd6] text-white shadow-[0_1px_4px_rgba(29,111,214,0.3)]'
            : 'text-[#6b7888] hover:text-[#1f2a37] hover:bg-[#e6f0fb]'"
          @click="emit('update:filterTerm', opt.term)"
        >{{ opt.term }}期<span class="text-[9.5px] font-normal opacity-70">（{{ opt.count }}）</span></button>
      </div>
      <MiyakoDataPeriod kind="static" class="ml-auto" />
    </div>
    <div class="w-full overflow-x-auto overflow-y-auto max-h-[45vh] md:max-h-[600px] p-0.5 md:p-1.5" style="-webkit-overflow-scrolling: touch">
      <div ref="heatmapRef" class="inline-block" style="min-width: min-content" />
    </div>
    <div class="flex md:hidden items-center justify-end px-3 py-1 border-t border-[#dbe4ef]">
      <span class="text-[11px] text-[#8593a3]">← 横にスクロール</span>
    </div>
  </div>
</template>
