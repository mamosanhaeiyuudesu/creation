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
      axisLabel: { fontSize: 11, color: '#3a4a72' },
      splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.08)' } },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    visualMap: {
      show: false,
      min: catRange.min,
      max: catRange.max,
      inRange: { color: ['#EEF0FF', '#7986CB', '#1A237E'] },
      outOfRange: { color: '#f0f1f8' },
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
  <div class="bg-white border border-[#dde2ef] rounded-[10px] shadow-[0_1px_4px_rgba(28,45,90,0.07),0_0_0_1px_rgba(28,45,90,0.06)] overflow-hidden w-full min-w-0">
    <div class="flex items-center gap-1.5 px-4 py-2.5 border-b border-[#dde2ef] bg-[#fafbff]">
      <template v-for="(opt, i) in termOptions" :key="opt.term">
        <span v-if="i > 0" class="text-[#c8d4e8] text-[11px]">/</span>
        <button
          :class="[
            'text-[11.5px] font-semibold transition-colors',
            opt.term === filterTerm ? 'text-[#1c2d5a]' : 'text-[#9aaac8] hover:text-[#4f6ac0]',
          ]"
          @click="emit('update:filterTerm', opt.term)"
        >{{ opt.term }}期<span class="text-[10.5px] font-normal">（{{ opt.count }}人）</span></button>
      </template>
    </div>
    <div class="w-full overflow-x-auto overflow-y-auto max-h-[45vh] md:max-h-[600px] p-0.5 md:p-1.5" style="-webkit-overflow-scrolling: touch">
      <div ref="heatmapRef" class="inline-block" style="min-width: min-content" />
    </div>
    <div class="flex md:hidden items-center justify-end px-3 py-1 text-[10px] text-[#9aa3c0] border-t border-[#dde2ef]">
      ← 横スクロールで全体を確認
    </div>
  </div>
</template>
