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
const renderedSummary = computed(() => aiSummary.value ? marked(aiSummary.value) as string : '')

const heatmapRef = ref<HTMLElement>()
const wordcloudRef = ref<HTMLElement>()
let heatmapChart: any = null
let wordcloudChart: any = null
let HC: any = null

onMounted(async () => {
  const Highcharts = (await import('highcharts')).default
  await import('highcharts/modules/heatmap')
  await import('highcharts/modules/wordcloud')
  await import('highcharts/modules/accessibility')
  HC = Highcharts

  rawData.value = await $fetch<FeaturesData>('/data/miyako-features.json')
  loading.value = false
  await nextTick()
  renderHeatmap()
})

onUnmounted(() => {
  heatmapChart?.destroy()
  wordcloudChart?.destroy()
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
  if (!heatmapRef.value || !HC) return
  const sessions = displayedSessions.value
  const keywords = topKeywords.value
  const rowHeight = 22
  const chartHeight = keywords.length * rowHeight + 110
  const chartWidth = sessions.length * CELL_WIDTH + 280

  const data: [number, number, number | null][] = []
  for (let si = 0; si < sessions.length; si++) {
    const wordMap = new Map(
      (rawData.value[sessions[si]] ?? []).map(w => [w.word, w.score])
    )
    for (let ki = 0; ki < keywords.length; ki++) {
      const s = wordMap.get(keywords[ki])
      data.push([si, ki, s !== undefined ? s : null])
    }
  }

  heatmapChart?.destroy()
  heatmapChart = HC.chart(heatmapRef.value, {
    chart: {
      type: 'heatmap',
      width: chartWidth,
      height: chartHeight,
      style: { fontFamily: 'inherit' },
      marginRight: 20,
      marginLeft: 60,
      marginTop: 50,
      marginBottom: 10,
      animation: false,
      backgroundColor: '#FFFFFF',
      plotBackgroundColor: '#FFFFFF',
    },
    title: { text: undefined },
    xAxis: {
      opposite: true,
      categories: sessions.map(shortLabel),
      labels: { rotation: 60, style: { fontSize: '9px' }, align: 'left', y: -15 },
      gridLineWidth: 1,
      gridLineColor: 'rgba(0,0,0,0.08)',
    },
    yAxis: {
      categories: keywords,
      title: { text: undefined },
      labels: { style: { fontSize: '11px' }, step: 1, y: 4 },
      reversed: true,
      gridLineWidth: 1,
      gridLineColor: 'rgba(0,0,0,0.08)',
    },
    colorAxis: {
      min: 0,
      max: 0.45,
      stops: [
        [0, '#EEF0FF'],
        [0.5, '#7986CB'],
        [1, '#1A237E'],
      ],
      nullColor: '#EEEEEE',
      labels: { format: '{value:.2f}' },
    },
    legend: { enabled: false },
    tooltip: {
      formatter: function (this: any) {
        if (this.point.value === null || this.point.value === undefined) return false
        const label = sessions[this.point.x].replace(/〜[\d-]+$/, '〜')
        return `<b>${label}</b><br/>${keywords[this.point.y]}: <b>${this.point.value.toFixed(3)}</b>`
      },
    },
    series: [{
      type: 'heatmap',
      name: '特徴度',
      data,
      cursor: 'pointer',
      borderWidth: 0.3,
      borderColor: '#FAFAFA',
      point: {
        events: {
          click: function (this: any) {
            const sessionKey = sessions[this.x]
            selectedSession.value = sessionKey
            nextTick(() => renderWordcloud())
          },
        },
      },
    }],
    credits: { enabled: false },
  })

}

function renderWordcloud() {
  if (!wordcloudRef.value || !HC || !selectedSession.value) return
  const words = (rawData.value[selectedSession.value] ?? [])
    .filter(w => !STOPWORDS.has(w.word))
    .map(w => ({ name: w.word, weight: Math.ceil(w.score * 100) }))

  wordcloudChart?.destroy()
  wordcloudChart = HC.chart(wordcloudRef.value, {
    series: [{
      type: 'wordcloud',
      data: words,
      name: '特徴度',
      cursor: 'pointer',
      colors: [
        '#1A237E', '#283593', '#303F9F', '#3949AB',
        '#3F51B5', '#5C6BC0', '#7986CB', '#9FA8DA',
        '#C5CAE9', '#0D47A1', '#1565C0', '#1976D2',
      ],
      point: {
        events: {
          click: function (this: any) { fetchSummary(this.name) },
        },
      },
    }],
    title: { text: undefined },
    tooltip: {
      formatter: function (this: any) {
        return `<b>${this.point.name}</b><br/>特徴度: ${(this.point.weight / 100).toFixed(3)}`
      },
    },
    credits: { enabled: false },
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
  wordcloudChart?.destroy()
  wordcloudChart = null
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
  <v-container max-width="1400" class="miyako-container">
    <div class="miyako-header">
      <h1 class="miyako-title">宮古島市議会 議事録分析</h1>
    </div>

    <v-card class="mb-2" elevation="1">
      <v-card-text class="d-flex align-center gap-4 flex-wrap py-2">
        <v-btn-toggle v-model="sessionTypeFilter" mandatory color="indigo" variant="outlined" density="compact">
          <v-btn value="定例会">定例会</v-btn>
          <v-btn value="臨時会">臨時会</v-btn>
        </v-btn-toggle>

        <div class="d-flex align-center gap-2 slider-group">
          <span class="text-caption text-medium-emphasis text-no-wrap ml-3">期間</span>
          <v-slider
            v-model="windowEnd"
            :min="windowEndMin"
            :max="windowEndMax"
            :step="1"
            density="compact"
            hide-details
            color="indigo"
            thumb-size="14"
            style="min-width: 120px; max-width: 180px; margin-right: 10px"
          />
          <span class="text-caption text-no-wrap text-medium-emphasis">{{ rangeLabel }}</span>
        </div>

        <div class="d-flex align-center gap-1 ml-3">
          <span class="text-caption text-medium-emphasis text-no-wrap">文字数</span>
          <v-btn-toggle v-model="maxChars" mandatory color="indigo" variant="outlined" density="compact">
            <v-btn v-for="n in MAX_CHARS_OPTIONS" :key="n" :value="n" size="small">{{ n }}</v-btn>
          </v-btn-toggle>
        </div>
      </v-card-text>
    </v-card>

    <div v-if="loading" class="d-flex justify-center py-8">
      <v-progress-circular indeterminate color="indigo" size="48" />
    </div>

    <template v-else>
      <div class="main-layout">
        <v-card elevation="1" class="heatmap-card">
          <v-card-text class="pa-2">
            <div class="heatmap-scroll">
              <div ref="heatmapRef" class="heatmap-container"></div>
            </div>
          </v-card-text>
        </v-card>

        <v-card elevation="1" class="wordcloud-card">
          <template v-if="selectedSession">
            <v-card-title class="text-subtitle-1 pr-3 pt-2 pb-1" style="padding-left: 0; margin-left: -3px">
              <v-icon class="mr-1" color="indigo" size="16">mdi-cloud</v-icon>
              {{ selectedSession?.replace(/〜[\d-]+$/, '〜') }}
            </v-card-title>
            <v-card-text class="pa-2 pb-1">
              <div ref="wordcloudRef" class="wordcloud-container"></div>
            </v-card-text>
            <v-divider />
            <v-card-text class="summary-section">
              <div v-if="!selectedWord" class="summary-hint text-caption text-medium-emphasis" style="padding: 12px 14px">
                <v-icon size="14" class="mr-1">mdi-cursor-default-click</v-icon>単語をクリックするとAI解説が表示されます
              </div>
              <template v-else>
                <div class="summary-word font-weight-bold">
                  <v-icon size="16" color="white" class="mr-1">mdi-robot</v-icon>「{{ selectedWord }}」の議論
                </div>
                <div v-if="aiLoading" class="summary-loading">
                  <v-progress-circular indeterminate size="20" width="2" color="indigo" />
                </div>
                <div v-else class="summary-text" v-html="renderedSummary" />
              </template>
            </v-card-text>
          </template>
          <div v-else class="d-flex align-center justify-center h-100 text-medium-emphasis text-caption pa-4 text-center">
            <div>
              <v-icon size="24" class="d-block mb-2">mdi-gesture-tap</v-icon>
              列をクリックすると<br>ワードクラウドが表示されます
            </div>
          </div>
        </v-card>
      </div>
    </template>
  </v-container>
</template>

<style scoped>
.miyako-container {
  padding-top: 12px;
  padding-bottom: 24px;
}

.miyako-header {
  text-align: center;
  margin-bottom: 10px;
}

.miyako-title {
  font-size: clamp(20px, 4vw, 28px);
  font-weight: 700;
  margin: 0 0 2px;
}

.main-layout {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: stretch;
}

@media (min-width: 768px) {
  .main-layout {
    flex-direction: row;
    align-items: flex-start;
  }
}

.heatmap-card {
  flex: 1;
  min-width: 0;
}

.wordcloud-card {
  width: 100%;
  flex-shrink: 0;
  align-self: flex-start;
}

@media (min-width: 768px) {
  .wordcloud-card {
    width: 420px;
  }
}

.heatmap-scroll {
  overflow: auto;
  max-height: 600px;
}

.heatmap-container {
  display: inline-block;
}

.wordcloud-container {
  width: 100%;
  height: 200px;
}

@media (min-width: 768px) {
  .wordcloud-container {
    height: 220px;
  }
}

.summary-section {
  min-height: 100px;
  max-height: 320px;
  overflow-y: auto;
  padding: 0 !important;
}

.summary-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
}

.summary-word {
  background: #1a237e;
  color: #ffffff;
  font-size: 15px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
}

.summary-text {
  color: #1a237e;
  background: #ffffff;
  font-size: 13px;
  padding: 10px 14px;
  line-height: 1.7;
}

.summary-text :deep(h2) {
  font-size: 14.5px;
  font-weight: 700;
  margin: 12px 0 6px;
  color: #1a237e;
  border-left: 3px solid #3949ab;
  padding-left: 8px;
}

.summary-text :deep(h2:first-child) {
  margin-top: 0;
}

.summary-text :deep(ul) {
  margin: 0 0 8px 16px;
  padding: 0;
}

.summary-text :deep(li) {
  line-height: 1.75;
  margin-bottom: 4px;
}

.summary-text :deep(strong) {
  color: #283593;
}

.summary-text :deep(p) {
  margin: 0 0 6px;
  line-height: 1.7;
}

.summary-hint {
  padding: 12px 14px;
}
</style>
