<script setup lang="ts">
import type { FarmLogData, FarmLogSession, WatchLogData, WatchLogSession } from '~/types/farm-log'

definePageMeta({ ssr: false, layout: 'farm-log' })
useHead({ title: '農作業ログ' })

const route  = useRoute()
const router = useRouter()

// ─── URL クエリ → 初期値 ────────────────
const qDevice  = route.query.device  as string | undefined
const qSession = route.query.session as string | undefined

// ─── タブ ───────────────────────────────
const tab = ref<'phone' | 'watch'>(qDevice === 'watch' ? 'watch' : 'phone')

// URL を上書きしないよう同値チェックしてから replace
function syncUrl(device: string, session: string) {
  if (route.query.device !== device || route.query.session !== session) {
    router.replace({ query: { device, session } })
  }
}

// ─── スマホログ ──────────────────────────
const phoneSessions      = ref<FarmLogSession[]>([])
const phoneSelectedLabel = ref<string>('')
const phoneData          = ref<FarmLogData | null>(null)
const phoneLoading       = ref(true)
const highlightT         = ref<number | null>(null)

async function loadPhoneSessions() {
  try {
    const index = await $fetch<FarmLogSession[]>('/data/farm-log/index.json')
    phoneSessions.value = index
    if (index.length > 0) {
      // URLにセッション指定があればそれを優先
      const target = (qDevice !== 'watch' && qSession && index.some(s => s.label === qSession))
        ? qSession
        : index[0].label
      await selectPhoneSession(target, /* updateUrl */ false)
    }
  } catch (e) {
    console.error('phone sessions load failed', e)
  } finally {
    phoneLoading.value = false
  }
}

async function selectPhoneSession(label: string, updateUrl = true) {
  phoneLoading.value = true
  phoneSelectedLabel.value = label
  try {
    phoneData.value = await $fetch<FarmLogData>(`/data/farm-log/${label}.json`)
  } catch (e) {
    console.error('phone session load failed', e)
    phoneData.value = null
  } finally {
    phoneLoading.value = false
  }
  if (updateUrl) syncUrl('phone', label)
}

// ─── Apple Watch ログ ───────────────────
const watchSessions      = ref<WatchLogSession[]>([])
const watchSelectedLabel = ref<string>('')
const watchData          = ref<WatchLogData | null>(null)
const watchLoading       = ref(false)
const watchInitialized   = ref(false)
const watchHighlightT    = ref<number | null>(null)

async function loadWatchSessions() {
  watchLoading.value = true
  try {
    const index = await $fetch<WatchLogSession[]>('/data/farm-log/watch-index.json')
    watchSessions.value = index
    if (index.length > 0) {
      const target = (qDevice === 'watch' && qSession && index.some(s => s.label === qSession))
        ? qSession
        : index[0].label
      await selectWatchSession(target, /* updateUrl */ false)
    }
  } catch (e) {
    console.error('watch sessions load failed', e)
  } finally {
    watchLoading.value  = false
    watchInitialized.value = true
    // ロード完了後に確定したラベルでURLを同期
    if (watchSelectedLabel.value) syncUrl('watch', watchSelectedLabel.value)
  }
}

async function selectWatchSession(label: string, updateUrl = true) {
  watchLoading.value = true
  watchSelectedLabel.value = label
  try {
    watchData.value = await $fetch<WatchLogData>(`/data/farm-log/${label}.json`)
  } catch (e) {
    console.error('watch session load failed', e)
    watchData.value = null
  } finally {
    watchLoading.value = false
  }
  if (updateUrl) syncUrl('watch', label)
}

// ─── タブ切替 ───────────────────────────
function switchTab(newTab: 'phone' | 'watch') {
  tab.value = newTab
  const session = newTab === 'watch' ? watchSelectedLabel.value : phoneSelectedLabel.value
  // セッションが確定済みならすぐに反映、未確定でも device だけ先に書く
  syncUrl(newTab, session || '')
  if (newTab === 'watch' && !watchInitialized.value) {
    loadWatchSessions()
  }
}

// ─── フォーマット ───────────────────────
function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00+09:00')
  return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
}
function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h${m}m` : `${m}m`
}

// ─── 初期ロード ─────────────────────────
onMounted(async () => {
  await loadPhoneSessions()
  // 初期タブが Watch の場合はそのままロード開始
  if (tab.value === 'watch') {
    loadWatchSessions()
  } else {
    // phone のセッションが確定したので URL を確定
    if (phoneSelectedLabel.value) syncUrl('phone', phoneSelectedLabel.value)
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-gray-100">
    <!-- Header -->
    <header class="border-b border-gray-800 px-4 py-3">
      <div class="flex items-center gap-3 flex-wrap">
        <span class="text-lg font-semibold">🌿 農作業ログ</span>

        <!-- タブ切替 -->
        <div class="flex gap-1 bg-gray-900 rounded-lg p-0.5">
          <button
            type="button"
            @click="switchTab('phone')"
            :class="['px-3 py-1 rounded-md text-xs font-medium transition-colors', tab === 'phone' ? 'bg-emerald-700 text-white' : 'text-gray-400 hover:text-gray-200']"
          >
            📱 スマホ
          </button>
          <button
            type="button"
            @click="switchTab('watch')"
            :class="['px-3 py-1 rounded-md text-xs font-medium transition-colors', tab === 'watch' ? 'bg-sky-700 text-white' : 'text-gray-400 hover:text-gray-200']"
          >
            ⌚ Apple Watch
          </button>
        </div>

        <!-- セッションピッカー（スマホ） -->
        <div v-if="tab === 'phone'" class="ml-auto">
          <FarmLogSessionPicker
            v-if="phoneSessions.length > 0"
            :sessions="phoneSessions"
            :selected-label="phoneSelectedLabel"
            @select="(label: string) => selectPhoneSession(label)"
          />
        </div>

        <!-- セッションピッカー（Apple Watch） -->
        <div v-if="tab === 'watch' && watchSessions.length > 0" class="ml-auto flex gap-1.5 flex-wrap">
          <button
            v-for="s in watchSessions"
            :key="s.label"
            type="button"
            @click="selectWatchSession(s.label)"
            class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            :class="s.label === watchSelectedLabel
              ? 'bg-sky-700 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'"
          >
            {{ formatDate(s.date) }}
            <span class="opacity-60 ml-1">{{ formatDuration(s.durationSec) }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- ════════════════════════════════════
         スマホタブ
         ════════════════════════════════════ -->
    <template v-if="tab === 'phone'">
      <div v-if="phoneLoading" class="flex items-center justify-center h-64 text-gray-500">読み込み中...</div>
      <div v-else-if="phoneData" class="p-4 max-w-6xl mx-auto space-y-4">
        <div v-if="phoneData.meta.activity" class="flex items-center gap-2">
          <span class="text-xs bg-emerald-900 text-emerald-300 px-2.5 py-1 rounded-full font-medium">
            {{ phoneData.meta.activity }}
          </span>
        </div>
        <div class="bg-gray-900 rounded-xl p-4">
          <div class="text-xs text-gray-500 mb-2">活動内訳</div>
          <FarmLogActivityBar :meta="phoneData.meta" />
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="bg-gray-900 rounded-xl p-2">
            <ClientOnly>
              <FarmLogMap :track="phoneData.track" :bounding-box="phoneData.meta.boundingBox" :highlight-t="highlightT" />
              <template #fallback>
                <div class="h-96 rounded-xl bg-gray-800 flex items-center justify-center text-gray-500 text-sm">地図を読み込み中...</div>
              </template>
            </ClientOnly>
          </div>
          <div class="bg-gray-900 rounded-xl p-4">
            <div class="text-xs text-gray-500 mb-3">サマリー</div>
            <FarmLogStatsGrid :data="phoneData" />
          </div>
        </div>
        <div class="bg-gray-900 rounded-xl p-4">
          <FarmLogTimeline :data="phoneData" :highlight-t="highlightT" @hover-time="(t: number | null) => highlightT = t" />
        </div>
      </div>
      <div v-else class="flex items-center justify-center h-64 text-gray-500">データが見つかりません</div>
    </template>

    <!-- ════════════════════════════════════
         Apple Watch タブ
         ════════════════════════════════════ -->
    <template v-if="tab === 'watch'">
      <div v-if="watchLoading" class="flex items-center justify-center h-64 text-gray-500">読み込み中...</div>
      <div v-else-if="watchData" class="p-4 max-w-6xl mx-auto space-y-4">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="bg-gray-900 rounded-xl p-2">
            <div class="text-xs text-gray-500 px-2 pt-1 mb-1">① GPS軌跡 / 活動ヒートマップ</div>
            <ClientOnly>
              <FarmLogWatchLogMap
                :track="watchData.track"
                :bounding-box="watchData.meta.boundingBox"
                :highlight-t="watchHighlightT"
              />
              <template #fallback>
                <div class="h-96 rounded-xl bg-gray-800 flex items-center justify-center text-gray-500 text-sm">地図を読み込み中...</div>
              </template>
            </ClientOnly>
          </div>
          <div class="bg-gray-900 rounded-xl p-4">
            <div class="text-xs text-gray-500 mb-3">サマリー</div>
            <FarmLogWatchLogStats :data="watchData" />
          </div>
        </div>
        <div class="bg-gray-900 rounded-xl p-4">
          <FarmLogWatchTimeline
            :data="watchData"
            :highlight-t="watchHighlightT"
            @hover-time="(t: number | null) => watchHighlightT = t"
          />
        </div>
      </div>
      <div v-else-if="!watchInitialized" class="flex items-center justify-center h-64 text-gray-500">読み込み中...</div>
      <div v-else class="flex items-center justify-center h-64 text-gray-500">データが見つかりません</div>
    </template>
  </div>
</template>
