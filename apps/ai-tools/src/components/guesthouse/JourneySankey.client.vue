<template>
  <div>
    <div v-if="!linkCount" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] text-center text-[var(--gh-ink-soft)] py-10 text-[13px]">
      旅程（前後の行き先）が読み取れた日記がまだありません。
    </div>
    <div v-else ref="el" :style="{ height: chartHeight + 'px' }" class="w-full" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { GuestProfile } from '~/types/guesthouse'

const props = defineProps<{ profiles: GuestProfile[] }>()

const el = ref<HTMLElement>()
let chart: any = null
let EC: any = null

// 「大阪から入り、帰りも大阪へ」のような往復があると、同名ノードが左右に来て
// sankey が循環参照エラーになる。列ごとに接頭辞を付けて別ノードとして扱う（表示時に外す）。
const PREV = '前:'
const NEXT = '次:'
const INN = '宿:'
const UNKNOWN = '（記載なし）'
// 宿名や地名にスペースが入っても壊れないよう、集計キーの区切りには本文に出ない文字を使う。
const SEP = '\u0000'

// echarts は canvas に描くので CSS 変数（var(--gh-*)）は解決されない。里山パレットの実値を持つ。
const COLOR = {
  prev: '#b3a992', // --gh-ink-faint
  inn: '#5f7a52', // --gh-forest
  next: '#d98a4e', // --gh-persimmon
  label: '#3a352c', // --gh-ink
}

interface Graph {
  nodes: { name: string; itemStyle: { color: string } }[]
  links: { source: string; target: string; value: number }[]
}

const graph = computed<Graph>(() => {
  const nodeColor = new Map<string, string>()
  const linkCounts = new Map<string, number>()

  for (const p of props.profiles) {
    const prev = PREV + (p.prevStop || UNKNOWN)
    const inn = INN + (p.houseName || '宿')
    const next = NEXT + (p.nextStop || UNKNOWN)

    nodeColor.set(prev, COLOR.prev)
    nodeColor.set(inn, COLOR.inn)
    nodeColor.set(next, COLOR.next)

    for (const key of [prev + SEP + inn, inn + SEP + next]) {
      linkCounts.set(key, (linkCounts.get(key) ?? 0) + 1)
    }
  }

  return {
    nodes: [...nodeColor].map(([name, color]) => ({ name, itemStyle: { color } })),
    links: [...linkCounts].map(([key, value]) => {
      const [source, target] = key.split(SEP)
      return { source, target, value }
    }),
  }
})

const linkCount = computed(() => graph.value.links.length)
// ノードが増えるほど縦に詰まるので、左右どちらかの最大ノード数で高さを決める。
const chartHeight = computed(() => Math.max(260, graph.value.nodes.length * 34))

function stripPrefix(name: string): string {
  return name.replace(/^(前:|次:|宿:)/, '')
}

function render() {
  if (!el.value || !EC || !linkCount.value) return
  chart ??= EC.init(el.value)
  chart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (p: any) =>
        p.dataType === 'edge'
          ? `${stripPrefix(p.data.source)} → ${stripPrefix(p.data.target)}：${p.data.value}組`
          : `${stripPrefix(p.name)}：${p.value}組`,
    },
    series: [
      {
        type: 'sankey',
        data: graph.value.nodes,
        links: graph.value.links,
        left: 4,
        right: 4,
        top: 12,
        bottom: 12,
        nodeWidth: 12,
        nodeGap: 10,
        // 同じ列のノードを揃えるため、レイアウトの繰り返しは既定のままにする。
        label: {
          color: COLOR.label,
          fontSize: 12,
          formatter: (p: any) => stripPrefix(p.name),
        },
        lineStyle: { color: 'gradient', opacity: 0.32, curveness: 0.5 },
        emphasis: { focus: 'adjacency' },
      },
    ],
  })
  chart.resize()
}

function onResize() {
  chart?.resize()
}

onMounted(async () => {
  EC = await import('echarts')
  await nextTick()
  render()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  chart?.dispose()
  chart = null
})

watch(
  () => props.profiles,
  async () => {
    await nextTick()
    render()
  },
  { deep: true }
)
</script>
