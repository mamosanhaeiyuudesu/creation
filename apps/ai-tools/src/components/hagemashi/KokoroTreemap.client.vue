<script setup lang="ts">
interface KokoroLeaf { name: string; weight: number; note: string }
interface KokoroEntry { charge: KokoroLeaf[]; stress: KokoroLeaf[]; summary: string; generatedAt: string }

const props = defineProps<{
  entry: KokoroEntry | null
  height?: number
}>()

// グループ（エナジー／ストレス）ごとの固定色
const GROUP_COLOR: Record<string, string> = {
  'エナジー': '#34d399',
  'ストレス': '#f87171',
}

const chartEl = ref<HTMLDivElement>()
let chart: import('echarts/core').ECharts | null = null

// クリックで表示する詳細ポップアップの状態
interface ActiveLeaf { name: string; note: string; group: string; x: number; y: number }
const activeLeaf = ref<ActiveLeaf | null>(null)

// echarts をフルインポートすると本番で巨大チャンク群が一気にダウンロードされ、
// Cloudflare のレートリミット(1015)を誘発するため、treemap に必要な部分だけを読み込む
async function loadECharts() {
  const [core, charts, renderers] = await Promise.all([
    import('echarts/core'),
    import('echarts/charts'),
    import('echarts/renderers'),
  ])
  core.use([charts.TreemapChart, renderers.SVGRenderer])
  return core
}

const treeData = computed(() => {
  const e = props.entry
  if (!e) return []
  const toChildren = (leaves: KokoroLeaf[], group: string) =>
    leaves.map(l => ({
      name: l.name,
      value: l.weight,
      note: l.note,
      group,
      itemStyle: { color: GROUP_COLOR[group] },
      label: { color: '#0f172a' },
    }))
  const nodes = []
  if (e.charge.length) nodes.push({ name: 'エナジー', itemStyle: { color: '#065f46' }, children: toChildren(e.charge, 'エナジー') })
  if (e.stress.length) nodes.push({ name: 'ストレス', itemStyle: { color: '#7f1d1d' }, children: toChildren(e.stress, 'ストレス') })
  return nodes
})

async function renderChart() {
  if (!chartEl.value) return
  const EC = await loadECharts()
  if (!chartEl.value) return
  if (!chart) {
    chart = EC.init(chartEl.value, undefined, { renderer: 'svg' })
    // 要素クリックで詳細ポップアップを表示（leaf のみ反応）
    chart.on('click', (params: any) => {
      const d = params?.data
      if (d && d.group) {
        const name = params.name ?? d.name ?? ''
        // すでに同じ要素のポップアップが開いていれば閉じる（トグル）
        if (activeLeaf.value && activeLeaf.value.name === name && activeLeaf.value.group === d.group) {
          activeLeaf.value = null
          return
        }
        // タッチ操作では event.clientX/Y が入らないため、
        // zrender が常に埋める offsetX/Y（キャンバス基準座標）から算出する
        const rect = chartEl.value?.getBoundingClientRect()
        const offsetX = params.event?.offsetX ?? 0
        const offsetY = params.event?.offsetY ?? 0
        activeLeaf.value = {
          name,
          note: d.note ?? '',
          group: d.group,
          x: (rect?.left ?? 0) + offsetX,
          y: (rect?.top ?? 0) + offsetY,
        }
      } else {
        activeLeaf.value = null
      }
    })
  }

  const data = treeData.value
  if (!data.length) {
    chart.setOption({ series: [] }, true)
    return
  }

  chart.setOption({
    series: [{
      type: 'treemap',
      roam: false,
      nodeClick: false,
      breadcrumb: { show: false },
      width: '100%',
      height: '100%',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      upperLabel: {
        show: true,
        height: 26,
        color: '#e2e8f0',
        fontWeight: 700,
        fontSize: 13,
      },
      itemStyle: {
        borderColor: '#0f172a',
        borderWidth: 2,
        gapWidth: 2,
      },
      label: {
        show: true,
        formatter: '{b}',
        color: '#0f172a',
        fontSize: 12,
        fontWeight: 600,
        overflow: 'break',
      },
      levels: [
        { itemStyle: { borderColor: '#0f172a', borderWidth: 0, gapWidth: 4 }, upperLabel: { show: true } },
        { itemStyle: { gapWidth: 2 } },
      ],
      data,
    }],
  }, true)
}

watch(() => props.entry, () => { activeLeaf.value = null; nextTick(renderChart) }, { deep: true })

// チャート・ポップアップ以外をクリックしたら閉じる（チャート内は echarts の click に任せる）
function onDocClick(e: MouseEvent) {
  const t = e.target as HTMLElement
  if (chartEl.value?.contains(t)) return
  if (t.closest('.kokoro-popup')) return
  activeLeaf.value = null
}

// スマホ幅ではポップアップを画面中央に出す（クリック位置だと画面外に切れやすいため）
const isMobile = ref(false)
const updateIsMobile = () => { isMobile.value = window.innerWidth < 640 }
const popupStyle = computed(() => {
  if (!activeLeaf.value) return {}
  if (isMobile.value) {
    return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
  }
  return { left: `${activeLeaf.value.x}px`, top: `${activeLeaf.value.y + 8}px` }
})

let ro: ResizeObserver | null = null
onMounted(async () => {
  updateIsMobile()
  await renderChart()
  if (chartEl.value) {
    ro = new ResizeObserver(() => chart?.resize())
    ro.observe(chartEl.value)
  }
  window.addEventListener('click', onDocClick)
  window.addEventListener('resize', updateIsMobile)
})
onBeforeUnmount(() => {
  ro?.disconnect()
  chart?.dispose()
  chart = null
  window.removeEventListener('click', onDocClick)
  window.removeEventListener('resize', updateIsMobile)
})
</script>

<template>
  <div class="relative">
    <div ref="chartEl" class="w-full" :style="{ height: `${height ?? 360}px` }" />

    <Teleport to="body">
      <div
        v-if="activeLeaf"
        class="kokoro-popup fixed z-50 min-w-[180px] max-w-[260px] bg-[#1e293b] border border-white/10 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] py-2.5 px-3.5 flex flex-col gap-1.5"
        :style="popupStyle"
      >
        <div class="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span class="w-2.5 h-2.5 rounded-sm inline-block shrink-0" :style="{ background: GROUP_COLOR[activeLeaf.group] }" />
          <span>{{ activeLeaf.group }}</span>
        </div>
        <div class="text-sm font-semibold text-slate-100 leading-snug">{{ activeLeaf.name }}</div>
        <p v-if="activeLeaf.note" class="m-0 text-xs text-slate-300 leading-relaxed">{{ activeLeaf.note }}</p>
      </div>
    </Teleport>
  </div>
</template>
