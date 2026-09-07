<template>
  <div class="max-w-[860px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <!-- 題字 -->
    <header class="border-b-2 border-[var(--news-ink)] pb-3 mb-4">
      <div class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 class="news-display text-[26px] sm:text-[30px] leading-none tracking-[0.12em]">AI ニュース</h1>
          <p class="text-[12px] text-[var(--news-ink-soft)] mt-2">
            {{ NEWS_SOURCES.length }}ソースの新着を毎朝7時に集め、5つの潮流に分けています
          </p>
        </div>
        <div class="flex items-center gap-1.5">
          <button class="news-btn-ghost" :disabled="running" @click="collect">
            {{ running ? '収集中…' : 'いま収集する' }}
          </button>
          <button v-if="isLoggedIn" class="text-[12.5px] text-[var(--news-ink-faint)] px-2 py-1.5 hover:text-[var(--news-ink)]" @click="doLogout">
            ログアウト
          </button>
        </div>
      </div>
    </header>

    <!-- 直近の実行状況 -->
    <div class="flex items-center justify-between gap-3 flex-wrap text-[12px] text-[var(--news-ink-soft)] mb-6">
      <p v-if="lastRun">
        最終更新 {{ fmtDateTime(lastRun.createdAt) }}（{{ lastRun.trigger === 'cron' ? '自動' : '手動' }}）・新着{{ lastRun.newItems }}件
        <span v-if="lastRun.errors" class="text-[var(--news-accent)]">・エラー{{ errorCount(lastRun) }}件</span>
      </p>
      <p v-else-if="!loading">まだ一度も実行されていません。</p>
      <p v-if="message" :class="messageIsError ? 'text-[var(--news-accent)]' : 'text-[var(--news-ink)]'">{{ message }}</p>
    </div>

    <!-- 潮流：まずここで大きな流れをつかむ。クリックすると全文がポップアップで読める -->
    <section v-if="!loading" class="mb-8">
      <div class="grid gap-3 sm:grid-cols-2">
        <button
          v-for="c in NEWS_CURRENTS"
          :key="c.id"
          class="news-current-card text-left"
          :class="{ 'news-current-card--on': currentId === c.id }"
          @click="openCurrentId = c.id"
        >
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <h2 class="news-display text-[14px]">{{ c.label }}</h2>
            <span class="text-[11px] text-[var(--news-ink-faint)] whitespace-nowrap">{{ currentState(c.id)?.itemCount30d ?? 0 }}件/30日</span>
          </div>
          <p
            class="text-[12.5px] leading-[1.7] text-[var(--news-ink-soft)] overflow-hidden"
            style="display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;"
          >
            {{ currentState(c.id)?.narrative || 'まだ記事が集まっていません。' }}
          </p>
        </button>
      </div>
    </section>

    <!-- 潮流の考察：全文ポップアップ -->
    <div v-if="openCurrentMeta" class="news-modal-backdrop" @click.self="openCurrentId = ''">
      <div class="news-modal" role="dialog" aria-modal="true">
        <div class="flex items-start justify-between gap-3 mb-1">
          <h2 class="news-display text-[18px] leading-snug">{{ openCurrentMeta.label }}</h2>
          <button class="news-modal-close" aria-label="閉じる" @click="openCurrentId = ''">×</button>
        </div>
        <p class="text-[11.5px] text-[var(--news-ink-faint)] mb-4">
          {{ openCurrentMeta.description }}
        </p>
        <p class="text-[12px] text-[var(--news-ink-faint)] mb-2">
          直近30日{{ currentState(openCurrentMeta.id)?.itemCount30d ?? 0 }}件
          <template v-if="currentState(openCurrentMeta.id)?.updatedAt">・{{ fmtDateTime(currentState(openCurrentMeta.id)!.updatedAt) }}更新</template>
        </p>
        <p class="text-[14px] leading-[1.9] text-[var(--news-ink)] whitespace-pre-line">
          {{ currentState(openCurrentMeta.id)?.narrative || 'まだ記事が集まっていません。' }}
        </p>
        <div class="mt-5 pt-3 border-t border-[var(--news-line)]">
          <button class="news-btn-ghost" @click="filterByCurrent(openCurrentMeta.id)">この潮流の記事だけ見る ↓</button>
        </div>
      </div>
    </div>

    <!-- 絞り込み -->
    <div v-if="items.length" ref="filterBarEl" class="flex items-center gap-1.5 flex-wrap mb-6">
      <button v-if="currentId" class="news-chip news-chip--on" @click="currentId = ''">
        {{ currentLabel(currentId) }} ×
      </button>
      <button class="news-chip" :class="{ 'news-chip--on': sourceId === 'all' }" @click="sourceId = 'all'">すべてのソース</button>
      <button
        v-for="s in usedSources"
        :key="s.id"
        class="news-chip"
        :class="{ 'news-chip--on': sourceId === s.id }"
        @click="sourceId = s.id"
      >
        {{ s.name }}
      </button>
      <span class="w-px h-5 bg-[var(--news-line)] mx-1" />
      <button
        v-for="t in THRESHOLDS"
        :key="t.value"
        class="news-chip"
        :class="{ 'news-chip--on': minImportance === t.value }"
        @click="minImportance = t.value"
      >
        {{ t.label }}
      </button>
      <input v-model="keyword" class="news-input ml-auto w-[150px]" type="search" placeholder="キーワード" />
    </div>

    <p v-if="loading" class="text-[13px] text-[var(--news-ink-soft)] py-16 text-center">読み込み中…</p>

    <p v-else-if="!items.length" class="text-[13px] text-[var(--news-ink-soft)] py-16 text-center leading-relaxed">
      まだ記事がありません。<br />
      「いま収集する」を押すか、翌朝の自動実行を待ってください。
    </p>

    <p v-else-if="!filtered.length" class="text-[13px] text-[var(--news-ink-soft)] py-16 text-center">
      条件に合う記事がありません。
    </p>

    <!-- 日付ごと -->
    <section v-for="group in groups" :key="group.date" class="mb-8">
      <div class="flex items-center gap-3 mb-3">
        <h2 class="news-display text-[15px]">{{ fmtDate(group.date) }}</h2>
        <span class="text-[11.5px] text-[var(--news-ink-faint)]">{{ group.items.length }}件</span>
        <span class="flex-1 h-px bg-[var(--news-line)]" />
      </div>

      <div class="flex flex-col gap-2.5">
        <article
          v-for="item in group.items"
          :id="`item-${item.id}`"
          :key="item.id"
          class="news-card"
          :class="{ 'news-card--top': item.importance >= 4 }"
        >
          <div class="flex items-center gap-2 text-[11.5px] text-[var(--news-ink-faint)] mb-1.5 flex-wrap">
            <span class="text-[var(--news-accent)] font-bold tracking-[0.08em]">{{ stars(item.importance) }}</span>
            <button class="font-bold text-[var(--news-ink-soft)] hover:text-[var(--news-accent)]" @click="currentId = item.current">
              {{ currentLabel(item.current) }}
            </button>
            <span>{{ sourceName(item.sourceId) }}</span>
            <span v-if="item.publishedAt">{{ fmtDate(item.publishedAt.slice(0, 10)) }}</span>
            <span v-if="item.bodySource === 'feed'" title="記事ページを取得できなかったため、フィードの要約文だけで判定しています">フィード要約から</span>
          </div>

          <h3 class="news-display text-[17px] sm:text-[18px] leading-[1.45] mb-1">{{ item.titleJa }}</h3>
          <p class="text-[11.5px] text-[var(--news-ink-faint)] mb-2.5 leading-snug">{{ item.title }}</p>

          <p class="text-[13.5px] leading-[1.85] text-[var(--news-ink)] whitespace-pre-line">{{ item.summary }}</p>

          <p v-if="item.reason" class="mt-2.5 text-[12px] text-[var(--news-ink-soft)] leading-relaxed border-l-2 border-[var(--news-line)] pl-2.5">
            重要度{{ item.importance }} — {{ item.reason }}
          </p>

          <div class="mt-3">
            <a :href="item.url" target="_blank" rel="noopener noreferrer" class="text-[12.5px] text-[var(--news-accent)] hover:underline">
              原文を読む ↗
            </a>
          </div>
        </article>
      </div>
    </section>

    <!-- 実行ログ -->
    <details v-if="runs.length" class="mt-10 text-[12px] text-[var(--news-ink-soft)]">
      <summary class="cursor-pointer hover:text-[var(--news-ink)]">実行ログ（直近{{ runs.length }}件）</summary>
      <div class="mt-3 flex flex-col gap-2">
        <div v-for="run in runs" :key="run.id" class="border-b border-[var(--news-line)] pb-2">
          <div class="flex flex-wrap gap-x-3 gap-y-0.5">
            <span>{{ fmtDateTime(run.createdAt) }}</span>
            <span>{{ run.trigger === 'cron' ? '自動' : '手動' }}</span>
            <span>対象{{ run.fetched }}件・新着{{ run.newItems }}件</span>
          </div>
          <p v-if="run.errors" class="mt-1 text-[var(--news-accent)] whitespace-pre-line">{{ run.errors }}</p>
        </div>
      </div>
    </details>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
/**
 * news — 毎朝のAIニュースを読むページ。
 *
 * 上段は5潮流の「いまの考察」（直近1ヶ月を踏まえてAIが更新）。クリックすると
 * 下の記事一覧がその潮流だけに絞り込まれる＝大きな流れから個別記事へのドリルダウン。
 * 通知やメールは無く、cron（毎朝7時）が集めておいたものをここで読む。
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import { NEWS_MIN_IMPORTANCE, NEWS_SOURCES, sourceName } from '~/utils/news-sources'
import { NEWS_CURRENTS, currentLabel } from '~/utils/news-currents'
import { WEEKDAYS_JA, toJSTDate } from '~/utils/jst'
import type { NewsCurrentState, NewsItem, NewsRun, NewsRunResult, NewsState } from '~/types/news'

definePageMeta({ layout: 'news' })
useHead({ title: 'AIニュース' })

const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

const loading = ref(true)
const running = ref(false)
const message = ref('')
const messageIsError = ref(false)
const items = ref<NewsItem[]>([])
const runs = ref<NewsRun[]>([])
const currents = ref<NewsCurrentState[]>([])
let thresholdApplied = false

const THRESHOLDS = [
  { value: 0, label: 'すべての重要度' },
  { value: 3, label: '重要度3以上' },
  { value: 4, label: '重要度4以上' },
]

/** 選択中の潮流id。空文字なら絞り込みなし。 */
const currentId = ref('')
const sourceId = ref('all')
const minImportance = ref(NEWS_MIN_IMPORTANCE)
const keyword = ref('')

/** ポップアップで全文を開いている潮流id。空文字なら閉じている。 */
const openCurrentId = ref('')
const openCurrentMeta = computed(() => NEWS_CURRENTS.find((c) => c.id === openCurrentId.value) ?? null)
const filterBarEl = ref<HTMLElement | null>(null)

const lastRun = computed<NewsRun | null>(() => runs.value[0] ?? null)

function errorCount(run: NewsRun): number {
  return run.errors.split('\n').filter(Boolean).length
}

function currentState(id: string): NewsCurrentState | undefined {
  return currents.value.find((c) => c.id === id)
}

/** ポップアップの「この潮流の記事だけ見る」。絞り込んで閉じ、記事一覧までスクロールする。 */
async function filterByCurrent(id: string) {
  currentId.value = id
  openCurrentId.value = ''
  await nextTick()
  filterBarEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') openCurrentId.value = ''
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

/** 実際に記事があるソースだけをチップに出す（ソースを増やせば勝手に増える） */
const usedSources = computed(() => {
  const ids = new Set(items.value.map((i) => i.sourceId))
  return NEWS_SOURCES.filter((s) => ids.has(s.id)).map((s) => ({ id: s.id, name: s.name }))
})

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return items.value.filter((i) => {
    if (currentId.value && i.current !== currentId.value) return false
    if (sourceId.value !== 'all' && i.sourceId !== sourceId.value) return false
    if (i.importance < minImportance.value) return false
    if (q && !`${i.titleJa} ${i.title} ${i.summary}`.toLowerCase().includes(q)) return false
    return true
  })
})

const groups = computed(() => {
  const map = new Map<string, NewsItem[]>()
  for (const item of filtered.value) {
    const key = item.digestDate || item.publishedAt.slice(0, 10) || '—'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, list]) => ({ date, items: list }))
})

function stars(n: number): string {
  const v = Math.max(0, Math.min(5, n))
  return '★'.repeat(v) + '☆'.repeat(5 - v)
}

function fmtDate(ymd: string): string {
  if (!ymd || ymd === '—') return '日付不明'
  const d = new Date(`${ymd}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return ymd
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日(${WEEKDAYS_JA[d.getUTCDay()]})`
}

function fmtDateTime(iso: string): string {
  if (!iso) return '—'
  const d = toJSTDate(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

async function load() {
  loading.value = true
  try {
    const state = await $fetch<NewsState>('/api/news')
    items.value = state.items
    runs.value = state.runs
    currents.value = state.currents
    // 初回だけサーバーの既定に合わせる。以降はユーザーが選んだ絞り込みを保つ
    if (!thresholdApplied) {
      minImportance.value = state.minImportance
      thresholdApplied = true
    }
  } catch (e: any) {
    if (e?.statusCode !== 401) {
      message.value = '読み込みに失敗しました'
      messageIsError.value = true
    }
  } finally {
    loading.value = false
  }
}

async function collect() {
  running.value = true
  message.value = '収集しています…'
  messageIsError.value = false
  try {
    // 収集と考察更新は別のAPI呼び出し＝別のWorker呼び出しにしている
    // （Cloudflare の subrequest 上限を1回の呼び出しで使い切らないため。詳しくは news-run.ts 参照）。
    // ボタンは1つのままなので、ここで順番に呼んでユーザーには一連の処理に見せる。
    const result = await $fetch<NewsRunResult>('/api/news/run', { method: 'POST', body: {} })
    const parts = [`新着${result.newItems}件`]
    if (result.errors.length) parts.push(`エラー${result.errors.length}件`)
    message.value = `${parts.join('・')}・考察を更新しています…`

    const trends = await $fetch<{ updated: string[]; errors: string[] }>('/api/news/run-trends', { method: 'POST', body: {} })
    if (trends.updated.length) parts.push(`考察更新${trends.updated.length}潮流`)
    if (trends.errors.length) parts.push(`考察エラー${trends.errors.length}件`)

    message.value = parts.join('・')
    messageIsError.value = result.errors.length > 0 || trends.errors.length > 0
    await load()
  } catch (e: any) {
    message.value = `実行に失敗しました（${e?.data?.message ?? e?.message ?? e}）`
    messageIsError.value = true
  } finally {
    running.value = false
  }
}

async function doLogout() {
  await logout()
  items.value = []
  runs.value = []
  currents.value = []
}

onMounted(async () => {
  await checkAuth()
  if (isLoggedIn.value) await load()
  else loading.value = false
})

// ログイン直後にも読み込み直す（AuthModal はリロードしないため）
watch(isLoggedIn, (v) => {
  if (v) load()
})
</script>
