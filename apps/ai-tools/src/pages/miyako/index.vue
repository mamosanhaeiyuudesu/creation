<script setup lang="ts">
definePageMeta({ ssr: false, layout: 'miyako', alias: ['/miyako', '/miyako/network'] })

useHead({ title: import.meta.dev ? '宮古議事録 (dev)' : '宮古議事録' })

import { CATEGORY_WORDS, CATEGORIES, CATEGORY_SHORT } from '~/utils/miyako/categories'

interface Pair {
  source: string
  target: string
  count: number
}

interface TooltipState {
  label: string
  totalCount: number
  edgeCount: number
  x: number
  y: number
}

interface AiTopic {
  title: string
  period: string
  conclusion: string
  flow: string[]
}

const MAX_EDGES_PER_NODE = 6

const route = useRoute()
const router = useRouter()

const pairs = ref<Pair[]>([])
const loading = ref(true)
const rendering = ref(false)
const cyContainer = ref<HTMLElement | null>(null)
const tooltip = ref<TooltipState | null>(null)
const graphStats = ref({ nodes: 0, edges: 0 })
const CATEGORY_OPTIONS = [...CATEGORIES] as string[]

const _initCat = (route.query.cat as string) ?? ''
const selectedCategory = ref<string>(
  CATEGORY_OPTIONS.includes(_initCat) ? _initCat : '暮らし・福祉'
)
const initNodeLabel = ref((route.query.node as string) ?? '')

const selectedNode = ref<{ label: string; neighbors: string[] } | null>(null)
const aiTopics = ref<AiTopic[]>([])
const aiLoading = ref(false)

let cy: any = null

// state → URL 同期
watch([selectedCategory, selectedNode], () => {
  const query: Record<string, string> = {}
  if (selectedCategory.value !== '暮らし・福祉') query.cat = selectedCategory.value
  if (selectedNode.value) query.node = selectedNode.value.label
  router.replace({ query })
})

// ── グラフ構築 ──────────────────────────────────────

function buildElements(categoryWords: Set<string> | null) {
  const filtered = categoryWords
    ? pairs.value.filter(p => categoryWords.has(p.source) || categoryWords.has(p.target))
    : pairs.value.slice(0, 3000)

  const nodeEdgeCount = new Map<string, number>()
  const selectedEdges: Pair[] = []

  for (const pair of filtered) {
    const sCount = nodeEdgeCount.get(pair.source) ?? 0
    const tCount = nodeEdgeCount.get(pair.target) ?? 0
    if (sCount < MAX_EDGES_PER_NODE && tCount < MAX_EDGES_PER_NODE) {
      selectedEdges.push(pair)
      nodeEdgeCount.set(pair.source, sCount + 1)
      nodeEdgeCount.set(pair.target, tCount + 1)
    }
  }

  const nodeTotalCount = new Map<string, number>()
  for (const edge of selectedEdges) {
    nodeTotalCount.set(edge.source, (nodeTotalCount.get(edge.source) ?? 0) + edge.count)
    nodeTotalCount.set(edge.target, (nodeTotalCount.get(edge.target) ?? 0) + edge.count)
  }

  const maxCount = Math.max(...nodeTotalCount.values(), 1)
  const maxEdgeCount = Math.max(...selectedEdges.map(e => e.count), 1)

  const nodes = [...nodeTotalCount.keys()].map(id => ({
    data: {
      id,
      label: id,
      totalCount: nodeTotalCount.get(id)!,
      edgeCount: nodeEdgeCount.get(id)!,
      size: 20 + Math.pow(nodeTotalCount.get(id)! / maxCount, 0.4) * 36,
    }
  }))

  const edges = selectedEdges.map((e, i) => ({
    data: {
      id: `e${i}`,
      source: e.source,
      target: e.target,
      count: e.count,
      width: 1 + (e.count / maxEdgeCount) * 5,
    }
  }))

  return { nodes, edges }
}

// ── グラフ描画 ──────────────────────────────────────

async function renderGraph() {
  if (!cyContainer.value || !pairs.value.length) return

  rendering.value = true
  tooltip.value = null

  if (cy) {
    cy.destroy()
    cy = null
  }

  const categoryWords = CATEGORY_WORDS[selectedCategory.value] ?? null
  const { nodes, edges } = buildElements(categoryWords)
  graphStats.value = { nodes: nodes.length, edges: edges.length }

  const { default: cytoscape } = await import('cytoscape')

  cy = cytoscape({
    container: cyContainer.value,
    elements: { nodes, edges },
    style: [
      {
        selector: 'node',
        style: {
          'background-color': '#1A237E',
          'border-width': 2,
          'border-color': '#3d5fc4',
          'label': 'data(label)',
          'color': '#ffffff',
          'font-size': '12px',
          'font-family': '"Hiragino Sans", "Noto Sans JP", system-ui, sans-serif',
          'text-valign': 'center',
          'text-halign': 'center',
          'width': 'data(size)',
          'height': 'data(size)',
          'min-zoomed-font-size': 7,
          'text-outline-width': 1.5,
          'text-outline-color': '#1A237E',
          'cursor': 'pointer',
        } as any
      },
      {
        selector: 'edge',
        style: {
          'width': 'data(width)',
          'line-color': '#5C6BC0',
          'opacity': 0.5,
          'curve-style': 'bezier',
        } as any
      },
      {
        selector: 'node.selected',
        style: {
          'background-color': '#b45309',
          'border-color': '#fbbf24',
          'border-width': 3,
          'z-index': 1000,
        } as any
      },
      {
        selector: 'node.highlighted',
        style: {
          'background-color': '#3d5fc4',
          'border-color': '#a5b4fc',
          'border-width': 3,
          'z-index': 999,
        } as any
      },
      {
        selector: 'edge.highlighted',
        style: {
          'opacity': 1,
          'line-color': '#a5b4fc',
          'z-index': 998,
        } as any
      },
      {
        selector: '.dimmed',
        style: { 'opacity': 0.12 } as any
      }
    ],
    wheelSensitivity: 1,
  })

  const layout = cy.layout({
    name: 'cose',
    animate: false,
    padding: 48,
    nodeRepulsion: () => 10000,
    idealEdgeLength: () => 90,
    edgeElasticity: () => 100,
    gravity: 1,
    numIter: 600,
    fit: true,
    randomize: true,
  } as any)

  layout.on('layoutstop', () => {
    // 接続数の多い上位ノード（密集中心）にズームイン
    const sorted = cy.nodes().sort((a: any, b: any) => b.connectedEdges().length - a.connectedEdges().length)
    const focusNodes = sorted.slice(0, Math.min(25, sorted.length))
    cy.fit(focusNodes, 60)

    rendering.value = false

    if (initNodeLabel.value && !selectedNode.value && cy) {
      const node = cy.getElementById(initNodeLabel.value)
      if (node.length > 0) {
        node.addClass('selected')
        const neighbors: string[] = node.neighborhood('node').map((n: any) => n.data('label'))
        searchNode(initNodeLabel.value, neighbors)
      }
      initNodeLabel.value = ''
    }
  })

  layout.run()

  cyContainer.value.addEventListener('mousemove', (e: MouseEvent) => {
    if (tooltip.value) {
      tooltip.value = { ...tooltip.value, x: e.offsetX, y: e.offsetY }
    }
  })

  cy.on('mouseover', 'node', (evt: any) => {
    const node = evt.target
    const pos = node.renderedPosition()
    tooltip.value = {
      label: node.data('label'),
      totalCount: node.data('totalCount'),
      edgeCount: node.data('edgeCount'),
      x: pos.x,
      y: pos.y,
    }
    const neighborhood = node.neighborhood().add(node)
    cy!.elements().not('.selected').addClass('dimmed')
    neighborhood.removeClass('dimmed').addClass('highlighted')
    neighborhood.edges().addClass('highlighted')
  })

  cy.on('mouseout', 'node', () => {
    tooltip.value = null
    cy!.elements().removeClass('dimmed highlighted')
  })

  cy.on('tap', 'node', (evt: any) => {
    const node = evt.target
    cy!.elements().removeClass('selected')
    node.addClass('selected')
    const neighbors: string[] = node.neighborhood('node').map((n: any) => n.data('label'))
    searchNode(node.data('label'), neighbors)
  })
}

// ── RAG 検索 ────────────────────────────────────────

function periodToSortKey(period: string): number {
  if (/令和元年/.test(period)) return 2019 * 100
  const reiwa = period.match(/令和(\d+)年/)
  if (reiwa) return (2018 + parseInt(reiwa[1])) * 100
  const heisei = period.match(/平成(\d+)年/)
  if (heisei) return (1988 + parseInt(heisei[1])) * 100
  return 0
}

async function searchNode(label: string, neighbors: string[]) {
  selectedNode.value = { label, neighbors }
  aiTopics.value = []

  const word = neighbors.length > 0
    ? `${label}（${neighbors.join('、')}）`
    : label

  const cacheKey = `miyako_network:${word}`
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      aiTopics.value = parsed
      return
    } catch {
      localStorage.removeItem(cacheKey)
    }
  }

  aiLoading.value = true
  try {
    const data = await $fetch<{ topics: AiTopic[] }>('/api/miyako/keyword', {
      method: 'POST',
      body: { word, count: 3, model: 'gpt-4.1-mini' },
    })
    aiTopics.value = [...data.topics].sort((a, b) => periodToSortKey(a.period) - periodToSortKey(b.period))
    localStorage.setItem(cacheKey, JSON.stringify(aiTopics.value))
  } catch {
    aiTopics.value = [{ title: 'エラー', period: '', conclusion: '取得に失敗しました。', flow: [] }]
  } finally {
    aiLoading.value = false
  }
}

// ── 初期化 ──────────────────────────────────────────

onMounted(async () => {
  pairs.value = await $fetch<Pair[]>('/data/pairs.json')
  loading.value = false
  await nextTick()
  renderGraph()
})

watch(selectedCategory, () => {
  selectedNode.value = null
  aiTopics.value = []
  renderGraph()
})
</script>

<template>
  <div class="network-page">
    <MiyakoHeader active-page="network" />

    <!-- Loading state -->
    <div v-if="loading" class="flex flex-col justify-center items-center py-[72px] px-6 gap-3">
      <span class="w-8 h-8 rounded-full border-2 border-[#1A237E]/20 border-t-[#1A237E] animate-spin block" />
      <span class="font-mono text-[10px] text-[#9aa3c0] tracking-[0.12em] uppercase">Loading data...</span>
    </div>

    <template v-else>
      <!-- Controls bar -->
      <div class="flex items-center gap-x-1.5 gap-y-1 flex-wrap px-4 py-2 bg-white/60 border-b border-[#e0e5f0] shrink-0">
        <button
          v-for="cat in CATEGORY_OPTIONS"
          :key="cat"
          class="text-[10.5px] font-medium px-2 py-[2px] rounded-[3px] transition-all leading-5"
          :class="selectedCategory === cat
            ? 'bg-[#1A237E] text-white shadow-[0_1px_4px_rgba(26,35,126,0.3)]'
            : 'text-[#6878a8] hover:text-[#1c2d5a] hover:bg-[#eef1fb]'"
          @click="selectedCategory = cat"
        >{{ CATEGORY_SHORT[cat] ?? cat }}</button>

        <span class="ml-auto font-mono text-[9.5px] text-[#9aa3c0] tracking-[0.1em] shrink-0">
          {{ graphStats.nodes }} 語 · {{ graphStats.edges }} 接続
        </span>
      </div>

      <!-- Two-column content -->
      <div class="content-row">

        <!-- Left: graph -->
        <div class="graph-area">
          <div ref="cyContainer" class="cy-canvas" />

          <div v-if="rendering" class="render-overlay">
            <span class="w-8 h-8 rounded-full border-2 border-[#1A237E]/20 border-t-[#1A237E] animate-spin block" />
            <span class="font-mono text-[10px] text-[#9aa3c0] tracking-[0.12em] uppercase mt-3">Rendering graph...</span>
          </div>

          <div
            v-if="tooltip"
            class="node-tooltip"
            :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
          >
            <div class="tooltip-label">{{ tooltip.label }}</div>
            <div class="tooltip-stat">共起: {{ tooltip.totalCount.toLocaleString() }} 回</div>
            <div class="tooltip-stat">接続: {{ tooltip.edgeCount }} 語</div>
          </div>

          <div class="legend">
            <div class="legend-row">
              <span class="legend-dot" />
              <span>単語（大きさ＝出現頻度）</span>
            </div>
            <div class="legend-row">
              <span class="legend-line" />
              <span>共起関係（太さ＝文中の隣接頻度）</span>
            </div>
          </div>

          <div class="zoom-hint">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 opacity-70"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            スクロール / ピンチで拡大縮小
          </div>
        </div>

        <!-- Right: AI result panel -->
        <div class="side-panel">

          <!-- Initial state -->
          <div v-if="!selectedNode && !aiLoading" class="panel-empty">
            <div class="click-cta">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-3 opacity-40"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <p class="click-cta-main">円をクリックで<br>議論の変遷をAI分析</p>
              <p class="click-cta-sub">単語を選ぶと、宮古島市議会での<br>議論の歴史をAIが解説します</p>
            </div>
          </div>

          <!-- Loading -->
          <div v-else-if="aiLoading" class="panel-empty">
            <span class="w-8 h-8 rounded-full border-2 border-[#1A237E]/20 border-t-[#1A237E] animate-spin block" />
            <p class="font-mono text-[10px] text-[#9aa3c0] tracking-[0.12em] uppercase mt-3">
              Searching "{{ selectedNode?.label }}"...
            </p>
          </div>

          <!-- Results -->
          <template v-else>
            <!-- Search context header -->
            <div class="search-header">
              <span class="font-mono text-[9px] tracking-[0.18em] text-[#a5b4fc] uppercase mr-2 shrink-0">Query</span>
              <span class="text-[12px] font-semibold text-white truncate">{{ selectedNode?.label }}</span>
              <span v-if="selectedNode?.neighbors.length" class="text-[10px] text-[#a5b4fc]/70 ml-1 truncate shrink-0">
                + {{ selectedNode.neighbors.join('・') }}
              </span>
            </div>

            <!-- Topic cards (top=oldest, bottom=newest) -->
            <div class="topics-list">
              <template v-for="(topic, i) in aiTopics" :key="i">
                <div class="topic-card">
                  <div class="card-period-bar">
                    <span class="font-mono text-[8.5px] tracking-[0.2em] text-[#a5b4fc] uppercase mr-3 shrink-0">Period</span>
                    <span class="text-[12px] font-semibold tracking-[0.02em]">{{ topic.period || '会期不明' }}</span>
                  </div>
                  <div class="card-body">
                    <div class="card-title">{{ topic.title }}</div>
                    <div class="card-conclusion">{{ topic.conclusion }}</div>
                    <div v-if="topic.flow?.length" class="flow-list">
                      <template v-for="(step, si) in topic.flow" :key="si">
                        <div class="flow-step">
                          <span class="step-num">{{ String(si + 1).padStart(2, '0') }}</span>
                          <span>{{ step }}</span>
                        </div>
                        <div v-if="si < topic.flow.length - 1" class="flow-arrow">↓</div>
                      </template>
                    </div>
                  </div>
                </div>

                <!-- Time arrow between cards -->
                <div v-if="i < aiTopics.length - 1" class="time-arrow">
                  <div class="time-arrow-line" />
                  <span class="time-arrow-icon">↓</span>
                  <div class="time-arrow-line" />
                </div>
              </template>
            </div>
          </template>

        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.network-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background-color: #f0f2f8;
  background-image: radial-gradient(circle, rgba(100,120,168,0.12) 1px, transparent 1px);
  background-size: 20px 20px;
}

.content-row {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 0;
}

/* ── Graph area ─────────────────────────── */

.graph-area {
  position: relative;
  flex: 1;
  min-width: 0;
}

.cy-canvas {
  position: absolute;
  inset: 0;
}

.render-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(240, 242, 248, 0.75);
  backdrop-filter: blur(2px);
  z-index: 10;
}

.node-tooltip {
  position: absolute;
  z-index: 20;
  pointer-events: none;
  background: rgba(28, 45, 90, 0.92);
  backdrop-filter: blur(4px);
  color: #fff;
  border-radius: 7px;
  padding: 8px 12px;
  box-shadow: 0 4px 16px rgba(28, 45, 90, 0.35);
  transform: translate(-50%, calc(-100% - 14px));
  white-space: nowrap;
}

.tooltip-label {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 4px;
}

.tooltip-stat {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  color: #a5b4fc;
  line-height: 1.6;
}

.legend {
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(4px);
  border: 1px solid #dde2ef;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 10.5px;
  color: #6878a8;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #1A237E;
  border: 1.5px solid #3d5fc4;
  flex-shrink: 0;
}

.legend-line {
  width: 24px;
  height: 2px;
  background: #5C6BC0;
  flex-shrink: 0;
}

/* ── Zoom hint ──────────────────────────── */

.zoom-hint {
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(28, 45, 90, 0.82);
  backdrop-filter: blur(4px);
  color: rgba(255, 255, 255, 0.85);
  font-size: 11.5px;
  font-weight: 500;
  padding: 7px 12px;
  border-radius: 20px;
  letter-spacing: 0.01em;
  box-shadow: 0 2px 10px rgba(28, 45, 90, 0.25);
}

/* ── Side panel ─────────────────────────── */

.side-panel {
  width: 420px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #dde2ef;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(6px);
  overflow-y: auto;
  overflow-x: hidden;
}

.panel-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
}

.click-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.click-cta-main {
  font-size: 15px;
  font-weight: 700;
  color: #1c2d5a;
  line-height: 1.55;
  margin-bottom: 10px;
}

.click-cta-sub {
  font-size: 11.5px;
  color: #9aa3c0;
  line-height: 1.7;
}

.search-header {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  overflow: hidden;
  padding: 10px 14px;
  background: #1c2d5a;
  color: white;
  border-bottom: 1px solid rgba(61, 95, 196, 0.3);
  flex-shrink: 0;
  gap: 4px;
}

.topics-list {
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 0;
}

.topic-card {
  background: white;
  border: 1px solid #dde2ef;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(28, 45, 90, 0.07), 0 0 0 1px rgba(28, 45, 90, 0.04);
  overflow: hidden;
}

.card-period-bar {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  background: #1c2d5a;
  color: white;
  padding: 8px 12px;
  border-left: 3px solid #a5b4fc;
}

.card-body {
  padding: 10px 12px;
  font-size: 13px;
  color: #1c2d5a;
  line-height: 1.72;
}

.card-title {
  font-size: 12.5px;
  font-weight: 700;
  margin-bottom: 6px;
  color: #1c2d5a;
  border-left: 3px solid #3d5fc4;
  padding-left: 7px;
}

.card-conclusion {
  font-size: 11.5px;
  color: #3a4a72;
  background: #f4f6fc;
  border: 1px solid #e8ecf8;
  border-radius: 5px;
  padding: 6px 9px;
  margin-bottom: 8px;
  line-height: 1.7;
}

.flow-list {
  display: flex;
  flex-direction: column;
}

.flow-step {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  font-size: 11.5px;
  color: #1c2d5a;
  background: #fff;
  border: 1px solid #dde2ef;
  border-radius: 4px;
  padding: 5px 8px;
  line-height: 1.6;
}

.step-num {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  color: #a5b4fc;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 2px;
  letter-spacing: 0.05em;
}

.flow-arrow {
  text-align: center;
  color: #3d5fc4;
  font-size: 12px;
  line-height: 1.2;
  opacity: 0.4;
  margin: 1px 0;
}

.time-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 0;
  gap: 0;
}

.time-arrow-line {
  width: 1px;
  height: 10px;
  background: #c5cad8;
}

.time-arrow-icon {
  font-size: 16px;
  color: #9aa3c0;
  line-height: 1;
}
</style>
