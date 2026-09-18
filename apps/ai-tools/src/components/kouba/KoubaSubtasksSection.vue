<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { KoubaSubtask } from '~/types/kouba'

/**
 * 板・タスクとは完全に無関係な、名前だけのサブタスク一覧。各行の上下ボタンで並べ替えられる
 * （ドラッグ&ドロップは2026-09-18に廃止した）。PCでは画面左の常設サイドバー、
 * スマホではタブ切り替えで表示する（どちらで出すかは pages/kouba/index.vue 側が決める＝このコンポーネントは
 * 自分がサイドバーかタブの中身かを意識しない）。
 */
const props = defineProps<{
  subtasks: KoubaSubtask[]
  loading: boolean
  saving: boolean
  error: string
}>()
const emit = defineEmits<{
  add: [title: string]
  rename: [payload: { id: string; title: string }]
  delete: [subtask: KoubaSubtask]
  reorder: [ids: string[]]
  toggleDone: [payload: { id: string; done: boolean }]
}>()

// ── 完了(done)で下段へ分ける（未完了を上、完了済みは折りたたんだ「完了済み」セクションへ）──────────────────────────────
const activeSubtasks = computed(() => props.subtasks.filter((s) => !s.done))
const doneSubtasks = computed(() => props.subtasks.filter((s) => s.done))
const showDone = ref(false)

function isImeEnter(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229
}
function runOnEnter(e: KeyboardEvent, fn: () => void) {
  if (isImeEnter(e)) return
  fn()
}

// ── 追加（名前だけの常設フォーム。時間などの付随項目が無いのでポップアップ化はしない）──────────────────────────────
const titleDraft = ref('')
function submitAdd() {
  const title = titleDraft.value.trim()
  if (!title) return
  titleDraft.value = ''
  emit('add', title)
}

// ── タイトルの編集（クリックで編集、Enter/フォーカス外しで保存、編集中の✗は保存せず削除確認へ）──────────────────────────────
const editingId = ref<string | null>(null)
const editDraft = ref('')

function startEdit(s: KoubaSubtask) {
  editingId.value = s.id
  editDraft.value = s.title
  nextTick(() => document.getElementById(`kouba-subtask-edit-${s.id}`)?.focus())
}
function commitEdit(s: KoubaSubtask) {
  if (editingId.value !== s.id) return
  editingId.value = null
  const title = editDraft.value.trim()
  if (title && title !== s.title) emit('rename', { id: s.id, title })
}
function cancelEditAndDelete(s: KoubaSubtask) {
  editingId.value = null
  emit('delete', s)
}

// ── 上下ボタンでの並べ替え（未完了どうしの隣り合う2件の並び順を入れ替えるだけ。完了済みは対象外）──────────────────────────────
function moveActive(s: KoubaSubtask, dir: -1 | 1) {
  const active = activeSubtasks.value
  const idx = active.findIndex((x) => x.id === s.id)
  const swapIdx = idx + dir
  if (idx < 0 || swapIdx < 0 || swapIdx >= active.length) return
  const otherId = active[swapIdx]!.id
  const ids = props.subtasks.map((x) => x.id)
  const i1 = ids.indexOf(s.id)
  const i2 = ids.indexOf(otherId)
  ;[ids[i1], ids[i2]] = [ids[i2]!, ids[i1]!]
  emit('reorder', ids)
}
function canMoveUp(s: KoubaSubtask): boolean {
  return activeSubtasks.value.findIndex((x) => x.id === s.id) > 0
}
function canMoveDown(s: KoubaSubtask): boolean {
  const idx = activeSubtasks.value.findIndex((x) => x.id === s.id)
  return idx >= 0 && idx < activeSubtasks.value.length - 1
}
</script>

<template>
  <section class="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-3 sm:h-full">
    <h2 class="m-0 text-sm font-bold text-slate-100">🧩 サブタスク</h2>
    <p v-if="error" class="m-0 text-[11px] text-rose-400">{{ error }}</p>

    <form class="flex gap-1.5 shrink-0" @submit.prevent="submitAdd">
      <input
        v-model="titleDraft"
        type="text"
        placeholder="サブタスク名"
        class="flex-1 min-w-0 h-8 bg-white/[0.06] border border-white/10 rounded-lg px-2.5 text-[12.5px] text-slate-100 outline-none focus:border-sky-400/50"
      />
      <button
        type="submit"
        class="h-8 px-3 rounded-lg bg-sky-500 text-white text-[12px] font-bold hover:bg-sky-400 shrink-0 disabled:opacity-50"
        :disabled="saving"
      >追加</button>
    </form>

    <div v-if="loading" class="text-center text-slate-500 text-xs py-4">読み込み中…</div>
    <p v-else-if="!subtasks.length" class="m-0 text-center text-slate-500 text-xs py-4">まだサブタスクがありません</p>
    <div v-else class="flex flex-col gap-2 sm:flex-1 sm:overflow-y-auto sm:min-h-0">
      <div class="flex flex-col gap-1.5">
        <p v-if="!activeSubtasks.length" class="m-0 text-center text-slate-500 text-xs py-2">すべて完了しました</p>
        <div
          v-for="s in activeSubtasks"
          :key="s.id"
          class="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 flex items-center gap-2 transition-colors"
        >
          <input
            type="checkbox"
            class="w-4 h-4 shrink-0 rounded border-white/20 bg-white/[0.06] accent-sky-500 cursor-pointer"
            title="完了にする"
            @change="emit('toggleDone', { id: s.id, done: true })"
          />

          <div class="flex flex-col shrink-0 -my-1">
            <button
              type="button"
              class="w-5 h-4 flex items-center justify-center text-slate-500 hover:text-sky-300 disabled:opacity-20 disabled:hover:text-slate-500 text-[9px] leading-none"
              title="上へ"
              :disabled="!canMoveUp(s)"
              @click="moveActive(s, -1)"
            >▲</button>
            <button
              type="button"
              class="w-5 h-4 flex items-center justify-center text-slate-500 hover:text-sky-300 disabled:opacity-20 disabled:hover:text-slate-500 text-[9px] leading-none"
              title="下へ"
              :disabled="!canMoveDown(s)"
              @click="moveActive(s, 1)"
            >▼</button>
          </div>

          <template v-if="editingId === s.id">
            <input
              :id="`kouba-subtask-edit-${s.id}`"
              v-model="editDraft"
              class="flex-1 min-w-0 bg-white/[0.08] border border-sky-400/50 rounded px-1.5 py-1 text-slate-50 text-[10.5px] font-semibold outline-none"
              @keydown.enter="runOnEnter($event, () => commitEdit(s))"
              @blur="commitEdit(s)"
            />
            <button
              type="button"
              class="w-6 h-6 rounded text-slate-500 hover:text-rose-300 hover:bg-white/10 flex items-center justify-center text-xs shrink-0"
              title="編集をやめて削除"
              @mousedown.prevent="cancelEditAndDelete(s)"
            >✗</button>
          </template>
          <template v-else>
            <span
              class="flex-1 min-w-0 text-[10.5px] font-semibold text-slate-100 truncate cursor-text"
              :title="s.title"
              @click="startEdit(s)"
            >{{ s.title }}</span>
            <button
              type="button"
              class="w-6 h-6 rounded text-slate-500 hover:text-rose-300 hover:bg-white/10 flex items-center justify-center text-xs shrink-0"
              title="削除"
              @click="emit('delete', s)"
            >🗑</button>
          </template>
        </div>
      </div>

      <div v-if="doneSubtasks.length" class="border-t border-white/10 pt-2 shrink-0">
        <button
          type="button"
          class="w-full flex items-center justify-between text-[11px] font-bold text-slate-400 hover:text-slate-200 px-0.5"
          @click="showDone = !showDone"
        >
          <span>✅ 完了済み（{{ doneSubtasks.length }}）</span>
          <span>{{ showDone ? '▲' : '▼' }}</span>
        </button>
        <div v-if="showDone" class="flex flex-col gap-1.5 mt-1.5">
          <div
            v-for="s in doneSubtasks"
            :key="s.id"
            class="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-2 flex items-center gap-2"
          >
            <input
              type="checkbox"
              checked
              class="w-4 h-4 shrink-0 rounded border-white/20 bg-white/[0.06] accent-sky-500 cursor-pointer"
              title="未完了に戻す"
              @change="emit('toggleDone', { id: s.id, done: false })"
            />
            <span class="flex-1 min-w-0 text-[10.5px] text-slate-500 line-through truncate" :title="s.title">{{ s.title }}</span>
            <button
              type="button"
              class="w-6 h-6 rounded text-slate-500 hover:text-rose-300 hover:bg-white/10 flex items-center justify-center text-xs shrink-0"
              title="削除"
              @click="emit('delete', s)"
            >🗑</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
