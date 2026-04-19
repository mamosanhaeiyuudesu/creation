<script setup lang="ts">
definePageMeta({ ssr: false, layout: 'miyako', alias: ['/miyako/keyword', '/miyako_gijiroku/keyword'] })

useHead({ title: import.meta.dev ? '宮古議事録 (dev)' : '宮古議事録' })

interface AiTopic {
  title: string
  period: string
  conclusion: string
  flow: string[]
}

const route = useRoute()
const router = useRouter()

const keyword = ref('')
const searchedWord = ref('')
const loading = ref(false)
const topics = ref<AiTopic[]>([])
const resultCount = ref(3)
const model = ref('gpt-4.1-mini')

function periodToSortKey(period: string): number {
  if (/令和元年/.test(period)) return 2019 * 100
  const reiwa = period.match(/令和(\d+)年/)
  if (reiwa) return (2018 + parseInt(reiwa[1])) * 100
  const heisei = period.match(/平成(\d+)年/)
  if (heisei) return (1988 + parseInt(heisei[1])) * 100
  return 0
}

function sortTopicsOldest(list: AiTopic[]): AiTopic[] {
  return [...list].sort((a, b) => {
    const diff = periodToSortKey(a.period) - periodToSortKey(b.period)
    if (diff !== 0) return diff
    const numA = parseInt(a.period.match(/第(\d+)回/)?.[1] ?? '0')
    const numB = parseInt(b.period.match(/第(\d+)回/)?.[1] ?? '0')
    return numA - numB
  })
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.isComposing) search()
}

async function search() {
  const word = keyword.value.trim()
  if (!word) return

  searchedWord.value = word
  topics.value = []
  router.replace({ query: { q: word } })

  const cacheKey = `miyako_keyword:${word}:${resultCount.value}:${model.value}`
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    try {
      topics.value = JSON.parse(cached)
      return
    } catch {
      localStorage.removeItem(cacheKey)
    }
  }

  loading.value = true
  try {
    const data = await $fetch<{ topics: AiTopic[] }>('/api/miyako/keyword', {
      method: 'POST',
      body: { word, count: resultCount.value, model: model.value },
    })
    topics.value = sortTopicsOldest(data.topics)
    localStorage.setItem(cacheKey, JSON.stringify(data.topics))
  } catch {
    topics.value = [{ title: 'エラー', period: '', conclusion: '取得に失敗しました。', flow: [] }]
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const q = (route.query.q as string) ?? ''
  if (q) {
    keyword.value = q
    await search()
  }
})
</script>

<template>
  <div class="min-h-screen bg-[#f0f2f8]">
    <MiyakoHeader active-page="keyword" />

    <div class="max-w-[1400px] mx-auto px-3 md:px-6 pt-5 pb-8">

      <!-- 検索バー -->
      <div class="flex gap-2 mb-6 items-center justify-center">
        <input
          v-model="keyword"
          type="text"
          placeholder="キーワード"
          class="rounded-[8px] border border-[#c5cad8] bg-white px-3 py-2.5 text-[14px] text-[#1c2d5a] placeholder:text-[#a0aac4] outline-none focus:border-[#3d5fc4] focus:ring-2 focus:ring-[#3d5fc4]/15 shadow-[0_1px_3px_rgba(28,45,90,0.06)] transition-all w-[200px]"
          @keydown="handleKeydown"
        />
        <button
          :disabled="loading || !keyword.trim()"
          class="flex-shrink-0 rounded-[8px] bg-[#1c2d5a] text-white text-[13.5px] font-semibold px-5 py-2.5 hover:bg-[#2a3f7a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-[0_1px_3px_rgba(28,45,90,0.18)]"
          @click="search"
        >
          検索
        </button>
      </div>

      <!-- ローディング -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-20 gap-4">
        <span class="w-10 h-10 rounded-full border-[3px] border-[#1A237E]/25 border-t-[#1A237E] animate-spin block" />
        <p class="text-[13px] text-[#6878a8]">「{{ searchedWord }}」を検索中…</p>
      </div>

      <!-- 初期状態 -->
      <div v-else-if="!searchedWord" class="flex flex-col items-center justify-center py-20 text-[#6878a8]">
        <div class="text-[40px] mb-3 opacity-40">🔍</div>
        <p class="text-[14px]">キーワードを入力して、議論の変遷を見る</p>
      </div>

      <!-- 結果（カード間に矢印） -->
      <div v-else class="flex flex-col md:flex-row md:items-stretch gap-0">
        <template v-for="(topic, i) in topics" :key="i">
          <!-- カード -->
          <div class="flex-1 min-w-0 bg-white border border-[#dde2ef] rounded-[10px] shadow-[0_1px_4px_rgba(28,45,90,0.07),0_0_0_1px_rgba(28,45,90,0.06)] overflow-hidden flex flex-col">
            <!-- 会期ヘッダー -->
            <div class="flex items-center flex-shrink-0 bg-[#1c2d5a] text-white px-3.5 py-2.5 gap-1.5">
              <span class="text-[11px] opacity-60">📅</span>
              <span class="text-[12.5px] font-semibold tracking-[0.02em]">{{ topic.period || '会期不明' }}</span>
            </div>

            <!-- トピック内容 -->
            <div class="ai-body flex-1">
              <div class="topic-title">{{ topic.title }}</div>
              <div class="conclusion">{{ topic.conclusion }}</div>
              <div v-if="topic.flow?.length" class="flow-list">
                <template v-for="(step, si) in topic.flow" :key="si">
                  <div class="flow-step">{{ step }}</div>
                  <div v-if="si < topic.flow.length - 1" class="flow-arrow">↓</div>
                </template>
              </div>
            </div>
          </div>

          <!-- カード間の矢印（最後のカードには表示しない） -->
          <div v-if="i < topics.length - 1" class="card-arrow">
            <span class="md:hidden">↓</span>
            <span class="hidden md:inline">→</span>
          </div>
        </template>

        <!-- 結果なし -->
        <div v-if="topics.length === 0" class="flex flex-col items-center justify-center py-16 text-[#6878a8] w-full">
          <p class="text-[14px]">「{{ searchedWord }}」に関する議論は見つかりませんでした</p>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.search-select {
  background: white;
  border: 1px solid #c5cad8;
  border-radius: 6px;
  color: #1c2d5a;
  font-size: 11.5px;
  font-weight: 500;
  padding: 2px 6px;
  cursor: pointer;
  outline: none;
}
.search-select:focus { border-color: #3d5fc4; }

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

.ai-body {
  font-size: 13px;
  color: #1c2d5a;
  padding: 12px 14px;
  line-height: 1.75;
}

.topic-title {
  font-size: 13.5px;
  font-weight: 700;
  margin-bottom: 5px;
  color: #1c2d5a;
  border-left: 3px solid #3d5fc4;
  padding-left: 8px;
}

.conclusion {
  font-size: 12.5px;
  color: #3a4a72;
  background: #f0f3fb;
  border-radius: 6px;
  padding: 6px 10px;
  margin-bottom: 10px;
  line-height: 1.7;
}

.flow-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.flow-step {
  font-size: 12.5px;
  color: #1c2d5a;
  background: #fff;
  border: 1px solid #dde2ef;
  border-radius: 6px;
  padding: 6px 10px;
  line-height: 1.65;
}

.flow-arrow {
  text-align: center;
  color: #3d5fc4;
  font-size: 15px;
  line-height: 1.4;
  opacity: 0.6;
  margin: 1px 0;
}

.card-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #3d5fc4;
  font-size: 20px;
  opacity: 0.5;
  padding: 8px 4px;
}
</style>
