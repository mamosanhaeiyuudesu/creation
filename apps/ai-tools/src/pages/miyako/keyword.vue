<script setup lang="ts">
definePageMeta({ ssr: false, layout: 'miyako', alias: ['/miyako/keyword'] })

useHead({ title: import.meta.dev ? '宮古議事録 (dev)' : '宮古議事録' })

const HISTORY_KEY = 'miyako_recent_keywords'
const CACHE_PREFIX = 'miyako_keyword_evolution:'
const MAX_HISTORY = 5

interface AiPhase {
  era: string
  title: string
  summary: string
  detail: string
}

const route = useRoute()
const router = useRouter()

const keyword = ref('')
const searchedWord = ref('')
const loading = ref(false)
const phases = ref<AiPhase[]>([])
const recentSearches = ref<string[]>([])
const allExpanded = ref(false)

function toggleDetail(_i: number) {
  allExpanded.value = !allExpanded.value
}

function breakAtKuten(text: string): string {
  if (!text) return ''
  return text.replace(/。(?!\n)/g, '。\n')
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    recentSearches.value = raw ? JSON.parse(raw) : []
  } catch {
    recentSearches.value = []
  }
}

function saveHistory(word: string) {
  const list = recentSearches.value.filter(w => w !== word)
  list.unshift(word)
  recentSearches.value = list.slice(0, MAX_HISTORY)
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(recentSearches.value))
  } catch {}
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.isComposing) search()
}

async function search(word?: string) {
  const q = (word ?? keyword.value).trim()
  if (!q) return

  keyword.value = q
  searchedWord.value = q
  phases.value = []
  allExpanded.value = false
  router.replace({ query: { q } })
  saveHistory(q)

  const cacheKey = CACHE_PREFIX + q
  try {
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      phases.value = JSON.parse(cached)
      return
    }
  } catch {
    localStorage.removeItem(cacheKey)
  }

  loading.value = true
  try {
    const data = await $fetch<{ phases: AiPhase[] }>('/api/miyako/keyword', {
      method: 'POST',
      body: { word: q },
    })
    phases.value = data.phases
    try { localStorage.setItem(cacheKey, JSON.stringify(data.phases)) } catch {}
  } catch {
    phases.value = [{ era: '', title: 'エラー', summary: '取得に失敗しました。', detail: '' }]
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadHistory()
  const q = (route.query.q as string) ?? ''
  if (q) {
    keyword.value = q
    search(q)
  }
})
</script>

<template>
  <div class="min-h-screen page-bg">
    <MiyakoHeader active-page="keyword" />

    <div class="max-w-[1400px] mx-auto px-3 md:px-6 pt-[11px] pb-8">

      <div class="flex justify-end mb-2.5">
        <MiyakoDataPeriod kind="live" />
      </div>

      <!-- 検索バー -->
      <div class="flex gap-2 mb-3 items-center justify-center">
        <div class="flex rounded-full border border-[#b9c8da] bg-white overflow-hidden shadow-[0_1px_4px_rgba(20,60,120,0.07)] focus-within:border-[#1d6fd6] focus-within:shadow-[0_0_0_3px_rgba(29,111,214,0.1)] transition-all">
          <span class="text-[12px] font-bold text-[#4b5868] flex items-center px-3 border-r border-[#e6f0fb] bg-[#f5f8fc] shrink-0 select-none">検索</span>
          <input
            v-model="keyword"
            type="text"
            placeholder="ex）サッカー, サトウキビなど"
            class="px-3 py-2.5 text-[16px] md:text-[14px] text-[#1f2a37] placeholder:text-[#a3afbd] outline-none w-[220px] bg-transparent"
            @keydown="handleKeydown"
          />
          <button
            v-if="keyword"
            class="flex items-center justify-center px-2.5 text-[#a3afbd] hover:text-[#6b7888] transition-colors shrink-0"
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
          class="shrink-0 rounded-full bg-[#f08c1e] text-white text-[14px] font-bold px-6 py-2.5 hover:bg-[#d97606] disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
          @click="search()"
        >検索</button>
      </div>

      <!-- 最近の検索 -->
      <div v-if="recentSearches.length" class="flex items-center gap-2 justify-center flex-wrap mb-6">
        <span class="text-[12px] font-bold text-[#4b5868] shrink-0">最近の検索</span>
        <button
          v-for="w in recentSearches"
          :key="w"
          class="recent-chip"
          :class="{ 'recent-chip-active': w === searchedWord }"
          @click="search(w)"
        >{{ w }}</button>
      </div>
      <div v-else class="mb-6" />

      <!-- ローディング -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-20 gap-4">
        <span class="w-8 h-8 rounded-full border-2 border-[#1d6fd6]/20 border-t-[#1d6fd6] animate-spin block" />
        <p class="text-[12px] text-[#8593a3]">「{{ searchedWord }}」の変遷を調べています...</p>
      </div>

      <!-- 初期状態 -->
      <div v-else-if="!searchedWord" class="flex flex-col items-center justify-center py-24 gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="opacity-30 text-[#1f2a37]"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <p class="text-[15px] font-bold text-[#1f2a37] text-center leading-snug">キーワードを入力して<br>議論の変遷をAI検索</p>
        <p class="text-[11.5px] text-[#8593a3] text-center leading-relaxed">気になる言葉を入力すると、<br>宮古島市議会でこの20年間でどう議論が変わってきたかをAIが解説します</p>
      </div>

      <!-- 結果：タイムライン -->
      <div v-else>
        <!-- 検索ワード見出し -->
        <div class="flex items-center gap-2 mb-4 justify-center">
          <span class="text-[14px] font-bold text-[#1f2a37]">「{{ searchedWord }}」</span>
          <span class="text-[12px] text-[#8593a3]">2005年〜現在の議論の変遷</span>
        </div>

        <!-- タイムライン本体 -->
        <div class="flex flex-col md:flex-row md:items-stretch gap-0">
          <template v-for="(phase, i) in phases" :key="i">
            <!-- フェーズカード -->
            <div
              class="phase-card flex-1 min-w-0"
              :class="{ 'phase-card-expanded': allExpanded }"
              @click="toggleDetail(i)"
            >
              <!-- 時代ラベル -->
              <div class="phase-era">
                <span class="text-[12px] font-bold text-[#134c9c]">{{ phase.era }}</span>
              </div>
              <!-- タイトル -->
              <div class="phase-title">{{ phase.title }}</div>
              <!-- 概要 -->
              <div class="phase-summary">{{ breakAtKuten(phase.summary) }}</div>
              <!-- 展開トリガー -->
              <div class="phase-toggle" :class="{ 'phase-toggle-open': allExpanded }">
                <span>{{ allExpanded ? '閉じる' : '詳しく見る' }}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="phase-toggle-chevron"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              <!-- 詳細（展開時のみ） -->
              <div v-if="allExpanded && phase.detail" class="phase-detail">
                {{ breakAtKuten(phase.detail) }}
              </div>
            </div>

            <!-- カード間矢印 -->
            <div v-if="i < phases.length - 1" class="phase-arrow">
              <span class="md:hidden">↓</span>
              <span class="hidden md:inline">→</span>
            </div>
          </template>

          <!-- 結果なし -->
          <div v-if="phases.length === 0" class="flex flex-col items-center justify-center py-16 gap-3 w-full">
                        <p class="text-[13px] text-[#6b7888]">「{{ searchedWord }}」に関する議論は見つかりませんでした</p>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.page-bg {
  background-color: #f1f6fc;
}

.recent-chip {
  padding: 3px 11px;
  border-radius: 9999px;
  font-size: 12px;
  color: #4b5868;
  background: #fff;
  border: 1px solid #b9c8da;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.recent-chip:hover {
  background: #f1f6fc;
  border-color: #1d6fd6;
  color: #1f2a37;
}
.recent-chip-active {
  background: #e6f0fb;
  border-color: #1d6fd6;
  color: #1f2a37;
  font-weight: 600;
}

.phase-card {
  background: #fff;
  border: 1px solid #dbe4ef;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(20,60,120,0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.phase-card:hover {
  border-color: #1d6fd6;
  box-shadow: 0 4px 14px rgba(29,111,214,0.13), 0 0 0 1px rgba(29,111,214,0.15);
}
.phase-card-expanded {
  border-color: #1d6fd6;
  box-shadow: 0 4px 14px rgba(29,111,214,0.13), 0 0 0 1px rgba(29,111,214,0.2);
}

.phase-era {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  background: #e6f0fb;
  padding: 7px 14px;
  border-left: 3px solid #1d6fd6;
  border-bottom: 1px solid #c5dbf5;
}

.phase-title {
  font-size: 15px;
  font-weight: 700;
  color: #1f2a37;
  padding: 10px 14px 4px;
  line-height: 1.55;
}

.phase-summary {
  font-size: 13px;
  color: #4b5868;
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
  color: #6b7888;
  padding: 5px 14px 9px;
  margin-top: auto;
}
.phase-toggle-open {
  color: #1d6fd6;
}
.phase-toggle-chevron {
  transition: transform 0.2s;
}
.phase-toggle-open .phase-toggle-chevron {
  transform: rotate(180deg);
}

.phase-detail {
  font-size: 13px;
  color: #1f2a37;
  background: #f5f8fc;
  border-top: 1px solid #dbe4ef;
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
  color: #1d6fd6;
  opacity: 0.45;
}
</style>
