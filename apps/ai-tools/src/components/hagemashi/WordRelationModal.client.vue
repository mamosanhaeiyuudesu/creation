<script setup lang="ts">
// 分析タブ: 単語クリック時のドリルダウン。
// 1) 単語に係り受けで結びつく「関連語」を単語ベースで一覧（AI抽出＋サーバキャッシュ）
// 2) 関連語をクリックすると、その組の該当記録（本文）を表示
// 3) 「AIでまとめる」でその本文をAIが要約
interface SourceItem { date: string; text: string }
interface Relation { word: string; kind: string; sentiment: 'ポジ' | 'ネガ' | '中立'; refs: number[] }
interface AnalysisBlock { title: string; text: string }

const props = defineProps<{
  keyword: string
  meta?: string
  items: SourceItem[] // クリックした単語を含む記録（古い→新しい順）。refs はこの配列を指す
}>()

const emit = defineEmits<{
  close: []
  exclude: []
}>()

const relations = ref<Relation[]>([])
const isLoading = ref(false)
const errorMsg = ref('')

// 選択中の関連語（該当記録の表示モード）
const selected = ref<Relation | null>(null)
// 選択中の関連語に対するAI要約
const summaryBlocks = ref<AnalysisBlock[]>([])
const isSummarizing = ref(false)
const summaryError = ref('')

const sentimentClass = (s: Relation['sentiment']) =>
  s === 'ポジ'
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
    : s === 'ネガ'
      ? 'border-orange-500/40 bg-orange-500/10 text-orange-300'
      : 'border-white/15 bg-white/[0.05] text-slate-300'

// 選択中の関連語の該当記録（refs → items）
const selectedItems = computed<SourceItem[]>(() => {
  if (!selected.value) return []
  return selected.value.refs.map(i => props.items[i]).filter(Boolean)
})

async function loadRelations() {
  relations.value = []
  errorMsg.value = ''
  if (!props.items.length) return
  isLoading.value = true
  try {
    const res = await $fetch<{ relations: Relation[] }>('/api/hagemashi/relations', {
      method: 'POST',
      body: { keyword: props.keyword, items: props.items },
    })
    relations.value = res.relations ?? []
  } catch {
    errorMsg.value = '関連語の抽出に失敗しました'
  } finally {
    isLoading.value = false
  }
}

function openRelation(r: Relation) {
  selected.value = r
  summaryBlocks.value = []
  summaryError.value = ''
}

function backToList() {
  selected.value = null
  summaryBlocks.value = []
  summaryError.value = ''
}

// 選択中の関連語の該当記録をAIで要約する（既存 topic-summary を流用）
async function summarizeSelected() {
  if (!selected.value || !selectedItems.value.length) return
  summaryBlocks.value = []
  summaryError.value = ''
  isSummarizing.value = true
  try {
    const res = await $fetch<{ blocks: AnalysisBlock[] }>('/api/hagemashi/topic-summary', {
      method: 'POST',
      body: {
        keyword: `${props.keyword}と「${selected.value.word}」`,
        scope: 'summary',
        items: selectedItems.value,
      },
    })
    summaryBlocks.value = res.blocks ?? []
    if (!summaryBlocks.value.length) summaryError.value = 'まとめられる内容が見つかりませんでした'
  } catch {
    summaryError.value = 'AI要約に失敗しました'
  } finally {
    isSummarizing.value = false
  }
}

onMounted(loadRelations)
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-[420px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[85vh]">
        <!-- ヘッダー -->
        <div class="px-5 pt-5 pb-3 border-b border-white/[0.08] flex items-start justify-between gap-3 shrink-0">
          <div class="min-w-0">
            <div v-if="selected" class="flex items-center gap-1.5 text-base font-semibold text-slate-50">
              <span class="text-slate-400">{{ keyword }}</span>
              <span class="text-slate-600">→</span>
              <span :class="selected.sentiment === 'ポジ' ? 'text-emerald-300' : selected.sentiment === 'ネガ' ? 'text-orange-300' : 'text-slate-200'">{{ selected.word }}</span>
            </div>
            <h3 v-else class="m-0 text-base font-semibold text-slate-50 truncate">{{ keyword }}</h3>
            <p v-if="meta && !selected" class="m-0 mt-1 text-xs text-slate-500">{{ meta }}</p>
            <p v-else-if="selected" class="m-0 mt-1 text-xs text-slate-500">該当する記録 {{ selectedItems.length }} 件</p>
          </div>
          <button
            class="shrink-0 bg-transparent border-none text-slate-500 text-lg cursor-pointer px-1 hover:text-slate-50 transition-colors"
            @click="emit('close')"
          >✕</button>
        </div>

        <div class="px-5 py-4 overflow-y-auto flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(249,115,22,0.3)_transparent]">
          <!-- ローディング -->
          <div v-if="isLoading" class="flex items-center justify-center gap-2 py-8 text-slate-400 text-sm">
            <span class="w-4 h-4 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin block" />
            関連語を抽出中...
          </div>
          <div v-else-if="errorMsg" class="text-center text-rose-400 text-sm py-4">{{ errorMsg }}</div>

          <!-- 関連語一覧 -->
          <template v-else-if="!selected">
            <div v-if="!relations.length" class="text-center text-slate-500 text-sm py-4">
              関連する言葉が見つかりませんでした
            </div>
            <template v-else>
              <p class="m-0 mb-3 text-[11px] text-slate-500 leading-relaxed">
                「{{ keyword }}」と結びついている言葉です。タップすると、その言葉が出てくる記録を表示します。
              </p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="r in relations"
                  :key="r.word"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-semibold cursor-pointer transition-all hover:brightness-125"
                  :class="sentimentClass(r.sentiment)"
                  @click="openRelation(r)"
                >
                  <span>{{ r.word }}</span>
                  <span class="text-[10px] font-medium opacity-70 tabular-nums">{{ r.refs.length }}</span>
                </button>
              </div>
            </template>
          </template>

          <!-- 該当記録＋AI要約 -->
          <template v-else>
            <button
              class="mb-3 flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 bg-transparent border-none cursor-pointer px-0 transition-colors"
              @click="backToList"
            >← 関連語一覧へ戻る</button>

            <!-- AI要約結果 -->
            <div v-if="isSummarizing" class="flex items-center justify-center gap-2 py-6 text-slate-400 text-sm">
              <span class="w-4 h-4 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin block" />
              まとめ中...
            </div>
            <div v-else-if="summaryBlocks.length" class="flex flex-col gap-3 mb-4 bg-white/[0.03] border border-white/[0.08] rounded-xl p-3.5">
              <div v-for="(b, i) in summaryBlocks" :key="i">
                <div class="text-xs font-semibold text-orange-400 mb-1">{{ b.title }}</div>
                <p class="m-0 text-sm text-slate-200 leading-relaxed whitespace-pre-line">{{ b.text }}</p>
              </div>
            </div>
            <div v-else-if="summaryError" class="text-center text-rose-400 text-xs py-2 mb-2">{{ summaryError }}</div>

            <!-- AIでまとめるボタン（未要約時のみ） -->
            <button
              v-if="!summaryBlocks.length && !isSummarizing"
              class="w-full mb-4 px-3 py-2 rounded-lg text-xs font-semibold border border-orange-500/30 bg-orange-500/10 text-orange-300 cursor-pointer hover:bg-orange-500/20 transition-colors"
              @click="summarizeSelected"
            >✨ この内容をAIでまとめる</button>

            <!-- 該当記録本文 -->
            <div class="flex flex-col gap-0">
              <div
                v-for="(it, i) in selectedItems"
                :key="i"
                class="flex items-start gap-2.5 px-1 py-2 border-b border-white/[0.05] last:border-b-0"
              >
                <span class="text-[11px] text-slate-500 shrink-0 w-[38px] pt-[2px] tabular-nums">{{ it.date }}</span>
                <span class="text-sm text-slate-200 leading-relaxed flex-1">{{ it.text }}</span>
              </div>
            </div>
          </template>
        </div>

        <!-- フッター（一覧時のみ 単語除外） -->
        <div v-if="!selected" class="px-5 py-2.5 border-t border-white/[0.08] shrink-0 flex justify-end">
          <button
            class="px-2.5 py-1 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-300 text-[11px] font-medium cursor-pointer hover:bg-rose-500/20 transition-colors"
            @click="emit('exclude')"
          >単語を除外</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
