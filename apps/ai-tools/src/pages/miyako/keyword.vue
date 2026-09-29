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
          @click="search()"
        >検索</button>
      </div>

      <!-- 最近の検索 -->
      <div v-if="recentSearches.length" class="flex items-center gap-2 justify-center flex-wrap mb-6">
        <span class="font-mono text-[10px] text-[#9aa3c0] tracking-[0.12em] shrink-0">RECENT</span>
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
        <span class="w-8 h-8 rounded-full border-2 border-[#1A237E]/20 border-t-[#1A237E] animate-spin block" />
        <p class="text-[12px] text-[#9aa3c0]">「{{ searchedWord }}」の変遷を調べています...</p>
      </div>

      <!-- 初期状態 -->
      <div v-else-if="!searchedWord" class="flex flex-col items-center justify-center py-24 gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="opacity-30 text-[#1c2d5a]"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <p class="text-[15px] font-bold text-[#1c2d5a] text-center leading-snug">キーワードを入力して<br>議論の変遷をAI検索</p>
        <p class="text-[11.5px] text-[#9aa3c0] text-center leading-relaxed">気になる言葉を入力すると、<br>宮古島市議会でこの20年間でどう議論が変わってきたかをAIが解説します</p>
      </div>

      <!-- 結果：タイムライン -->
      <div v-else>
        <!-- 検索ワード見出し -->
        <div class="flex items-center gap-2 mb-4 justify-center">
          <span class="font-mono text-[10px] text-[#6878a8] tracking-[0.15em] uppercase">「{{ searchedWord }}」</span>
          <span class="text-[12px] text-[#9aa3c0]">2005年〜現在の議論の変遷</span>
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
                <span class="font-mono text-[8.5px] tracking-[0.18em] text-[#a5b4fc]/70 uppercase mr-2">Era</span>
                <span class="text-[11px] font-semibold text-[#a5b4fc]">{{ phase.era }}</span>
              </div>
              <!-- タイトル -->
              <div class="phase-title">{{ phase.title }}</div>
              <!-- 概要 -->
              <div class="phase-summary">{{ phase.summary }}</div>
              <!-- 展開トリガー -->
              <div class="phase-toggle" :class="{ 'phase-toggle-open': allExpanded }">
                <span>{{ allExpanded ? '閉じる' : '詳しく見る' }}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="phase-toggle-chevron"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              <!-- 詳細（展開時のみ） -->
              <div v-if="allExpanded && phase.detail" class="phase-detail">
                {{ phase.detail }}
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
            <span class="font-mono text-[10px] text-[#9aa3c0] tracking-[0.1em]">// no results found</span>
            <p class="text-[13px] text-[#6878a8]">「{{ searchedWord }}」に関する議論は見つかりませんでした</p>
          </div>
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

.recent-chip {
  padding: 3px 11px;
  border-radius: 9999px;
  font-size: 12px;
  color: #44507a;
  background: #fff;
  border: 1px solid #c5cad8;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.recent-chip:hover {
  background: #f0f2f8;
  border-color: #3d5fc4;
  color: #1c2d5a;
}
.recent-chip-active {
  background: #e8ecf8;
  border-color: #3d5fc4;
  color: #1c2d5a;
  font-weight: 600;
}

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
  font-size: 14px;
  font-weight: 700;
  color: #1c2d5a;
  padding: 10px 14px 4px;
  line-height: 1.55;
}

.phase-summary {
  font-size: 12px;
  color: #3a4a72;
  padding: 0 14px 12px;
  line-height: 1.75;
  flex: 1;
}

.phase-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #6878a8;
  padding: 5px 14px 9px;
  margin-top: auto;
}
.phase-toggle-open {
  color: #3d5fc4;
}
.phase-toggle-chevron {
  transition: transform 0.2s;
}
.phase-toggle-open .phase-toggle-chevron {
  transform: rotate(180deg);
}

.phase-detail {
  font-size: 12px;
  color: #1c2d5a;
  background: #f4f6fc;
  border-top: 1px solid #dde2ef;
  padding: 10px 14px 12px;
  line-height: 1.78;
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
</style>
