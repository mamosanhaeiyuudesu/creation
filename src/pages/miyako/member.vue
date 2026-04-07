<script setup lang="ts">
definePageMeta({ ssr: false, alias: ['/miyako_gijiroku/member'] })

import { parseCsv } from '~/utils/miyako/csv'
import { CATEGORIES, CATEGORY_WORDS, STOPWORDS } from '~/utils/miyako/categories'

interface SpeakerMeta {
  id: string
  name: string
  role: string
  gender: string
  party: string
  faction: string
  terms: number[]
  utterance_count: number
  total_words: number
  in_member_json: boolean
}

interface CategoryEntry {
  speaker_id: string
  category: string
  score: number
  top_words: string
}

interface WordEntry {
  speaker_id: string
  word: string
  tfidf: number
  count: number
}

interface AiTopic {
  title: string
  conclusion: string
  flow: string[]
}

const WC_COLORS = [
  '#1A237E', '#283593', '#303F9F', '#3949AB',
  '#3F51B5', '#5C6BC0', '#7986CB', '#0D47A1',
  '#1565C0', '#1976D2', '#1E88E5',
]

const route = useRoute()
const router = useRouter()

function qInt(key: string, fallback: number) {
  const v = route.query[key]
  const n = parseInt(typeof v === 'string' ? v : '')
  return isNaN(n) ? fallback : n
}

const filterTerm = ref(qInt('term', 6))

watch([filterTerm], () => {
  router.replace({ query: { term: String(filterTerm.value) } })
})

const speakersMeta = ref<SpeakerMeta[]>([])
const categoryEntries = ref<CategoryEntry[]>([])
const wordEntries = ref<WordEntry[]>([])
const loading = ref(true)

// 選択状態
const selectedSpeakerId = ref<string | null>(null)
const selectedCategory = ref<string | null>(null)
const selectedWord = ref<string | null>(null)
const aiTopics = ref<AiTopic[]>([])
const aiLoading = ref(false)
const maxChars = ref(1000)

const heatmapRef = ref<{ render: () => void } | null>(null)

const termOptions = computed(() => {
  const counts = new Map<number, number>()
  for (const s of speakersMeta.value) {
    for (const t of s.terms) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([term, count]) => ({ term, count }))
})

const filteredSpeakers = computed(() =>
  speakersMeta.value.filter(s => s.terms.includes(filterTerm.value))
)

const filteredIds = computed(() => new Set(filteredSpeakers.value.map(s => s.id)))

const catMap = computed(() => {
  const map: Record<string, Record<string, { score: number; top_words: string }>> = {}
  for (const e of categoryEntries.value) {
    if (!filteredIds.value.has(e.speaker_id)) continue
    if (!map[e.speaker_id]) map[e.speaker_id] = {}
    map[e.speaker_id][e.category] = { score: e.score, top_words: e.top_words }
  }
  return map
})

const catRange = computed(() => {
  let min = Infinity, max = -Infinity
  for (const cats of Object.values(catMap.value)) {
    for (const cat of CATEGORIES) {
      const score = cats[cat]?.score
      if (score == null) continue
      if (score < min) min = score
      if (score > max) max = score
    }
  }
  return { min: min === Infinity ? 0 : min, max: max === -Infinity ? 1 : max }
})

const displayNames = computed(() => {
  const familyName = (name: string) => name.split(/\s+/)[0] ?? name
  const givenName = (name: string) => name.split(/\s+/)[1] ?? ''
  const counts = new Map<string, number>()
  for (const s of filteredSpeakers.value) {
    const fn = familyName(s.name)
    counts.set(fn, (counts.get(fn) ?? 0) + 1)
  }
  const result: Record<string, string> = {}
  for (const s of filteredSpeakers.value) {
    const fn = familyName(s.name)
    result[s.id] = (counts.get(fn) ?? 1) > 1
      ? `${fn} ${givenName(s.name).charAt(0)}`
      : fn
  }
  return result
})

const selectedSpeakerName = computed(() => {
  if (!selectedSpeakerId.value) return null
  return speakersMeta.value.find(s => s.id === selectedSpeakerId.value)?.name ?? null
})

// ワードクラウド用単語
const wordcloudWords = computed(() => {
  if (!selectedSpeakerId.value || !selectedCategory.value) return []
  const catWords = CATEGORY_WORDS[selectedCategory.value]
  const entry = catMap.value[selectedSpeakerId.value]?.[selectedCategory.value]
  const topWordSet = new Set(
    entry?.top_words ? entry.top_words.split(',').map((w: string) => w.trim()).filter(Boolean) : []
  )
  const words = wordEntries.value
    .filter(w =>
      w.speaker_id === selectedSpeakerId.value &&
      !STOPWORDS.has(w.word) &&
      (!catWords || catWords.has(w.word) || topWordSet.has(w.word))
    )
    .sort((a, b) => b.tfidf - a.tfidf)
    .slice(0, 50)
  if (!words.length) return []
  const maxScore = words[0].tfidf
  const minScore = words[words.length - 1].tfidf
  const range = maxScore - minScore || 1
  return words.map((w, i) => {
    const t = (w.tfidf - minScore) / range
    const size = Math.round(11 + Math.pow(t, 0.55) * 26)
    return { name: w.word, score: w.tfidf, size, color: WC_COLORS[i % WC_COLORS.length] }
  })
})

function handleCellClick(speakerId: string, category: string) {
  selectedSpeakerId.value = speakerId
  selectedCategory.value = category
  selectedWord.value = null
  aiTopics.value = []
}

async function fetchMemberSummary(word: string) {
  const speaker = speakersMeta.value.find(s => s.id === selectedSpeakerId.value)
  if (!speaker) return
  selectedWord.value = word
  aiTopics.value = []

  const speakerName = speaker.name
  const cacheKey = `miyako_member_summary:${speakerName}:${word}:${maxChars.value}`
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
    const data = await $fetch<{ topics: AiTopic[] }>('/api/miyako/member-summary', {
      method: 'POST',
      body: { speakerName, word, maxChars: maxChars.value },
    })
    aiTopics.value = data.topics
    localStorage.setItem(cacheKey, JSON.stringify(data.topics))
  } catch {
    aiTopics.value = [{ title: 'エラー', conclusion: '取得に失敗しました。', flow: [] }]
  } finally {
    aiLoading.value = false
  }
}

watch(filterTerm, () => {
  selectedSpeakerId.value = null
  selectedCategory.value = null
  selectedWord.value = null
  aiTopics.value = []
  nextTick(() => heatmapRef.value?.render())
})

onMounted(async () => {
  const [metaRaw, catsRaw, wordsRaw] = await Promise.all([
    $fetch<SpeakerMeta[]>('/data/speakers_meta.json'),
    $fetch('/data/tfidf_categories.csv', { responseType: 'text' }) as Promise<string>,
    $fetch('/data/tfidf_words.csv', { responseType: 'text' }) as Promise<string>,
  ])

  speakersMeta.value = metaRaw

  categoryEntries.value = parseCsv(catsRaw).map(r => ({
    speaker_id: r.speaker_id,
    category: r.category,
    score: parseFloat(r.score),
    top_words: r.top_words,
  }))

  wordEntries.value = parseCsv(wordsRaw).map(r => ({
    speaker_id: r.speaker_id,
    word: r.word,
    tfidf: parseFloat(r.tfidf),
    count: parseInt(r.count),
  }))

  loading.value = false
  await nextTick()
  heatmapRef.value?.render()
})
</script>

<template>
  <div class="min-h-screen bg-[#f0f2f8] overflow-x-hidden">
    <MiyakoHeader active-page="member" />

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-[72px]">
      <span class="w-11 h-11 rounded-full border-[3px] border-[#1A237E]/30 border-t-[#1A237E] animate-spin block" />
    </div>

    <!-- Main content -->
    <div v-else class="max-w-[1400px] mx-auto px-3 md:px-6 pt-[11px] pb-8 flex flex-col md:flex-row gap-3 items-start">

      <!-- Heatmap panel -->
      <div class="w-full md:flex-1 min-w-0 overflow-hidden">
        <MiyakoMemberHeatmap
          ref="heatmapRef"
          :speakers="filteredSpeakers"
          :categories="CATEGORIES"
          :cat-map="catMap"
          :cat-range="catRange"
          :display-names="displayNames"
          :term-options="termOptions"
          :filter-term="filterTerm"
          @cell-click="handleCellClick"
          @update:filter-term="filterTerm = $event"
        />
      </div>

      <!-- Side panel -->
      <div class="w-full md:w-[420px] md:h-[638px] flex-shrink-0 flex flex-col gap-3">
        <MiyakoMemberWordCloud
          :speaker-name="selectedSpeakerId ? (displayNames[selectedSpeakerId] ?? selectedSpeakerName) : null"
          :category="selectedCategory"
          :words="wordcloudWords"
          @word-click="fetchMemberSummary($event)"
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
