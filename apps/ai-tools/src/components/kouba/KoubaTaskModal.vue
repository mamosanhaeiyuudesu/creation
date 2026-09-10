<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import type { KoubaTask } from '~/types/kouba'
import KoubaIconPicker from '~/components/kouba/KoubaIconPicker.vue'

const props = defineProps<{
  show: boolean
  task: KoubaTask | null
  categories: { id: string; name: string; icon: string }[]
  saving: boolean
  error: string
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  update: [patch: { title?: string; icon?: string; categoryId?: string }]
  delete: []
  addLog: [payload: { workDate: string; hours: number; note: string }]
  deleteLog: [logId: string]
}>()

// 日本語入力の変換確定Enterでも @keydown.enter は発火するため、確定中は無視する
// （無視しないと編集中の文字が確定と同時に二重入力される）。
function isImeEnter(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229
}
function runOnEnter(e: KeyboardEvent, fn: () => void) {
  if (isImeEnter(e)) return
  fn()
}

const form = ref<{ workDate: string; hours: number | null; note: string }>({ workDate: todayJST(), hours: 1, note: '' })
const formError = ref('')
const editingTitle = ref(false)
const titleDraft = ref('')
const titleInputEl = ref<HTMLInputElement | null>(null)
const editingIcon = ref(false)

watch(
  () => props.show,
  (v) => {
    if (v) {
      form.value = { workDate: todayJST(), hours: 1, note: '' }
      formError.value = ''
      editingTitle.value = false
      editingIcon.value = false
    }
  }
)

function submitLog() {
  formError.value = ''
  const hours = Number(form.value.hours)
  if (!form.value.workDate) {
    formError.value = '日付を選んでください'
    return
  }
  if (!Number.isFinite(hours) || hours <= 0) {
    formError.value = '時間を正しく入力してください'
    return
  }
  emit('addLog', { workDate: form.value.workDate, hours, note: form.value.note })
  form.value.note = ''
}

function close() {
  emit('update:show', false)
}

function noteLines(note: string): string[] {
  return note
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

function formatHours(h: number): string {
  return (Math.round(h * 100) / 100).toString()
}

function formatDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return `${y}/${m}/${d}(${weekdayJa(ymd)})`
}

function startEditTitle() {
  if (!props.task) return
  titleDraft.value = props.task.title
  editingTitle.value = true
  nextTick(() => titleInputEl.value?.focus())
}

function commitTitle() {
  if (!editingTitle.value) return
  editingTitle.value = false
  const title = titleDraft.value.trim()
  if (title && props.task && title !== props.task.title) emit('update', { title })
}

function onPickIcon(icon: string) {
  editingIcon.value = false
  if (props.task && icon && icon !== props.task.icon) emit('update', { icon })
}

function onChangeCategory(e: Event) {
  const categoryId = (e.target as HTMLSelectElement).value
  if (props.task && categoryId && categoryId !== props.task.categoryId) emit('update', { categoryId })
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show && task"
      class="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      @click.self="close"
    >
      <div class="w-[min(560px,100%)] max-h-[88vh] bg-[#1e293b] border border-white/10 rounded-2xl flex flex-col overflow-hidden">
        <!-- ヘッダー: アイコン・タイトル編集・カテゴリ移動・合計時間・削除/閉じる -->
        <div class="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 relative">
              <button
                type="button"
                class="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-base shrink-0 hover:border-white/25"
                title="アイコンを変更"
                @click="editingIcon = !editingIcon"
              >{{ task.icon }}</button>
              <div v-if="editingIcon" class="absolute top-full left-0 mt-1 z-10 w-56 bg-[#0f172a] border border-white/10 rounded-xl p-2.5 shadow-xl" @click.stop>
                <KoubaIconPicker :model-value="task.icon" @update:model-value="onPickIcon" />
              </div>

              <input
                v-if="editingTitle"
                ref="titleInputEl"
                v-model="titleDraft"
                class="flex-1 min-w-0 bg-white/[0.06] border border-sky-400/50 rounded-lg px-2.5 py-1.5 text-slate-50 text-base font-bold outline-none"
                @keydown.enter="runOnEnter($event, commitTitle)"
                @blur="commitTitle"
              />
              <h2 v-else class="flex-1 min-w-0 m-0 text-base font-bold text-slate-50 truncate cursor-text" title="クリックして編集" @click="startEditTitle">
                {{ task.title }}
              </h2>
            </div>

            <div class="mt-2 flex items-center gap-2">
              <label class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">カテゴリ</label>
              <select
                class="bg-white/[0.06] border border-white/10 rounded-lg px-2 py-1 text-slate-200 text-xs outline-none focus:border-sky-400/50"
                :value="task.categoryId"
                @change="onChangeCategory"
              >
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.icon }} {{ c.name }}</option>
              </select>
            </div>

            <div class="mt-1.5 text-2xl font-extrabold text-amber-300 tabular-nums">
              {{ formatHours(task.totalHours) }}<span class="text-sm font-semibold text-slate-400 ml-1">時間</span>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button
              class="w-8 h-8 rounded-lg text-slate-400 hover:bg-white/10 hover:text-rose-300 flex items-center justify-center"
              title="タスクを削除"
              @click="emit('delete')"
            >🗑</button>
            <button class="w-8 h-8 rounded-lg text-slate-400 hover:bg-white/10 flex items-center justify-center" title="閉じる" @click="close">✕</button>
          </div>
        </div>

        <!-- 本体: スクロール -->
        <div class="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-5">
          <!-- 記録の追加フォーム -->
          <form class="flex flex-col gap-2.5 bg-white/[0.04] border border-white/10 rounded-xl p-3.5" @submit.prevent="submitLog">
            <div class="flex gap-2">
              <div class="flex flex-col gap-1 flex-1">
                <label class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">日付</label>
                <input
                  v-model="form.workDate"
                  type="date"
                  class="bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-slate-100 text-[13px] outline-none focus:border-sky-400/50"
                  required
                />
              </div>
              <div class="flex flex-col gap-1 w-28">
                <label class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">時間</label>
                <input
                  v-model.number="form.hours"
                  type="number"
                  min="0.25"
                  step="0.25"
                  placeholder="1.5"
                  class="bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-slate-100 text-[13px] outline-none focus:border-sky-400/50"
                  required
                />
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">やったこと（箇条書き。改行で複数項目）</label>
              <textarea
                v-model="form.note"
                rows="3"
                placeholder="資料を作成した&#10;SNSに投稿した"
                class="bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-slate-100 text-[13px] outline-none focus:border-sky-400/50 resize-y leading-relaxed font-[inherit]"
              />
            </div>
            <p v-if="formError || error" class="text-xs text-rose-400 m-0">{{ formError || error }}</p>
            <button
              type="submit"
              class="self-end h-9 px-4 rounded-full bg-sky-500 text-white text-[13px] font-bold hover:bg-sky-400 disabled:opacity-40"
              :disabled="saving"
            >記録を追加</button>
          </form>

          <!-- 記録一覧（新しい日付が上） -->
          <div class="flex flex-col gap-2.5">
            <div v-if="!task.logs.length" class="text-center text-slate-500 text-[13px] py-6">まだ記録がありません</div>
            <div v-for="log in task.logs" :key="log.id" class="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
                  <span>{{ formatDate(log.workDate) }}</span>
                  <span class="text-amber-300 tabular-nums">{{ formatHours(log.hours) }}時間</span>
                </div>
                <button
                  class="w-6 h-6 rounded text-slate-500 hover:text-rose-300 hover:bg-white/10 flex items-center justify-center text-xs"
                  title="この記録を削除"
                  :disabled="saving"
                  @click="emit('deleteLog', log.id)"
                >🗑</button>
              </div>
              <ul v-if="noteLines(log.note).length" class="mt-1.5 pl-4 space-y-0.5">
                <li v-for="(line, i) in noteLines(log.note)" :key="i" class="text-[13px] text-slate-300 leading-relaxed list-disc">{{ line }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
