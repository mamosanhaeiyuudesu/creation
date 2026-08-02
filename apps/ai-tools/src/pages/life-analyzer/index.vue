<template>
  <div class="h-[100dvh] flex overflow-hidden">
    <!-- メイン：分析画面 -->
    <main class="flex-1 min-w-0 flex flex-col">
      <header class="shrink-0 flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-[var(--la-line)]">
        <div class="min-w-0 flex items-center gap-2.5">
          <span class="text-2xl leading-none">🕯</span>
          <div class="min-w-0">
            <h1 class="la-display text-[17px] sm:text-[20px] font-semibold leading-none">人生の光と影</h1>
            <p class="text-[11px] text-[var(--la-ink-faint)] mt-1 truncate">
              <span v-if="analysis">{{ analysis.docTitles.join('・') }}</span>
              <span v-else>語られた人生から、コアとなる影と光を見つめ直す</span>
            </p>
          </div>
        </div>

        <div class="ml-auto flex items-center gap-1.5">
          <template v-if="analysis">
            <div class="hidden sm:flex gap-1 p-1 rounded-full bg-white/[0.04] border border-[var(--la-line)]">
              <button v-for="s in SIDES" :key="s.value" class="px-3 h-7 rounded-full text-[11.5px] font-bold transition-colors"
                :class="side === s.value ? 'bg-white/[0.09] text-[var(--la-ink)]' : 'text-[var(--la-ink-faint)] hover:text-[var(--la-ink-soft)]'"
                @click="focusSide(s.value)"
              >{{ s.label }}</button>
            </div>
            <button class="la-btn-ghost hidden sm:inline-flex items-center" :disabled="analyzing" @click="runAnalyze(selectedIds, true)">分析し直す</button>
          </template>
          <button class="la-btn-ghost lg:hidden" @click="sidebarOpen = true">テキスト</button>
          <button v-if="isLoggedIn" class="hidden lg:inline text-[12px] text-[var(--la-ink-faint)] hover:text-[var(--la-ink-soft)] px-2" @click="doLogout">ログアウト</button>
        </div>
      </header>

      <!-- 図 -->
      <div class="flex-1 min-h-0 relative">
        <div v-if="analyzing" class="absolute inset-0 z-10 grid place-items-center bg-[#0a0d16]/70">
          <div class="text-center la-rise">
            <span class="w-9 h-9 mx-auto rounded-full border-2 border-white/12 border-t-[var(--la-light)] animate-spin block" />
            <p class="la-display text-[14px] mt-4">人生を読み返しています…</p>
            <p class="text-[11.5px] text-[var(--la-ink-faint)] mt-1.5">影と光をそれぞれ5つ選ぶまで、1分ほどかかります</p>
          </div>
        </div>

        <CoreGraph
          v-if="analysis && analysis.cores.length"
          ref="graph"
          :cores="analysis.cores"
          :signature="analysis.id"
          :height="320"
          @episode-click="onEpisodeClick"
          @core-click="onCoreClick"
          @center-click="onCenterClick"
        />

        <!-- 空の状態 -->
        <div v-else-if="!analyzing" class="h-full grid place-items-center px-6 text-center">
          <div class="max-w-[420px] la-rise">
            <p class="la-display text-[16px] leading-[1.9] mb-3">
              <span class="text-[var(--la-shadow-soft)]">影</span>
              <span class="text-[var(--la-ink-faint)]"> と </span>
              <span class="text-[var(--la-light-soft)]">光</span>
              は、ひと続きのもの
            </p>
            <p class="text-[12.5px] leading-[2] text-[var(--la-ink-faint)]">
              {{ emptyMessage }}
            </p>
            <button v-if="isLoggedIn && selectedIds.length" class="la-btn mt-5" @click="runAnalyze(selectedIds)">
              選んだ {{ selectedIds.length }} 件を分析する
            </button>
            <button v-else-if="isLoggedIn" class="la-btn mt-5 lg:hidden" @click="sidebarOpen = true">テキストを追加する</button>
          </div>
        </div>

        <!-- 凡例 -->
        <div v-if="analysis" class="absolute left-3 bottom-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-[var(--la-ink-faint)] pointer-events-none">
          <span class="flex items-center gap-1.5"><i class="w-2.5 h-2.5 rounded-sm bg-[var(--la-shadow)]/70 inline-block" />左＝影</span>
          <span class="flex items-center gap-1.5"><i class="w-2.5 h-2.5 rounded-sm bg-[var(--la-light)]/70 inline-block" />右＝光</span>
          <span class="hidden sm:inline">点線の先は具体的な出来事。クリックすると読み返せます</span>
        </div>

        <p v-if="errorMessage" class="absolute right-3 bottom-3 max-w-[70%] text-[11.5px] text-[#f28b82] text-right">{{ errorMessage }}</p>
      </div>
    </main>

    <!-- 右サイドバー -->
    <aside
      class="w-[330px] shrink-0 border-l border-[var(--la-line)] bg-white/[0.02] hidden lg:block"
    >
      <SidePanel
        :docs="docs"
        :selected-ids="selectedIds"
        :saving="saving"
        :analyzing="analyzing"
        :loading-docs="loadingDocs"
        @update:selected-ids="selectedIds = $event"
        @save="onSave"
        @analyze="runAnalyze($event)"
        @delete="onDelete"
        @open-doc="onOpenDoc"
      />
    </aside>

    <!-- 右サイドバー（スマホ：ドロワー） -->
    <div v-if="sidebarOpen" class="fixed inset-0 z-[150] lg:hidden">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="sidebarOpen = false" />
      <div class="absolute right-0 top-0 h-full w-[min(88vw,340px)] bg-[var(--la-panel-solid)] border-l border-[var(--la-line)] flex flex-col">
        <div class="flex items-center justify-between px-4 pt-3 shrink-0">
          <span class="text-[12px] text-[var(--la-ink-faint)]">テキストと履歴</span>
          <button class="w-8 h-8 rounded-full text-[var(--la-ink-faint)] hover:bg-white/[0.06] text-lg leading-none" @click="sidebarOpen = false">×</button>
        </div>
        <div class="flex-1 min-h-0">
          <SidePanel
            :docs="docs"
            :selected-ids="selectedIds"
            :saving="saving"
            :analyzing="analyzing"
            :loading-docs="loadingDocs"
            @update:selected-ids="selectedIds = $event"
            @save="onSave"
            @analyze="onAnalyzeFromDrawer"
            @delete="onDelete"
            @open-doc="onOpenDoc"
          />
        </div>
      </div>
    </div>

    <NodeModal
      v-if="modal"
      :kind="modal.kind"
      :polarity="modal.polarity"
      :title="modal.title"
      :context="modal.context"
      :description="modal.description"
      :loading="modal.loading"
      :error="modal.error"
      :summary="modal.summary"
      :cached="modal.cached"
      @close="closeModal"
      @regenerate="regenerate"
    />

    <AuthModal v-if="showAuthModal" accent="sky" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import CoreGraph from '~/components/life-analyzer/CoreGraph.client.vue'
import NodeModal from '~/components/life-analyzer/NodeModal.vue'
import SidePanel from '~/components/life-analyzer/SidePanel.vue'
import type { EpisodeSummary, LifeAnalysis, LifeDocument, LifeDocumentSummary, Polarity } from '~/types/life-analyzer'

definePageMeta({ layout: 'life-analyzer' })
useHead({ title: 'life-analyzer — 人生の光と影' })

const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

const SIDES = [
  { value: 'all' as const, label: '全体' },
  { value: 'shadow' as const, label: '影' },
  { value: 'light' as const, label: '光' },
]

const docs = ref<LifeDocumentSummary[]>([])
const selectedIds = ref<string[]>([])
const analysis = ref<LifeAnalysis | null>(null)
const loadingDocs = ref(false)
const saving = ref(false)
const analyzing = ref(false)
const errorMessage = ref('')
const sidebarOpen = ref(false)
const side = ref<'all' | 'shadow' | 'light'>('all')
const graph = ref<InstanceType<typeof CoreGraph> | null>(null)

interface ModalState {
  kind: 'episode' | 'core' | 'center'
  polarity: Polarity | null
  title: string
  context?: string
  description?: string
  loading?: boolean
  error?: string
  summary?: EpisodeSummary | null
  cached?: boolean
  nodeKey?: string
}
const modal = ref<ModalState | null>(null)

const emptyMessage = computed(() => {
  if (!isLoggedIn.value) return 'ログインすると、自分のテキストを保存して分析できます。'
  if (!docs.value.length) return '自分について語られたテキストを右のパネルから貼り付けると、そこからコアとなる影と光を5つずつ取り出します。'
  if (!selectedIds.value.length) return '履歴からテキストを選ぶと、その内容をもとに分析できます。'
  return '選んだテキストで分析を始めましょう。'
})

function toMessage(e: any, fallback: string): string {
  return e?.data?.message || e?.statusMessage || e?.message || fallback
}

// ── テキスト（履歴）──────────────────────────────

async function loadDocs() {
  loadingDocs.value = true
  try {
    docs.value = await $fetch<LifeDocumentSummary[]>('/api/life-analyzer/documents')
  } catch (e: any) {
    errorMessage.value = toMessage(e, '履歴を読み込めませんでした')
  } finally {
    loadingDocs.value = false
  }
}

async function onSave(text: string) {
  saving.value = true
  errorMessage.value = ''
  try {
    const doc = await $fetch<LifeDocument>('/api/life-analyzer/documents', { method: 'POST', body: { text } })
    await loadDocs()
    // 追加した1件をそのまま分析する（続けて分析したいのが普通なので）。
    selectedIds.value = [doc.id]
    await runAnalyze(selectedIds.value)
  } catch (e: any) {
    errorMessage.value = toMessage(e, '保存に失敗しました')
  } finally {
    saving.value = false
  }
}

async function onDelete(id: string) {
  if (!confirm('このテキストを削除しますか？（このテキストを含む分析結果も消えます）')) return
  try {
    await $fetch(`/api/life-analyzer/documents/${id}`, { method: 'DELETE' })
    selectedIds.value = selectedIds.value.filter((v) => v !== id)
    if (analysis.value?.docIds.includes(id)) analysis.value = null
    await loadDocs()
  } catch (e: any) {
    errorMessage.value = toMessage(e, '削除に失敗しました')
  }
}

async function onOpenDoc(id: string) {
  const summary = docs.value.find((d) => d.id === id)
  modal.value = { kind: 'center', polarity: null, title: summary?.title ?? '原文', description: '読み込み中…' }
  try {
    const doc = await $fetch<LifeDocument>(`/api/life-analyzer/documents/${id}`)
    modal.value = { kind: 'center', polarity: null, title: doc.title, context: `${doc.createdAt.slice(0, 10)}・${doc.charCount.toLocaleString()}文字`, description: doc.content }
  } catch (e: any) {
    modal.value = { kind: 'center', polarity: null, title: '原文', description: toMessage(e, '読み込めませんでした') }
  }
}

// ── 分析 ──────────────────────────────

async function runAnalyze(ids: string[], force = false) {
  if (!ids.length || analyzing.value) return
  analyzing.value = true
  errorMessage.value = ''
  try {
    const result = await $fetch<LifeAnalysis | null>('/api/life-analyzer/analyze', {
      method: 'POST',
      body: { docIds: ids, force },
    })
    analysis.value = result
    side.value = 'all'
  } catch (e: any) {
    errorMessage.value = toMessage(e, '分析に失敗しました')
  } finally {
    analyzing.value = false
  }
}

/** 画面を開いた直後の復元。キャッシュがあるときだけ図を出す（勝手にAIは呼ばない）。 */
async function restoreAnalysis(ids: string[]) {
  if (!ids.length) return
  try {
    analysis.value = await $fetch<LifeAnalysis | null>('/api/life-analyzer/analyze', {
      method: 'POST',
      body: { docIds: ids, cacheOnly: true },
    })
  } catch { /* 復元できなければ空の状態のままでよい */ }
}

function onAnalyzeFromDrawer(ids: string[]) {
  sidebarOpen.value = false
  runAnalyze(ids)
}

function focusSide(value: 'all' | 'shadow' | 'light') {
  side.value = value
  graph.value?.focusSide(value)
}

// ── ノードのポップアップ ──────────────────────────────

function findCore(coreKey: string) {
  return analysis.value?.cores.find((c) => c.key === coreKey) ?? null
}

async function onEpisodeClick({ coreKey, nodeKey }: { coreKey: string; nodeKey: string }) {
  const core = findCore(coreKey)
  const episode = core?.episodes.find((e) => e.key === nodeKey)
  if (!core || !episode || !analysis.value) return

  modal.value = {
    kind: 'episode',
    polarity: core.polarity,
    title: episode.label,
    context: core.label,
    description: episode.detail,
    loading: true,
    summary: null,
    nodeKey,
  }
  await fetchSummary(nodeKey, false)
}

async function fetchSummary(nodeKey: string, force: boolean) {
  if (!analysis.value || !modal.value) return
  modal.value = { ...modal.value, loading: true, error: '' }
  try {
    const res = await $fetch<EpisodeSummary & { cached: boolean }>('/api/life-analyzer/episode-summary', {
      method: 'POST',
      body: { analysisId: analysis.value.id, nodeKey, force },
    })
    // 待っている間にポップアップが閉じ／別ノードに切り替わっていたら捨てる。
    if (!modal.value || modal.value.nodeKey !== nodeKey) return
    modal.value = { ...modal.value, loading: false, summary: res, cached: res.cached }
  } catch (e: any) {
    if (!modal.value || modal.value.nodeKey !== nodeKey) return
    modal.value = { ...modal.value, loading: false, error: toMessage(e, '要約に失敗しました') }
  }
}

function regenerate() {
  if (modal.value?.nodeKey) fetchSummary(modal.value.nodeKey, true)
}

function onCoreClick({ coreKey }: { coreKey: string }) {
  const core = findCore(coreKey)
  if (!core) return
  const episodes = core.episodes.map((e) => `・${e.label}`).join('\n')
  modal.value = {
    kind: 'core',
    polarity: core.polarity,
    title: core.label,
    description: `${core.description}\n\nこのコアを裏づける出来事:\n${episodes}\n\n（図の点線の先をクリックすると、その出来事を読み返せます）`,
  }
}

function onCenterClick() {
  if (!analysis.value) return
  modal.value = {
    kind: 'center',
    polarity: null,
    title: 'わたし',
    context: analysis.value.docTitles.join('・'),
    description: analysis.value.overview || '全体の所感はまだありません。',
  }
}

function closeModal() {
  modal.value = null
  graph.value?.clearSelection()
}

async function doLogout() {
  await logout()
  window.location.reload()
}

onMounted(async () => {
  await checkAuth()
  if (!isLoggedIn.value) return
  await loadDocs()
  // 直近のテキストを選んだ状態で開く。分析済みならそのまま図が出る。
  if (docs.value.length) {
    selectedIds.value = [docs.value[0].id]
    await restoreAnalysis(selectedIds.value)
  }
})
</script>
