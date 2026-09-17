<script setup lang="ts">
import { ref, nextTick } from 'vue'
import type { KoubaSubtask } from '~/types/kouba'

/**
 * 板・タスクとは完全に無関係な、名前だけのサブタスク一覧。ドラッグ&ドロップで自由に並べ替えられる
 * （カテゴリの並べ替えと同じ「掴んだ場所の手前に入る」規則）。PCでは画面左の常設サイドバー、
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
}>()

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

// ── ドラッグ&ドロップでの並べ替え（掴めるのは左端の⠿ハンドルだけ。行全体だとタイトル編集・削除ボタンと取り合いになる）──────────────────────────────
const dragId = ref<string | null>(null)
const dropBeforeId = ref<string | 'end' | null>(null)

function onDragStart(e: DragEvent, s: KoubaSubtask) {
  dragId.value = s.id
  e.dataTransfer?.setData('text/plain', s.id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onDragEnd() {
  dragId.value = null
  dropBeforeId.value = null
}
/** s が null なら一覧の末尾（リスト下の余白）へのドロップを表す。 */
function onRowDragOver(s: KoubaSubtask | null) {
  if (!dragId.value) return
  dropBeforeId.value = s ? s.id : 'end'
}
function onRowDrop(s: KoubaSubtask | null) {
  const id = dragId.value
  onDragEnd()
  if (!id) return
  const ids = props.subtasks.map((x) => x.id).filter((v) => v !== id)
  let insertAt = s && s.id !== id ? ids.indexOf(s.id) : ids.length
  if (insertAt < 0) insertAt = ids.length
  ids.splice(insertAt, 0, id)
  if (ids.every((v, i) => v === props.subtasks[i]?.id)) return // 並びが変わらないなら送らない
  emit('reorder', ids)
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
    <div
      v-else
      class="flex flex-col gap-1.5 sm:flex-1 sm:overflow-y-auto sm:min-h-0"
      @dragover.prevent="onRowDragOver(null)"
      @drop.prevent="onRowDrop(null)"
    >
      <div
        v-for="s in subtasks"
        :key="s.id"
        class="rounded-lg border px-2 py-2 flex items-center gap-2 transition-colors"
        :class="[
          dropBeforeId === s.id ? 'border-sky-400/70 ring-1 ring-sky-400/30' : 'border-white/10 bg-white/[0.03]',
          dragId === s.id ? 'opacity-40' : '',
        ]"
        @dragover.prevent.stop="onRowDragOver(s)"
        @drop.prevent.stop="onRowDrop(s)"
      >
        <span
          draggable="true"
          class="w-5 h-6 shrink-0 flex items-center justify-center text-slate-600 text-sm cursor-grab active:cursor-grabbing select-none"
          title="ドラッグで並べ替え"
          @dragstart="onDragStart($event, s)"
          @dragend="onDragEnd"
        >⠿</span>

        <template v-if="editingId === s.id">
          <input
            :id="`kouba-subtask-edit-${s.id}`"
            v-model="editDraft"
            class="flex-1 min-w-0 bg-white/[0.08] border border-sky-400/50 rounded px-1.5 py-1 text-slate-50 text-[12.5px] font-semibold outline-none"
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
            class="flex-1 min-w-0 text-[12.5px] font-semibold text-slate-100 truncate cursor-text"
            title="クリックして編集"
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
  </section>
</template>
