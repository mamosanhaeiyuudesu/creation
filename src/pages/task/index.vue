<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useTaskProfiles } from '~/composables/task/useTaskProfiles'
import { useTaskBoards, BOARD_COLORS } from '~/composables/task/useTaskBoards'
import { useDragDrop } from '~/composables/task/useDragDrop'
import { useMonthPicker } from '~/composables/task/useMonthPicker'
import { useTaskStats } from '~/composables/task/useTaskStats'
import type { DoneView } from '~/composables/task/useTaskStats'

const route = useRoute()
const isMounted = ref(false)

const now = new Date()
const defaultStart = `${now.getFullYear()}-01`
const defaultEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const startMonth = ref((route.query.start as string) || defaultStart)
const endMonth = ref((route.query.end as string) || defaultEnd)

// --- Composables ---
const {
  profiles, activeProfileId, apiKey, apiToken,
  excludedBoards, hasCredentials, showSettings,
  init, openSettings, applySettings, switchProfile: switchProfileFn,
} = useTaskProfiles()

const {
  boards, allDates, loading, saving, error,
  showTaskModal, editTarget, taskForm, isEditing, modalTitle,
  pendingDone, pendingDueInput,
  doingTotal, todoTotal,
  trelloPut,
  load: loadBoards, formatDate, doneTotal, boardColor, boardBorderStyle,
  markDone, confirmMarkDone, unmarkDone,
  openAddTask, openEditTask, openEditDoneTask, saveTask, deleteTask,
} = useTaskBoards(apiKey, apiToken, excludedBoards, startMonth, endMonth)

const {
  dragging, dragOverCardId, dragOverEndKey,
  onDragStart, onDragEnd, onDragOverCard, onDragOverEnd, onDropCard, onDropEnd,
  onMobileTouchStart,
} = useDragDrop(boards, trelloPut)

const {
  pickerOpen, pickerYearStart, pickerYearEnd, showMobilePeriod,
  formatMonthLabel, formatMonthShort,
  toggleMobilePeriod, togglePicker, prevYear, nextYear, selectMonth, isSelectedMonth,
} = useMonthPicker(startMonth, endMonth)

const {
  doneView, doneViewOptions,
  chartRef, selectedDate, renderDoneChart,
  compPeriod, compChartRef, renderCompChart,
  compPeriodData, compPeriodTotal,
  thisWeekDoneFlat, weekComparison, weekCompTotal, lastMonthWeekDoneFlat,
} = useTaskStats(boards, allDates, route.query.view as DoneView)

const praiseFeedback = ref('')
const praiseLoading = ref(false)
const praiseError = ref('')
const praiseSentences = computed(() =>
  praiseFeedback.value
    .split('。')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s + '。')
)

async function generatePraise() {
  praiseLoading.value = true
  praiseFeedback.value = ''
  praiseError.value = ''
  try {
    const res = await $fetch<{ feedback: string }>('/api/task/praise', {
      method: 'POST',
      body: {
        thisWeek: thisWeekDoneFlat.value.map(r => r.card.name),
        lastMonthWeek: lastMonthWeekDoneFlat.value.map(r => r.card.name),
      },
    })
    praiseFeedback.value = res.feedback
  } catch (e: any) {
    praiseError.value = e?.data?.statusMessage || 'エラーが発生しました'
  } finally {
    praiseLoading.value = false
  }
}

// --- Page-level orchestration ---
function syncUrl() {
  const url = new URL(window.location.href)
  url.searchParams.set('start', startMonth.value)
  url.searchParams.set('end', endMonth.value)
  url.searchParams.set('view', doneView.value)
  url.searchParams.set('profile', activeProfileId.value)
  window.history.replaceState({}, '', url.toString())
}

watch(doneView, () => {
  const url = new URL(window.location.href)
  url.searchParams.set('view', doneView.value)
  window.history.replaceState({}, '', url.toString())
})

async function load() {
  selectedDate.value = null
  syncUrl()
  await loadBoards()
}

function switchProfile(id: string) {
  switchProfileFn(id)
  load()
}

function handleTaskSave(form: typeof taskForm.value) {
  Object.assign(taskForm.value, form)
  saveTask()
}

function handleSettingsSave(validProfiles: typeof profiles.value) {
  applySettings(validProfiles)
  if (hasCredentials.value) load()
}

const showPendingDone = computed({
  get: () => pendingDone.value !== null,
  set: (v: boolean) => { if (!v) pendingDone.value = null },
})

onMounted(() => {
  init(route.query.profile as string | undefined)
  isMounted.value = true
  if (hasCredentials.value) load()
  else openSettings()
})
</script>

<template>
  <!-- Month picker backdrop -->
  <div v-if="pickerOpen || showMobilePeriod" class="fixed inset-0 z-40" @click="pickerOpen = null; showMobilePeriod = false" />

  <div class="min-h-screen pb-16 text-[#e2e8f0] text-sm">
    <!-- Header -->
    <header class="sticky top-0 z-[100] bg-[rgba(15,23,42,0.92)] backdrop-blur-[12px] border-b border-white/[0.08]">
      <!-- タイトル行 -->
      <div class="flex items-center gap-2 px-3 md:px-5 py-2 md:py-3.5">
        <h1 class="flex-none m-0 text-xl font-bold bg-gradient-to-br from-sky-400 to-indigo-500 bg-clip-text text-transparent">タスクくん</h1>
        <!-- デスクトップ用コントロール -->
        <div v-if="hasCredentials" class="hidden md:flex items-center gap-2 ml-auto">
          <div class="flex items-center gap-1 mr-1">
            <button
              v-for="p in profiles"
              :key="p.id"
              :class="[
                'px-2.5 py-1 rounded-md text-[12px] font-medium cursor-pointer border transition-all',
                activeProfileId === p.id
                  ? 'bg-sky-500/20 border-sky-400/50 text-sky-400'
                  : 'bg-white/[0.04] border-white/10 text-slate-500 hover:bg-white/[0.08] hover:text-slate-300',
              ]"
              @click="switchProfile(p.id)"
            >{{ p.name }}</button>
          </div>
          <div class="relative z-50" @click.stop>
            <button
              class="bg-white/[0.06] border border-white/10 rounded-md px-2.5 py-1.5 text-[#e2e8f0] text-[13px] cursor-pointer hover:bg-white/[0.1] transition-colors min-w-[90px] text-left"
              @click="togglePicker('start')"
            >{{ formatMonthLabel(startMonth) }}</button>
            <div v-if="pickerOpen === 'start'" class="absolute top-full left-0 mt-1 bg-[#1e293b] border border-white/10 rounded-xl p-3 shadow-xl w-44">
              <div class="flex items-center justify-between mb-2">
                <button class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors text-sm" @click="prevYear('start')">‹</button>
                <span class="text-[13px] font-semibold text-slate-200">{{ pickerYearStart }}年</span>
                <button class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors text-sm" @click="nextYear('start')">›</button>
              </div>
              <div class="grid grid-cols-3 gap-1">
                <button
                  v-for="m in 12" :key="m"
                  class="py-1 rounded-md text-[12px] transition-colors cursor-pointer"
                  :class="isSelectedMonth('start', m) ? 'bg-sky-500 text-white font-semibold' : 'text-slate-300 hover:bg-white/10'"
                  @click="selectMonth('start', m)"
                >{{ m }}月</button>
              </div>
            </div>
          </div>
          <span class="text-slate-600">〜</span>
          <div class="relative z-50" @click.stop>
            <button
              class="bg-white/[0.06] border border-white/10 rounded-md px-2.5 py-1.5 text-[#e2e8f0] text-[13px] cursor-pointer hover:bg-white/[0.1] transition-colors min-w-[90px] text-left"
              @click="togglePicker('end')"
            >{{ formatMonthLabel(endMonth) }}</button>
            <div v-if="pickerOpen === 'end'" class="absolute top-full left-0 mt-1 bg-[#1e293b] border border-white/10 rounded-xl p-3 shadow-xl w-44">
              <div class="flex items-center justify-between mb-2">
                <button class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors text-sm" @click="prevYear('end')">‹</button>
                <span class="text-[13px] font-semibold text-slate-200">{{ pickerYearEnd }}年</span>
                <button class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors text-sm" @click="nextYear('end')">›</button>
              </div>
              <div class="grid grid-cols-3 gap-1">
                <button
                  v-for="m in 12" :key="m"
                  class="py-1 rounded-md text-[12px] transition-colors cursor-pointer"
                  :class="isSelectedMonth('end', m) ? 'bg-sky-500 text-white font-semibold' : 'text-slate-300 hover:bg-white/10'"
                  @click="selectMonth('end', m)"
                >{{ m }}月</button>
              </div>
            </div>
          </div>
          <button
            class="px-4 py-1.5 rounded-lg border-none bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-[13px] font-semibold cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:opacity-90 hover:enabled:-translate-y-px"
            :disabled="loading"
            @click="load"
          >{{ loading ? '…' : '更新' }}</button>
        </div>
        <button
          class="w-9 h-9 rounded-lg border border-white/10 bg-white/[0.06] text-slate-400 text-lg cursor-pointer flex items-center justify-center transition-all hover:bg-white/[0.12] hover:text-[#e2e8f0] ml-auto md:ml-0"
          title="設定"
          @click="openSettings"
        >⚙</button>
      </div>
      <!-- モバイル用コントロール行 -->
      <div v-if="hasCredentials" class="md:hidden flex items-center gap-2 px-3 pb-2">
        <select
          v-if="profiles.length > 1"
          :value="activeProfileId"
          class="bg-white/[0.06] border border-white/10 rounded-md px-2 py-1 text-[12px] text-[#e2e8f0] cursor-pointer flex-shrink-0 max-w-[110px]"
          @change="switchProfile(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="p in profiles" :key="p.id" :value="p.id" class="bg-[#1e293b] text-[#e2e8f0]">{{ p.name }}</option>
        </select>
        <div class="relative flex-1 min-w-0 z-50" @click.stop>
          <button
            class="w-full bg-white/[0.06] border border-white/10 rounded-md px-2 py-1 text-[#e2e8f0] text-[12px] cursor-pointer hover:bg-white/[0.1] transition-colors text-left whitespace-nowrap"
            @click="toggleMobilePeriod"
          >{{ formatMonthShort(startMonth) }}〜{{ formatMonthShort(endMonth) }}</button>
          <div v-if="showMobilePeriod" class="absolute top-full left-0 mt-1 bg-[#1e293b] border border-white/10 rounded-xl p-3 shadow-xl z-50 flex gap-4">
            <div>
              <div class="text-[11px] text-slate-400 mb-1.5 font-semibold">開始</div>
              <div class="flex items-center justify-between mb-2">
                <button class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors text-sm cursor-pointer" @click="prevYear('start')">‹</button>
                <span class="text-[12px] font-semibold text-slate-200">{{ pickerYearStart }}年</span>
                <button class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors text-sm cursor-pointer" @click="nextYear('start')">›</button>
              </div>
              <div class="grid grid-cols-3 gap-1">
                <button
                  v-for="m in 12" :key="m"
                  class="py-1 rounded-md text-[12px] transition-colors cursor-pointer"
                  :class="isSelectedMonth('start', m) ? 'bg-sky-500 text-white font-semibold' : 'text-slate-300 hover:bg-white/10'"
                  @click="selectMonth('start', m)"
                >{{ m }}月</button>
              </div>
            </div>
            <div>
              <div class="text-[11px] text-slate-400 mb-1.5 font-semibold">終了</div>
              <div class="flex items-center justify-between mb-2">
                <button class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors text-sm cursor-pointer" @click="prevYear('end')">‹</button>
                <span class="text-[12px] font-semibold text-slate-200">{{ pickerYearEnd }}年</span>
                <button class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors text-sm cursor-pointer" @click="nextYear('end')">›</button>
              </div>
              <div class="grid grid-cols-3 gap-1">
                <button
                  v-for="m in 12" :key="m"
                  class="py-1 rounded-md text-[12px] transition-colors cursor-pointer"
                  :class="isSelectedMonth('end', m) ? 'bg-sky-500 text-white font-semibold' : 'text-slate-300 hover:bg-white/10'"
                  @click="selectMonth('end', m)"
                >{{ m }}月</button>
              </div>
            </div>
          </div>
        </div>
        <button
          class="flex-shrink-0 px-3 py-1 rounded-lg border-none bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-[12px] font-semibold cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="loading"
          @click="load"
        >{{ loading ? '…' : '更新' }}</button>
      </div>
    </header>

    <!-- Modals -->
    <TaskSettingsModal
      v-model:show="showSettings"
      :profiles="profiles"
      :active-profile-id="activeProfileId"
      @save="handleSettingsSave"
    />
    <TaskModal
      v-model:show="showTaskModal"
      :boards="boards"
      :is-editing="isEditing"
      :modal-title="modalTitle"
      :initial-form="taskForm"
      :saving="saving"
      :error="error"
      @save="handleTaskSave"
      @delete="deleteTask"
    />
    <TaskDoneDateModal
      v-model:show="showPendingDone"
      v-model="pendingDueInput"
      :card-name="pendingDone?.card.name ?? ''"
      :saving="saving"
      @confirm="confirmMarkDone"
    />

    <!-- No credentials -->
    <div v-if="isMounted && !hasCredentials" class="flex flex-col items-center justify-center gap-3 min-h-[60vh] text-slate-500">
      <div class="text-5xl">🔑</div>
      <p class="m-0">APIキーが未設定です</p>
      <button class="px-4 py-2 rounded-lg border-none bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-[13px] font-semibold cursor-pointer" @click="openSettings">設定を開く</button>
    </div>

    <template v-else-if="isMounted">
      <!-- Error -->
      <div v-if="error && !showTaskModal" class="mx-5 my-3 px-3.5 py-2.5 bg-red-500/12 border border-red-500/30 rounded-lg text-red-300 text-[13px]">⚠ {{ error }}</div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="p-5 flex flex-col gap-8">
        <div v-for="i in 3" :key="i" class="flex flex-col gap-3">
          <div class="w-[120px] h-6 rounded-md bg-white/[0.06] animate-pulse" />
          <div class="flex gap-3">
            <div v-for="j in 4" :key="j" class="w-[200px] flex-shrink-0 flex flex-col gap-2">
              <div class="h-14 rounded-lg bg-white/[0.06] animate-pulse" />
              <div class="h-10 rounded-lg bg-white/[0.06] animate-pulse" />
              <div class="h-14 rounded-lg bg-white/[0.06] animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <template v-else>
        <!-- DOING (PC only) -->
        <section class="hidden md:block px-5 pt-5 mb-8">
          <div class="flex items-center gap-2.5 mb-3.5">
            <span class="inline-block px-3 py-0.5 rounded-full text-[11px] font-[800] tracking-[0.1em] bg-sky-400/15 text-white border border-sky-400/30">DOING</span>
            <span class="text-xl font-bold text-slate-600">{{ doingTotal }}</span>
          </div>
          <div class="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
            <div
              v-for="board in boards"
              :key="board.id"
              class="w-[220px] flex-shrink-0 rounded-xl p-3 border flex flex-col"
              :style="boardBorderStyle(board)"
            >
              <div class="text-[11px] font-bold uppercase tracking-[0.05em] mb-2.5" :style="{ color: boardColor(board) }">{{ board.name }}<span v-if="board.doing.length" class="ml-1 opacity-70">({{ board.doing.length }})</span></div>
              <ul class="list-none m-0 p-0 flex flex-col gap-1.5 max-h-[290px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
                <li
                  v-for="card in board.doing"
                  :key="card.id"
                  :class="[
                    'bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-2 flex flex-col gap-0.5 transition-all hover:bg-white/[0.07] cursor-grab select-none',
                    card.isOverdue ? 'border-red-500/40 bg-red-500/[0.06]' : '',
                    card.isUrgent ? 'border-amber-500/40 bg-amber-500/[0.06]' : '',
                    dragging?.cardId === card.id ? 'opacity-40' : '',
                    dragOverCardId === card.id ? 'border-t-2 border-t-sky-400' : '',
                  ]"
                  draggable="true"
                  @dragstart="onDragStart($event, card, board.id, 'doing')"
                  @dragend="onDragEnd"
                  @dragover="onDragOverCard($event, card.id)"
                  @drop.prevent="onDropCard(card.id, board.id, 'doing')"
                  @click="openEditTask(card, board.id, 'doing')"
                >
                  <div class="flex items-start gap-2">
                    <button
                      class="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-white/20 bg-white/[0.04] hover:border-emerald-400/60 hover:bg-emerald-400/10 transition-all cursor-pointer flex items-center justify-center"
                      title="DONEにする"
                      @click.stop="markDone(card, board)"
                    />
                    <div class="flex-1 min-w-0">
                      <span class="text-[13px] leading-snug text-white block">{{ card.name }}</span>
                      <span v-if="card.desc" class="text-[11px] text-slate-500 block mt-0.5 truncate">{{ card.desc }}</span>
                    </div>
                  </div>
                  <span v-if="card.display" :class="['text-[11px] ml-6', card.isOverdue ? 'text-red-500 font-semibold' : card.isUrgent ? 'text-amber-500 font-semibold' : 'text-slate-500']">{{ card.display }}</span>
                </li>
              </ul>
              <button
                :class="['mt-2 w-full py-1.5 rounded-lg border border-dashed text-[13px] cursor-pointer transition-all', dragOverEndKey === `${board.id}:doing` ? 'opacity-100 border-t-2 border-t-sky-400' : 'opacity-40 hover:opacity-80']"
                :style="{ borderColor: dragOverEndKey === `${board.id}:doing` ? undefined : boardColor(board), color: boardColor(board) }"
                @click="openAddTask(board.id, 'doing')"
                @dragover="onDragOverEnd($event, `${board.id}:doing`)"
                @drop.prevent="onDropEnd(board.id, 'doing')"
              >＋</button>
            </div>
          </div>
        </section>

        <!-- TODO (PC only) -->
        <section class="hidden md:block px-5 mb-8">
          <div class="flex items-center gap-2.5 mb-3.5">
            <span class="inline-block px-3 py-0.5 rounded-full text-[11px] font-[800] tracking-[0.1em] bg-amber-500/15 text-white border border-amber-500/30">TODO</span>
            <span class="text-xl font-bold text-slate-600">{{ todoTotal }}</span>
          </div>
          <div class="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
            <div
              v-for="board in boards"
              :key="board.id"
              class="w-[220px] flex-shrink-0 rounded-xl p-3 border flex flex-col"
              :style="boardBorderStyle(board)"
            >
              <div class="text-[11px] font-bold uppercase tracking-[0.05em] mb-2.5" :style="{ color: boardColor(board) }">{{ board.name }}<span v-if="board.todo.length" class="ml-1 opacity-70">({{ board.todo.length }})</span></div>
              <ul class="list-none m-0 p-0 flex flex-col gap-1.5 max-h-[290px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
                <li
                  v-for="card in board.todo"
                  :key="card.id"
                  :class="[
                    'bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-2 flex flex-col gap-0.5 transition-all hover:bg-white/[0.07] cursor-grab select-none',
                    card.isOverdue ? 'border-red-500/40 bg-red-500/[0.06]' : '',
                    card.isUrgent ? 'border-amber-500/40 bg-amber-500/[0.06]' : '',
                    dragging?.cardId === card.id ? 'opacity-40' : '',
                    dragOverCardId === card.id ? 'border-t-2 border-t-amber-400' : '',
                  ]"
                  draggable="true"
                  @dragstart="onDragStart($event, card, board.id, 'todo')"
                  @dragend="onDragEnd"
                  @dragover="onDragOverCard($event, card.id)"
                  @drop.prevent="onDropCard(card.id, board.id, 'todo')"
                  @click="openEditTask(card, board.id, 'todo')"
                >
                  <div class="flex items-start gap-2">
                    <button
                      class="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-white/20 bg-white/[0.04] hover:border-emerald-400/60 hover:bg-emerald-400/10 transition-all cursor-pointer flex items-center justify-center"
                      title="DONEにする"
                      @click.stop="markDone(card, board)"
                    />
                    <div class="flex-1 min-w-0">
                      <span class="text-[13px] leading-snug text-white block">{{ card.name }}</span>
                      <span v-if="card.desc" class="text-[11px] text-slate-500 block mt-0.5 truncate">{{ card.desc }}</span>
                    </div>
                  </div>
                  <span v-if="card.display" :class="['text-[11px] ml-6', card.isOverdue ? 'text-red-500 font-semibold' : card.isUrgent ? 'text-amber-500 font-semibold' : 'text-slate-500']">{{ card.display }}</span>
                </li>
              </ul>
              <button
                :class="['mt-2 w-full py-1.5 rounded-lg border border-dashed text-[13px] cursor-pointer transition-all', dragOverEndKey === `${board.id}:todo` ? 'opacity-100 border-t-2 border-t-amber-400' : 'opacity-40 hover:opacity-80']"
                :style="{ borderColor: dragOverEndKey === `${board.id}:todo` ? undefined : boardColor(board), color: boardColor(board) }"
                @click="openAddTask(board.id, 'todo')"
                @dragover="onDragOverEnd($event, `${board.id}:todo`)"
                @drop.prevent="onDropEnd(board.id, 'todo')"
              >＋</button>
            </div>
          </div>
        </section>

        <!-- DONE (PC only) -->
        <section class="hidden md:block px-5">
          <div class="flex items-center gap-2.5 mb-3.5">
            <span class="inline-block px-3 py-0.5 rounded-full text-[11px] font-[800] tracking-[0.1em] bg-emerald-500/15 text-white border border-emerald-500/30">DONE</span>
            <span class="text-xl font-bold text-slate-600">{{ boards.reduce((s, b) => s + doneTotal(b), 0) }}</span>
            <div class="ml-auto flex items-center gap-1">
              <button
                v-for="opt in doneViewOptions"
                :key="opt.key"
                :class="[
                  'px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer',
                  doneView === opt.key
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-white/[0.04] border-white/10 text-slate-500 hover:bg-white/[0.08] hover:text-slate-300',
                ]"
                @click="doneView = opt.key"
              >{{ opt.label }}</button>
            </div>
          </div>
          <div v-if="allDates.length === 0" class="px-4 py-4 text-slate-600 text-[13px]">期間内の完了タスクなし</div>
          <template v-else>
            <!-- Table -->
            <div v-if="doneView === 'table'" class="overflow-x-auto rounded-xl border border-white/[0.07]">
              <table class="border-collapse text-[13px] w-full table-fixed">
                <thead>
                  <tr>
                    <th class="border border-white/[0.06] pl-2.5 pr-1 py-2 text-left text-slate-500 text-[11px] font-bold whitespace-nowrap w-[72px] min-w-[72px] bg-emerald-500/[0.08]">日付</th>
                    <th v-for="board in boards" :key="board.id" class="border border-white/[0.06] px-2.5 py-2 text-left text-[11px] font-bold whitespace-nowrap" :style="{ backgroundColor: boardColor(board) + '1a', color: boardColor(board) }">
                      <span class="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" :style="{ backgroundColor: boardColor(board) }" />{{ board.name }}
                    </th>
                  </tr>
                  <tr>
                    <td class="border border-white/[0.06] pl-2.5 pr-1 py-2 text-slate-400 font-bold bg-white/[0.03]">合計</td>
                    <td v-for="board in boards" :key="board.id" class="border border-white/[0.06] px-2.5 py-2 text-slate-400 font-bold bg-white/[0.03]">{{ doneTotal(board) }}</td>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="date in allDates" :key="date">
                    <td class="border border-white/[0.06] pl-2.5 pr-1 py-2 whitespace-nowrap text-slate-500 text-xs w-[72px] min-w-[72px]">{{ formatDate(date) }}</td>
                    <td v-for="board in boards" :key="board.id" class="border border-white/[0.06] px-2.5 py-2 align-top">
                      <ul v-if="board.done[date]" class="list-none m-0 p-0 flex flex-col gap-1">
                        <li v-for="item in board.done[date]" :key="item.id" class="flex items-center gap-1.5 px-1.5 py-1 rounded bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer" @click="openEditDoneTask(item, date, board)">
                          <button
                            class="flex-shrink-0 w-3.5 h-3.5 rounded border border-white/40 bg-white/10 flex items-center justify-center text-white text-[10px] hover:bg-red-500/20 hover:border-red-400/60 hover:text-red-400 transition-all cursor-pointer"
                            title="DOINGに戻す"
                            @click.stop="unmarkDone(item, date, board)"
                          >✓</button>
                          <span class="leading-snug text-white text-[13px]">{{ item.name }}</span>
                        </li>
                      </ul>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- Chart -->
            <div v-else class="flex gap-4 items-start">
              <div ref="chartRef" class="flex-1 min-w-0 h-[480px] rounded-xl border border-white/[0.07]" style="cursor:pointer" />
              <transition name="slide-fade">
                <div v-if="selectedDate && (doneView === 'line' || doneView === 'stacked')" class="w-80 flex-none bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 self-stretch overflow-y-auto max-h-[480px]">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-[13px] font-bold text-white">{{ formatDate(selectedDate) }}</span>
                    <button class="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-300 text-xs cursor-pointer" @click="selectedDate = null">✕</button>
                  </div>
                  <template v-for="board in boards" :key="board.id">
                    <template v-if="board.done[selectedDate]?.length">
                      <p class="m-0 mb-1 text-[11px] font-bold uppercase tracking-wide" :style="{ color: boardColor(board) }">{{ board.name }}</p>
                      <ul class="list-none m-0 p-0 mb-1 flex flex-col gap-1">
                        <li v-for="item in board.done[selectedDate]" :key="item.id" class="flex items-center gap-1.5 px-1.5 py-0.5 rounded border-l-2 cursor-pointer hover:brightness-125" :style="{ backgroundColor: boardColor(board) + '14', borderColor: boardColor(board) + '60' }" @click="openEditDoneTask(item, selectedDate, board)">
                          <button class="flex-shrink-0 w-3.5 h-3.5 rounded border border-white/40 bg-white/10 flex items-center justify-center text-white text-[10px] hover:bg-red-500/20 hover:border-red-400/60 hover:text-red-400 transition-all cursor-pointer" title="DOINGに戻す" @click.stop="unmarkDone(item, selectedDate, board)">✓</button>
                          <span class="leading-snug text-white text-xs">{{ item.name }}</span>
                        </li>
                      </ul>
                    </template>
                  </template>
                </div>
              </transition>
            </div>
          </template>
        </section>

        <!-- 称賛フィードバック (PC only) -->
        <section class="hidden md:block px-5 mt-6">
          <div class="flex items-center gap-3 mb-3">
            <span class="text-[13px] font-bold text-slate-400">今週の称賛フィードバック</span>
            <span class="text-[11px] text-slate-600">直近7日 vs 2週間前の7日</span>
            <button
              class="ml-auto px-3.5 py-1.5 rounded-lg border-none bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-[12px] font-semibold cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:opacity-90 hover:enabled:-translate-y-px"
              :disabled="praiseLoading"
              @click="generatePraise"
            >{{ praiseLoading ? '生成中…' : 'AIに称賛してもらう' }}</button>
          </div>
          <div v-if="praiseError" class="px-3.5 py-2.5 bg-red-500/12 border border-red-500/30 rounded-lg text-red-300 text-[13px]">⚠ {{ praiseError }}</div>
          <div v-else-if="praiseLoading" class="h-[56px] rounded-xl bg-white/[0.04] border border-white/[0.07] animate-pulse" />
          <div v-else-if="praiseFeedback" class="px-4 py-3.5 bg-violet-500/[0.08] border border-violet-400/25 rounded-xl text-[14px] leading-relaxed text-slate-200 flex flex-col gap-1">
            <p v-for="(s, i) in praiseSentences" :key="i" class="m-0">{{ s }}</p>
          </div>
          <div v-else class="px-4 py-3 text-[13px] text-slate-600 bg-white/[0.02] border border-white/[0.06] rounded-xl">
            今週({{ thisWeekDoneFlat.length }}件) と2週間前の同期間({{ lastMonthWeekDoneFlat.length }}件) を比較して、AIが称賛コメントを生成します。
          </div>
        </section>

        <!-- DONE 期間比較 (PC only) -->
        <section class="hidden md:block px-5 mt-6 pb-8">
          <div class="flex items-center gap-2.5 mb-3.5">
            <span class="text-[13px] font-bold text-slate-400">前期間との比較</span>
            <div class="flex items-center gap-1 ml-2">
              <button
                v-for="p in ([7, 30, 90, 180] as const)"
                :key="p"
                :class="[
                  'px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer',
                  compPeriod === p
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-white/[0.04] border-white/10 text-slate-500 hover:bg-white/[0.08] hover:text-slate-300',
                ]"
                @click="compPeriod = p"
              >{{ p }}日</button>
            </div>
            <div class="ml-auto flex items-center gap-3 text-[13px]">
              <span class="text-slate-500">前期: <span class="font-bold text-slate-400">{{ compPeriodTotal.prev }}</span></span>
              <span :class="compPeriodTotal.current >= compPeriodTotal.prev ? 'text-emerald-400' : 'text-red-400'">
                今期: <span class="font-bold">{{ compPeriodTotal.current }}</span>
                <span v-if="compPeriodTotal.current > compPeriodTotal.prev"> ↑</span>
                <span v-else-if="compPeriodTotal.current < compPeriodTotal.prev"> ↓</span>
              </span>
            </div>
          </div>
          <div ref="compChartRef" class="h-[280px] rounded-xl border border-white/[0.07]" />
        </section>

        <!-- スマホ版レイアウト (md未満のみ表示) -->
        <div class="md:hidden px-2 pt-3 pb-8">
          <!-- ヘッダー: TODO/DOING 合計 -->
          <div class="mb-3 flex items-center gap-2">
            <span class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-[800] tracking-[0.1em] bg-amber-500/15 text-white border border-amber-500/30">TODO</span>
            <span class="text-slate-400 text-base font-bold">({{ todoTotal }})</span>
            <span class="mx-1 text-slate-700">/</span>
            <span class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-[800] tracking-[0.1em] bg-sky-400/15 text-white border border-sky-400/30">DOING</span>
            <span class="text-slate-400 text-base font-bold">({{ doingTotal }})</span>
          </div>

          <!-- ボードごとに TODO(左) DOING(右) -->
          <div v-for="board in boards" :key="board.id" class="mb-3">
            <div
              class="text-[13px] font-bold uppercase tracking-[0.05em] mb-1.5 px-1.5 py-1 rounded-lg border-l-4"
              :style="{ color: boardColor(board), borderColor: boardColor(board), backgroundColor: boardColor(board) + '12' }"
            >{{ board.name }}</div>
            <div class="grid grid-cols-2 gap-1.5">
              <!-- TODO (左) -->
              <div class="rounded-xl p-2 border flex flex-col" :style="boardBorderStyle(board)">
                <div class="text-[11px] font-bold mb-1 text-white/80">TODO<span v-if="board.todo.length" class="ml-1">({{ board.todo.length }})</span></div>
                <ul class="list-none m-0 p-0 flex flex-col gap-1 min-h-[28px] max-h-[240px] overflow-y-auto">
                  <li
                    v-for="card in board.todo"
                    :key="card.id"
                    :data-card-id="card.id"
                    :data-board-id="board.id"
                    data-status="todo"
                    :class="[
                      'bg-white/[0.04] border border-white/[0.07] rounded-lg px-2 py-1.5 flex items-start gap-1.5 cursor-grab active:bg-white/[0.07] select-none',
                      card.isOverdue ? 'border-red-500/40 bg-red-500/[0.06]' : '',
                      card.isUrgent ? 'border-amber-500/40 bg-amber-500/[0.06]' : '',
                      dragging?.cardId === card.id ? 'opacity-40' : '',
                      dragOverCardId === card.id ? 'border-t-2 border-t-amber-400' : '',
                    ]"
                    draggable="true"
                    @dragstart="onDragStart($event, card, board.id, 'todo')"
                    @dragend="onDragEnd"
                    @dragover="onDragOverCard($event, card.id)"
                    @drop.prevent="onDropCard(card.id, board.id, 'todo')"
                    @touchstart="onMobileTouchStart($event, card, board.id, 'todo')"
                    @click="openEditTask(card, board.id, 'todo')"
                  >
                    <button
                      data-no-drag="true"
                      class="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-white/20 bg-white/[0.04] hover:border-emerald-400/60 hover:bg-emerald-400/10 transition-all cursor-pointer flex items-center justify-center"
                      @click.stop="markDone(card, board)"
                    />
                    <span class="text-[14px] leading-snug text-white flex-1 min-w-0 break-words">{{ card.name }}</span>
                  </li>
                </ul>
                <button
                  :data-drop-end="`${board.id}:todo`"
                  :class="['mt-1.5 w-full py-1 rounded-lg border border-dashed text-[13px] cursor-pointer transition-all', dragOverEndKey === `${board.id}:todo` ? 'opacity-100 border-t-2 border-t-amber-400' : 'opacity-40 hover:opacity-80']"
                  :style="{ borderColor: dragOverEndKey === `${board.id}:todo` ? undefined : boardColor(board), color: boardColor(board) }"
                  @click="openAddTask(board.id, 'todo')"
                  @dragover="onDragOverEnd($event, `${board.id}:todo`)"
                  @drop.prevent="onDropEnd(board.id, 'todo')"
                >＋</button>
              </div>
              <!-- DOING (右) -->
              <div class="rounded-xl p-2 border flex flex-col" :style="boardBorderStyle(board)">
                <div class="text-[11px] font-bold mb-1 text-white/80">DOING<span v-if="board.doing.length" class="ml-1">({{ board.doing.length }})</span></div>
                <ul class="list-none m-0 p-0 flex flex-col gap-1 min-h-[28px] max-h-[240px] overflow-y-auto">
                  <li
                    v-for="card in board.doing"
                    :key="card.id"
                    :data-card-id="card.id"
                    :data-board-id="board.id"
                    data-status="doing"
                    :class="[
                      'bg-white/[0.04] border border-white/[0.07] rounded-lg px-2 py-1.5 flex items-start gap-1.5 cursor-grab active:bg-white/[0.07] select-none',
                      card.isOverdue ? 'border-red-500/40 bg-red-500/[0.06]' : '',
                      card.isUrgent ? 'border-amber-500/40 bg-amber-500/[0.06]' : '',
                      dragging?.cardId === card.id ? 'opacity-40' : '',
                      dragOverCardId === card.id ? 'border-t-2 border-t-sky-400' : '',
                    ]"
                    draggable="true"
                    @dragstart="onDragStart($event, card, board.id, 'doing')"
                    @dragend="onDragEnd"
                    @dragover="onDragOverCard($event, card.id)"
                    @drop.prevent="onDropCard(card.id, board.id, 'doing')"
                    @touchstart="onMobileTouchStart($event, card, board.id, 'doing')"
                    @click="openEditTask(card, board.id, 'doing')"
                  >
                    <button
                      data-no-drag="true"
                      class="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-white/20 bg-white/[0.04] hover:border-emerald-400/60 hover:bg-emerald-400/10 transition-all cursor-pointer flex items-center justify-center"
                      @click.stop="markDone(card, board)"
                    />
                    <span class="text-[14px] leading-snug text-white flex-1 min-w-0 break-words">{{ card.name }}</span>
                  </li>
                </ul>
                <button
                  :data-drop-end="`${board.id}:doing`"
                  :class="['mt-1.5 w-full py-1 rounded-lg border border-dashed text-[13px] cursor-pointer transition-all', dragOverEndKey === `${board.id}:doing` ? 'opacity-100 border-t-2 border-t-sky-400' : 'opacity-40 hover:opacity-80']"
                  :style="{ borderColor: dragOverEndKey === `${board.id}:doing` ? undefined : boardColor(board), color: boardColor(board) }"
                  @click="openAddTask(board.id, 'doing')"
                  @dragover="onDragOverEnd($event, `${board.id}:doing`)"
                  @drop.prevent="onDropEnd(board.id, 'doing')"
                >＋</button>
              </div>
            </div>
          </div>

          <!-- スマホ版 DONE -->
          <div class="mt-4 pt-4 border-t border-white/[0.06]">
            <div class="flex items-center gap-2 mb-3">
              <span class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-[800] tracking-[0.1em] bg-emerald-500/15 text-white border border-emerald-500/30">DONE</span>
              <span class="text-slate-400 text-base font-bold">({{ boards.reduce((s, b) => s + doneTotal(b), 0) }})</span>
            </div>
            <div class="flex gap-3">
              <!-- 左半分: 直近1週間のDONEリスト -->
              <div class="flex-1 min-w-0">
                <div class="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">直近7日</div>
                <div v-if="thisWeekDoneFlat.length === 0" class="text-[13px] text-slate-600 py-3 text-center">完了タスクなし</div>
                <ul v-else class="list-none m-0 p-0 flex flex-col gap-0.5">
                  <li
                    v-for="row in thisWeekDoneFlat"
                    :key="row.card.id"
                    class="flex items-center gap-1 px-1.5 py-1 rounded bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer"
                    @click="openEditDoneTask(row.card, row.date, row.board)"
                  >
                    <button
                      class="flex-shrink-0 w-3.5 h-3.5 rounded border border-white/40 bg-white/10 flex items-center justify-center text-white text-[10px] hover:bg-red-500/20 hover:border-red-400/60 hover:text-red-400 transition-all cursor-pointer"
                      title="DOINGに戻す"
                      @click.stop="unmarkDone(row.card, row.date, row.board)"
                    >✓</button>
                    <span class="text-[14px] leading-snug text-white truncate" :style="{ color: boardColor(row.board) + 'cc' }">{{ row.card.name }}</span>
                  </li>
                </ul>
              </div>
              <!-- 右半分: 今週 vs 先週比較 -->
              <div class="flex-1 min-w-0">
                <div class="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">今週 vs 先週</div>
                <table class="w-full border-collapse text-[14px]">
                  <thead>
                    <tr>
                      <th class="text-left py-1 px-1 text-slate-500 text-[14px] font-bold border-b border-white/[0.06]"></th>
                      <th class="text-right py-1 px-1 text-slate-500 text-[14px] font-bold border-b border-white/[0.06]">先週</th>
                      <th class="text-right py-1 px-1 text-emerald-500/70 text-[14px] font-bold border-b border-white/[0.06]">今週</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="border-b border-white/[0.05]">
                      <td class="py-1 px-1 text-slate-400 font-bold text-[14px]">合計</td>
                      <td class="py-1 px-1 text-right text-slate-500">{{ weekCompTotal.prevWeek }}</td>
                      <td
                        class="py-1 px-1 text-right font-bold"
                        :class="weekCompTotal.thisWeek > weekCompTotal.prevWeek ? 'text-emerald-400' : weekCompTotal.thisWeek < weekCompTotal.prevWeek ? 'text-red-400' : 'text-slate-400'"
                      >{{ weekCompTotal.thisWeek }}<span v-if="weekCompTotal.thisWeek > weekCompTotal.prevWeek">↑</span><span v-else-if="weekCompTotal.thisWeek < weekCompTotal.prevWeek">↓</span></td>
                    </tr>
                    <tr
                      v-for="(row, ri) in weekComparison"
                      :key="row.name"
                      class="border-b border-white/[0.03]"
                    >
                      <td class="py-1 px-1 text-[14px] truncate max-w-0 w-1/2" :style="{ color: BOARD_COLORS[ri % BOARD_COLORS.length] }">{{ row.name }}</td>
                      <td class="py-1 px-1 text-right text-slate-500">{{ row.prevWeek }}</td>
                      <td
                        class="py-1 px-1 text-right"
                        :class="row.thisWeek > row.prevWeek ? 'text-emerald-400' : row.thisWeek < row.prevWeek ? 'text-red-400' : 'text-slate-400'"
                      >{{ row.thisWeek }}<span v-if="row.thisWeek > row.prevWeek">↑</span><span v-else-if="row.thisWeek < row.prevWeek">↓</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- スマホ版 称賛フィードバック -->
          <div class="mt-4 pt-4 border-t border-white/[0.06]">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-[11px] font-bold text-slate-400">今週の称賛フィードバック</span>
              <button
                class="ml-auto px-3 py-1 rounded-lg border-none bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                :disabled="praiseLoading"
                @click="generatePraise"
              >{{ praiseLoading ? '…' : 'AIに称賛してもらう' }}</button>
            </div>
            <div v-if="praiseError" class="px-2.5 py-2 bg-red-500/12 border border-red-500/30 rounded-lg text-red-300 text-[12px]">⚠ {{ praiseError }}</div>
            <div v-else-if="praiseLoading" class="h-12 rounded-xl bg-white/[0.04] border border-white/[0.07] animate-pulse" />
            <div v-else-if="praiseFeedback" class="px-3 py-2.5 bg-violet-500/[0.08] border border-violet-400/25 rounded-xl text-[13px] leading-relaxed text-slate-200 flex flex-col gap-1">
              <p v-for="(s, i) in praiseSentences" :key="i" class="m-0">{{ s }}</p>
            </div>
            <div v-else class="text-[12px] text-slate-600">今週({{ thisWeekDoneFlat.length }}件) vs 2週間前({{ lastMonthWeekDoneFlat.length }}件)</div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.slide-fade-enter-active { transition: all 0.2s ease; }
.slide-fade-leave-active { transition: all 0.15s ease; }
.slide-fade-enter-from { opacity: 0; transform: translateX(12px); }
.slide-fade-leave-to { opacity: 0; transform: translateX(8px); }
</style>
