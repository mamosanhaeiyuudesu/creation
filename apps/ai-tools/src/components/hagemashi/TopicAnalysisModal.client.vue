<script setup lang="ts">
interface SourceItem { date: string; text: string }

const props = defineProps<{
  title: string
  meta?: string
  note?: string
  keyword: string
  matchedItems: SourceItem[]
  showExclude?: boolean
}>()

const emit = defineEmits<{
  close: []
  exclude: []
}>()

const analysis = ref('')
const isLoading = ref(false)
const errorMsg = ref('')

// キャッシュ・保存はせず、開くたびに毎回AI分析を実行する
async function runAnalysis() {
  analysis.value = ''
  errorMsg.value = ''
  if (!props.matchedItems.length) return
  isLoading.value = true
  try {
    const res = await $fetch<{ summary: string }>('/api/hagemashi/topic-summary', {
      method: 'POST',
      body: { keyword: props.keyword, note: props.note, items: props.matchedItems },
    })
    analysis.value = res.summary
  } catch {
    errorMsg.value = 'AI分析に失敗しました'
  } finally {
    isLoading.value = false
  }
}

onMounted(runAnalysis)
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-[400px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[85vh]">
        <div class="px-5 pt-5 pb-3 border-b border-white/[0.08] flex items-start justify-between gap-3 shrink-0">
          <div>
            <h3 class="m-0 text-base font-semibold text-slate-50">{{ title }}</h3>
            <p v-if="meta" class="m-0 mt-1 text-xs text-slate-500">{{ meta }}</p>
          </div>
          <button
            class="shrink-0 bg-transparent border-none text-slate-500 text-lg cursor-pointer px-1 hover:text-slate-50 transition-colors"
            @click="emit('close')"
          >✕</button>
        </div>

        <div class="px-5 py-4 overflow-y-auto flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(249,115,22,0.3)_transparent]">
          <p v-if="note" class="m-0 mb-3 text-xs text-slate-400 leading-relaxed border-l-2 border-orange-500/40 pl-2.5">{{ note }}</p>

          <div v-if="isLoading" class="flex items-center justify-center gap-2 py-8 text-slate-400 text-sm">
            <span class="w-4 h-4 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin block" />
            分析中...
          </div>
          <div v-else-if="errorMsg" class="text-center text-rose-400 text-sm py-4">{{ errorMsg }}</div>
          <div v-else-if="!matchedItems.length" class="text-center text-slate-500 text-sm py-4">
            関連する中間データが見つかりませんでした
          </div>
          <p v-else class="m-0 text-sm text-slate-200 leading-relaxed whitespace-pre-line">{{ analysis }}</p>
        </div>

        <div v-if="showExclude" class="px-5 py-4 border-t border-white/[0.08] shrink-0">
          <button
            class="w-full px-4 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm font-medium cursor-pointer hover:bg-rose-500/20 transition-colors"
            @click="emit('exclude')"
          >単語を除外</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
