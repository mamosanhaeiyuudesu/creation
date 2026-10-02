<script setup lang="ts">
import { ref } from 'vue'
import type { KoubaAchievement } from '~/types/kouba'
import { formatJstDate, KOUBA_ACHIEVEMENT_TEXT_MAX } from '~/types/kouba'

// 「達成したこと」の一覧。右サイドバーとして表示。
// 記録はポップアップ（KoubaAchievementFormModal）、編集はインライン。
defineProps<{
  achievements: KoubaAchievement[]
  loading: boolean
  saving: boolean
  /** 一覧側の操作の失敗時のエラー。 */
  error: string
}>()
const emit = defineEmits<{
  openAdd: []
  update: [id: string, text: string, achievedAt: string]
  delete: [achievement: KoubaAchievement]
}>()

const editingId = ref<string | null>(null)
const editText = ref('')
const editDate = ref('')

/** ISO8601 → "YYYY-MM-DD"（JST）。date input の value 用。 */
function isoToDateInput(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}

function startEdit(a: KoubaAchievement) {
  editingId.value = a.id
  editText.value = a.text
  editDate.value = isoToDateInput(a.achievedAt)
}

function cancelEdit() {
  editingId.value = null
}

function commitEdit() {
  const text = editText.value.trim()
  if (!text || !editingId.value || !editDate.value) return
  emit('update', editingId.value, text, editDate.value)
  editingId.value = null
}
</script>

<template>
  <section class="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-3 h-full">
    <div class="flex items-center justify-between gap-3">
      <h2 class="m-0 text-sm font-bold text-slate-100">🏆 達成したこと</h2>
      <button
        type="button"
        class="h-7 px-3 rounded-full bg-sky-500 text-white text-[11px] font-bold hover:bg-sky-400 shrink-0"
        @click="emit('openAdd')"
      >＋ 記録</button>
    </div>
    <p v-if="error" class="m-0 text-[11px] text-rose-400">{{ error }}</p>

    <div v-if="loading" class="text-center text-slate-500 text-xs py-4">読み込み中…</div>
    <p v-else-if="!achievements.length" class="m-0 text-center text-slate-500 text-xs py-4">まだ記録がありません</p>
    <ul v-else class="m-0 p-0 flex flex-col gap-1.5 list-none overflow-y-auto">
      <li v-for="a in achievements" :key="a.id" class="rounded-lg bg-white/[0.03] px-3 py-2.5">
        <!-- 編集モード -->
        <template v-if="editingId === a.id">
          <div class="flex flex-col gap-1.5">
            <textarea
              v-model="editText"
              rows="3"
              :maxlength="KOUBA_ACHIEVEMENT_TEXT_MAX"
              class="w-full resize-none bg-white/[0.08] border border-sky-400/50 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-100 outline-none font-[inherit] leading-snug"
              @keydown.esc="cancelEdit"
            />
            <div class="flex items-center gap-1.5">
              <input
                v-model="editDate"
                type="date"
                class="flex-1 min-w-0 bg-white/[0.06] border border-white/10 rounded-lg px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-400/50"
              />
              <button
                type="button"
                class="h-7 px-3 rounded-full bg-sky-500 text-white text-[11px] font-bold hover:bg-sky-400 disabled:opacity-50 shrink-0"
                :disabled="saving || !editText.trim()"
                @click="commitEdit"
              >保存</button>
              <button
                type="button"
                class="h-7 w-7 rounded-full bg-white/10 text-slate-300 text-[11px] flex items-center justify-center shrink-0"
                @click="cancelEdit"
              >✕</button>
            </div>
          </div>
        </template>
        <!-- 表示モード -->
        <template v-else>
          <div class="flex items-start gap-2">
            <div class="flex-1 min-w-0 flex flex-col gap-0.5">
              <span class="text-[10px] text-slate-500 tabular-nums">{{ formatJstDate(a.achievedAt) }}</span>
              <span class="text-[12px] text-slate-200 leading-snug break-words whitespace-pre-line">{{ a.text }}</span>
            </div>
            <div class="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                class="w-6 h-6 rounded text-slate-500 hover:text-sky-300 hover:bg-white/10 flex items-center justify-center text-xs"
                title="編集"
                @click="startEdit(a)"
              >✏️</button>
              <button
                type="button"
                class="w-6 h-6 rounded text-slate-500 hover:text-rose-300 hover:bg-white/10 flex items-center justify-center text-xs"
                title="削除"
                @click="emit('delete', a)"
              >🗑</button>
            </div>
          </div>
        </template>
      </li>
    </ul>
  </section>
</template>
