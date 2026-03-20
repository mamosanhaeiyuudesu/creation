<script setup lang="ts">
definePageMeta({ ssr: false })

interface WordScore {
  word: string
  score: number
}

type FeaturesData = Record<string, WordScore[]>

const STOPWORDS = new Set([
  '言う', 'つく', '此れ', '其れ', '其の', '此の', '成る', '有る', '居る', '致す',
  '掛かる', '受ける', '関する', '行う', '行なう', '元年', '因る', '出る', '入る',
  '見る', '置く', '来る', '対する', '付く', '取る', '当たる', '係る', '伴う',
  '図る', '向ける', '与える', '設ける', '基づく', '求める', '休憩', '質疑',
  '議決', '議案', '請け負い', '一貫', '子供', '道路',
])

const TOP_KEYWORDS = 100
const MAX_DISPLAY = 20
const CELL_WIDTH = 28

const loading = ref(true)
const rawData = ref<FeaturesData>({})
const sessionTypeFilter = ref<'定例会' | '臨時会'>('定例会')
const selectedSession = ref<string | null>(null)
const sessionCount = MAX_DISPLAY
const windowEnd = ref(0)

const selectedWord = ref<string | null>(null)
const aiSummary = ref<string>('')
const aiLoading = ref(false)
const maxChars = ref(1000)
const MAX_CHARS_OPTIONS = [500, 1000, 2000]

const { marked } = await import('marked')
const renderedSummary = computed(() => {
  if (!aiSummary.value) return ''
  const html = marked(aiSummary.value) as string
  // ↓ のみの段落にクラスを付与してフロー矢印として強調
  return html.replace(/<p>↓<\/p>/g, '<p class="flow-arrow">↓</p>')
})

const WC_COLORS = [
  '#1A237E', '#283593', '#303F9F', '#3949AB',
  '#3F51B5', '#5C6BC0', '#7986CB', '#0D47A1',
  '#1565C0', '#1976D2', '#1E88E5',
]

const wordcloudWords = computed(() => {
  if (!selectedSession.value) return []
  const words = (rawData.value[selectedSession.value] ?? [])
    .filter(w => !STOPWORDS.has(w.word))
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
  if (!words.length) return []
  const maxScore = words[0].score
  const minScore = words[words.length - 1].score
  const range = maxScore - minScore || 1
  return words.map((w, i) => {
    const t = (w.score - minScore) / range
    const size = Math.round(11 + Math.pow(t, 0.55) * 26)  // 11px〜37px（平方根に近いカーブ）
    return { name: w.word, score: w.score, size, color: WC_COLORS[i % WC_COLORS.length] }
  })
})

// ── ワードクラウド螺旋レイアウト ─────────────────
const wcContainerRef = ref<HTMLElement>()
const wcPositions = ref<Record<string, { x: number; y: number }>>({})
const wcReady = ref(false)

// selectedSession が変わったらリセット（pre: DOM更新前）
watch(selectedSession, () => {
  wcReady.value = false
  wcPositions.value = {}
})

// 単語リストが変わった後（post: DOM更新後）に配置計算
watch(wordcloudWords, (words) => {
  if (!words.length) return
  layoutWordcloud()
}, { flush: 'post' })

function layoutWordcloud() {
  const container = wcContainerRef.value
  if (!container) return
  const cw = container.offsetWidth
  const ch = container.offsetHeight
  if (!cw || !ch) return

  const cx = cw / 2
  const cy = ch / 2
  const spans = Array.from(container.querySelectorAll<HTMLElement>('.wc-word'))
  const words = wordcloudWords.value
  if (!spans.length || spans.length !== words.length) return

  const newPos: Record<string, { x: number; y: number }> = {}
  const boxes: { x: number; y: number; hw: number; hh: number }[] = []

  for (let i = 0; i < spans.length; i++) {
    const el = spans[i]
    const hw = el.offsetWidth / 2 + 1
    const hh = el.offsetHeight / 2 + 1
    const name = words[i].name

    if (i === 0) {
      newPos[name] = { x: cx, y: cy }
      boxes.push({ x: cx, y: cy, hw, hh })
      continue
    }

    let px = cx, py = cy
    for (let step = 0; step < 2000; step++) {
      const theta = step * 0.12
      const r = 1.5 * theta
      const x = cx + r * Math.cos(theta)
      const y = cy + r * Math.sin(theta) * 0.65
      if (x - hw < 2 || x + hw > cw - 2) continue
      if (y - hh < 2 || y + hh > ch - 2) continue
      if (!boxes.some(b =>
        Math.abs(x - b.x) < hw + b.hw &&
        Math.abs(y - b.y) < hh + b.hh
      )) {
        px = x; py = y
        break
      }
    }
    newPos[name] = { x: px, y: py }
    boxes.push({ x: px, y: py, hw, hh })
  }

  // 配置済み単語の実際の占有矩形を測定してコンテナいっぱいに拡大
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity
  for (let i = 0; i < spans.length; i++) {
    const p = newPos[words[i].name]
    const hw = spans[i].offsetWidth / 2
    const hh = spans[i].offsetHeight / 2
    left   = Math.min(left,   p.x - hw)
    right  = Math.max(right,  p.x + hw)
    top    = Math.min(top,    p.y - hh)
    bottom = Math.max(bottom, p.y + hh)
  }
  const contentCx = (left + right) / 2
  const contentCy = (top + bottom) / 2
  const scaleX = (cw - 8) / (right - left)
  const scaleY = (ch - 8) / (bottom - top)
  const scale  = Math.min(scaleX, scaleY, 2.0)  // 最大2倍まで拡大

  if (scale > 1.05) {
    for (const name in newPos) {
      newPos[name] = {
        x: cx + (newPos[name].x - contentCx) * scale,
        y: cy + (newPos[name].y - contentCy) * scale,
      }
    }
  }

  wcPositions.value = newPos
  wcReady.value = true
}

const heatmapRef = ref<HTMLElement>()
let heatmapChart: any = null
let EC: any = null

onMounted(async () => {
  EC = await import('echarts')

  rawData.value = await $fetch<FeaturesData>('/data/miyako-features.json')
  loading.value = false
  await nextTick()
  renderHeatmap()
})

onUnmounted(() => {
  heatmapChart?.dispose()
})

function parseDate(key: string): Date {
  const m = key.match(/(\d{4}-\d{2}-\d{2})/)
  return m ? new Date(m[1]) : new Date(0)
}

function shortLabel(key: string): string {
  const m = key.match(/(令和|平成)(元|\d+)年\s+第(\d+)回\s+(定例会|臨時会)/)
  if (!m) return key
  const era = m[1] === '令和' ? '令' : '平'
  const year = m[2] === '元' ? '1' : m[2]
  return `${era}${year}-${m[3]}`
}

const filteredSessions = computed(() =>
  Object.keys(rawData.value)
    .filter(k => k.includes(sessionTypeFilter.value))
    .sort((a, b) => parseDate(a).getTime() - parseDate(b).getTime())
)

const windowEndMax = computed(() => filteredSessions.value.length)
const windowEndMin = computed(() => Math.min(sessionCount, filteredSessions.value.length))

const displayedSessions = computed(() => {
  const sessions = filteredSessions.value
  if (!sessions.length) return []
  const end = Math.min(windowEnd.value, sessions.length)
  const start = Math.max(0, end - sessionCount)
  return sessions.slice(start, end)
})

const topKeywords = computed(() => {
  const maxScore = new Map<string, number>()
  for (const key of displayedSessions.value) {
    for (const { word, score } of (rawData.value[key] ?? [])) {
      if (!STOPWORDS.has(word) && (maxScore.get(word) ?? 0) < score) {
        maxScore.set(word, score)
      }
    }
  }
  return [...maxScore.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_KEYWORDS)
    .map(([w]) => w)
})

const rangeLabel = computed(() => {
  const s = displayedSessions.value
  if (!s.length) return ''
  return `${shortLabel(s[0])} 〜 ${shortLabel(s[s.length - 1])}`
})

watch(filteredSessions, (sessions) => {
  windowEnd.value = sessions.length
}, { immediate: true })



function renderHeatmap() {
  if (!heatmapRef.value || !EC) return
  const sessions = displayedSessions.value
  const keywords = topKeywords.value
  const rowHeight = 22
  const chartHeight = keywords.length * rowHeight + 140
  const chartWidth = sessions.length * CELL_WIDTH + 280

  // null を -1 で表現して outOfRange カラーに割り当てる
  const data: [number, number, number][] = []
  for (let si = 0; si < sessions.length; si++) {
    const wordMap = new Map(
      (rawData.value[sessions[si]] ?? []).map(w => [w.word, w.score])
    )
    for (let ki = 0; ki < keywords.length; ki++) {
      const s = wordMap.get(keywords[ki])
      data.push([si, ki, s !== undefined ? s : -1])
    }
  }

  heatmapChart?.dispose()
  heatmapRef.value.style.width = chartWidth + 'px'
  heatmapRef.value.style.height = chartHeight + 'px'
  heatmapChart = EC.init(heatmapRef.value, null, { renderer: 'canvas' })

  heatmapChart.setOption({
    animation: false,
    grid: { top: 80, right: 20, bottom: 10, left: 130 },
    xAxis: {
      type: 'category',
      data: sessions.map(shortLabel),
      position: 'top',
      axisLabel: { rotate: 60, fontSize: 9, align: 'left', margin: 34 },
      splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.08)' } },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    yAxis: {
      type: 'category',
      data: keywords,
      inverse: true,
      axisLabel: { fontSize: 11 },
      splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.08)' } },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    visualMap: {
      show: false,
      min: 0,
      max: 0.45,
      inRange: { color: ['#EEF0FF', '#7986CB', '#1A237E'] },
      outOfRange: { color: '#EEEEEE' },
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.value[2] < 0) return ''
        const label = sessions[params.value[0]].replace(/〜[\d-]+$/, '〜')
        return `<b>${label}</b><br/>${keywords[params.value[1]]}: <b>${params.value[2].toFixed(3)}</b>`
      },
    },
    series: [{
      type: 'heatmap',
      data,
      cursor: 'pointer',
      itemStyle: { borderWidth: 0.5, borderColor: '#FAFAFA' },
      emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.2)' } },
    }],
  })

  heatmapChart.on('click', (params: any) => {
    if (params.value[2] < 0) return
    selectedSession.value = sessions[params.value[0]]
  })
}

async function fetchSummary(word: string) {
  if (!selectedSession.value) return
  selectedWord.value = word
  aiSummary.value = ''

  const cacheKey = `miyako_summary:${selectedSession.value}:${word}:${maxChars.value}`
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    aiSummary.value = cached
    return
  }

  aiLoading.value = true
  try {
    const data = await $fetch<{ summary: string }>('/api/miyako/search', {
      method: 'POST',
      body: { session: selectedSession.value, word, maxChars: maxChars.value },
    })
    aiSummary.value = data.summary
    localStorage.setItem(cacheKey, data.summary)
  } catch {
    aiSummary.value = '取得に失敗しました。'
  } finally {
    aiLoading.value = false
  }
}

async function resetAndRender() {
  selectedSession.value = null
  selectedWord.value = null
  aiSummary.value = ''
  await nextTick()
  renderHeatmap()
}

watch(sessionTypeFilter, async () => {
  await nextTick()
  resetAndRender()
})

watch([sessionCount, windowEnd], resetAndRender)
</script>

<template>
  <div class="min-h-screen bg-[#f0f2f8]">
    <!-- Page header -->
    <header class="bg-gradient-to-br from-[#121d3e] to-[#2a3f7a] px-6 py-5">
      <div class="max-w-[1400px] mx-auto">
        <h1 class="m-0 mb-1 text-[clamp(17px,2.5vw,22px)] font-bold text-white tracking-[0.03em]">
          宮古島市議会<span class="text-[#a5b4fc] ml-1.5">議事録分析</span>
        </h1>
        <p class="m-0 text-[11.5px] text-white/45 tracking-[0.02em]">会期ごとのキーワード出現傾向と議論内容をAIで可視化</p>
      </div>
    </header>

    <!-- Controls bar -->
    <div class="bg-white border-b border-[#dde2ef] px-6 py-2.5">
      <div class="max-w-[1400px] mx-auto flex items-center flex-wrap gap-y-2 gap-x-5">
        <div class="flex items-center gap-2">
          <span class="text-[11px] font-semibold text-[#6878a8] whitespace-nowrap uppercase tracking-[0.04em]">会期</span>
          <div class="flex rounded-lg overflow-hidden border border-[#3949AB]">
            <button
              v-for="opt in ['定例会', '臨時会']"
              :key="opt"
              :class="[
                'px-3 py-1 text-xs font-medium cursor-pointer border-none transition-colors',
                sessionTypeFilter === opt ? 'bg-[#1A237E] text-white' : 'bg-white text-[#1A237E] hover:bg-blue-50'
              ]"
              @click="sessionTypeFilter = opt as '定例会' | '臨時会'"
            >{{ opt }}</button>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <span class="text-[11px] font-semibold text-[#6878a8] whitespace-nowrap uppercase tracking-[0.04em]">期間</span>
          <input
            v-model.number="windowEnd"
            type="range"
            :min="windowEndMin"
            :max="windowEndMax"
            :step="1"
            class="ctrl-slider"
          />
          <span class="text-[11px] text-[#6878a8] whitespace-nowrap min-w-[110px]">{{ rangeLabel }}</span>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-[11px] font-semibold text-[#6878a8] whitespace-nowrap uppercase tracking-[0.04em]">要約文字数</span>
          <div class="flex rounded-lg overflow-hidden border border-[#3949AB]">
            <button
              v-for="n in MAX_CHARS_OPTIONS"
              :key="n"
              :class="[
                'px-3 py-1 text-xs font-medium cursor-pointer border-none transition-colors',
                maxChars === n ? 'bg-[#1A237E] text-white' : 'bg-white text-[#1A237E] hover:bg-blue-50'
              ]"
              @click="maxChars = n"
            >{{ n }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-[72px] px-6">
      <span class="w-11 h-11 rounded-full border-[3px] border-[#1A237E]/30 border-t-[#1A237E] animate-spin block" />
    </div>

    <!-- Main content -->
    <div v-else class="max-w-[1400px] mx-auto px-6 pt-4 pb-8 flex flex-col md:flex-row gap-3 items-stretch md:items-start">

      <!-- Heatmap panel -->
      <div class="flex-1 min-w-0 bg-white border border-[#dde2ef] rounded-[10px] shadow-[0_1px_4px_rgba(28,45,90,0.07),0_0_0_1px_rgba(28,45,90,0.06)] overflow-hidden">
        <div class="flex items-center gap-1 px-3.5 py-2.5 border-b border-[#dde2ef] bg-[#fafbff]">
          <span class="text-[11.5px] font-bold text-[#1c2d5a] tracking-[0.03em]">■ キーワード分布</span>
          <span class="text-[11px] text-[#6878a8] ml-2">{{ rangeLabel }}</span>
          <span class="text-[10.5px] text-[#6878a8] ml-auto opacity-70">列をクリックでワードクラウドを表示</span>
        </div>
        <div class="overflow-auto max-h-[600px] p-1.5">
          <div ref="heatmapRef" class="inline-block" />
        </div>
      </div>

      <!-- Side panel -->
      <div class="w-full md:w-[420px] flex-shrink-0 self-start bg-white border border-[#dde2ef] rounded-[10px] shadow-[0_1px_4px_rgba(28,45,90,0.07),0_0_0_1px_rgba(28,45,90,0.06)] overflow-hidden">
        <template v-if="selectedSession">
          <!-- Session header -->
          <div class="flex items-center gap-1 px-3.5 py-2.5 bg-[#eef1fb] border-b border-[#dde2ef]">
            <span class="opacity-70">📅</span>
            <span class="text-xs font-semibold text-[#1c2d5a] tracking-[0.02em]">{{ selectedSession?.replace(/〜[\d-]+$/, '〜') }}</span>
          </div>

          <!-- Wordcloud -->
          <div class="p-0">
            <div ref="wcContainerRef" class="wordcloud-container">
              <span
                v-for="item in wordcloudWords"
                :key="item.name"
                class="wc-word"
                :style="{
                  fontSize: item.size + 'px',
                  color: item.color,
                  left: (wcPositions[item.name]?.x ?? 0) + 'px',
                  top: (wcPositions[item.name]?.y ?? 0) + 'px',
                  opacity: wcReady ? 1 : 0,
                }"
                :title="`特徴度: ${item.score.toFixed(3)}`"
                @click="fetchSummary(item.name)"
              >{{ item.name }}</span>
            </div>
          </div>

          <!-- AI card -->
          <div class="mx-3 mb-3 border border-[#dde2ef] rounded-[10px] shadow-[0_1px_4px_rgba(28,45,90,0.07),0_0_0_1px_rgba(28,45,90,0.06)] overflow-hidden flex flex-col max-h-[300px]">
            <div v-if="!selectedWord" class="flex items-center px-3.5 py-3 text-xs text-[#6878a8]">
              👆 単語をクリックするとAI解説が表示されます
            </div>
            <template v-else>
              <div class="flex items-center flex-shrink-0 bg-[#1c2d5a] text-white text-[13.5px] font-semibold px-3.5 py-2.5 tracking-[0.02em]">
                🤖 「{{ selectedWord }}」の議論
              </div>
              <div class="overflow-y-auto flex-1">
                <div v-if="aiLoading" class="flex items-center justify-center min-h-[80px]">
                  <span class="w-[22px] h-[22px] rounded-full border-2 border-[#1A237E]/30 border-t-[#1A237E] animate-spin block" />
                </div>
                <div v-else class="ai-body" v-html="renderedSummary" />
              </div>
            </template>
          </div>
        </template>

        <!-- Empty state -->
        <div v-else class="flex flex-col items-center justify-center min-h-[280px] gap-3 p-8 text-center text-[#6878a8] text-xs leading-relaxed">
          <span class="text-4xl opacity-25">👆</span>
          <p class="m-0">左のヒートマップの列をクリックすると<br>ワードクラウドが表示されます</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ctrl-slider {
  min-width: 110px;
  max-width: 170px;
  accent-color: #1A237E;
}

.wordcloud-container {
  position: relative;
  width: 100%;
  height: 220px;
  overflow: hidden;
}

.wc-word {
  position: absolute;
  transform: translate(-50%, -50%);
  cursor: pointer;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  transition: opacity 0.25s;
}

.wc-word:hover {
  opacity: 0.55 !important;
}

.ai-body {
  font-size: 13px;
  color: #1c2d5a;
  padding: 12px 14px;
  line-height: 1.75;
}

.ai-body :deep(h2) {
  font-size: 13.5px;
  font-weight: 700;
  margin: 14px 0 6px;
  color: #1c2d5a;
  border-left: 3px solid #3d5fc4;
  padding-left: 8px;
}

.ai-body :deep(h2:first-child) {
  margin-top: 0;
}

.ai-body :deep(ul) {
  margin: 0 0 8px 16px;
  padding: 0;
}

.ai-body :deep(li) {
  line-height: 1.75;
  margin-bottom: 4px;
}

.ai-body :deep(strong) {
  color: #1c2d5a;
}

.ai-body :deep(p) {
  margin: 0 0 6px;
  line-height: 1.75;
}

.ai-body :deep(.flow-arrow) {
  text-align: center;
  color: #3d5fc4;
  font-size: 16px;
  margin: 1px 0;
  line-height: 1.3;
  opacity: .7;
}
</style>
