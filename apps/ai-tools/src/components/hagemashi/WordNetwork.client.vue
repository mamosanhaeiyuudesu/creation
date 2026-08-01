<script setup lang="ts">
// 単語の共起ネットワーク図。ノード＝語、エッジ＝同じ要約行に出た関係。
// 色は valence（ポジ/ネガ）、ノードの大きさ＝出現行数、線の太さ＝結びつきの強さ。
//
// 配置（レイアウト）は cose で解くが結果が毎回変わるため、
// 座標を localStorage に保存してタブを開き直しても同じ絵が出るようにしている。
// 意図的に組み直すのは親から relayout() を呼んだとき（＝更新ボタン）だけ。
import type { NetGraph } from '~/utils/hagemashi/cooccurrence'
import { valenceColor } from '~/utils/hagemashi/cooccurrence'

const props = withDefaults(defineProps<{
  graph: NetGraph
  /** グラフ構成の署名。保存済み座標がこの署名と一致すれば復元する */
  signature: string
  height?: number
}>(), { height: 420 })

const emit = defineEmits<{
  'node-click': [{ word: string; pos: number; neg: number; df: number }]
}>()

const LS_LAYOUT = 'hagemashi-network-layout'

const container = ref<HTMLElement>()
const isRendering = ref(false)
let cy: any = null

interface SavedLayout { signature: string; positions: Record<string, { x: number; y: number }> }

function loadSaved(): SavedLayout | null {
  try {
    const raw = localStorage.getItem(LS_LAYOUT)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedLayout
    return parsed?.positions ? parsed : null
  } catch {
    return null
  }
}

function saveLayout() {
  if (!cy) return
  const positions: Record<string, { x: number; y: number }> = {}
  cy.nodes().forEach((n: any) => {
    const p = n.position()
    positions[n.id()] = { x: Math.round(p.x), y: Math.round(p.y) }
  })
  try {
    localStorage.setItem(LS_LAYOUT, JSON.stringify({ signature: props.signature, positions }))
  } catch { /* 容量超過などは無視する */ }
}

/**
 * 保存済み座標から、今のグラフの全ノード分の座標をそろえる。
 * 座標が無いノード（除外解除や出現回数を下げて増えた語）は、
 * 既に置かれている隣接ノードのそばに落として既存の配置を動かさずに済ませる。
 * 1つも座標が無ければ null を返し、呼び出し側が cose で解き直す。
 */
function resolvePositions(saved: SavedLayout | null): Record<string, { x: number; y: number }> | null {
  if (!saved) return null
  const known = props.graph.nodes.filter(n => saved.positions[n.word])
  if (!known.length) return null

  const out: Record<string, { x: number; y: number }> = {}
  for (const n of known) out[n.word] = { ...saved.positions[n.word] }

  const missing = props.graph.nodes.filter(n => !out[n.word])
  if (missing.length) {
    // 座標のある語の重心。隣接が1つも置かれていない語はここに落とす
    const cx = known.reduce((s, n) => s + out[n.word].x, 0) / known.length
    const cy0 = known.reduce((s, n) => s + out[n.word].y, 0) / known.length

    for (const n of missing) {
      const neighbors = props.graph.edges
        .filter(e => e.a === n.word || e.b === n.word)
        .map(e => (e.a === n.word ? e.b : e.a))
        .filter(w => out[w])
      const base = neighbors.length
        ? neighbors.reduce((acc, w) => ({ x: acc.x + out[w].x, y: acc.y + out[w].y }), { x: 0, y: 0 })
        : { x: cx * neighbors.length || cx, y: cy0 }
      const n0 = neighbors.length || 1
      // 完全に重ならないよう語ごとに決まった向きへ少しずらす
      const angle = (n.word.charCodeAt(0) % 12) * (Math.PI / 6)
      out[n.word] = {
        x: (neighbors.length ? base.x / n0 : cx) + Math.cos(angle) * 70,
        y: (neighbors.length ? base.y / n0 : cy0) + Math.sin(angle) * 70,
      }
    }
  }

  return out
}

function buildElements(positions: Record<string, { x: number; y: number }> | null) {
  const maxDf = Math.max(...props.graph.nodes.map(n => n.df), 1)
  const maxStrength = Math.max(...props.graph.edges.map(e => e.strength), 0.0001)

  const nodes = props.graph.nodes.map(n => ({
    data: {
      id: n.word,
      label: n.word,
      df: n.df,
      pos: n.pos,
      neg: n.neg,
      color: valenceColor(n.valence),
      // 出現行数の差を出しつつ、極端に大きくならないよう緩いカーブにする
      size: 22 + Math.pow(n.df / maxDf, 0.55) * 34,
      fontSize: 11 + Math.pow(n.df / maxDf, 0.55) * 5,
    },
    position: positions?.[n.word] ? { ...positions[n.word] } : undefined,
  }))

  const edges = props.graph.edges.map((e, i) => ({
    data: {
      id: `e${i}`,
      source: e.a,
      target: e.b,
      co: e.co,
      color: valenceColor(e.valence),
      width: 1 + (e.strength / maxStrength) * 4.5,
    },
  }))

  return { nodes, edges }
}

const STYLE = [
  {
    selector: 'node',
    style: {
      'background-color': 'data(color)',
      'background-opacity': 0.22,
      'border-width': 1.5,
      'border-color': 'data(color)',
      'label': 'data(label)',
      'color': '#f1f5f9',
      'font-size': 'data(fontSize)',
      'font-weight': 700,
      'font-family': '"Hiragino Sans", "Noto Sans JP", system-ui, sans-serif',
      'text-valign': 'center',
      'text-halign': 'center',
      'width': 'data(size)',
      'height': 'data(size)',
      'min-zoomed-font-size': 7,
      'text-outline-width': 2.5,
      'text-outline-color': '#0f172a',
      'cursor': 'pointer',
    },
  },
  {
    selector: 'edge',
    style: {
      'width': 'data(width)',
      'line-color': 'data(color)',
      'opacity': 0.55,
      'curve-style': 'bezier',
    },
  },
  {
    selector: 'node.selected',
    style: {
      'background-opacity': 0.4,
      'border-width': 3,
      'border-color': '#f97316',
      'z-index': 1000,
    },
  },
  {
    selector: '.highlighted',
    style: { 'opacity': 1, 'z-index': 999 },
  },
  {
    selector: '.dimmed',
    style: { 'opacity': 0.12, 'text-opacity': 0.25 },
  },
]

// 描画は非同期（cytoscape の動的 import）なので、続けて呼ばれたときに
// 古い方が後から完了して新しい図を壊さないよう、最新の呼び出しだけを通す
let renderToken = 0

async function render(useSaved: boolean) {
  if (!container.value || !props.graph.nodes.length) return

  const token = ++renderToken
  isRendering.value = true
  await nextTick()
  if (token !== renderToken) return

  // 保存済み座標があれば、構成が変わっていても既存ノードは動かさない。
  // 除外単語を消したときに図全体が組み直るのを避けるのが狙い
  const positions = useSaved ? resolvePositions(loadSaved()) : null
  const elements = buildElements(positions)

  const { default: cytoscape } = await import('cytoscape')
  if (token !== renderToken) return

  if (cy) {
    cy.destroy()
    cy = null
  }

  cy = cytoscape({
    container: container.value,
    elements,
    style: STYLE as any,
    wheelSensitivity: 0.2,
    minZoom: 0.25,
    maxZoom: 2.5,
  })

  const finish = () => {
    if (token !== renderToken) return
    // 接続の多い上位ノードにフィットする。全体に fit するとスマホで字が潰れるため
    const sorted = cy.nodes().sort((a: any, b: any) => b.connectedEdges().length - a.connectedEdges().length)
    const focus = sorted.slice(0, Math.min(25, sorted.length))
    cy.fit(focus.length ? focus : cy.nodes(), 40)
    isRendering.value = false
    saveLayout()
  }

  if (positions) {
    cy.layout({ name: 'preset', fit: false } as any).run()
    finish()
  } else {
    const layout = cy.layout({
      name: 'cose',
      animate: false,
      padding: 40,
      nodeRepulsion: () => 9000,
      idealEdgeLength: () => 95,
      edgeElasticity: () => 100,
      gravity: 1,
      numIter: 600,
      fit: false,
      randomize: true,
    } as any)
    layout.on('layoutstop', finish)
    layout.run()
  }

  cy.on('tap', 'node', (evt: any) => {
    const node = evt.target
    cy.elements().removeClass('selected dimmed highlighted')
    node.addClass('selected')
    const near = node.neighborhood().add(node)
    cy.elements().not(near).addClass('dimmed')
    near.addClass('highlighted')
    emit('node-click', {
      word: node.data('label'),
      pos: node.data('pos'),
      neg: node.data('neg'),
      df: node.data('df'),
    })
  })

  cy.on('tap', (evt: any) => {
    if (evt.target === cy) cy.elements().removeClass('selected dimmed highlighted')
  })
}

/** 選択状態を外から解除する（ポップアップを閉じたとき用） */
function clearSelection() {
  cy?.elements().removeClass('selected dimmed highlighted')
}

/** 図を意図的に組み直す（更新ボタン）。保存済み座標は使わない */
function relayout() {
  render(false)
}

defineExpose({ relayout, clearSelection })

// グラフの中身が変わったら描き直す。座標が使えれば復元されるので絵は動かない
watch(() => props.signature, () => render(true))

onMounted(() => render(true))
onBeforeUnmount(() => {
  cy?.destroy()
  cy = null
})
</script>

<template>
  <div class="relative w-full rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
    <div ref="container" :style="{ height: `${height}px` }" class="w-full" />

    <div
      v-if="isRendering"
      class="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-[#0f172a]/60"
    >
      <span class="w-7 h-7 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin block" />
      <span class="text-[11px] text-slate-500 tracking-wider">配置を計算中...</span>
    </div>
  </div>
</template>
