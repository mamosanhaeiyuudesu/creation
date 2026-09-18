<script setup lang="ts">
definePageMeta({ ssr: false, layout: 'miyako' })

useHead({ title: import.meta.dev ? '宮古議事録 (dev)' : '宮古議事録' })

import type { MiyakoTrendState, MiyakoTrendTerm } from '~/types/miyako-trends'

interface AiTopic {
  title: string
  conclusion: string
  flow: string[]
}

/** 前回の定例会でこの回数未満なら「新しく出てきた話題」として色を変える。 */
const NEW_TOPIC_BELOW = 3
const COLOR_NEW = '#c2410c'
const COLOR_CONTINUING = '#1c2d5a'

const route = useRoute()
const router = useRouter()

const state = ref<MiyakoTrendState | null>(null)
const loading = ref(true)
const loadError = ref('')
const sessionKey = ref((route.query.session as string) || '')
const selectedWord = ref<string | null>((route.query.word as string) || null)
const aiWord = ref<string | null>(null)
const aiTopics = ref<AiTopic[]>([])
const aiLoading = ref(false)
const isMobile = ref(false) // 767px以下＝文字を小さくする
const isStacked = ref(false) // 1023px以下＝詳細がワードクラウドの下に回る
const detailRef = ref<HTMLElement | null>(null)

const current = computed(() => state.value?.current ?? null)
const terms = computed(() => current.value?.terms ?? [])
const selectedTerm = computed(() => terms.value.find(t => t.term === selectedWord.value) ?? null)

const isNew = (t: MiyakoTrendTerm) => t.prevCount < NEW_TOPIC_BELOW

// バズ度の平方根で文字の大きさを決める（そのままだと1位だけが極端に大きくなる）
const cloudWords = computed(() => {
  const list = terms.value
  if (!list.length) return []
  const [minSize, maxSize, maxWidth] = isMobile.value ? [12, 30, 320] : [14, 46, 640]
  const hi = Math.sqrt(list[0]!.buzz)
  const lo = Math.sqrt(list[list.length - 1]!.buzz)
  return list.map((t) => {
    const r = hi > lo ? (Math.sqrt(t.buzz) - lo) / (hi - lo) : 1
    const size = Math.min(Math.round(minSize + r * (maxSize - minSize)), Math.floor(maxWidth / t.term.length))
    return {
      name: t.term,
      size,
      color: isNew(t) ? COLOR_NEW : COLOR_CONTINUING,
      title: `${t.term}：今回 ${t.count}回`,
    }
  })
})

function fmtMD(ymd: string): string {
  const [, m, d] = ymd.split('-').map(Number)
  return `${m}/${d}`
}

const period = computed(() => {
  const c = current.value
  if (!c) return ''
  return c.heldFrom === c.heldTo ? fmtMD(c.heldFrom) : `${fmtMD(c.heldFrom)}〜${fmtMD(c.heldTo)}`
})

/**
 * 過去3年の頻度のまま今回と同じ長さの会期だったら何回出ていたか。倍率（「約255倍」）は
 * 過去にほぼ出ていない語で極端な数字になり読みにくいので、回数で「今回・前回」と並べる。
 */
function usualCount(t: MiyakoTrendTerm): string {
  const n = t.rate > 0 ? (t.baseRate * t.count) / t.rate : 0
  return n < 10 ? String(Math.round(n * 10) / 10) : String(Math.round(n))
}

// ── 読み込み ──────────────────────────────────────

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    state.value = await $fetch<MiyakoTrendState>('/api/miyako/trends', {
      query: sessionKey.value ? { session: sessionKey.value } : {},
    })
  } catch {
    loadError.value = '読み込みに失敗しました。時間をおいて再読み込みしてください。'
  } finally {
    loading.value = false
  }
}

function onSessionChange() {
  selectedWord.value = null
  aiWord.value = null
  aiTopics.value = []
  load()
}

// state → URL 同期（最新の会期を見ているときは session を付けない）
watch([sessionKey, selectedWord], () => {
  const query: Record<string, string> = {}
  const latest = state.value?.sessions[0]?.key
  if (sessionKey.value && sessionKey.value !== latest) query.session = sessionKey.value
  if (selectedWord.value) query.word = selectedWord.value
  router.replace({ query })
})

// ── 語を選ぶ・AI解説 ──────────────────────────────

function selectWord(word: string) {
  selectedWord.value = selectedWord.value === word ? null : word
  if (aiWord.value !== selectedWord.value) {
    aiWord.value = null
    aiTopics.value = []
  }
  // 縦並びのときは詳細がワードクラウドの下にあり気づきにくいので、そこまで送る
  if (selectedWord.value && isStacked.value) {
    nextTick(() => detailRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
}

async function fetchAi(word: string) {
  const c = current.value
  if (!c) return
  aiWord.value = word
  aiTopics.value = []

  const cacheKey = `miyako_trend_ai:${c.key}:${word}`
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
      body: { session: c.key, word, maxChars: 800 },
    })
    aiTopics.value = data.topics
    localStorage.setItem(cacheKey, JSON.stringify(data.topics))
  } catch {
    aiTopics.value = [{ title: 'エラー', conclusion: '取得に失敗しました。', flow: [] }]
  } finally {
    aiLoading.value = false
  }
}

onMounted(async () => {
  // 以前のトップ（全体像）を共有したURL（?cat= / ?node=）は全体像のページへ送る
  if (route.query.cat || route.query.node) {
    router.replace({ path: '/miyako/network', query: route.query })
    return
  }
  const mq = window.matchMedia('(max-width: 767px)')
  isMobile.value = mq.matches
  mq.addEventListener('change', (e) => { isMobile.value = e.matches })
  const stacked = window.matchMedia('(max-width: 1023px)')
  isStacked.value = stacked.matches
  stacked.addEventListener('change', (e) => { isStacked.value = e.matches })

  await load()
  if (!sessionKey.value && current.value) sessionKey.value = current.value.key
  if (selectedWord.value && !selectedTerm.value) selectedWord.value = null
})
</script>

<template>
  <div class="min-h-screen overflow-x-hidden page-bg">
    <MiyakoHeader active-page="trend" />

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col justify-center items-center py-[72px] px-6 gap-3">
      <span class="w-8 h-8 rounded-full border-2 border-[#1A237E]/20 border-t-[#1A237E] animate-spin block" />
      <span class="font-mono text-[10px] text-[#9aa3c0] tracking-[0.12em] uppercase">Loading data...</span>
    </div>

    <div v-else-if="loadError || !current" class="max-w-[640px] mx-auto px-4 py-16 text-center">
      <p class="text-[14px] text-[#44507a] leading-relaxed m-0">
        {{ loadError || 'まだ分析された定例会がありません。市のサイトで会議録が公開されると、毎月1日に自動で取り込みます。' }}
      </p>
    </div>

    <!-- Main content -->
    <!-- 右の詳細パネルが400px固定なので、2列にするのは1024px以上（768pxで2列にするとワードクラウドが潰れる） -->
    <div v-else class="max-w-[1400px] mx-auto px-3 md:px-6 pt-[11px] pb-8 flex flex-col lg:flex-row gap-3 items-start">

      <!-- Word cloud -->
      <section class="card w-full lg:flex-1 min-w-0">
        <div class="px-4 md:px-5 pt-4 pb-3 border-b border-[#dde2ef]">
          <div class="flex items-start gap-x-3 gap-y-2 flex-wrap">
            <div class="min-w-0 w-full md:w-auto md:flex-1">
              <span class="font-mono text-[9.5px] tracking-[0.18em] text-[#6878a8] uppercase">Recent trends</span>
              <h2 class="m-0 mt-1 text-[17px] md:text-[20px] font-bold text-[#1c2d5a] leading-snug">
                {{ current.label }}<span class="text-[#6878a8] font-semibold text-[14px] md:text-[16px]">（{{ period }}）</span>でよく議論された言葉
              </h2>
            </div>
            <label v-if="(state?.sessions.length ?? 0) > 1" class="shrink-0 flex items-center gap-1.5 text-[11.5px] text-[#6878a8]">
              会期
              <select v-model="sessionKey" class="session-select" @change="onSessionChange">
                <option v-for="s in state?.sessions" :key="s.key" :value="s.key">{{ s.label }}</option>
              </select>
            </label>
          </div>
          <p class="m-0 mt-2 text-[12.5px] text-[#44507a] leading-relaxed">
            文字が大きいほど、いつもより多く話題になった言葉です。
            <template v-if="current.baseSessions">過去3年の定例会（{{ current.baseSessions }}回分）と比べています。</template>
          </p>
          <div class="mt-2 flex items-center gap-x-4 gap-y-1 flex-wrap text-[11.5px] text-[#44507a]">
            <span class="flex items-center gap-1.5"><span class="legend-dot" :style="{ background: COLOR_NEW }" />新しく出てきた話題</span>
            <span class="flex items-center gap-1.5">
              <span class="legend-dot" :style="{ background: COLOR_CONTINUING }" />前回<template v-if="current.prevLabel">（{{ current.prevLabel }}）</template>から続く話題
            </span>
          </div>
        </div>

        <div class="h-[340px] md:h-[460px] px-2">
          <MiyakoSessionWordCloud :words="cloudWords" :selected="selectedWord" @word-click="selectWord" />
        </div>

        <!-- 順位（ワードクラウドに入りきらない語や、スマホで押しにくい小さい語もここから選べる） -->
        <div class="px-4 md:px-5 py-3 border-t border-[#dde2ef]">
          <div class="font-mono text-[9.5px] tracking-[0.18em] text-[#6878a8] uppercase mb-2">Ranking</div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="t in terms"
              :key="t.term"
              type="button"
              class="rank-chip"
              :class="{ 'rank-chip-active': selectedWord === t.term }"
              @click="selectWord(t.term)"
            >
              <span class="font-mono text-[10px] text-[#9aa3c0]">{{ t.rank }}</span>
              <span :style="{ color: selectedWord === t.term ? undefined : (isNew(t) ? COLOR_NEW : COLOR_CONTINUING) }">{{ t.term }}</span>
            </button>
          </div>
          <p class="m-0 mt-3 text-[11px] text-[#9aa3c0] leading-relaxed">
            会議録は閉会から2〜3か月後に市のサイトで公開されるため、これが公開済みで最新の定例会です（毎月1日に確認）。
            言葉はAIが会議録から選び、回数は会議録の本文をそのまま数えています。
          </p>
        </div>
      </section>

      <!-- Side panel -->
      <div ref="detailRef" class="w-full lg:w-[400px] flex-shrink-0 flex flex-col gap-3 lg:sticky lg:top-3">
        <div v-if="!selectedTerm" class="card hint-area">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-3 opacity-35"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <p class="hint-main">言葉をクリック</p>
          <p class="hint-sub">その言葉がこの定例会でどう話されたか、何回出てきたかを表示します</p>
        </div>

        <div v-else class="card overflow-hidden">
          <div class="flex items-center gap-2 bg-[#1c2d5a] text-white px-3.5 py-2.5" style="border-left: 3px solid #a5b4fc">
            <span class="text-[15px] font-bold tracking-[0.02em] truncate">「{{ selectedTerm.term }}」</span>
            <span
              class="ml-auto shrink-0 text-[10.5px] font-semibold px-2 py-[2px] rounded-[3px]"
              :style="{ background: isNew(selectedTerm) ? COLOR_NEW : '#3d5fc4' }"
            >{{ isNew(selectedTerm) ? '新しく出てきた話題' : '前回から続く話題' }}</span>
          </div>
          <div class="px-4 py-3.5">
            <p v-if="selectedTerm.note" class="m-0 mb-3.5 text-[13.5px] text-[#1c2d5a] leading-relaxed">{{ selectedTerm.note }}</p>
            <dl class="stats">
              <div>
                <dt>今回</dt>
                <dd>{{ selectedTerm.count }}<span>回</span></dd>
              </div>
              <div>
                <dt>前回</dt>
                <dd>{{ selectedTerm.prevCount }}<span>回</span></dd>
              </div>
              <div>
                <dt>いつもの定例会</dt>
                <dd><span class="stats-approx">約</span>{{ usualCount(selectedTerm) }}<span>回</span></dd>
              </div>
            </dl>
            <button
              v-if="aiWord !== selectedTerm.term"
              type="button"
              class="ai-button"
              @click="fetchAi(selectedTerm.term)"
            >この定例会での議論をAIで詳しく見る</button>
          </div>
        </div>

        <MiyakoSessionAiPanel
          v-if="aiWord && aiWord === selectedWord"
          :selected-word="aiWord"
          :selected-session="null"
          :ai-topics="aiTopics"
          :ai-loading="aiLoading"
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

.card {
  background: #fff;
  border: 1px solid #dde2ef;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(28,45,90,0.07), 0 0 0 1px rgba(28,45,90,0.04);
}

.session-select {
  font-size: 12px;
  color: #1c2d5a;
  border: 1px solid #dde2ef;
  border-radius: 4px;
  padding: 3px 6px;
  background: #fff;
}

.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 9999px;
  display: inline-block;
}

.rank-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  padding: 3px 9px;
  font-size: 12.5px;
  font-weight: 600;
  border: 1px solid #dde2ef;
  border-radius: 9999px;
  background: #fff;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}
.rank-chip:hover {
  background: #eef1fb;
}
.rank-chip-active,
.rank-chip-active:hover {
  background: #1c2d5a;
  border-color: #1c2d5a;
  color: #fff;
}
.rank-chip-active .font-mono {
  color: #a5b4fc;
}

.hint-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 36px 24px;
  color: #6878a8;
}
.hint-main {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #44507a;
}
.hint-sub {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: #9aa3c0;
}

.stats {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.stats > div {
  background: #f5f7fc;
  border-radius: 6px;
  padding: 8px 10px;
}
.stats dt {
  font-size: 10.5px;
  color: #6878a8;
}
.stats dd {
  margin: 2px 0 0;
  font-size: 20px;
  font-weight: 700;
  color: #1c2d5a;
  line-height: 1.2;
}
.stats dd span {
  font-size: 11px;
  font-weight: 500;
  margin-left: 2px;
}
.stats dd .stats-approx {
  margin: 0 2px 0 0;
}

.ai-button {
  margin-top: 14px;
  width: 100%;
  padding: 9px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #1A237E;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s;
}
.ai-button:hover {
  background: #283593;
}
</style>
