<script setup lang="ts">
interface KokoroLeaf { name: string; weight: number; valence: number; note: string }
interface KokoroEntry { charge: KokoroLeaf[]; stress: KokoroLeaf[]; summary: string; generatedAt: string }

const props = defineProps<{
  entry: KokoroEntry | null
  height?: number
}>()

// valence（-2〜+2）を色にマッピング。プラス=緑、マイナス=赤。
function colorFor(valence: number): string {
  switch (valence) {
    case 2: return '#34d399'  // 強い充実
    case 1: return '#6ee7b7'  // 前向き
    case 0: return '#94a3b8'  // 中立
    case -1: return '#fb923c' // モヤモヤ
    case -2: return '#f87171' // 強いストレス
    default: return valence > 0 ? '#6ee7b7' : '#fb923c'
  }
}

const chartEl = ref<HTMLDivElement>()
let chart: import('echarts').ECharts | null = null

const treeData = computed(() => {
  const e = props.entry
  if (!e) return []
  const toChildren = (leaves: KokoroLeaf[]) =>
    leaves.map(l => ({
      name: l.name,
      value: l.weight,
      note: l.note,
      itemStyle: { color: colorFor(l.valence) },
      label: { color: '#0f172a' },
    }))
  const nodes = []
  if (e.charge.length) nodes.push({ name: 'チャージ源', itemStyle: { color: '#065f46' }, children: toChildren(e.charge) })
  if (e.stress.length) nodes.push({ name: 'ストレス源', itemStyle: { color: '#7f1d1d' }, children: toChildren(e.stress) })
  return nodes
})

async function renderChart() {
  if (!chartEl.value) return
  const EC = await import('echarts')
  if (!chartEl.value) return
  if (!chart) chart = EC.init(chartEl.value, undefined, { renderer: 'svg' })

  const data = treeData.value
  if (!data.length) {
    chart.setOption({ series: [] }, true)
    return
  }

  chart.setOption({
    tooltip: {
      backgroundColor: '#1e293b',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (info: any) => {
        const note = info?.data?.note
        const name = info?.name ?? ''
        if (!note) return `<b>${name}</b>`
        return `<b>${name}</b><br/><span style="color:#94a3b8">${note}</span>`
      },
    },
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
