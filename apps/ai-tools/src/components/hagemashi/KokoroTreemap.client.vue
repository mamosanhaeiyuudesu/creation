<script setup lang="ts">
interface KokoroLeaf { name: string; weight: number; note: string }
interface KokoroEntry { charge: KokoroLeaf[]; stress: KokoroLeaf[]; summary: string; generatedAt: string }

const props = defineProps<{
  entry: KokoroEntry | null
  height?: number
}>()

const emit = defineEmits<{
  'leaf-click': [{ name: string; note: string; group: string; weight: number }]
}>()

// グループ（エナジー／ストレス）ごとの固定色
const GROUP_COLOR: Record<string, string> = {
  'エナジー': '#34d399',
  'ストレス': '#f87171',
}

const chartEl = ref<HTMLDivElement>()
let chart: import('echarts/core').ECharts | null = null

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
    // 要素クリックで詳細を親に通知（leaf のみ反応）
    chart.on('click', (params: any) => {
      const d = params?.data
      if (d && d.group) {
        emit('leaf-click', {
          name: params.name ?? d.name ?? '',
          note: d.note ?? '',
          group: d.group,
          weight: Number(d.value) || 0,
        })
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

watch(() => props.entry, () => nextTick(renderChart), { deep: true })

let ro: ResizeObserver | null = null
onMounted(async () => {
  await renderChart()
  if (chartEl.value) {
    ro = new ResizeObserver(() => chart?.resize())
    ro.observe(chartEl.value)
  }
})
onBeforeUnmount(() => {
  ro?.disconnect()
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div class="relative">
    <div ref="chartEl" class="w-full" :style="{ height: `${height ?? 360}px` }" />
  </div>
</template>
