<script setup lang="ts">
definePageMeta({ ssr: false, alias: ['/miyako_gijiroku', '/miyako_gijiroku/'] })

useHead({
  link: [{ rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏝️</text></svg>` }]
})

import { STOPWORDS, CATEGORY_WORDS, CATEGORIES, CATEGORY_SHORT } from '~/utils/miyako/categories'

interface WordScore {
  word: string
  score: number
  count?: number
}

type FeaturesData = Record<string, WordScore[]>

interface AiTopic {
  title: string
  conclusion: string
  flow: string[]
}

const TOP_KEYWORDS = 100
const WC_COLORS = [
  '#1A237E', '#283593', '#303F9F', '#3949AB',
  '#3F51B5', '#5C6BC0', '#7986CB', '#0D47A1',
  '#1565C0', '#1976D2', '#1E88E5',
]

const loading = ref(true)
const rawData = ref<FeaturesData>({})
const selectedSession = ref<string | null>(null)

const selectedWord = ref<string | null>(null)
const aiTopics = ref<AiTopic[]>([])
const aiLoading = ref(false)
const maxChars = ref(1000)
const selectedCategory = ref<string>('暮らし・福祉')
const CATEGORY_OPTIONS = [...CATEGORIES]

// ── 年グループ計算 ─────────────────────────────

function getYear(key: string): string {
  const m = key.match(/(\d{4})-\d{2}-\d{2}/)
  return m ? m[1] : '不明'
}

function yearLabel(key: string): string {
  return key
}

const yearKeys = computed(() => {
  const years = new Set<string>()
  for (const key of Object.keys(rawData.value)) {
    const y = getYear(key)
    if (y !== '不明') years.add(y)
  }
  return [...years].sort()
})

const yearAggregatedData = computed(() => {
  const yearSessions = new Map<string, string[]>()
  for (const key of Object.keys(rawData.value)) {
    const y = getYear(key)
    if (y === '不明') continue
    if (!yearSessions.has(y)) yearSessions.set(y, [])
    yearSessions.get(y)!.push(key)
  }
  const result: Record<string, WordScore[]> = {}
  for (const [year, sessions] of yearSessions.entries()) {
    const wordMax = new Map<string, number>()
    const wordCount = new Map<string, number>()
    for (const session of sessions) {
      for (const { word, score, count } of (rawData.value[session] ?? [])) {
        if ((wordMax.get(word) ?? 0) < score) wordMax.set(word, score)
        wordCount.set(word, (wordCount.get(word) ?? 0) + (count ?? 0))
      }
    }
    result[year] = [...wordMax.entries()].map(([word, score]) => ({ word, score, count: wordCount.get(word) ?? 0 }))
  }
  return result
})

const topKeywords = computed(() => {
  const maxScore = new Map<string, number>()
  for (const year of yearKeys.value) {
    for (const { word, score } of (yearAggregatedData.value[year] ?? [])) {
      if (!STOPWORDS.has(word) && (maxScore.get(word) ?? 0) < score) {
        maxScore.set(word, score)
      }
    }
  }
  let entries = [...maxScore.entries()].sort((a, b) => b[1] - a[1])
  const catWords = CATEGORY_WORDS[selectedCategory.value]
  if (catWords) entries = entries.filter(([w]) => catWords.has(w))
  return entries.slice(0, TOP_KEYWORDS).map(([w]) => w)
})

// ── ワードクラウド ─────────────────────────────

const wordcloudWords = computed(() => {
  if (!selectedSession.value) return []
  const catWords = CATEGORY_WORDS[selectedCategory.value]
  const words = (yearAggregatedData.value[selectedSession.value] ?? [])
    .filter(w => !STOPWORDS.has(w.word) && (!catWords || catWords.has(w.word)))
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
  if (!words.length) return []
  const maxScore = words[0].score
  const minScore = words[words.length - 1].score
  const range = maxScore - minScore || 1
  return words.map((w, i) => {
    const t = (w.score - minScore) / range
    const size = Math.round(11 + Math.pow(t, 0.55) * 26)
    return { name: w.word, score: w.score, size, color: WC_COLORS[i % WC_COLORS.length] }
  })
})

// ── AI要約 ─────────────────────────────────────

async function fetchSummary(word: string) {
  if (!selectedSession.value) return
  selectedWord.value = word
  aiTopics.value = []

  // 選択年に属する全会期キー
  const yearSessions = Object.keys(rawData.value).filter(k => getYear(k) === selectedSession.value)

  const cacheKey = `miyako_summary:${selectedSession.value}:${word}:${maxChars.value}`
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    try {
      aiTopics.value = JSON.parse(cached)
      return
    } catch {
      localStorage.removeItem(cacheKey)
    }
  }

  aiLoading.value = true
  try {
    const data = await $fetch<{ topics: AiTopic[] }>('/api/miyako/search', {
      method: 'POST',
      body: { sessions: yearSessions, word, maxChars: maxChars.value },
    })
    aiTopics.value = data.topics
    localStorage.setItem(cacheKey, JSON.stringify(data.topics))
  } catch {
    aiTopics.value = [{ title: 'エラー', conclusion: '取得に失敗しました。', flow: [] }]
  } finally {
    aiLoading.value = false
  }
}

// ── データ取得・リセット ────────────────────────

const heatmapRef = ref<{ render: () => void } | null>(null)

async function resetAndRender() {
  selectedSession.value = null
  selectedWord.value = null
  aiTopics.value = []
  await nextTick()
  heatmapRef.value?.render()
}

onMounted(async () => {
  rawData.value = await $fetch<FeaturesData>('/data/miyako-features.json')
  loading.value = false
  await nextTick()
  heatmapRef.value?.render()
})

watch(selectedCategory, resetAndRender)
</script>

<template>
  <div class="min-h-screen bg-[#f0f2f8] overflow-x-hidden">
    <MiyakoHeader active-page="session" />

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-[72px] px-6">
      <span class="w-11 h-11 rounded-full border-[3px] border-[#1A237E]/30 border-t-[#1A237E] animate-spin block" />
    </div>

    <!-- Main content -->
    <div v-else class="max-w-[1400px] mx-auto px-3 md:px-6 pt-[11px] pb-8 flex flex-col md:flex-row gap-3 items-start">

      <!-- Heatmap panel -->
      <div class="w-full md:flex-1 min-w-0 overflow-hidden">
        <MiyakoSessionHeatmap
          ref="heatmapRef"
          :sessions="yearKeys"
          :keywords="topKeywords"
          :raw-data="yearAggregatedData"
          :short-label="yearLabel"
          @session-click="selectedSession = $event"
        >
          <template #label>
            <div class="flex items-center flex-wrap gap-y-0.5 gap-x-0 ml-1">
              <template v-for="(cat, i) in CATEGORY_OPTIONS" :key="cat">
                <span v-if="i > 0" class="text-[#c5cad8] text-[11px] select-none mx-0.5">/</span>
                <button
                  class="text-[11px] px-1 py-0.5 rounded transition-colors leading-5"
                  :class="selectedCategory === cat ? 'text-[#1A237E] font-bold' : 'text-[#6878a8] hover:text-[#3949AB]'"
                  @click="selectedCategory = cat"
                >{{ CATEGORY_SHORT[cat] ?? cat }}</button>
              </template>
            </div>
          </template>
        </MiyakoSessionHeatmap>
      </div>

      <!-- Side panel -->
      <div class="w-full md:w-[420px] md:h-[638px] flex-shrink-0 flex flex-col gap-3">
        <MiyakoSessionWordCloud
          :session="selectedSession"
          :words="wordcloudWords"
          @word-click="fetchSummary($event)"
        />

        <MiyakoSessionAiPanel
          :selected-word="selectedWord"
          :ai-topics="aiTopics"
          :ai-loading="aiLoading"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ctrl-select {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  color: rgba(255,255,255,0.85);
  font-size: 11.5px;
  font-weight: 500;
  padding: 2px 6px;
  cursor: pointer;
  outline: none;
}
.ctrl-select:focus { border-color: rgba(255,255,255,0.4); }
.ctrl-select option { background: #1c2d5a; color: white; }
</style>
