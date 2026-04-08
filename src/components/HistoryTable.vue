<template>
  <div v-if="history.length > 0" class="mt-1 min-w-0">
    <h2 v-if="!hideHeader" class="m-0 mb-3 text-base text-slate-400 font-medium">履歴</h2>
    <div class="max-h-[280px] overflow-auto border border-white/[0.08] rounded-[10px] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]">
      <table class="w-full border-collapse text-xs">
        <thead class="sticky top-0 bg-[rgba(15,23,42,0.95)] z-[1]">
          <tr>
            <th class="py-1.5 px-2 text-left text-slate-500 font-medium border-b border-white/[0.08] w-[110px] whitespace-nowrap">日時</th>
            <th class="py-1.5 px-2 text-left text-slate-500 font-medium border-b border-white/[0.08]">タイトル</th>
            <th v-if="summarizable && !noSummarizeColumn" class="py-1.5 px-2 text-left text-slate-500 font-medium border-b border-white/[0.08] w-8 text-center whitespace-nowrap">要約</th>
            <th class="py-1.5 px-2 text-left text-slate-500 font-medium border-b border-white/[0.08] w-8 text-center whitespace-nowrap">コピー</th>
            <th class="py-1.5 px-2 text-left text-slate-500 font-medium border-b border-white/[0.08] w-[52px] text-center">削除</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in history"
            :key="item.id"
            class="hover:[&>td]:bg-white/[0.03]"
          >
            <td class="py-1.5 px-2 text-slate-300 border-b border-white/[0.04] whitespace-nowrap last:border-b-0 w-[110px]">{{ formatDate(item.timestamp) }}</td>
            <td
              class="py-1.5 px-2 text-slate-200 border-b border-white/[0.04] overflow-hidden text-ellipsis whitespace-nowrap max-w-0 cursor-pointer hover:text-orange-400 transition-colors"
              @click="selectedItem = item"
            >{{ item.title }}</td>
            <td v-if="summarizable && !noSummarizeColumn" class="py-1.5 px-2 text-slate-300 border-b border-white/[0.04] text-center w-8">
              <button
                v-if="!item.notes"
                class="bg-transparent border-none cursor-pointer p-1 rounded text-[13px] leading-none transition-colors hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed"
                title="要点を箇条書きでまとめる"
                :disabled="summarizingId === item.id"
                @click.stop="$emit('summarize', item.id)"
              >
                <span v-if="summarizingId === item.id" class="w-3 h-3 rounded-full border border-slate-400/30 border-t-slate-400 animate-spin inline-block" />
                <span v-else>📝</span>
              </button>
              <span v-else class="text-green-400 text-[13px]" title="要点メモあり">✓</span>
            </td>
            <td class="py-1.5 px-2 text-slate-300 border-b border-white/[0.04] text-center w-8">
              <button
                class="bg-transparent border-none cursor-pointer p-1 rounded text-[13px] leading-none transition-colors hover:bg-white/[0.08]"
                :title="item.id === copiedId ? 'コピーしました!' : 'コピー'"
                @click="$emit('copy', item)"
              >
                {{ item.id === copiedId ? '✓' : '📋' }}
              </button>
            </td>
            <td class="py-1.5 px-2 text-slate-300 border-b border-white/[0.04] text-center w-[52px] whitespace-nowrap">
              <template v-if="confirmingId === item.id">
                <button class="bg-transparent border-none cursor-pointer p-1 rounded text-[13px] leading-none text-green-400 transition-colors hover:bg-green-400/15" title="削除する" @click="confirmDelete(item.id)">✓</button>
                <button class="bg-transparent border-none cursor-pointer p-1 rounded text-[13px] leading-none text-slate-400 transition-colors hover:bg-white/[0.08]" title="キャンセル" @click="confirmingId = null">✕</button>
              </template>
              <button v-else class="bg-transparent border-none cursor-pointer p-1 rounded text-[13px] leading-none transition-colors hover:bg-red-500/15" title="削除" @click="confirmingId = item.id">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- 詳細ポップアップ -->
  <Teleport to="body">
    <div
      v-if="selectedItem"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200]"
      @click.self="selectedItem = null"
    >
      <div class="w-full max-w-[600px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div class="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <div>
            <p class="m-0 text-xs text-slate-500 mb-1">{{ formatDate(selectedItem.timestamp) }}</p>
            <h2 class="m-0 text-base text-slate-50 font-semibold">{{ selectedItem.title }}</h2>
          </div>
          <button class="shrink-0 bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="selectedItem = null">✕</button>
        </div>
        <div class="px-6 py-5 overflow-y-auto flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent] flex flex-col gap-4">
          <div
            v-if="markdown"
            class="text-[#e2e8f0] text-sm leading-relaxed [&_h1]:text-slate-50 [&_h2]:text-slate-50 [&_h3]:text-slate-50 [&_h2]:text-[15px] [&_h2]:my-4 [&_p]:m-0 [&_p]:mb-2.5 [&_ul]:m-0 [&_ul]:mb-2.5 [&_ul]:pl-5 [&_li]:mb-1 [&_strong]:text-slate-50 [&_strong]:font-semibold [&_hr]:border-none [&_hr]:border-t [&_hr]:border-white/[0.08] [&_hr]:my-3"
            v-html="parsedText"
          />
          <pre v-else class="m-0 text-[#e2e8f0] text-sm leading-relaxed whitespace-pre-wrap font-[inherit]">{{ selectedItem.text }}</pre>

          <!-- 要約メモ -->
          <template v-if="summarizable">
            <div class="border-t border-white/[0.08] pt-4">
              <div v-if="selectedItem.notes" class="flex flex-col gap-2">
                <p class="m-0 text-[11px] font-medium text-slate-500 uppercase tracking-wide">要点メモ</p>
                <pre class="m-0 text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-[inherit]">{{ selectedItem.notes }}</pre>
              </div>
              <div v-else class="flex items-center gap-3">
                <p class="m-0 text-xs text-slate-500">要点メモがありません</p>
                <button
                  class="px-3 py-1.5 rounded-lg border border-white/15 bg-transparent text-slate-400 text-xs cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  :disabled="summarizingId === selectedItem.id"
                  @click="$emit('summarize', selectedItem.id)"
                >
                  <span v-if="summarizingId === selectedItem.id" class="w-3 h-3 rounded-full border border-slate-400/30 border-t-slate-400 animate-spin block" />
                  {{ summarizingId === selectedItem.id ? '要約中...' : '📝 要約' }}
                </button>
              </div>
            </div>
          </template>
        </div>
        <div class="flex justify-between items-center gap-2 px-6 py-4 pb-5 border-t border-white/[0.08]">
          <button
            v-if="confirmingDelete"
            class="flex items-center gap-2"
          >
            <span class="text-xs text-slate-400">削除しますか？</span>
            <button class="px-3 py-1.5 rounded-lg border-none bg-red-500/20 text-red-400 text-xs cursor-pointer hover:bg-red-500/30 transition-colors" @click="deleteFromModal">削除</button>
            <button class="px-3 py-1.5 rounded-lg border border-white/15 bg-transparent text-slate-400 text-xs cursor-pointer hover:bg-white/[0.06] transition-colors" @click="confirmingDelete = false">キャンセル</button>
          </button>
          <button
            v-else
            class="px-3 py-1.5 rounded-lg border border-white/15 bg-transparent text-slate-400 text-xs cursor-pointer hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all"
            @click="confirmingDelete = true"
          >🗑️ 削除</button>
          <div class="flex items-center gap-3">
            <span class="text-xs text-slate-500">{{ selectedItem.text.length.toLocaleString() }}文字</span>
            <button
              class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all"
              @click="copyFromModal"
            >{{ modalCopied ? 'コピーしました' : '📋 コピー' }}</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { marked } from 'marked'
import type { HistoryItem } from '~/types/history'

const props = defineProps<{
  history: HistoryItem[]
  copiedId: string | null
  hideHeader?: boolean
  markdown?: boolean
  summarizable?: boolean
  summarizingId?: string | null
  noSummarizeColumn?: boolean
}>()

const emit = defineEmits<{
  copy: [item: HistoryItem]
  delete: [id: string]
  summarize: [id: string]
}>()

const confirmingId = ref<string | null>(null)
const selectedItem = ref<HistoryItem | null>(null)
const confirmingDelete = ref(false)
const modalCopied = ref(false)

// selectedItemが変わったらdelete確認をリセット
watch(selectedItem, () => { confirmingDelete.value = false })

// 削除後にポップアップを閉じる
watch(() => props.history, (newHistory) => {
  if (selectedItem.value && !newHistory.find(h => h.id === selectedItem.value!.id)) {
    selectedItem.value = null
  }
})

const parsedText = computed(() =>
  props.markdown && selectedItem.value ? marked.parse(selectedItem.value.text) as string : ''
)

const confirmDelete = (id: string) => {
  emit('delete', id)
  confirmingId.value = null
}

const deleteFromModal = () => {
  if (!selectedItem.value) return
  emit('delete', selectedItem.value.id)
  confirmingDelete.value = false
}

const copyFromModal = async () => {
  if (!selectedItem.value) return
  emit('copy', selectedItem.value)
  modalCopied.value = true
  setTimeout(() => { modalCopied.value = false }, 2000)
}

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  const y = String(d.getFullYear()).slice(-2)
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${y}/${mo}/${day} ${h}:${mi}`
}
</script>
