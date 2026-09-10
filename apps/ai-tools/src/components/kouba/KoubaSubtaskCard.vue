<script setup lang="ts">
import { ref, nextTick } from 'vue'
import type { KoubaSubtask, KoubaSubtaskLog } from '~/types/kouba'
import { KOUBA_MIN_HOURS, KOUBA_MAX_HOURS } from '~/types/kouba'

const props = defineProps<{ subtask: KoubaSubtask; saving: boolean }>()
const emit = defineEmits<{
  rename: [title: string]
  delete: []
  setLog: [payload: { workDate: string; hours: number }]
  deleteLog: [log: KoubaSubtaskLog]
}>()

// 日本語入力の変換確定Enterでも @keydown.enter は発火するため、確定中は無視する
function isImeEnter(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229
}
function runOnEnter(e: KeyboardEvent, fn: () => void) {
  if (isImeEnter(e)) return
  fn()
}

const HOUR_OPTIONS = Array.from({ length: KOUBA_MAX_HOURS - KOUBA_MIN_HOURS + 1 }, (_, i) => i + KOUBA_MIN_HOURS)

const editingTitle = ref(false)
const titleDraft = ref('')
const titleInputEl = ref<HTMLInputElement | null>(null)

function startEdit() {
  titleDraft.value = props.subtask.title
  editingTitle.value = true
  nextTick(() => titleInputEl.value?.focus())
}
function commitTitle() {
  if (!editingTitle.value) return
  editingTitle.value = false
  const title = titleDraft.value.trim()
  if (title && title !== props.subtask.title) emit('rename', title)
}

const newDate = ref(todayJST())
const newHours = ref(KOUBA_MIN_HOURS)

function submitNewLog() {
  emit('setLog', { workDate: newDate.value, hours: Number(newHours.value) })
  newDate.value = todayJST()
  newHours.value = KOUBA_MIN_HOURS
}

function onEditHours(log: KoubaSubtaskLog, e: Event) {
  const hours = Number((e.target as HTMLSelectElement).value)
  if (hours !== log.hours) emit('setLog', { workDate: log.workDate, hours })
}

function formatDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return `${y}/${m}/${d}(${weekdayJa(ymd)})`
}
</script>

<template>
  <div class="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 flex flex-col gap-2.5">
    <div class="flex items-center gap-2">
      <input
        v-if="editingTitle"
        ref="titleInputEl"
        v-model="titleDraft"
        class="flex-1 min-w-0 bg-white/[0.08] border border-sky-400/50 rounded-lg px-2 py-1 text-slate-50 text-[13px] font-bold outline-none"
        @keydown.enter="runOnEnter($event, commitTitle)"
        @blur="commitTitle"
      />
      <h3
        v-else
        class="flex-1 min-w-0 m-0 text-[13px] font-bold text-slate-100 truncate cursor-text"
        title="クリックして編集"
        @click="startEdit"
      >{{ subtask.title }}</h3>
      <span class="text-sm font-extrabold text-amber-300 tabular-nums shrink-0">{{ subtask.totalHours }}<span class="text-[11px] font-semibold text-slate-500 ml-0.5">h</span></span>
      <button
        class="w-6 h-6 rounded text-slate-500 hover:text-rose-300 hover:bg-white/10 flex items-center justify-center text-xs shrink-0"
        title="サブタスクを削除"
        @click="emit('delete')"
      >🗑</button>
    </div>

    <!-- 日別の作業時間（select で直接編集できる） -->
    <div v-if="subtask.logs.length" class="flex flex-col gap-1">
      <div v-for="log in subtask.logs" :key="log.id" class="flex items-center gap-2 text-[12.5px]">
        <span class="text-slate-300 w-24 shrink-0">{{ formatDate(log.workDate) }}</span>
        <select
          class="bg-white/[0.06] border border-white/10 rounded px-1.5 py-1 text-slate-100 text-xs outline-none focus:border-sky-400/50"
          :value="log.hours"
          :disabled="saving"
          @change="onEditHours(log, $event)"
        >
          <option v-for="h in HOUR_OPTIONS" :key="h" :value="h">{{ h }}時間</option>
        </select>
        <button
          class="w-5 h-5 rounded text-slate-500 hover:text-rose-300 hover:bg-white/10 flex items-center justify-center text-[10px] ml-auto"
          title="この日の記録を削除"
          :disabled="saving"
          @click="emit('deleteLog', log)"
        >🗑</button>
      </div>
    </div>
    <p v-else class="text-[12px] text-slate-500 m-0">まだ記録がありません</p>

    <!-- 日を追加 -->
    <form class="flex items-center gap-1.5" @submit.prevent="submitNewLog">
      <input
        v-model="newDate"
        type="date"
        class="bg-white/[0.06] border border-white/10 rounded px-1.5 py-1 text-slate-100 text-xs outline-none focus:border-sky-400/50"
        required
      />
      <select
        v-model.number="newHours"
        class="bg-white/[0.06] border border-white/10 rounded px-1.5 py-1 text-slate-100 text-xs outline-none focus:border-sky-400/50"
      >
        <option v-for="h in HOUR_OPTIONS" :key="h" :value="h">{{ h }}時間</option>
      </select>
      <button
        type="submit"
        class="h-7 px-3 rounded-full bg-sky-500 text-white text-[11px] font-bold hover:bg-sky-400 disabled:opacity-40"
        :disabled="saving"
      >追加</button>
    </form>
  </div>
</template>
