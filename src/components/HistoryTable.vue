<template>
  <div v-if="history.length > 0" class="mt-1 min-w-0">
    <h2 class="m-0 mb-3 text-base text-slate-400 font-medium">履歴</h2>
    <div class="max-h-[280px] overflow-auto border border-white/[0.08] rounded-[10px] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]">
      <table class="w-full border-collapse text-xs">
        <thead class="sticky top-0 bg-[rgba(15,23,42,0.95)] z-[1]">
          <tr>
            <th class="py-1.5 px-2 text-left text-slate-500 font-medium border-b border-white/[0.08] w-[110px] whitespace-nowrap">日時</th>
            <th class="py-1.5 px-2 text-left text-slate-500 font-medium border-b border-white/[0.08]">タイトル</th>
            <th class="py-1.5 px-2 text-left text-slate-500 font-medium border-b border-white/[0.08] w-8 text-center">コピー</th>
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
            <td class="py-1.5 px-2 text-slate-200 border-b border-white/[0.04] overflow-hidden text-ellipsis whitespace-nowrap max-w-0">{{ item.title }}</td>
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
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { HistoryItem } from '~/types/history'

defineProps<{
  history: HistoryItem[]
  copiedId: string | null
}>()

const emit = defineEmits<{
  copy: [item: HistoryItem]
  delete: [id: string]
}>()

const confirmingId = ref<string | null>(null)

const confirmDelete = (id: string) => {
  emit('delete', id)
  confirmingId.value = null
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
