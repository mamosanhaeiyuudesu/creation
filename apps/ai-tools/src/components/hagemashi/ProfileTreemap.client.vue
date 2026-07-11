<script setup lang="ts">
interface ProfileLeaf { title: string; content: string; weight?: number }

const props = defineProps<{
  items: ProfileLeaf[]
  color: string
  height?: number
}>()

const emit = defineEmits<{
  'leaf-click': [{ name: string; note: string; weight: number }]
}>()

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

const treeData = computed(() =>
  (props.items ?? []).map((l) => {
    const weight = Math.min(10, Math.max(1, Math.round(Number(l.weight) || 5)))
    return {
      name: l.title,
      value: weight,
      note: l.content,
      itemStyle: { color: props.color },
      label: { color: '#0f172a' },
    }
  })
)

async function renderChart() {
  if (!chartEl.value) return
  const EC = await loadECharts()
  if (!chartEl.value) return
  if (!chart) {
    chart = EC.init(chartEl.value, undefined, { renderer: 'svg' })
    // 要素クリックで詳細を親に通知
    chart.on('click', (params: any) => {
      const d = params?.data
      if (d) {
        emit('leaf-click', {
          name: params.name ?? d.name ?? '',
          note: d.note ?? '',
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
      data,
    }],
  }, true)
}

watch(() => [props.items, props.color], () => nextTick(renderChart), { deep: true })

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
