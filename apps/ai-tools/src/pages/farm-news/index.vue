<template>
  <div class="max-w-[860px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <!-- 題字 -->
    <header class="border-b-2 border-[var(--fnews-ink)] pb-3 mb-6">
      <h1 class="fnews-display text-[26px] sm:text-[30px] leading-none tracking-[0.12em]">farm news</h1>
      <p class="text-[12px] text-[var(--fnews-ink-soft)] mt-2">
        農業×AIの動向を{{ FARM_NEWS_SOURCES.length }}ソースから集め、6つの潮流で読み解く専門ニュースサイトです
      </p>
    </header>

    <p v-if="loading" class="text-[13px] text-[var(--fnews-ink-soft)] py-16 text-center">読み込み中…</p>

    <template v-else>
      <!-- ① 最新ニュース -->
      <section class="mb-12">
        <div class="flex items-center gap-3 mb-4">
          <h2 class="fnews-display text-[18px]">① 最新ニュース</h2>
          <span class="flex-1 h-px bg-[var(--fnews-line)]" />
        </div>

        <div v-if="items.length" ref="filterBarEl" class="flex items-center gap-1.5 flex-wrap mb-5">
          <button v-if="currentId" class="fnews-chip fnews-chip--on" @click="currentId = ''">
            {{ farmNewsCurrentLabel(currentId) }} ×
          </button>
          <button class="fnews-btn-ghost" @click="filterModalOpen = true">
            フィルタ：{{ sourceLabel }}・{{ importanceLabel }}
          </button>
          <input v-model="keyword" class="fnews-input ml-auto w-[150px]" type="search" placeholder="キーワード" />
        </div>

        <p v-if="!items.length" class="text-[13px] text-[var(--fnews-ink-soft)] py-10 text-center leading-relaxed">
          まだ記事がありません。翌回の自動収集をお待ちください。
        </p>
        <p v-else-if="!filtered.length" class="text-[13px] text-[var(--fnews-ink-soft)] py-10 text-center">
          条件に合う記事がありません。
        </p>

        <section v-for="group in groups" :key="group.date" class="mb-7">
          <div class="flex items-center gap-3 mb-3">
            <h3 class="fnews-display text-[15px]">{{ fmtDate(group.date) }}</h3>
            <span class="text-[11.5px] text-[var(--fnews-ink-faint)]">{{ group.items.length }}件</span>
            <span class="flex-1 h-px bg-[var(--fnews-line)]" />
          </div>

          <div class="flex flex-col gap-2.5">
            <article
              v-for="item in group.items"
              :key="item.id"
              class="fnews-card"
              :class="{ 'fnews-card--top': item.importance >= 4 }"
            >
              <div class="flex items-center gap-2 text-[11.5px] text-[var(--fnews-ink-faint)] mb-1.5 flex-wrap">
                <span class="text-[var(--fnews-accent)] font-bold tracking-[0.08em]">{{ stars(item.importance) }}</span>
                <button class="font-bold text-[var(--fnews-ink-soft)] hover:text-[var(--fnews-accent)]" @click="currentId = item.current">
                  {{ farmNewsCurrentLabel(item.current) }}
                </button>
                <span>{{ farmNewsSourceName(item.sourceId) }}</span>
                <span v-if="item.publishedAt">{{ fmtDate(item.publishedAt.slice(0, 10)) }}</span>
              </div>

              <h4 class="fnews-display text-[17px] sm:text-[18px] leading-[1.45] mb-1">{{ item.titleJa }}</h4>
              <p class="text-[11.5px] text-[var(--fnews-ink-faint)] mb-2.5 leading-snug">{{ item.title }}</p>
              <p class="text-[13.5px] leading-[1.85] text-[var(--fnews-ink)] whitespace-pre-line">{{ item.summary }}</p>

              <p v-if="item.reason" class="mt-2.5 text-[12px] text-[var(--fnews-ink-soft)] leading-relaxed border-l-2 border-[var(--fnews-line)] pl-2.5">
                重要度{{ item.importance }} — {{ item.reason }}
              </p>

              <div class="mt-3">
                <a :href="item.url" target="_blank" rel="noopener noreferrer" class="text-[12.5px] text-[var(--fnews-accent)] hover:underline">
                  原文を読む ↗
                </a>
              </div>
            </article>
          </div>
        </section>
      </section>

      <!-- ソース・重要度の絞り込みポップアップ -->
      <div v-if="filterModalOpen" class="fnews-modal-backdrop" @click.self="filterModalOpen = false">
        <div class="fnews-modal" role="dialog" aria-modal="true">
          <div class="flex items-start justify-between gap-3 mb-4">
            <h2 class="fnews-display text-[18px] leading-snug">絞り込み</h2>
            <button class="fnews-modal-close" aria-label="閉じる" @click="filterModalOpen = false">×</button>
          </div>

          <div class="mb-5">
            <h3 class="text-[11.5px] font-bold text-[var(--fnews-ink-faint)] mb-2">ソース</h3>
            <div class="flex items-center gap-1.5 flex-wrap">
              <button class="fnews-chip" :class="{ 'fnews-chip--on': sourceId === 'all' }" @click="sourceId = 'all'">すべてのソース</button>
              <button
                v-for="s in usedSources"
                :key="s.id"
                class="fnews-chip"
                :class="{ 'fnews-chip--on': sourceId === s.id }"
                @click="sourceId = s.id"
              >
                {{ s.name }}
              </button>
            </div>
          </div>

          <div>
            <h3 class="text-[11.5px] font-bold text-[var(--fnews-ink-faint)] mb-2">重要度</h3>
            <div class="flex items-center gap-1.5 flex-wrap">
              <button
                v-for="t in THRESHOLDS"
                :key="t.value"
                class="fnews-chip"
                :class="{ 'fnews-chip--on': minImportance === t.value }"
                @click="minImportance = t.value"
              >
                {{ t.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ② 今後の潮流予測 -->
      <section class="mb-12">
        <div class="flex items-center gap-3 mb-1">
          <h2 class="fnews-display text-[18px]">② 今後の潮流予測</h2>
          <span class="flex-1 h-px bg-[var(--fnews-line)]" />
        </div>
        <p class="text-[12px] text-[var(--fnews-ink-soft)] mb-4">直近1ヶ月の動きを踏まえて、これからどうなりそうかをAIが予測します</p>

        <div class="grid gap-3 sm:grid-cols-2">
          <button
            v-for="c in FARM_NEWS_CURRENTS"
            :key="c.id"
            class="fnews-current-card text-left"
            :class="{ 'fnews-current-card--on': currentId === c.id }"
            @click="openCurrentId = c.id"
          >
            <div class="flex items-center justify-between gap-2 mb-1.5">
              <h3 class="fnews-display text-[14px]">{{ c.label }}</h3>
              <span class="text-[11px] text-[var(--fnews-ink-faint)] whitespace-nowrap">{{ currentState(c.id)?.itemCount30d ?? 0 }}件/30日</span>
            </div>
            <ul v-if="cardBullets(c.id).length" class="flex flex-col gap-1">
              <li v-for="(b, i) in cardBullets(c.id)" :key="i" class="text-[12.5px] leading-[1.5] text-[var(--fnews-ink-soft)]">
                ・{{ b }}
              </li>
            </ul>
            <p v-else class="text-[12.5px] leading-[1.7] text-[var(--fnews-ink-soft)]">まだ記事が集まっていません。</p>
          </button>
        </div>
      </section>

      <!-- 潮流の考察：全文ポップアップ -->
      <div v-if="openCurrentMeta" class="fnews-modal-backdrop" @click.self="openCurrentId = ''">
        <div class="fnews-modal" role="dialog" aria-modal="true">
          <div class="flex items-start justify-between gap-3 mb-3">
            <h2 class="fnews-display text-[18px] leading-snug">{{ openCurrentMeta.label }}</h2>
            <button class="fnews-modal-close" aria-label="閉じる" @click="openCurrentId = ''">×</button>
          </div>

          <button class="fnews-btn-ghost mb-4" @click="filterByCurrent(openCurrentMeta.id)">この潮流の記事だけ見る ↑</button>

          <p class="text-[11.5px] text-[var(--fnews-ink-faint)] mb-4">{{ openCurrentMeta.description }}</p>
          <p class="text-[12px] text-[var(--fnews-ink-faint)] mb-4">
            直近30日{{ currentState(openCurrentMeta.id)?.itemCount30d ?? 0 }}件
            <template v-if="currentState(openCurrentMeta.id)?.updatedAt">・{{ fmtDateTime(currentState(openCurrentMeta.id)!.updatedAt) }}更新</template>
          </p>

          <p v-if="!currentState(openCurrentMeta.id)?.sections.length" class="text-[13.5px] text-[var(--fnews-ink-soft)]">
            まだ記事が集まっていません。
          </p>
          <div v-else class="flex flex-col gap-4">
            <div v-for="(section, i) in currentState(openCurrentMeta.id)!.sections" :key="i">
              <h3 v-if="section.title" class="fnews-display text-[13px] text-[var(--fnews-accent)] mb-1">{{ section.title }}</h3>
              <p class="text-[14px] leading-[1.85] text-[var(--fnews-ink)] whitespace-pre-line">{{ section.body }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ③ 潮流アーカイブ -->
      <section>
        <div class="flex items-center gap-3 mb-1">
          <h2 class="fnews-display text-[18px]">③ 潮流アーカイブ</h2>
          <span class="flex-1 h-px bg-[var(--fnews-line)]" />
        </div>
        <p class="text-[12px] text-[var(--fnews-ink-soft)] mb-4">直近{{ FARM_NEWS_ARCHIVE_RECENT_MONTHS }}ヶ月は月ごと、それより前は年ごとに振り返れます</p>

        <p v-if="!archive.recent.length && !archive.older.length" class="text-[13px] text-[var(--fnews-ink-soft)] py-10 text-center leading-relaxed">
          まだアーカイブがありません。半年ほど記事が積み上がると月ごとの振り返りが読めるようになります。
        </p>

        <template v-else>
          <div v-if="archive.recent.length" class="mb-6">
            <h3 class="text-[11.5px] font-bold text-[var(--fnews-ink-faint)] mb-2">直近{{ FARM_NEWS_ARCHIVE_RECENT_MONTHS }}ヶ月</h3>
            <div class="grid gap-2.5 sm:grid-cols-2">
              <button v-for="e in archive.recent" :key="e.key" class="fnews-archive-card text-left" @click="openArchiveKey = e.key">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <h4 class="fnews-display text-[13.5px]">{{ periodLabel(e.snapshot) }}</h4>
                  <span class="text-[11px] text-[var(--fnews-ink-faint)]">{{ e.snapshot.itemCount }}件</span>
                </div>
                <p class="text-[12.5px] leading-[1.6] text-[var(--fnews-ink-soft)] line-clamp-2">
                  {{ e.snapshot.sections[0]?.body || 'まだ記事が集まっていません。' }}
                </p>
              </button>
            </div>
          </div>

          <div v-if="archive.older.length">
            <h3 class="text-[11.5px] font-bold text-[var(--fnews-ink-faint)] mb-2">それ以前</h3>
            <div class="grid gap-2.5 sm:grid-cols-2">
              <button v-for="e in archive.older" :key="e.key" class="fnews-archive-card text-left" @click="openArchiveKey = e.key">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <h4 class="fnews-display text-[13.5px]">{{ periodLabel(e.snapshot) }}</h4>
                  <span class="text-[11px] text-[var(--fnews-ink-faint)]">{{ e.snapshot.itemCount }}件</span>
                </div>
                <p class="text-[12.5px] leading-[1.6] text-[var(--fnews-ink-soft)] line-clamp-2">
                  {{ e.snapshot.sections[0]?.body || 'まだ記事が集まっていません。' }}
                </p>
              </button>
            </div>
          </div>
        </template>
      </section>

      <!-- アーカイブ：全文ポップアップ -->
      <div v-if="openArchiveEntry" class="fnews-modal-backdrop" @click.self="openArchiveKey = ''">
        <div class="fnews-modal" role="dialog" aria-modal="true">
          <div class="flex items-start justify-between gap-3 mb-3">
            <h2 class="fnews-display text-[18px] leading-snug">{{ periodLabel(openArchiveEntry.snapshot) }}</h2>
            <button class="fnews-modal-close" aria-label="閉じる" @click="openArchiveKey = ''">×</button>
          </div>
          <p class="text-[12px] text-[var(--fnews-ink-faint)] mb-4">記事{{ openArchiveEntry.snapshot.itemCount }}件をもとにした振り返りです</p>
          <div class="flex flex-col gap-4">
            <p class="text-[14px] leading-[1.85] text-[var(--fnews-ink)] whitespace-pre-line">
              {{ openArchiveEntry.snapshot.sections[0]?.body }}
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * farm-news — 農業×AIの専門ニュースサイト（外部公開・ログイン不要）。
 *
 * news（/news）と違い認証を一切使わない。管理用の手動収集・アーカイブ生成はページに
 * ボタンを置かず、秘密キーを付けたコマンド実行（curl等）で行う運用（server/api/farm-news/*.post.ts）。
 *
 * 要求どおり①最新ニュース→②今後の潮流予測→③潮流アーカイブの順に並べる
 * （newsは「潮流カードが上」だが、farm-newsではまずニュースを読んでから潮流の話に入る構成にしている）。
 */
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { FARM_NEWS_ARCHIVE_RECENT_MONTHS, FARM_NEWS_MIN_IMPORTANCE, FARM_NEWS_SOURCES, farmNewsSourceName } from '~/utils/farm-news-sources'
import { FARM_NEWS_CURRENTS, farmNewsCurrentLabel } from '~/utils/farm-news-currents'
import { WEEKDAYS_JA, toJSTDate, todayJST } from '~/utils/jst'
import type { FarmNewsCurrentState, FarmNewsItem, FarmNewsState, FarmNewsTrendSnapshot } from '~/types/farm-news'

definePageMeta({ layout: 'farm-news' })
useHead({ title: 'farm news — 農業×AIニュース' })

const loading = ref(true)
const items = ref<FarmNewsItem[]>([])
const currents = ref<FarmNewsCurrentState[]>([])
const snapshots = ref<FarmNewsTrendSnapshot[]>([])
let thresholdApplied = false

const THRESHOLDS = [
  { value: 0, label: 'すべての重要度' },
  { value: 3, label: '重要度3以上' },
  { value: 4, label: '重要度4以上' },
]

const currentId = ref('')
const sourceId = ref('all')
const minImportance = ref(FARM_NEWS_MIN_IMPORTANCE)
const keyword = ref('')

const openCurrentId = ref('')
const openCurrentMeta = computed(() => FARM_NEWS_CURRENTS.find((c) => c.id === openCurrentId.value) ?? null)
const filterBarEl = ref<HTMLElement | null>(null)
const filterModalOpen = ref(false)

const openArchiveKey = ref('')

const sourceLabel = computed(() => (sourceId.value === 'all' ? 'すべてのソース' : farmNewsSourceName(sourceId.value)))
const importanceLabel = computed(() => THRESHOLDS.find((t) => t.value === minImportance.value)?.label ?? '')

function currentState(id: string): FarmNewsCurrentState | undefined {
  return currents.value.find((c) => c.id === id)
}

function cardBullets(id: string): string[] {
  const state = currentState(id)
  if (!state) return []
  if (state.bullets.length) return state.bullets
  return state.sections
    .map((s) => s.body.split('\n')[0]?.trim())
    .filter((s): s is string => Boolean(s))
    .slice(0, 3)
    .map((s) => (s.length > 24 ? `${s.slice(0, 23)}…` : s))
}

async function filterByCurrent(id: string) {
  currentId.value = id
  openCurrentId.value = ''
  await nextTick()
  filterBarEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (openCurrentId.value) openCurrentId.value = ''
  else if (openArchiveKey.value) openArchiveKey.value = ''
  else if (filterModalOpen.value) filterModalOpen.value = false
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const usedSources = computed(() => {
  const ids = new Set(items.value.map((i) => i.sourceId))
  return FARM_NEWS_SOURCES.filter((s) => ids.has(s.id)).map((s) => ({ id: s.id, name: s.name }))
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
  const map = new Map<string, FarmNewsItem[]>()
  for (const item of filtered.value) {
    const key = item.digestDate || item.publishedAt.slice(0, 10) || '—'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([date, list]) => ({ date, items: list }))
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

/** 'YYYY-MM' → '2026年9月'、'YYYY' → '2026年'。 */
function periodLabel(s: FarmNewsTrendSnapshot): string {
  if (s.periodType === 'year') return `${s.periodKey}年`
  const [y, m] = s.periodKey.split('-')
  return `${y}年${Number(m)}月`
}

interface ArchiveEntry {
  key: string
  snapshot: FarmNewsTrendSnapshot
}

/**
 * 直近 FARM_NEWS_ARCHIVE_RECENT_MONTHS ヶ月は月次スナップショットをそのまま、
 * それより前は年ごとにまとめる（year snapshot があればそれを1枚、まだ無ければ
 * その年の月次スナップショットをそのまま個別カードにフォールバック表示する＝
 * 今年のように、まだ年次サマリーが作れない年でもデータの欠落なく見せるための救済）。
 */
const archive = computed(() => {
  const cutoff = (() => {
    const d = new Date(`${todayJST()}T00:00:00Z`)
    d.setUTCMonth(d.getUTCMonth() - FARM_NEWS_ARCHIVE_RECENT_MONTHS)
    return d.toISOString().slice(0, 7)
  })()

  const monthSnaps = snapshots.value.filter((s) => s.periodType === 'month')
  const yearSnaps = snapshots.value.filter((s) => s.periodType === 'year')

  const recent: ArchiveEntry[] = monthSnaps
    .filter((s) => s.periodKey >= cutoff)
    .sort((a, b) => b.periodKey.localeCompare(a.periodKey))
    .map((s) => ({ key: `month:${s.periodKey}`, snapshot: s }))

  const olderMonths = monthSnaps.filter((s) => s.periodKey < cutoff)
  const years = [...new Set(olderMonths.map((s) => s.periodKey.slice(0, 4)))].sort().reverse()

  const older: ArchiveEntry[] = []
  for (const year of years) {
    const yearSnap = yearSnaps.find((s) => s.periodKey === year)
    if (yearSnap) {
      older.push({ key: `year:${year}`, snapshot: yearSnap })
    } else {
      for (const s of olderMonths.filter((m) => m.periodKey.slice(0, 4) === year).sort((a, b) => b.periodKey.localeCompare(a.periodKey))) {
        older.push({ key: `month:${s.periodKey}`, snapshot: s })
      }
    }
  }

  return { recent, older }
})

const openArchiveEntry = computed<ArchiveEntry | null>(() => {
  if (!openArchiveKey.value) return null
  return [...archive.value.recent, ...archive.value.older].find((e) => e.key === openArchiveKey.value) ?? null
})

async function load() {
  loading.value = true
  try {
    const state = await $fetch<FarmNewsState>('/api/farm-news')
    items.value = state.items
    currents.value = state.currents
    snapshots.value = state.snapshots
    if (!thresholdApplied) {
      minImportance.value = state.minImportance
      thresholdApplied = true
    }
  } catch {
    // 公開ページなので静かに失敗する（記事0件の表示に自然にフォールバックする）
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
