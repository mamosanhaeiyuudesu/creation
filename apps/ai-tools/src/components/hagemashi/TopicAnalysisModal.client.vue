<script setup lang="ts">
interface SourceItem { date: string; text: string }

const props = defineProps<{
  title: string
  meta?: string
  keyword: string
  scope?: string
  matchedItems: SourceItem[]
}>()

const emit = defineEmits<{
  close: []
}>()

interface AnalysisBlock { title: string; text: string }
const blocks = ref<AnalysisBlock[]>([])
const isLoading = ref(false)
const errorMsg = ref('')

// 分析結果はサーバー側で D1 にキャッシュされる（同じ入力なら再生成せずキャッシュを返す）
async function runAnalysis() {
  blocks.value = []
  errorMsg.value = ''
  if (!props.matchedItems.length) return
  isLoading.value = true
  try {
    const res = await $fetch<{ blocks: AnalysisBlock[] }>('/api/hagemashi/topic-summary', {
      method: 'POST',
      body: { keyword: props.keyword, scope: props.scope, items: props.matchedItems },
    })
    blocks.value = res.blocks ?? []
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
          <div v-if="isLoading" class="flex items-center justify-center gap-2 py-8 text-slate-400 text-sm">
            <span class="w-4 h-4 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin block" />
            分析中...
          </div>
          <div v-else-if="errorMsg" class="text-center text-rose-400 text-sm py-4">{{ errorMsg }}</div>
          <div v-else-if="!blocks.length" class="text-center text-slate-500 text-sm py-4">
            関連する中間データが見つかりませんでした
          </div>
          <div v-else class="flex flex-col gap-3.5">
            <div v-for="(b, i) in blocks" :key="i">
              <div class="text-xs font-semibold text-orange-400 mb-1">{{ b.title }}</div>
              <p class="m-0 text-sm text-slate-200 leading-relaxed whitespace-pre-line">{{ b.text }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
