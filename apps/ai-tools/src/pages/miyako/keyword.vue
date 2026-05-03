<script setup lang="ts">
definePageMeta({ ssr: false, layout: 'miyako', alias: ['/miyako/keyword'] })

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
  <div class="min-h-screen page-bg">
    <MiyakoHeader active-page="keyword" />

    <div class="max-w-[1400px] mx-auto px-3 md:px-6 pt-6 pb-8">

      <!-- 検索バー -->
      <div class="flex gap-2 mb-7 items-center justify-center">
        <div class="flex rounded-[7px] border border-[#c5cad8] bg-white overflow-hidden shadow-[0_1px_4px_rgba(28,45,90,0.07)] focus-within:border-[#3d5fc4] focus-within:shadow-[0_0_0_3px_rgba(61,95,196,0.1)] transition-all">
          <span class="font-mono text-[11px] text-[#9aa3c0] tracking-[0.1em] flex items-center px-3 border-r border-[#edf0f8] bg-[#fafbff] shrink-0 select-none">検索</span>
          <input
            v-model="keyword"
            type="text"
            placeholder="ex）サッカー, サトウキビなど"
            class="px-3 py-2.5 text-[13.5px] text-[#1c2d5a] placeholder:text-[#b8c2d8] outline-none w-[220px] bg-transparent"
            @keydown="handleKeydown"
          />
          <button
            v-if="keyword"
            class="flex items-center justify-center px-2.5 text-[#b0b8cc] hover:text-[#6878a8] transition-colors shrink-0"
            tabindex="-1"
            @click="keyword = ''"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <button
          :disabled="loading || !keyword.trim()"
          class="shrink-0 rounded-[7px] bg-[#1c2d5a] text-white text-[13px] font-semibold px-5 py-2.5 hover:bg-[#2a3f7a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-[0_1px_4px_rgba(28,45,90,0.2)]"
          @click="search"
        >検索</button>
      </div>

      <!-- ローディング -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-20 gap-4">
        <span class="w-8 h-8 rounded-full border-2 border-[#1A237E]/20 border-t-[#1A237E] animate-spin block" />
        <p class="text-[12px] text-[#9aa3c0]">「{{ searchedWord }}」を検索中...</p>
      </div>

      <!-- 初期状態 -->
      <div v-else-if="!searchedWord" class="flex flex-col items-center justify-center py-24 gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="opacity-30 text-[#1c2d5a]"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <p class="text-[15px] font-bold text-[#1c2d5a] text-center leading-snug">キーワードを入力して<br>議論の変遷をAI検索</p>
        <p class="text-[11.5px] text-[#9aa3c0] text-center leading-relaxed">気になる言葉を入力すると、<br>宮古島市議会での議論の歴史をAIが解説します</p>
      </div>

      <!-- 結果 -->
      <div v-else class="flex flex-col md:flex-row md:items-stretch gap-0">
        <template v-for="(topic, i) in topics" :key="i">
          <!-- カード -->
          <div class="flex-1 min-w-0 bg-white border border-[#dde2ef] rounded-[8px] shadow-[0_2px_8px_rgba(28,45,90,0.07),0_0_0_1px_rgba(28,45,90,0.04)] overflow-hidden flex flex-col">
            <!-- 会期ヘッダー -->
            <div class="flex items-center flex-shrink-0 bg-[#1c2d5a] text-white px-3.5 py-2.5" style="border-left: 3px solid #a5b4fc">
              <span class="font-mono text-[8.5px] tracking-[0.2em] text-[#a5b4fc] uppercase mr-3 shrink-0">Period</span>
              <span class="text-[12px] font-semibold tracking-[0.02em]">{{ topic.period || '会期不明' }}</span>
            </div>

            <!-- トピック内容 -->
            <div class="ai-body flex-1">
              <div class="topic-title">{{ topic.title }}</div>
              <div class="conclusion">{{ topic.conclusion }}</div>
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

          <!-- カード間の矢印 -->
          <div v-if="i < topics.length - 1" class="card-arrow">
            <span class="md:hidden text-[#3d5fc4] opacity-50">↓</span>
            <span class="hidden md:inline text-[#3d5fc4] opacity-50">→</span>
          </div>
        </template>

        <!-- 結果なし -->
        <div v-if="topics.length === 0" class="flex flex-col items-center justify-center py-16 gap-3 w-full">
          <span class="font-mono text-[10px] text-[#9aa3c0] tracking-[0.1em]">// no results found</span>
          <p class="text-[13px] text-[#6878a8]">「{{ searchedWord }}」に関する議論は見つかりませんでした</p>
        </div>
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

.ai-body {
  font-size: 13px;
  color: #1c2d5a;
  padding: 12px 14px;
  line-height: 1.75;
}

.topic-title {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 6px;
  color: #1c2d5a;
  border-left: 3px solid #3d5fc4;
  padding-left: 8px;
}

.conclusion {
  font-size: 12px;
  color: #3a4a72;
  background: #f4f6fc;
  border: 1px solid #e8ecf8;
  border-radius: 5px;
  padding: 7px 10px;
  margin-bottom: 10px;
  line-height: 1.72;
}

.flow-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.flow-step {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: #1c2d5a;
  background: #fff;
  border: 1px solid #dde2ef;
  border-radius: 5px;
  padding: 6px 10px;
  line-height: 1.65;
}

.step-num {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  color: #a5b4fc;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 2px;
  letter-spacing: 0.05em;
}

.flow-arrow {
  text-align: center;
  color: #3d5fc4;
  font-size: 14px;
  line-height: 1.4;
  opacity: 0.45;
  margin: 1px 0;
}

.card-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20px;
  padding: 8px 6px;
}
</style>
