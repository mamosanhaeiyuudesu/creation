<script setup lang="ts">
interface MoodEntry { id: string; score: number; note: string; createdAt: string }

const props = defineProps<{
  entries: MoodEntry[]
  height?: number
}>()

const emit = defineEmits<{ (e: 'delete', id: string): void }>()

const chartEl = ref<HTMLDivElement>()
let chart: import('echarts/core').ECharts | null = null

// クリックで表示する詳細ポップアップの状態
interface ActivePoint { id: string; score: number; note: string; date: string; x: number; y: number }
const activePoint = ref<ActivePoint | null>(null)

// 気分スコア(1〜10)を赤→緑のグラデーション色に変換
function colorForScore(score: number): string {
  const clamped = Math.max(1, Math.min(10, score))
  const hue = ((clamped - 1) / 9) * 120 // 1→赤(0), 10→緑(120)
  return `hsl(${hue}, 70%, 55%)`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd} ${hh}:${mi}`
}

// echarts をフルインポートすると本番で巨大チャンク群が一気にダウンロードされ、
// Cloudflare のレートリミット(1015)を誘発するため、折れ線に必要な部分だけを読み込む
async function loadECharts() {
  const [core, charts, components, renderers] = await Promise.all([
    import('echarts/core'),
    import('echarts/charts'),
    import('echarts/components'),
    import('echarts/renderers'),
  ])
  core.use([
    charts.LineChart,
    components.GridComponent,
    components.TooltipComponent,
    renderers.SVGRenderer,
  ])
  return core
}

// 時系列昇順に並べ替えたデータ
const sorted = computed(() =>
  [...props.entries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
)

async function renderChart() {
  if (!chartEl.value) return
  const EC = await loadECharts()
  if (!chartEl.value) return
  if (!chart) {
    chart = EC.init(chartEl.value, undefined, { renderer: 'svg' })
    // ドットクリックで詳細ポップアップを表示（トグル）
    chart.on('click', (params: any) => {
      const d = params?.data
      if (!d || !d.id) { activePoint.value = null; return }
      if (activePoint.value && activePoint.value.id === d.id) {
        activePoint.value = null
        return
      }
      // タッチ操作では clientX/Y が入らないため offsetX/Y（キャンバス基準）から算出する
      const rect = chartEl.value?.getBoundingClientRect()
      const offsetX = params.event?.offsetX ?? 0
      const offsetY = params.event?.offsetY ?? 0
      activePoint.value = {
        id: d.id,
        score: d.score,
        note: d.note ?? '',
        date: formatDate(d.createdAt),
        x: (rect?.left ?? 0) + offsetX,
        y: (rect?.top ?? 0) + offsetY,
      }
    })
  }

  const data = sorted.value.map(e => ({
    value: [e.createdAt, e.score] as [string, number],
    id: e.id,
    score: e.score,
    note: e.note,
    createdAt: e.createdAt,
    itemStyle: { color: colorForScore(e.score) },
  }))

  chart.setOption({
    grid: { top: 16, left: 32, right: 16, bottom: 28 },
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1e293b',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (p: any) => `${formatDate(p.data.createdAt)}<br/><b>気分 ${p.data.score}</b>`,
    },
    xAxis: {
      type: 'time',
      axisLabel: {
        color: '#94a3b8',
        fontSize: 10,
        formatter: (v: number) => {
          const d = new Date(v)
          return `${d.getMonth() + 1}/${d.getDate()}`
        },
        hideOverlap: true,
      },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 1,
      max: 10,
      interval: 1,
      axisLabel: { color: '#94a3b8', fontSize: 10 },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: [{
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 12,
      lineStyle: { color: '#f97316', width: 2 },
      itemStyle: { borderColor: '#0f172a', borderWidth: 2 },
      emphasis: { scale: 1.3 },
      data,
    }],
  }, true)
}

watch(() => props.entries, () => { activePoint.value = null; nextTick(renderChart) }, { deep: true })

// チャート・ポップアップ以外をクリックしたら閉じる（チャート内は echarts の click に任せる）
function onDocClick(e: MouseEvent) {
  const t = e.target as HTMLElement
  if (chartEl.value?.contains(t)) return
  if (t.closest('.mood-popup')) return
  activePoint.value = null
}

let ro: ResizeObserver | null = null
onMounted(async () => {
  await renderChart()
  if (chartEl.value) {
    ro = new ResizeObserver(() => chart?.resize())
    ro.observe(chartEl.value)
  }
  window.addEventListener('click', onDocClick)
})
onBeforeUnmount(() => {
  ro?.disconnect()
  chart?.dispose()
  chart = null
  window.removeEventListener('click', onDocClick)
})
</script>

<template>
  <div class="relative">
    <div ref="chartEl" class="w-full" :style="{ height: `${height ?? 300}px` }" />

    <Teleport to="body">
      <div
        v-if="activePoint"
        class="mood-popup fixed z-50 min-w-[180px] max-w-[280px] bg-[#1e293b] border border-white/10 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] py-2.5 px-3.5 flex flex-col gap-1.5"
        :style="{ left: `${Math.min(activePoint.x, (typeof window !== 'undefined' ? window.innerWidth : 9999) - 300)}px`, top: `${activePoint.y + 8}px` }"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span class="w-2.5 h-2.5 rounded-full inline-block shrink-0" :style="{ background: colorForScore(activePoint.score) }" />
            <span>{{ activePoint.date }}</span>
            <span class="text-slate-200 font-semibold">気分 {{ activePoint.score }}</span>
          </div>
          <button
            class="shrink-0 text-slate-600 hover:text-red-400 transition-colors bg-transparent border-none cursor-pointer text-xs px-1"
            title="削除"
            @click="emit('delete', activePoint.id); activePoint = null"
          >🗑</button>
        </div>
        <p v-if="activePoint.note" class="m-0 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{{ activePoint.note }}</p>
        <p v-else class="m-0 text-xs text-slate-500 italic">テキストなし</p>
      </div>
    </Teleport>
  </div>
</template>
