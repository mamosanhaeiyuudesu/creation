<script setup lang="ts">
definePageMeta({ ssr: false, layout: 'miyako' })

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

interface AiPhase {
  era: string
  title: string
  summary: string
  detail: string
}

const MAX_EDGES_PER_NODE = 6
const CACHE_PREFIX = 'miyako_keyword_evolution:'

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

const selectedWord = ref<string | null>(null)
const selectedEdge = ref<{ source: string; target: string } | null>(null)
const phases = ref<AiPhase[]>([])
const phasesB = ref<AiPhase[]>([])
const aiLoading = ref(false)
const aiLoadingB = ref(false)
const popupOpen = ref(false)
const allExpanded = ref(false)

let cy: any = null

watch([selectedCategory, selectedWord], () => {
  const query: Record<string, string> = {}
  if (selectedCategory.value !== '暮らし・福祉') query.cat = selectedCategory.value
  if (selectedWord.value) query.node = selectedWord.value
  router.replace({ query })
})

function breakAtKuten(text: string): string {
  if (!text) return ''
  return text.replace(/。(?!\n)/g, '。\n')
}

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
          'cursor': 'pointer',
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
        selector: 'edge.edge-selected',
        style: {
          'opacity': 1,
          'line-color': '#fbbf24',
          'z-index': 999,
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
    // 接続数上位8ノードの密集エリアにズームイン
    const sorted = cy.nodes().sort((a: any, b: any) => b.connectedEdges().length - a.connectedEdges().length)
    const focusNodes = sorted.slice(0, Math.min(8, sorted.length))
    cy.fit(focusNodes, 20)

    rendering.value = false

    if (initNodeLabel.value && !selectedWord.value && cy) {
      const node = cy.getElementById(initNodeLabel.value)
      if (node.length > 0) {
        node.addClass('selected')
        fetchKeyword(initNodeLabel.value)
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
    cy!.elements().removeClass('selected edge-selected')
    node.addClass('selected')
    fetchKeyword(node.data('label'))
  })

  cy.on('tap', 'edge', (evt: any) => {
    const edge = evt.target
    const sourceId = edge.data('source')
    const targetId = edge.data('target')
    cy!.elements().removeClass('selected edge-selected')
    edge.addClass('edge-selected')
    cy.getElementById(sourceId).addClass('selected')
    cy.getElementById(targetId).addClass('selected')
    fetchKeywordPair(sourceId, targetId)
  })
}

// ── キーワード検索（keyword.vue と同じ API・同じキャッシュ） ────

async function fetchPhasesFor(word: string): Promise<AiPhase[]> {
  const cacheKey = CACHE_PREFIX + word
  try {
    const cached = localStorage.getItem(cacheKey)
    if (cached) return JSON.parse(cached)
  } catch {
    localStorage.removeItem(cacheKey)
  }
  const data = await $fetch<{ phases: AiPhase[] }>('/api/miyako/keyword', {
    method: 'POST',
    body: { word },
  })
  try { localStorage.setItem(cacheKey, JSON.stringify(data.phases)) } catch {}
  return data.phases
}

async function fetchKeyword(word: string) {
  selectedWord.value = word
  selectedEdge.value = null
  phases.value = []
  phasesB.value = []
  allExpanded.value = false
  popupOpen.value = true

  aiLoading.value = true
  try {
    phases.value = await fetchPhasesFor(word)
  } catch {
    phases.value = [{ era: '', title: 'エラー', summary: '取得に失敗しました。', detail: '' }]
  } finally {
    aiLoading.value = false
  }
}

async function fetchKeywordPair(source: string, target: string) {
  selectedWord.value = source
  selectedEdge.value = { source, target }
  phases.value = []
  phasesB.value = []
  allExpanded.value = false
  popupOpen.value = true
  aiLoading.value = true
  aiLoadingB.value = true

  const [resA, resB] = await Promise.allSettled([
    fetchPhasesFor(source),
    fetchPhasesFor(target),
  ])

  phases.value = resA.status === 'fulfilled' ? resA.value : [{ era: '', title: 'エラー', summary: '取得に失敗しました。', detail: '' }]
  aiLoading.value = false

  phasesB.value = resB.status === 'fulfilled' ? resB.value : [{ era: '', title: 'エラー', summary: '取得に失敗しました。', detail: '' }]
  aiLoadingB.value = false
}

function closePopup() {
  popupOpen.value = false
  selectedWord.value = null
  selectedEdge.value = null
  phases.value = []
  phasesB.value = []
  if (cy) cy.elements().removeClass('selected edge-selected')
}

// ── 初期化 ──────────────────────────────────────────

onMounted(async () => {
  if (window.innerWidth < 768) {
    router.replace('/miyako/yearly')
    return
  }
  pairs.value = await $fetch<Pair[]>('/data/pairs.json')
  loading.value = false
  await nextTick()
  renderGraph()
})

watch(selectedCategory, () => {
  selectedWord.value = null
  selectedEdge.value = null
  phases.value = []
  phasesB.value = []
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

        <div class="ml-auto flex items-center gap-3 shrink-0">
          <MiyakoDataPeriod kind="static" />
          <span class="font-mono text-[9.5px] text-[#9aa3c0] tracking-[0.1em]">
            {{ graphStats.nodes }} 語 · {{ graphStats.edges }} 接続
          </span>
        </div>
      </div>

      <!-- Full-width graph -->
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
          スクロール / ピンチで拡大縮小・円をクリックで議論を分析
        </div>
      </div>
    </template>

    <!-- Keyword popup overlay -->
    <Teleport to="body">
      <div v-if="popupOpen" class="popup-overlay" @click.self="closePopup">
        <div class="popup-box">
          <!-- Popup header -->
          <div class="popup-header">
            <div class="flex items-center gap-2 min-w-0">
              <template v-if="selectedEdge">
                <span class="font-mono text-[10px] text-[#6878a8] tracking-[0.15em] uppercase shrink-0">「{{ selectedEdge.source }}」と「{{ selectedEdge.target }}」</span>
                <span class="text-[12px] text-[#9aa3c0] shrink-0">の議論の変遷（2005年〜現在）</span>
              </template>
              <template v-else>
                <span class="font-mono text-[10px] text-[#6878a8] tracking-[0.15em] uppercase shrink-0">「{{ selectedWord }}」</span>
                <span class="text-[12px] text-[#9aa3c0] shrink-0">2005年〜現在の議論の変遷</span>
              </template>
            </div>
            <button class="popup-close" @click="closePopup">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <!-- 単語1語モード -->
          <template v-if="!selectedEdge">
            <!-- Loading -->
            <div v-if="aiLoading" class="flex flex-col items-center justify-center py-16 gap-4">
              <span class="w-8 h-8 rounded-full border-2 border-[#1A237E]/20 border-t-[#1A237E] animate-spin block" />
              <p class="text-[12px] text-[#9aa3c0]">「{{ selectedWord }}」の変遷を調べています...</p>
            </div>
            <!-- Phase timeline -->
            <div v-else class="popup-timeline">
              <template v-for="(phase, i) in phases" :key="i">
                <div
                  class="phase-card flex-1 min-w-0"
                  :class="{ 'phase-card-expanded': allExpanded }"
                  @click="allExpanded = !allExpanded"
                >
                  <div class="phase-era">
                    <span class="font-mono text-[8.5px] tracking-[0.18em] text-[#a5b4fc]/70 uppercase mr-2">Era</span>
                    <span class="text-[11px] font-semibold text-[#a5b4fc]">{{ phase.era }}</span>
                  </div>
                  <div class="phase-title">{{ phase.title }}</div>
                  <div class="phase-summary">{{ breakAtKuten(phase.summary) }}</div>
                  <div class="phase-toggle" :class="{ 'phase-toggle-open': allExpanded }">
                    <span>{{ allExpanded ? '閉じる' : '詳しく見る' }}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="phase-toggle-chevron"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                  <div v-if="allExpanded && phase.detail" class="phase-detail">
                    {{ breakAtKuten(phase.detail) }}
                  </div>
                </div>
                <div v-if="i < phases.length - 1" class="phase-arrow">→</div>
              </template>
            </div>
          </template>

          <!-- 辺クリック（2語）モード -->
          <template v-else>
            <div class="popup-two-words">
              <!-- Word A -->
              <div class="popup-word-section">
                <div class="popup-word-heading">「{{ selectedEdge.source }}」の変遷</div>
                <div v-if="aiLoading" class="flex items-center justify-center py-8 gap-3">
                  <span class="w-6 h-6 rounded-full border-2 border-[#1A237E]/20 border-t-[#1A237E] animate-spin block" />
                  <span class="text-[12px] text-[#9aa3c0]">調べています...</span>
                </div>
                <div v-else class="popup-timeline">
                  <template v-for="(phase, i) in phases" :key="'a-' + i">
                    <div
                      class="phase-card flex-1 min-w-0"
                      :class="{ 'phase-card-expanded': allExpanded }"
                      @click="allExpanded = !allExpanded"
                    >
                      <div class="phase-era">
                        <span class="font-mono text-[8.5px] tracking-[0.18em] text-[#a5b4fc]/70 uppercase mr-2">Era</span>
                        <span class="text-[11px] font-semibold text-[#a5b4fc]">{{ phase.era }}</span>
                      </div>
                      <div class="phase-title">{{ phase.title }}</div>
                      <div class="phase-summary">{{ breakAtKuten(phase.summary) }}</div>
                      <div class="phase-toggle" :class="{ 'phase-toggle-open': allExpanded }">
                        <span>{{ allExpanded ? '閉じる' : '詳しく見る' }}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="phase-toggle-chevron"><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                      <div v-if="allExpanded && phase.detail" class="phase-detail">
                        {{ breakAtKuten(phase.detail) }}
                      </div>
                    </div>
                    <div v-if="i < phases.length - 1" class="phase-arrow">→</div>
                  </template>
                </div>
              </div>

              <div class="popup-word-divider" />

              <!-- Word B -->
              <div class="popup-word-section">
                <div class="popup-word-heading">「{{ selectedEdge.target }}」の変遷</div>
                <div v-if="aiLoadingB" class="flex items-center justify-center py-8 gap-3">
                  <span class="w-6 h-6 rounded-full border-2 border-[#1A237E]/20 border-t-[#1A237E] animate-spin block" />
                  <span class="text-[12px] text-[#9aa3c0]">調べています...</span>
                </div>
                <div v-else class="popup-timeline">
                  <template v-for="(phase, i) in phasesB" :key="'b-' + i">
                    <div
                      class="phase-card flex-1 min-w-0"
                      :class="{ 'phase-card-expanded': allExpanded }"
                      @click="allExpanded = !allExpanded"
                    >
                      <div class="phase-era">
                        <span class="font-mono text-[8.5px] tracking-[0.18em] text-[#a5b4fc]/70 uppercase mr-2">Era</span>
                        <span class="text-[11px] font-semibold text-[#a5b4fc]">{{ phase.era }}</span>
                      </div>
                      <div class="phase-title">{{ phase.title }}</div>
                      <div class="phase-summary">{{ breakAtKuten(phase.summary) }}</div>
                      <div class="phase-toggle" :class="{ 'phase-toggle-open': allExpanded }">
                        <span>{{ allExpanded ? '閉じる' : '詳しく見る' }}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="phase-toggle-chevron"><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                      <div v-if="allExpanded && phase.detail" class="phase-detail">
                        {{ breakAtKuten(phase.detail) }}
                      </div>
                    </div>
                    <div v-if="i < phasesB.length - 1" class="phase-arrow">→</div>
                  </template>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
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

/* ── Graph area ─────────────────────────── */

.graph-area {
  position: relative;
  flex: 1;
  min-height: 0;
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
.legend-row:last-child { margin-bottom: 0; }

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

/* ── Popup overlay ──────────────────────── */

.popup-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(28, 45, 90, 0.55);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 20px;
}

.popup-box {
  background: #f0f2f8;
  border-radius: 12px;
  box-shadow: 0 8px 40px rgba(28, 45, 90, 0.35);
  width: 100%;
  max-width: 1100px;
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #dde2ef;
  flex-shrink: 0;
  gap: 12px;
}

.popup-close {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #6878a8;
  transition: background 0.12s, color 0.12s;
}
.popup-close:hover {
  background: #eef1fb;
  color: #1c2d5a;
}

.popup-timeline {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0;
  padding: 16px;
  overflow-x: auto;
  overflow-y: auto;
  flex: 1;
}

/* ── Phase cards (same style as keyword.vue) ── */

.phase-card {
  background: #fff;
  border: 1px solid #dde2ef;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(28,45,90,0.07), 0 0 0 1px rgba(28,45,90,0.04);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: box-shadow 0.15s, border-color 0.15s;
  min-width: 160px;
}
.phase-card:hover {
  border-color: #3d5fc4;
  box-shadow: 0 4px 14px rgba(61,95,196,0.13), 0 0 0 1px rgba(61,95,196,0.15);
}
.phase-card-expanded {
  border-color: #3d5fc4;
  box-shadow: 0 4px 14px rgba(61,95,196,0.13), 0 0 0 1px rgba(61,95,196,0.2);
}

.phase-era {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  background: #1c2d5a;
  padding: 8px 14px;
  border-left: 3px solid #a5b4fc;
}

.phase-title {
  font-size: 15px;
  font-weight: 700;
  color: #1c2d5a;
  padding: 10px 14px 4px;
  line-height: 1.55;
}

.phase-summary {
  font-size: 13px;
  color: #3a4a72;
  padding: 0 14px 12px;
  line-height: 1.75;
  flex: 1;
  white-space: pre-line;
}

.phase-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6878a8;
  padding: 5px 14px 9px;
  margin-top: auto;
}
.phase-toggle-open { color: #3d5fc4; }

.phase-toggle-chevron {
  transition: transform 0.2s;
}
.phase-toggle-open .phase-toggle-chevron {
  transform: rotate(180deg);
}

.phase-detail {
  font-size: 13px;
  color: #1c2d5a;
  background: #f4f6fc;
  border-top: 1px solid #dde2ef;
  padding: 10px 14px 12px;
  line-height: 1.78;
  white-space: pre-line;
}

.phase-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 18px;
  padding: 6px 5px;
  color: #3d5fc4;
  opacity: 0.45;
}

/* ── 2語モード（辺クリック） ─────────────── */

.popup-two-words {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.popup-word-section {
  padding: 12px 0;
}

.popup-word-heading {
  font-size: 12px;
  font-weight: 700;
  color: #6878a8;
  letter-spacing: 0.08em;
  padding: 0 16px 8px;
  border-left: 3px solid #3d5fc4;
  margin-left: 16px;
}

.popup-word-divider {
  height: 1px;
  background: #dde2ef;
  margin: 0 16px;
}
</style>
