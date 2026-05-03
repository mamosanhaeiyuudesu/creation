<script setup lang="ts">
definePageMeta({ ssr: false, layout: 'miyako', alias: ['/miyako/yearly'] })

useHead({
  title: import.meta.dev ? '宮古議事録 (dev)' : '宮古議事録',
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

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const rawData = ref<FeaturesData>({})
const selectedSession = ref<string | null>(null)
const selectedWord = ref<string | null>(null)
const aiTopics = ref<AiTopic[]>([])
const aiLoading = ref(false)
const maxChars = ref(1000)
const CATEGORY_OPTIONS = [...CATEGORIES]

const _initCat = (route.query.cat as string) ?? ''
const selectedCategory = ref<string>(
  CATEGORY_OPTIONS.includes(_initCat) ? _initCat : '暮らし・福祉'
)

// state → URL 同期
watch([selectedCategory, selectedSession, selectedWord], () => {
  const query: Record<string, string> = {}
  if (selectedCategory.value !== '暮らし・福祉') query.cat = selectedCategory.value
  if (selectedSession.value) query.year = selectedSession.value
  if (selectedWord.value) query.word = selectedWord.value
  router.replace({ query })
})

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

// ── AI要約 ─────────────────────────────────────

async function fetchSummary(word: string) {
  if (!selectedSession.value) return
  selectedWord.value = word
  aiTopics.value = []

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

function onCellClick({ session, word }: { session: string; word: string }) {
  selectedSession.value = session
  fetchSummary(word)
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

  const yearParam = route.query.year as string
  const wordParam = route.query.word as string
  if (yearParam && yearKeys.value.includes(yearParam)) {
    selectedSession.value = yearParam
    if (wordParam) {
      await fetchSummary(wordParam)
    }
  }
})

watch(selectedCategory, resetAndRender)
</script>

<template>
  <div class="min-h-screen overflow-x-hidden page-bg">
    <MiyakoHeader active-page="session" />

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col justify-center items-center py-[72px] px-6 gap-3">
      <span class="w-8 h-8 rounded-full border-2 border-[#1A237E]/20 border-t-[#1A237E] animate-spin block" />
      <span class="font-mono text-[10px] text-[#9aa3c0] tracking-[0.12em] uppercase">Loading data...</span>
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
          @word-click="onCellClick"
        >
          <template #label>
            <div class="flex items-center flex-wrap gap-x-1 gap-y-1">
              <button
                v-for="cat in CATEGORY_OPTIONS"
                :key="cat"
                class="text-[10.5px] font-medium px-2 py-[2px] rounded-[3px] transition-all leading-5"
                :class="selectedCategory === cat
                  ? 'bg-[#1A237E] text-white shadow-[0_1px_4px_rgba(26,35,126,0.3)]'
                  : 'text-[#6878a8] hover:text-[#1c2d5a] hover:bg-[#eef1fb]'"
                @click="selectedCategory = cat"
              >{{ CATEGORY_SHORT[cat] ?? cat }}</button>
            </div>
          </template>
        </MiyakoSessionHeatmap>
      </div>

      <!-- Side panel -->
      <div class="w-full md:w-[420px] md:h-[638px] flex-shrink-0 flex flex-col">
        <MiyakoSessionAiPanel
          :selected-word="selectedWord"
          :selected-session="selectedSession"
          :ai-topics="aiTopics"
          :ai-loading="aiLoading"
          hint-main="ヒートマップをクリックで議論をAI分析"
          hint-sub="年×キーワードのセルを選ぶと、その年の議会での議論の変遷をAIが解説します"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-bg {
  background-color: #f0f2f8;
  background-image: radial-gradient(circle, rgba(100,120,168,0.12) 1px, transparent 1px);
  background-size: 20px 20px;
}
</style>
