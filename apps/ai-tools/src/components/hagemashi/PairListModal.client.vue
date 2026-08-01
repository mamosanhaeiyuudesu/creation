<script setup lang="ts">
// ネットワーク図でノードをタップしたときのドリルダウン。
// 1) その語に結びついている「組み合わせ」を強い順に一覧（集計のみ・AIは呼ばない）
// 2) 組み合わせをタップすると、2語が同時に出た記録をAIが読み解く
// 3) 相手の語を起点に図を描き直すこともできる
import type { NetEdge, NetGraph } from '~/utils/hagemashi/cooccurrence'
import { edgesOf, otherWord, valenceColor } from '~/utils/hagemashi/cooccurrence'

interface SourceItem { date: string; text: string }
interface AnalysisBlock { title: string; text: string }

const props = defineProps<{
  word: string
  pos: number
  neg: number
  df: number
  graph: NetGraph
  /** 全要約行（古い→新しい順でなくてよい。ここで整列する） */
  rows: { fullDate: string; text: string }[]
}>()

const emit = defineEmits<{
  close: []
  exclude: []
  focus: [string]
}>()

const selected = ref<NetEdge | null>(null)
const blocks = ref<AnalysisBlock[]>([])
const isLoading = ref(false)
const errorMsg = ref('')

const pairs = computed(() => edgesOf(props.graph, props.word))
// 図に線が引かれているものと、見やすさのために線を省略したものを分けて見せる
const drawnPairs = computed(() => pairs.value.filter(e => e.drawn))
const hiddenPairs = computed(() => pairs.value.filter(e => !e.drawn))

const moodLabel = computed(() => {
  const v = props.df ? (props.pos - props.neg) / props.df : 0
  return v > 0.2 ? 'ポジ寄り' : v < -0.2 ? 'ネガ寄り' : '両価'
})

const partnerOf = (e: NetEdge) => otherWord(e, props.word)

// 2語が同時に含まれる記録。古い→新しい順で渡す（新しい順のままだと直近が過度に強調されるため）
const MAX_ITEMS = 80
function matchedItems(edge: NetEdge): SourceItem[] {
  const other = partnerOf(edge)
  const all = props.rows
    .filter(r => r.text.includes(props.word) && r.text.includes(other))
    .map(r => ({ date: r.fullDate, text: r.text }))
    .reverse()
  if (all.length <= MAX_ITEMS) return all
  // 時系列の偏りが出ないよう均等サンプリングする
  const step = all.length / MAX_ITEMS
  return Array.from({ length: MAX_ITEMS }, (_, i) => all[Math.floor(i * step)])
}

const selectedItems = computed(() => (selected.value ? matchedItems(selected.value) : []))

async function openPair(edge: NetEdge) {
  selected.value = edge
  blocks.value = []
  errorMsg.value = ''

  const items = selectedItems.value
  if (!items.length) {
    errorMsg.value = '該当する記録が見つかりませんでした'
    return
  }

  // 語順を正規化してキャッシュキーを安定させる（「仕事×締切」と「締切×仕事」を同一視）
  const keyword = [props.word, partnerOf(edge)].sort().join(' × ')

  isLoading.value = true
  try {
    const res = await $fetch<{ blocks: AnalysisBlock[] }>('/api/hagemashi/topic-summary', {
      method: 'POST',
      body: { keyword, scope: 'pair', items },
    })
    blocks.value = res.blocks ?? []
    if (!blocks.value.length) errorMsg.value = '読み解ける内容が見つかりませんでした'
  } catch {
    errorMsg.value = 'AI分析の生成に失敗しました'
  } finally {
    isLoading.value = false
  }
}

function backToList() {
  selected.value = null
  blocks.value = []
  errorMsg.value = ''
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-[440px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[85vh]">
        <!-- ヘッダー -->
        <div class="px-5 pt-5 pb-3 border-b border-white/[0.08] flex items-start justify-between gap-3 shrink-0">
          <div class="min-w-0">
            <div v-if="selected" class="flex items-center gap-1.5 text-base font-semibold text-slate-50">
              <span class="text-slate-400">{{ word }}</span>
              <span class="text-slate-600 text-xs">×</span>
              <span :style="{ color: valenceColor(selected.valence) }">{{ partnerOf(selected) }}</span>
            </div>
            <h3 v-else class="m-0 text-base font-semibold text-slate-50 truncate">{{ word }}</h3>

            <p v-if="selected" class="m-0 mt-1 text-xs text-slate-500">
              同時に出た記録 {{ selected.co }} 件 ・ ポジ {{ selected.pos }} / ネガ {{ selected.neg }}
            </p>
            <p v-else class="m-0 mt-1 text-xs text-slate-500">
              {{ df }} 件の記録 ・ ポジ {{ pos }} / ネガ {{ neg }} ・ {{ moodLabel }}
            </p>
          </div>
          <button
            class="shrink-0 bg-transparent border-none text-slate-500 text-lg cursor-pointer px-1 hover:text-slate-50 transition-colors"
            @click="emit('close')"
          >✕</button>
        </div>

        <div class="px-5 py-4 overflow-y-auto flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(249,115,22,0.3)_transparent]">
          <!-- 組み合わせ一覧 -->
          <template v-if="!selected">
            <div v-if="!pairs.length" class="text-center text-slate-500 text-sm py-4">
              結びついている言葉が見つかりませんでした
            </div>
            <template v-else>
              <p class="m-0 mb-3 text-[11px] text-slate-500 leading-relaxed">
                「{{ word }}」と結びついている組み合わせです。強い順。タップするとAIが読み解きます。
              </p>

              <!-- 図で線が引かれている組み合わせ -->
              <div v-if="drawnPairs.length" class="flex flex-col gap-2">
                <button
                  v-for="e in drawnPairs"
                  :key="`${e.a}-${e.b}`"
                  class="w-full text-left px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] cursor-pointer hover:bg-white/[0.07] hover:border-white/20 transition-all"
                  @click="openPair(e)"
                >
                  <div class="flex items-center justify-between gap-3">
                    <span class="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
                      <span>{{ word }}</span>
                      <span class="text-slate-600 text-[10px]">×</span>
                      <span :style="{ color: valenceColor(e.valence) }">{{ partnerOf(e) }}</span>
                    </span>
                    <span class="text-[10px] text-slate-500 tabular-nums shrink-0">
                      {{ e.co }}件 ・ 強さ {{ e.strength.toFixed(2) }}
                    </span>
                  </div>
                  <!-- ポジ/ネガの内訳 -->
                  <div class="mt-1.5 h-1 rounded-full bg-white/[0.08] overflow-hidden flex">
                    <span class="h-full bg-emerald-400" :style="{ width: `${(e.pos / e.co) * 100}%` }" />
                    <span class="h-full bg-orange-400" :style="{ width: `${(e.neg / e.co) * 100}%` }" />
                  </div>
                </button>
              </div>

              <!-- 図では線を省略した組み合わせ（結びつき自体はある） -->
              <template v-if="hiddenPairs.length">
                <div class="flex items-center gap-2 mt-4 mb-2">
                  <span class="h-px flex-1 bg-white/[0.08]" />
                  <span class="text-[10px] text-slate-600 shrink-0">図では線を省略</span>
                  <span class="h-px flex-1 bg-white/[0.08]" />
                </div>
                <p class="m-0 mb-2 text-[10px] text-slate-600 leading-relaxed">
                  図が見づらくならないよう線を間引いています。結びつき自体はあるので、同じように掘り下げられます。
                </p>
                <div class="flex flex-col gap-2">
                  <button
                    v-for="e in hiddenPairs"
                    :key="`${e.a}-${e.b}`"
                    class="w-full text-left px-3 py-2.5 rounded-xl border border-dashed border-white/[0.10] bg-transparent cursor-pointer hover:bg-white/[0.05] hover:border-white/20 transition-all"
                    @click="openPair(e)"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <span class="flex items-center gap-1.5 text-sm font-semibold text-slate-400">
                        <span>{{ word }}</span>
                        <span class="text-slate-600 text-[10px]">×</span>
                        <span :style="{ color: valenceColor(e.valence) }">{{ partnerOf(e) }}</span>
                      </span>
                      <span class="text-[10px] text-slate-600 tabular-nums shrink-0">
                        {{ e.co }}件 ・ 強さ {{ e.strength.toFixed(2) }}
                      </span>
                    </div>
                    <div class="mt-1.5 h-1 rounded-full bg-white/[0.06] overflow-hidden flex opacity-70">
                      <span class="h-full bg-emerald-400" :style="{ width: `${(e.pos / e.co) * 100}%` }" />
                      <span class="h-full bg-orange-400" :style="{ width: `${(e.neg / e.co) * 100}%` }" />
                    </div>
                  </button>
                </div>
              </template>
            </template>
          </template>

          <!-- AI分析 -->
          <template v-else>
            <button
              class="mb-3 flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 bg-transparent border-none cursor-pointer px-0 transition-colors"
              @click="backToList"
            >← 組み合わせ一覧へ戻る</button>

            <div v-if="isLoading" class="flex items-center justify-center gap-2 py-8 text-slate-400 text-sm">
              <span class="w-4 h-4 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin block" />
              記録を読み解いています...
            </div>

            <div v-else-if="errorMsg" class="text-center text-rose-400 text-sm py-4">{{ errorMsg }}</div>

            <template v-else>
              <div class="flex flex-col gap-3 mb-4">
                <div
                  v-for="(b, i) in blocks"
                  :key="i"
                  class="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3.5"
                >
                  <div class="text-xs font-semibold text-orange-400 mb-1">{{ b.title }}</div>
                  <p class="m-0 text-sm text-slate-200 leading-relaxed whitespace-pre-line">{{ b.text }}</p>
                </div>
              </div>

              <button
                class="w-full mb-4 px-3 py-2 rounded-lg text-xs font-semibold border border-orange-500/30 bg-orange-500/10 text-orange-300 cursor-pointer hover:bg-orange-500/20 transition-colors"
                @click="emit('focus', partnerOf(selected))"
              >「{{ partnerOf(selected) }}」を起点に見る</button>

              <!-- 該当記録 -->
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
