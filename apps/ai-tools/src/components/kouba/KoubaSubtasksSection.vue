<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { KoubaSubtask } from '~/types/kouba'
import { KOUBA_MIN_HOURS, formatKoubaHours } from '~/types/kouba'
import KoubaHoursStepper from '~/components/kouba/KoubaHoursStepper.vue'

/** "今のテーマ"の下に出す、板全体を横断した「サブタスク」一覧。タスクを選んで紐付けて追加し、
 * DONEにすると紐づくタスクの時間へその分が加算される（外すと引き戻る）。板の奥（ジョブ→タスク）まで
 * 辿らずに、思いついた細目をすぐ書き留められる入り口として置いている。 */
export interface KoubaTaskOption {
  id: string
  /** 「カテゴリ名 > ジョブ名 > タスク名」の形。選択肢と、紐付け済みサブタスクの文脈表示の両方に使う。 */
  label: string
  taskTitle: string
}

const props = defineProps<{
  subtasks: KoubaSubtask[]
  taskOptions: KoubaTaskOption[]
  saving: boolean
  error: string
}>()
const emit = defineEmits<{
  add: [payload: { taskId: string; title: string; hours: number }]
  rename: [payload: { id: string; title: string }]
  setHours: [payload: { id: string; hours: number }]
  toggleDone: [payload: { id: string; done: boolean }]
  delete: [subtask: KoubaSubtask]
}>()

function isImeEnter(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229
}
function runOnEnter(e: KeyboardEvent, fn: () => void) {
  if (isImeEnter(e)) return
  fn()
}

const taskById = computed(() => new Map(props.taskOptions.map((o) => [o.id, o])))
function optionFor(subtask: KoubaSubtask): KoubaTaskOption | undefined {
  return taskById.value.get(subtask.taskId)
}

const openSubtasks = computed(() => props.subtasks.filter((s) => !s.done))
const doneSubtasks = computed(() => props.subtasks.filter((s) => s.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? '')))

// ── 追加フォーム ──────────────────────────────
const titleDraft = ref('')
const taskIdDraft = ref('')
const HOURS_DEFAULT = KOUBA_MIN_HOURS
const hoursDraft = ref(HOURS_DEFAULT)

function submitAdd() {
  const title = titleDraft.value.trim()
  if (!title || !taskIdDraft.value) return
  emit('add', { taskId: taskIdDraft.value, title, hours: Number(hoursDraft.value) })
  titleDraft.value = ''
  hoursDraft.value = HOURS_DEFAULT
  // taskId はそのまま残す＝同じタスクへ続けて書き留めることが多いため
}

// ── タイトルの編集（クリックで編集、Enter/フォーカス外しで保存、編集中の✗で削除確認へ）──────────────────────────────
const editingId = ref<string | null>(null)
const editDraft = ref('')

function startEdit(subtask: KoubaSubtask) {
  editingId.value = subtask.id
  editDraft.value = subtask.title
  nextTick(() => document.getElementById(`kouba-subtask-edit-${subtask.id}`)?.focus())
}
function commitEdit(subtask: KoubaSubtask) {
  if (editingId.value !== subtask.id) return
  editingId.value = null
  const title = editDraft.value.trim()
  if (title && title !== subtask.title) emit('rename', { id: subtask.id, title })
}
function cancelEditAndDelete(subtask: KoubaSubtask) {
  editingId.value = null
  emit('delete', subtask)
}
</script>

<template>
  <section class="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-4">
    <div>
      <h2 class="m-0 text-sm font-bold text-slate-100">🧩 サブタスク</h2>
      <p class="m-0 mt-0.5 text-[11px] text-slate-500">タスクを選んで紐付けます。DONEにすると、その時間がタスクへ加算されます</p>
    </div>

    <!-- 追加フォーム: タイトル＋どのタスクに紐付けるか＋時間 -->
    <form class="flex flex-col sm:flex-row gap-2" @submit.prevent="submitAdd">
      <input
        v-model="titleDraft"
        type="text"
        placeholder="サブタスクを書く（例: 参考記事を探す）"
        class="flex-1 min-w-0 bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-slate-100 text-[13px] outline-none focus:border-sky-400/50"
        @keydown.enter="runOnEnter($event, submitAdd)"
      />
      <select
        v-model="taskIdDraft"
        class="min-w-0 sm:max-w-[220px] bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-slate-100 text-[13px] outline-none focus:border-sky-400/50"
      >
        <option value="" disabled>タスクを選ぶ</option>
        <option v-for="o in taskOptions" :key="o.id" :value="o.id">{{ o.label }}</option>
      </select>
      <div class="flex gap-2 shrink-0">
        <KoubaHoursStepper v-model="hoursDraft" />
        <button
          type="submit"
          class="h-9 px-4 rounded-full bg-sky-500 text-white text-[13px] font-bold hover:bg-sky-400 disabled:opacity-40 shrink-0"
          :disabled="saving || !taskIdDraft"
        >追加</button>
      </div>
    </form>
    <p v-if="!taskOptions.length" class="m-0 -mt-2 text-[11px] text-slate-500">先にカテゴリ・ジョブ・タスクを1つ作ると、ここで選べるようになります</p>
    <p v-if="error" class="m-0 text-[11px] text-rose-400">{{ error }}</p>

    <!-- 未完了 -->
    <div v-if="!subtasks.length" class="text-center text-slate-500 text-xs py-4">まだサブタスクがありません</div>
    <template v-else>
      <div class="flex flex-col gap-2">
        <h3 class="m-0 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">未完了（{{ openSubtasks.length }}）</h3>
        <p v-if="!openSubtasks.length" class="m-0 text-[12px] text-slate-600 py-1">未完了のサブタスクはありません</p>
        <div
          v-for="s in openSubtasks"
          :key="s.id"
          class="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 flex items-center gap-2.5"
        >
          <button
            type="button"
            class="w-6 h-6 rounded border border-white/20 text-slate-400 hover:border-sky-400 hover:text-sky-300 flex items-center justify-center text-xs shrink-0"
            title="DONEにする"
            :disabled="saving"
            @click="emit('toggleDone', { id: s.id, done: true })"
          >☐</button>

          <template v-if="editingId === s.id">
            <input
              :id="`kouba-subtask-edit-${s.id}`"
              v-model="editDraft"
              class="flex-1 min-w-0 bg-white/[0.08] border border-sky-400/50 rounded-lg px-2 py-1 text-slate-50 text-[13px] font-semibold outline-none"
              @keydown.enter="runOnEnter($event, () => commitEdit(s))"
              @blur="commitEdit(s)"
            />
            <button
              type="button"
              class="w-7 h-7 rounded text-slate-500 hover:text-rose-300 hover:bg-white/10 flex items-center justify-center text-xs shrink-0"
              title="編集をやめて削除"
              @mousedown.prevent="cancelEditAndDelete(s)"
            >✗</button>
          </template>
          <template v-else>
            <span
              class="flex-1 min-w-0 text-[13px] font-semibold text-slate-100 truncate cursor-text"
              title="クリックして編集"
              @click="startEdit(s)"
            >{{ s.title }}</span>
            <span
              v-if="optionFor(s)"
              class="shrink-0 max-w-[9rem] truncate text-[10px] font-semibold text-sky-300/80 bg-sky-500/10 border border-sky-500/20 rounded-full px-2 py-0.5"
              :title="optionFor(s)!.label"
            >{{ optionFor(s)!.taskTitle }}</span>
            <KoubaHoursStepper
              :model-value="s.hours"
              :disabled="saving"
              @update:model-value="(hours) => emit('setHours', { id: s.id, hours })"
            />
            <button
              type="button"
              class="w-7 h-7 rounded text-slate-500 hover:text-rose-300 hover:bg-white/10 flex items-center justify-center text-xs shrink-0"
              title="サブタスクを削除"
              :disabled="saving"
              @click="emit('delete', s)"
            >🗑</button>
          </template>
        </div>
      </div>

      <!-- 完了。打ち消し線・淡色で一覧に残す。DONEを外すと加算した時間もタスクから引き戻る -->
      <div v-if="doneSubtasks.length" class="flex flex-col gap-2">
        <h3 class="m-0 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">完了（{{ doneSubtasks.length }}）</h3>
        <div
          v-for="s in doneSubtasks"
          :key="s.id"
          class="rounded-xl border border-white/5 bg-white/[0.015] px-3 py-2.5 flex items-center gap-2.5 opacity-60"
        >
          <button
            type="button"
            class="w-6 h-6 rounded border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs shrink-0"
            title="DONEを外す（タスクへ加算した時間も引き戻ります）"
            :disabled="saving"
            @click="emit('toggleDone', { id: s.id, done: false })"
          >☑</button>
          <span class="flex-1 min-w-0 text-[13px] font-semibold text-slate-400 truncate line-through">{{ s.title }}</span>
          <span
            v-if="optionFor(s)"
            class="shrink-0 max-w-[9rem] truncate text-[10px] font-semibold text-slate-500 bg-white/5 border border-white/10 rounded-full px-2 py-0.5"
            :title="optionFor(s)!.label"
          >{{ optionFor(s)!.taskTitle }}</span>
          <span class="shrink-0 text-[12px] font-bold text-slate-500 tabular-nums w-[4.5rem] text-center">{{ formatKoubaHours(s.hours) }}</span>
          <button
            type="button"
            class="w-7 h-7 rounded text-slate-500 hover:text-rose-300 hover:bg-white/10 flex items-center justify-center text-xs shrink-0"
            title="サブタスクを削除"
            :disabled="saving"
            @click="emit('delete', s)"
          >🗑</button>
        </div>
      </div>
    </template>
  </section>
</template>
