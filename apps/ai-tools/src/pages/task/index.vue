<script setup lang="ts">
definePageMeta({ alias: ['/task', '/task/'] })
import { ref, computed, watch, onMounted } from 'vue'

useHead({
  title: import.meta.dev ? 'タスクくん (dev)' : 'タスクくん',
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📋</text></svg>` },
    { rel: 'manifest', href: '/manifest-task.json' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
  ],
  meta: [
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-title', content: 'タスクくん' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'theme-color', content: '#10b981' },
  ],
})
import { useTaskProfiles } from '~/composables/task/useTaskProfiles'
import { useTaskBoards, BOARD_COLORS } from '~/composables/task/useTaskBoards'
import { useDragDrop } from '~/composables/task/useDragDrop'
import { useMonthPicker } from '~/composables/task/useMonthPicker'
import { useTaskStats } from '~/composables/task/useTaskStats'
import type { DoneView } from '~/composables/task/useTaskStats'

const route = useRoute()
const isMounted = ref(false)

const now = new Date()
const startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
const defaultStart = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`
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
  showBoardEditModal, boardEditForm,
  openEditBoard, saveBoardMeta,
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
  thisWeekDoneFlat, weekComparison, weekCompTotal,
} = useTaskStats(boards, allDates, route.query.view as DoneView)

// 全件表示
const showAll = ref(route.query.showAll !== '0')
watch(showAll, v => {
  const url = new URL(window.location.href)
  if (!v) url.searchParams.set('showAll', '0')
  else url.searchParams.delete('showAll')
  window.history.replaceState({}, '', url.toString())
})

const praiseDialog = ref(false)
const praiseDays = ref(3)
const praiseDaysOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 60, 180, 365]
const praiseChars = ref(500)
const praiseCharsOptions = [500, 1000, 1500, 2000]
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

const praisePeriodFlat = computed(() => {
  const keys = Array.from({ length: praiseDays.value }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return new Date(d.getTime() + 9 * 3_600_000).toISOString().slice(0, 10)
  })
  const items: { card: any; board: any; date: string }[] = []
  for (const date of keys) {
    for (const board of boards.value) {
      for (const card of board.done[date] ?? []) {
        items.push({ card, board, date })
      }
    }
  }
  return items
})

async function generatePraise() {
  praiseDialog.value = false
  praiseLoading.value = true
  praiseFeedback.value = ''
  praiseError.value = ''
  try {
    const res = await $fetch<{ feedback: string }>('/api/task/praise', {
      method: 'POST',
      body: {
        tasks: praisePeriodFlat.value.map(r => ({ board: r.board.name, task: r.card.name, date: r.date })),
        days: praiseDays.value,
        chars: praiseChars.value,
        boardContexts: boards.value
          .filter(b => b.desc)
          .map(b => ({ name: b.name, description: b.desc })),
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

  <!-- 称賛ダイアログ -->
  <div v-if="praiseDialog" class="fixed inset-0 z-[200] flex items-center justify-center">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="praiseDialog = false" />
    <div class="relative bg-[#1e293b] border border-white/[0.12] rounded-2xl p-5 w-[320px] shadow-2xl" @click.stop>
      <h3 class="text-[14px] font-semibold text-slate-200 mb-4">称賛の設定</h3>
      <div class="flex flex-col gap-3 mb-5">
        <div>
          <label class="block text-[11px] text-slate-500 mb-1.5">期間</label>
          <select
            v-model="praiseDays"
            class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-slate-200 cursor-pointer focus:outline-none focus:border-violet-400/50"
          >
            <option v-for="d in praiseDaysOptions" :key="d" :value="d" class="bg-[#1e293b] text-slate-200">{{ d }}日</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] text-slate-500 mb-1.5">文字数</label>
          <select
            v-model="praiseChars"
            class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-slate-200 cursor-pointer focus:outline-none focus:border-violet-400/50"
          >
            <option v-for="c in praiseCharsOptions" :key="c" :value="c" class="bg-[#1e293b] text-slate-200">{{ c }}文字</option>
          </select>
        </div>
      </div>
      <div class="flex justify-end gap-2">
        <button class="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 text-[12px] cursor-pointer hover:bg-white/[0.08]" @click="praiseDialog = false">キャンセル</button>
        <button class="px-4 py-1.5 rounded-lg border-none bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-[12px] font-semibold cursor-pointer hover:opacity-90" @click="generatePraise">生成</button>
      </div>
    </div>
  </div>

  <!-- ボード編集ダイアログ -->
  <div v-if="showBoardEditModal" class="fixed inset-0 z-[200] flex items-center justify-center">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showBoardEditModal = false" />
    <div class="relative bg-[#1e293b] border border-white/[0.12] rounded-2xl p-5 w-[360px] shadow-2xl" @click.stop>
      <h3 class="text-[14px] font-semibold text-slate-200 mb-4">ボードを編集</h3>
      <div class="flex flex-col gap-3 mb-5">
        <div>
          <label class="block text-[11px] text-slate-500 mb-1.5">ボード名</label>
          <input
            v-model="boardEditForm.name"
            type="text"
            class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-slate-200 focus:outline-none focus:border-sky-400/50"
          />
        </div>
        <div>
          <label class="block text-[11px] text-slate-500 mb-1.5">概要 <span class="text-slate-600">（AIによる称賛に反映されます）</span></label>
          <textarea
            v-model="boardEditForm.description"
            rows="4"
            class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-slate-200 resize-none focus:outline-none focus:border-sky-400/50 placeholder-slate-600"
            placeholder="このボードの目的・概要を入力..."
          />
        </div>
      </div>
      <div class="flex justify-end gap-2">
        <button class="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 text-[12px] cursor-pointer hover:bg-white/[0.08]" @click="showBoardEditModal = false">キャンセル</button>
        <button class="px-4 py-1.5 rounded-lg border-none bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-[12px] font-semibold cursor-pointer hover:opacity-90 disabled:opacity-50" :disabled="saving" @click="saveBoardMeta">{{ saving ? '保存中…' : '保存' }}</button>
      </div>
    </div>
  </div>

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
          <label class="flex items-center gap-1.5 text-[13px] text-slate-400 cursor-pointer select-none">
            <input type="checkbox" v-model="showAll" class="w-3.5 h-3.5 accent-sky-400 cursor-pointer" />
            全件表示
          </label>
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
        <label class="flex items-center gap-1 text-[12px] text-slate-400 cursor-pointer select-none flex-shrink-0">
          <input type="checkbox" v-model="showAll" class="w-3.5 h-3.5 accent-sky-400 cursor-pointer" />
          全件
        </label>
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
        <section class="hidden md:block px-5 pt-3 mb-8">
          <div class="flex items-center gap-2.5 mb-3.5">
            <span class="inline-block px-3 py-0.5 rounded-full text-[11px] font-[800] tracking-[0.1em] bg-sky-400/15 text-white border border-sky-400/30">DOING</span>
            <span class="text-xl font-bold text-slate-600">{{ doingTotal }}</span>
          </div>
          <div class="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
            <div
              v-for="board in boards"
              :key="board.id"
              class="group w-[220px] flex-shrink-0 rounded-xl p-3 border flex flex-col"
              :style="boardBorderStyle(board)"
            >
              <div class="flex items-center gap-1 mb-2.5">
                <span class="text-[11px] font-bold uppercase tracking-[0.05em]" :style="{ color: boardColor(board) }">{{ board.name }}<span v-if="board.doing.length" class="ml-1 opacity-70">({{ board.doing.length }})</span></span>
                <button class="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-slate-400 hover:text-slate-200 cursor-pointer" title="ボードを編集" @click.stop="openEditBoard(board)">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="10" height="10" fill="currentColor"><path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z"/></svg>
                </button>
              </div>
              <ul :class="['list-none m-0 p-0 flex flex-col gap-1.5', showAll ? '' : 'overflow-y-auto max-h-[300px]']">
                <li
                  v-for="card in board.doing"
                  :key="card.id"
                  :class="[
                    'bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-2 flex flex-col gap-0.5 transition-all hover:bg-white/[0.07] cursor-grab select-none',
                    card.isImportant && !card.isOverdue ? 'border-rose-400/60 bg-rose-400/[0.05] shadow-[inset_3px_0_0_rgba(251,113,133,0.7)]' : '',
                    card.isOverdue ? 'border-red-500/40 bg-red-500/[0.06]' : '',
                    card.isUrgent && !card.isOverdue ? 'border-amber-500/40 bg-amber-500/[0.06]' : '',
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
              class="group w-[220px] flex-shrink-0 rounded-xl p-3 border flex flex-col"
              :style="boardBorderStyle(board)"
            >
              <div class="flex items-center gap-1 mb-2.5">
                <span class="text-[11px] font-bold uppercase tracking-[0.05em]" :style="{ color: boardColor(board) }">{{ board.name }}<span v-if="board.todo.length" class="ml-1 opacity-70">({{ board.todo.length }})</span></span>
                <button class="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-slate-400 hover:text-slate-200 cursor-pointer" title="ボードを編集" @click.stop="openEditBoard(board)">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="10" height="10" fill="currentColor"><path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z"/></svg>
                </button>
              </div>
              <ul :class="['list-none m-0 p-0 flex flex-col gap-1.5', showAll ? '' : 'overflow-y-auto max-h-[300px]']">
                <li
                  v-for="card in board.todo"
                  :key="card.id"
                  :class="[
                    'bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-2 flex flex-col gap-0.5 transition-all hover:bg-white/[0.07] cursor-grab select-none',
                    card.isImportant && !card.isOverdue ? 'border-rose-400/60 bg-rose-400/[0.05] shadow-[inset_3px_0_0_rgba(251,113,133,0.7)]' : '',
                    card.isOverdue ? 'border-red-500/40 bg-red-500/[0.06]' : '',
                    card.isUrgent && !card.isOverdue ? 'border-amber-500/40 bg-amber-500/[0.06]' : '',
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

        <!-- 称賛フィードバック (PC only) -->
        <section class="hidden md:block px-5 pt-1.8">
          <div class="flex items-center gap-3 mb-1.5">
            <button
              class="px-3.5 py-1.5 rounded-lg border-none bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-[12px] font-semibold cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:opacity-90 hover:enabled:-translate-y-px"
              :disabled="praiseLoading"
              @click="praiseDialog = true"
            >{{ praiseLoading ? '生成中…' : 'AIに称賛してもらう' }}</button>
          </div>
          <div v-if="praiseError" class="px-3.5 py-2.5 bg-red-500/12 border border-red-500/30 rounded-lg text-red-300 text-[13px] mb-4">⚠ {{ praiseError }}</div>
          <div v-else-if="praiseLoading" class="h-[56px] rounded-xl bg-white/[0.04] border border-white/[0.07] animate-pulse mb-4" />
          <div v-else-if="praiseFeedback" class="px-4 py-3.5 bg-violet-500/[0.08] border border-violet-400/25 rounded-xl text-[14px] leading-relaxed text-slate-200 flex flex-col gap-1 mb-4">
            <p v-for="(s, i) in praiseSentences" :key="i" class="m-0">{{ s }}</p>
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
              class="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-[0.05em] mb-1.5 px-1.5 py-1 rounded-lg border-l-4"
              :style="{ color: boardColor(board), borderColor: boardColor(board), backgroundColor: boardColor(board) + '12' }"
            >
              <span class="flex-1 min-w-0">{{ board.name }}</span>
              <button class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded opacity-60 active:opacity-100 text-current cursor-pointer" title="ボードを編集" @click.stop="openEditBoard(board)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="11" height="11" fill="currentColor"><path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z"/></svg>
              </button>
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <!-- TODO (左) -->
              <div class="rounded-xl p-2 border flex flex-col" :style="boardBorderStyle(board)">
                <div class="text-[11px] font-bold mb-1 text-white/80">TODO<span v-if="board.todo.length" class="ml-1">({{ board.todo.length }})</span></div>
                <ul :class="['list-none m-0 p-0 flex flex-col gap-1 min-h-[28px]', showAll ? '' : 'overflow-y-auto max-h-[300px]']">
                  <li
                    v-for="card in board.todo"
                    :key="card.id"
                    :data-card-id="card.id"
                    :data-board-id="board.id"
                    data-status="todo"
                    :class="[
                      'bg-white/[0.04] border border-white/[0.07] rounded-lg px-2 py-1.5 flex items-start gap-1.5 cursor-grab active:bg-white/[0.07] select-none',
                      card.isImportant && !card.isOverdue ? 'border-rose-400/60 bg-rose-400/[0.05] shadow-[inset_3px_0_0_rgba(251,113,133,0.7)]' : '',
                      card.isOverdue ? 'border-red-500/40 bg-red-500/[0.06]' : '',
                      card.isUrgent && !card.isOverdue ? 'border-amber-500/40 bg-amber-500/[0.06]' : '',
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
                <ul :class="['list-none m-0 p-0 flex flex-col gap-1 min-h-[28px]', showAll ? '' : 'overflow-y-auto max-h-[300px]']">
                  <li
                    v-for="card in board.doing"
                    :key="card.id"
                    :data-card-id="card.id"
                    :data-board-id="board.id"
                    data-status="doing"
                    :class="[
                      'bg-white/[0.04] border border-white/[0.07] rounded-lg px-2 py-1.5 flex items-start gap-1.5 cursor-grab active:bg-white/[0.07] select-none',
                      card.isImportant && !card.isOverdue ? 'border-rose-400/60 bg-rose-400/[0.05] shadow-[inset_3px_0_0_rgba(251,113,133,0.7)]' : '',
                      card.isOverdue ? 'border-red-500/40 bg-red-500/[0.06]' : '',
                      card.isUrgent && !card.isOverdue ? 'border-amber-500/40 bg-amber-500/[0.06]' : '',
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

          <!-- スマホ版 称賛フィードバック -->
          <div class="mt-3 pt-3 border-t border-white/[0.06]">
            <div class="flex items-center gap-2 mb-2">
              <button
                class="px-3 py-1 rounded-lg border-none bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                :disabled="praiseLoading"
                @click="praiseDialog = true"
              >{{ praiseLoading ? '…' : 'AIに称賛してもらう' }}</button>
            </div>
            <div v-if="praiseError" class="px-2.5 py-2 bg-red-500/12 border border-red-500/30 rounded-lg text-red-300 text-[12px]">⚠ {{ praiseError }}</div>
            <div v-else-if="praiseLoading" class="h-12 rounded-xl bg-white/[0.04] border border-white/[0.07] animate-pulse" />
            <div v-else-if="praiseFeedback" class="px-3 py-2.5 bg-violet-500/[0.08] border border-violet-400/25 rounded-xl text-[13px] leading-relaxed text-slate-200 flex flex-col gap-1">
              <p v-for="(s, i) in praiseSentences" :key="i" class="m-0">{{ s }}</p>
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
