<script setup lang="ts">
// 人生のコア図。中央＝わたし、左＝影のコア5つ、右＝光のコア5つ。
// 各コアの外側に、それを裏づける具体的な出来事が3つ扇状に並ぶ。
//
// 配置は cose のような力学レイアウトではなく preset（決め打ち座標）で描く。
// 「左が影・右が光」「同じ番号の影と光は対になる」という意味を持った並びなので、
// 毎回配置が変わってしまうと図そのものが読めなくなるため。
import type { LifeCore } from '~/types/life-analyzer'

const props = withDefaults(defineProps<{
  cores: LifeCore[]
  /** 図の構成が変わったことを示す署名（分析ID）。変わったら描き直す */
  signature: string
  height?: number
}>(), { height: 620 })

const emit = defineEmits<{
  'episode-click': [{ coreKey: string; nodeKey: string }]
  'core-click': [{ coreKey: string }]
  'center-click': []
}>()

// ── 座標の決め方 ──────────────────────────────
// 図全体が縦に伸びるほど、全体表示にしたときの文字が小さくなる。
// 出来事は「弧を描くように少しずらして縦に3つ」並べ、行間を詰めて全体を横長に保つ。
const ROW_GAP = 215      // コア同士の縦の間隔
const CORE_X = 345       // 中央からコアまでの横の距離
const EPISODE_DY = [-72, 0, 72]    // 出来事の縦位置（コアからの差）
const EPISODE_DX = [190, 235, 190] // 出来事の横位置（真ん中を外に出して弧に見せる）

const container = ref<HTMLElement>()
const isRendering = ref(false)
let cy: any = null

const shadowCores = computed(() => props.cores.filter((c) => c.polarity === 'shadow'))
const lightCores = computed(() => props.cores.filter((c) => c.polarity === 'light'))

function buildElements() {
  const nodes: any[] = [
    { data: { id: 'center', label: 'わたし', kind: 'center' }, position: { x: 0, y: 0 } },
  ]
  const edges: any[] = []

  const place = (cores: LifeCore[], polarity: 'shadow' | 'light') => {
    const dir = polarity === 'shadow' ? -1 : 1
    // コアが5つに満たなくても中央に対して縦に均等に並ぶようにする
    const offset = (cores.length - 1) / 2
    cores.forEach((core, i) => {
      const cx = dir * CORE_X
      const cy0 = (i - offset) * ROW_GAP
      nodes.push({
        data: { id: core.key, label: core.label, kind: 'core', polarity },
        position: { x: cx, y: cy0 },
      })
      edges.push({ data: { id: `e-center-${core.key}`, source: 'center', target: core.key, kind: 'spine', polarity } })

      core.episodes.forEach((ep, j) => {
        nodes.push({
          data: { id: ep.key, label: ep.label, kind: 'episode', polarity, coreKey: core.key },
          position: {
            x: cx + dir * (EPISODE_DX[j] ?? 210),
            y: cy0 + (EPISODE_DY[j] ?? 0),
          },
        })
        edges.push({ data: { id: `e-${ep.key}`, source: core.key, target: ep.key, kind: 'branch', polarity } })
      })
    })
  }

  place(shadowCores.value, 'shadow')
  place(lightCores.value, 'light')
  return { nodes, edges }
}

const FONT = '"Zen Kaku Gothic New", "Hiragino Sans", system-ui, sans-serif'

const STYLE = [
  {
    selector: 'node',
    style: {
      'label': 'data(label)',
      'text-wrap': 'wrap',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-family': FONT,
      'font-weight': 700,
      'min-zoomed-font-size': 6,
      'shape': 'round-rectangle',
      'cursor': 'pointer',
      'transition-property': 'background-opacity, border-color, opacity',
      'transition-duration': '140ms',
    },
  },
  {
    selector: 'node[kind = "center"]',
    style: {
      'shape': 'ellipse',
      'width': 104,
      'height': 104,
      'background-color': '#ffffff',
      'background-opacity': 0.06,
      'border-width': 1.5,
      'border-color': 'rgba(255,255,255,0.32)',
      'color': '#e9edf8',
      'font-size': 15,
      'text-max-width': 88,
    },
  },
  {
    selector: 'node[kind = "core"]',
    style: {
      'width': 190,
      'height': 72,
      'background-opacity': 0.18,
      'border-width': 1.6,
      'font-size': 15.5,
      'text-max-width': 168,
      'text-outline-width': 0,
    },
  },
  {
    selector: 'node[kind = "core"][polarity = "shadow"]',
    style: { 'background-color': '#7c83f5', 'border-color': '#7c83f5', 'color': '#dfe2ff' },
  },
  {
    selector: 'node[kind = "core"][polarity = "light"]',
    style: { 'background-color': '#f0b544', 'border-color': '#f0b544', 'color': '#ffeccb' },
  },
  {
    selector: 'node[kind = "episode"]',
    style: {
      'width': 140,
      'height': 46,
      'background-opacity': 0.07,
      'border-width': 1,
      'border-style': 'dashed',
      'font-size': 11,
      'font-weight': 500,
      'text-max-width': 124,
    },
  },
  {
    selector: 'node[kind = "episode"][polarity = "shadow"]',
    style: { 'background-color': '#7c83f5', 'border-color': 'rgba(124,131,245,0.55)', 'color': '#c6cafb' },
  },
  {
    selector: 'node[kind = "episode"][polarity = "light"]',
    style: { 'background-color': '#f0b544', 'border-color': 'rgba(240,181,68,0.55)', 'color': '#f7dcaa' },
  },
  {
    selector: 'edge',
    style: { 'curve-style': 'bezier', 'opacity': 0.4 },
  },
  {
    selector: 'edge[kind = "spine"][polarity = "shadow"]',
    style: { 'width': 2, 'line-color': '#7c83f5' },
  },
  {
    selector: 'edge[kind = "spine"][polarity = "light"]',
    style: { 'width': 2, 'line-color': '#f0b544' },
  },
  {
    selector: 'edge[kind = "branch"][polarity = "shadow"]',
    style: { 'width': 1.2, 'line-color': '#7c83f5', 'line-style': 'dotted' },
  },
  {
    selector: 'edge[kind = "branch"][polarity = "light"]',
    style: { 'width': 1.2, 'line-color': '#f0b544', 'line-style': 'dotted' },
  },
  {
    selector: 'node.selected',
    style: { 'background-opacity': 0.34, 'border-width': 2.6, 'z-index': 1000 },
  },
  {
    selector: '.dimmed',
    style: { 'opacity': 0.14, 'text-opacity': 0.3 },
  },
  {
    selector: '.highlighted',
    style: { 'opacity': 1, 'z-index': 900 },
  },
]

// 描画は cytoscape の動的 import を挟むので、続けて呼ばれたとき
// 古い方が後から完了して新しい図を壊さないよう最新の呼び出しだけ通す。
let renderToken = 0

async function render() {
  if (!container.value || !props.cores.length) return

  const token = ++renderToken
  isRendering.value = true
  await nextTick()
  if (token !== renderToken) return

  const elements = buildElements()
  const { default: cytoscape } = await import('cytoscape')
  if (token !== renderToken) return

  cy?.destroy()
  cy = cytoscape({
    container: container.value,
    elements,
    style: STYLE as any,
    layout: { name: 'preset', fit: false } as any,
    wheelSensitivity: 0.2,
    minZoom: 0.2,
    maxZoom: 2.2,
  })

  cy.fit(cy.elements(), 36)
  isRendering.value = false

  cy.on('tap', 'node', (evt: any) => {
    const node = evt.target
    const kind = node.data('kind')

    cy.elements().removeClass('selected dimmed highlighted')
    if (kind !== 'center') {
      node.addClass('selected')
      const near = node.closedNeighborhood()
      cy.elements().not(near).addClass('dimmed')
      near.addClass('highlighted')
    }

    if (kind === 'episode') {
      emit('episode-click', { coreKey: node.data('coreKey'), nodeKey: node.id() })
    } else if (kind === 'core') {
      // 全体表示のままだと出来事の文字が小さいので、コアを選んだらその周りへ寄る。
      cy.animate({ fit: { eles: node.closedNeighborhood(), padding: 70 }, duration: 260, easing: 'ease-out' })
      emit('core-click', { coreKey: node.id() })
    } else {
      emit('center-click')
    }
  })

  cy.on('tap', (evt: any) => {
    if (evt.target === cy) cy.elements().removeClass('selected dimmed highlighted')
  })
}

/** 選択状態を解除する（ポップアップを閉じたとき用）。 */
function clearSelection() {
  cy?.elements().removeClass('selected dimmed highlighted')
}

/** 全体が入るように戻す。 */
function fit() {
  cy?.fit(cy.elements(), 36)
}

/** 片側（影／光）だけに寄せる。左右の比較を落ち着いて見たいとき用。 */
function focusSide(polarity: 'shadow' | 'light' | 'all') {
  if (!cy) return
  cy.elements().removeClass('selected dimmed highlighted')
  if (polarity === 'all') {
    cy.fit(cy.elements(), 36)
    return
  }
  const side = cy.nodes(`[polarity = "${polarity}"]`)
  if (side.length) cy.fit(side, 48)
}

defineExpose({ clearSelection, fit, focusSide })

watch(() => props.signature, () => render())

// コンテナの高さは画面サイズに追従するので、サイズ変化を cytoscape に伝える。
let ro: ResizeObserver | null = null

onMounted(() => {
  render()
  if (container.value && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => cy?.resize())
    ro.observe(container.value)
  }
})

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
  cy?.destroy()
  cy = null
})
</script>

<template>
  <div class="relative w-full h-full">
    <div ref="container" class="w-full h-full" :style="{ minHeight: `${height}px` }" />

    <div v-if="isRendering" class="absolute inset-0 grid place-items-center bg-[#0a0d16]/50">
      <span class="w-7 h-7 rounded-full border-2 border-white/15 border-t-[var(--la-light)] animate-spin block" />
    </div>
  </div>
</template>
