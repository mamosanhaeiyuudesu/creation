<script setup lang="ts">
definePageMeta({ alias: ['/task', '/task/'] })
import { ref, computed, watch, onMounted } from 'vue'

useHead({
  title: import.meta.dev ? 'タスクくん (dev)' : 'タスクくん',
  link: [
    { key: 'icon', rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📋</text></svg>` },
    { rel: 'manifest', href: '/manifest-task.json' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon-task.png' },
  ],
  meta: [
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-title', content: 'タスクくん' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'theme-color', content: '#10b981' },
  ],
})
import { useTaskProfiles } from '~/composables/task/useTaskProfiles'
import { useTaskBoards, parseTaskName } from '~/composables/task/useTaskBoards'
import type { Board, Card } from '~/composables/task/useTaskBoards'
import { useDragDrop } from '~/composables/task/useDragDrop'
import { useDatePicker } from '~/composables/task/useDatePicker'
import { useTaskSns, SNS_PLATFORMS } from '~/composables/task/useTaskSns'
import { useTaskGoal } from '~/composables/task/useTaskGoal'
import { useHistory } from '~/composables/useHistory'
import type { HistoryItem } from '~/types/history'

const route = useRoute()
const isMounted = ref(false)

const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => !import.meta.dev && !isLoggedIn.value && checked.value)
const showPasswordModal = ref(false)

const now = nowJST()
const defaultStartDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, now.getUTCDate()))
const defaultStart = `${defaultStartDate.getUTCFullYear()}-${String(defaultStartDate.getUTCMonth() + 1).padStart(2, '0')}-${String(defaultStartDate.getUTCDate()).padStart(2, '0')}`
const defaultEnd = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
const periodStart = ref((route.query.start as string) || defaultStart)
// end は空文字＝「指定なし（今週まで）」を明示的に表すため、クエリにキーがあれば空でもそのまま使う
const periodEnd = ref(route.query.end !== undefined ? (route.query.end as string) : defaultEnd)

// --- Composables ---
const {
  profiles, activeProfileId, apiKey, apiToken,
  excludedBoards, hasCredentials, showSettings,
  init, openSettings, applySettings, switchProfile: switchProfileFn,
} = useTaskProfiles()

const {
  boards, allDates, loading, saving, error,
  showBoardEditModal, boardEditTarget, boardEditForm,
  openEditBoard, saveBoardMeta,
  showTaskModal, editTarget, taskForm, isEditing, modalTitle,
  pendingDone, pendingDueInput,
  doingEffort, todoEffort,
  trelloPut,
  load: loadBoards, doneTotal, doneEffort, boardTodoEffort, boardColor, boardBorderStyle,
  markDone, confirmMarkDone, unmarkDone,
  openAddTask, openEditTask, openEditDoneTask, saveTask, deleteTask,
  moveBoardLeft, moveBoardRight,
} = useTaskBoards(apiKey, apiToken, excludedBoards, activeProfileId, periodStart, periodEnd)

const {
  dragging, dragOverCardId, dragOverEndKey,
  onDragStart, onDragEnd, onDragOverCard, onDragOverEnd, onDropCard, onDropEnd,
  onMobileTouchStart,
  draggingDone, dragOverDoneBoardId,
  onDragStartDone, onDragEndDone, onDragOverDoneBoard, onDropDoneBoard,
} = useDragDrop(boards, trelloPut, doingDueForGroup)

const {
  pickerOpen, showMobilePeriod,
  formatDateLabel, formatDateShort,
  toggleMobilePeriod, togglePicker,
  monthLabel, prevMonth, nextMonth, gridDays,
  selectDay, isSelectedDay, isTodayDay, clearEnd,
} = useDatePicker(periodStart, periodEnd)

// --- 投稿カウンター（Instagram / note）---
// タスクとは別軸の「出した数」の記録。表示期間には連動せず、全期間の累計をヘッダーに出す。
const {
  counts: snsCounts, totals: snsTotals,
  saving: snsSaving, error: snsError,
  load: loadSns, save: saveSns,
} = useTaskSns()
const showSnsModal = ref(false)

// --- 今週の目標 ---
const {
  goal: weeklyGoal, saving: goalSaving,
  load: loadGoal, save: saveGoal,
} = useTaskGoal()
const weeklyGoalInput = ref('')
watch(weeklyGoal, v => { weeklyGoalInput.value = v }, { immediate: true })
function commitWeeklyGoal() {
  if (weeklyGoalInput.value === weeklyGoal.value) return
  saveGoal(weeklyGoalInput.value)
}
// IME変換確定のEnterでもblurが走ると確定文字が二重入力されるため、変換中は無視する
function blurOnEnter(e: KeyboardEvent) {
  if (e.isComposing || e.keyCode === 229) return
  ;(e.target as HTMLInputElement).blur()
}

// 全件表示
const showAll = ref(route.query.showAll !== '0')
watch(showAll, v => {
  const url = new URL(window.location.href)
  if (!v) url.searchParams.set('showAll', '0')
  else url.searchParams.delete('showAll')
  window.history.replaceState({}, '', url.toString())
})

// --- Settings menu ---
const showSettingsMenu = ref(false)

function openSettingsMenu() { showSettingsMenu.value = !showSettingsMenu.value }
function closeSettingsMenu() { showSettingsMenu.value = false }

function escapeCsv(v: string): string {
  const s = v ?? ''
  return (s.includes(',') || s.includes('"') || s.includes('\n'))
    ? '"' + s.replace(/"/g, '""') + '"'
    : s
}

function downloadDone() {
  closeSettingsMenu()
  const rows: string[] = ['﻿完了日,ボード名,タスク名,概要']
  const allEntries: { date: string; boardName: string; name: string; desc: string }[] = []
  for (const board of boards.value) {
    for (const [date, cards] of Object.entries(board.done)) {
      for (const card of cards) {
        allEntries.push({ date, boardName: board.name, name: card.name, desc: card.desc ?? '' })
      }
    }
  }
  allEntries.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
  for (const r of allEntries) {
    rows.push([r.date, r.boardName, r.name, r.desc].map(escapeCsv).join(','))
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tasks-done-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// 月曜始まりの週でグルーピング（DONE欄をPC版で週ごとに縦積み表示するため）
function mondayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const diffFromMonday = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - diffFromMonday)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const doneWeekGroups = computed(() => {
  const map = new Map<string, string[]>()
  for (const date of allDates.value) {
    const monday = mondayOf(date)
    if (!map.has(monday)) map.set(monday, [])
    map.get(monday)!.push(date)
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
    .map(([monday, dates]) => ({
      monday,
      label: `${formatDateShort(monday)}(月)〜${formatDateShort(addDays(monday, 6))}(日)`,
      dates: [...dates].sort().reverse(),
    }))
})

function boardDoneFlatForDates(board: Board, dates: string[]) {
  return dates.flatMap(date => (board.done[date] ?? []).map(item => ({ item, date })))
}

// スマホ版DONE列は直近の週（doneWeekGroupsの先頭）のみ表示
const mobileDoneDates = computed(() => doneWeekGroups.value[0]?.dates ?? [])

function weekBoardEffort(board: Board, dates: string[]) {
  return dates.reduce((s, date) => s + (board.done[date] ?? []).reduce((a, c) => a + parseTaskName(c.name).effort, 0), 0)
}

function weekBoardTotal(board: Board, dates: string[]) {
  return dates.reduce((s, date) => s + (board.done[date] ?? []).length, 0)
}

function weekTotalEffort(dates: string[]) {
  return boards.value.reduce((s, board) => s + weekBoardEffort(board, dates), 0)
}

function firstThreeBoardsEffort(dates: string[]) {
  return boards.value.slice(0, 3).reduce((s, board) => s + weekBoardEffort(board, dates), 0)
}

// 週次DONE推移チャート用データ（古い週→新しい週の時系列順）
const doneChartData = computed(() => {
  const weeksAsc = [...doneWeekGroups.value].reverse()
  return {
    weekLabels: weeksAsc.map(w => w.label),
    axisLabels: weeksAsc.map(w => formatDateShort(w.monday)),
    series: boards.value.map(board => ({
      name: board.name,
      color: boardColor(board),
      data: weeksAsc.map(w => weekBoardEffort(board, w.dates)),
    })),
    firstThreeEffort: weeksAsc.map(w => firstThreeBoardsEffort(w.dates)),
  }
})

// 期限がその日のTODO/DOINGカード（未完了ぶん）。進捗の分母と日別一覧の両方でこれを使う
function pendingCardsForDate(date: string) {
  const rows: { board: Board; card: Card; status: 'doing' | 'todo' }[] = []
  for (const board of boards.value) {
    for (const status of ['doing', 'todo'] as const) {
      for (const card of board[status]) {
        if (!card.due) continue
        if (toJSTDate(card.due).toISOString().slice(0, 10) === date) rows.push({ board, card, status })
      }
    }
  }
  return rows
}

// 指定日付群のうち、期限がその日付群に入っているTODO/DOINGカードの工数合計
function pendingHoursForDates(dates: string[]) {
  return dates.reduce((sum, date) => sum + pendingCardsForDate(date).reduce((s, r) => s + r.card.effort, 0), 0)
}

// 今週（月曜始まり）の進捗（ヘッダー表示用）: 分母=期限が今週のタスク工数、分子=そのうち完了済み
const thisWeekDates = computed(() => {
  const monday = mondayOf(todayJST())
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
})

const thisWeekDoneHours = computed(() => weekTotalEffort(thisWeekDates.value))

const thisWeekPlannedHours = computed(() => thisWeekDoneHours.value + pendingHoursForDates(thisWeekDates.value))

const thisWeekPercent = computed(() => {
  if (thisWeekPlannedHours.value <= 0) return 0
  return Math.round((thisWeekDoneHours.value / thisWeekPlannedHours.value) * 100)
})

// 今日・明日の進捗: 分母=期限がその日のタスク工数、分子=そのうち完了済み
const todayDateKey = computed(() => todayJST())
const tomorrowDateKey = computed(() => addDays(todayJST(), 1))

const todayDoneHours = computed(() => weekTotalEffort([todayDateKey.value]))
const todayPlannedHours = computed(() => todayDoneHours.value + pendingHoursForDates([todayDateKey.value]))
const todayPercent = computed(() => {
  if (todayPlannedHours.value <= 0) return 0
  return Math.round((todayDoneHours.value / todayPlannedHours.value) * 100)
})

const tomorrowDoneHours = computed(() => weekTotalEffort([tomorrowDateKey.value]))
const tomorrowPlannedHours = computed(() => tomorrowDoneHours.value + pendingHoursForDates([tomorrowDateKey.value]))
const tomorrowPercent = computed(() => {
  if (tomorrowPlannedHours.value <= 0) return 0
  return Math.round((tomorrowDoneHours.value / tomorrowPlannedHours.value) * 100)
})

// 今週の月曜日から今日までの経過日数（月曜=1日目）で割った1日あたりの平均完了工数
const thisWeekDailyAvgHours = computed(() => {
  const daysElapsed = ((nowJST().getUTCDay() + 6) % 7) + 1
  return Math.round((thisWeekDoneHours.value / daysElapsed) * 10) / 10
})

// 今週の各日の完了工数の推移（棒グラフ用）
const thisWeekDailyBars = computed(() => {
  const hours = thisWeekDates.value.map(d => weekTotalEffort([d]))
  const max = Math.max(...hours, 1)
  return thisWeekDates.value.map((date, i) => ({
    date,
    hours: hours[i],
    heightPct: Math.round((hours[i] / max) * 100),
    first3Pct: Math.round((firstThreeBoardsEffort([date]) / max) * 100),
  }))
})

// --- DOING の内訳（今日やること / 今週中にやること） ---
// 期限が今日以前（超過ぶんを含む）＝「今日やること」、それ以外（期限が明日以降・期限なし）＝「今週中にやること」。
// 振り分けは期限だけで決まるので、グループをまたぐドラッグでは移らない（期限を変えると移る）。
function isDoingToday(card: Card): boolean {
  return !!card.due && toJSTDate(card.due).toISOString().slice(0, 10) <= todayDateKey.value
}

// 欄をまたいでドラッグされたときに必要な期限（変更不要なら null）。
// 見た目の位置に合わせて期限のほうを書き換えることで、落とした欄にそのまま残るようにする。
function doingDueForGroup(card: Card, key: 'today' | 'week'): string | null {
  const isToday = isDoingToday(card)
  if (key === 'today') return isToday ? null : jstDueEndOfDay(todayDateKey.value)
  if (!isToday) return null
  // 「今週中」は今日より後。日曜に操作したときは今週の残りがないので明日にずらす
  const sunday = addDays(mondayOf(todayJST()), 6)
  return jstDueEndOfDay(sunday > todayDateKey.value ? sunday : addDays(todayDateKey.value, 1))
}

/** 'YYYY-MM-DD' → その日のJST 23:59 を表すISO文字列（期限の振り分けはJSTの日付で行うため） */
function jstDueEndOfDay(date: string): string {
  return new Date(`${date}T23:59:00+09:00`).toISOString()
}

function boardDoingCards(board: Board, key: 'today' | 'week'): Card[] {
  return board.doing.filter(c => (key === 'today' ? isDoingToday(c) : !isDoingToday(c)))
}

function cardsEffort(cards: Card[]): number {
  return cards.reduce((s, c) => s + c.effort, 0)
}

function doingGroupEffort(board: Board, key: 'today' | 'week'): number {
  return cardsEffort(boardDoingCards(board, key))
}

// short はスマホ版の列見出し用（幅が狭いので短縮形）
const doingGroupDefs = [
  { key: 'today', label: '今日やること', short: '今日', badgeClass: 'bg-sky-400/20 text-sky-100 border-sky-400/40' },
  { key: 'week', label: '今週中にやること', short: '今週中', badgeClass: 'bg-white/[0.06] text-slate-300 border-white/15' },
] as const

const doingGroups = computed(() => doingGroupDefs.map((def) => {
  const columns = boards.value.map((board) => {
    const cards = boardDoingCards(board, def.key)
    return { board, cards, effort: cardsEffort(cards) }
  })
  return {
    ...def,
    columns,
    effort: columns.reduce((s, c) => s + c.effort, 0),
    // 「今日やること」欄の＋で追加したタスクがその欄に出るよう、期限を今日で埋めておく
    newDue: def.key === 'today' ? `${todayDateKey.value}T23:59` : '',
  }
}))

// --- スマホ版: ボードごとの横スクロール（TODO / DOING×2 / DONE）を全ボードで揃える ---
// 1つのボードをずらしてDONEを出したら、他のボードも同じ列が見えている状態にする。
// 追従側は snap が効いていると途中の位置で勝手に吸着してガタつくので、同期中だけ snap を切る。
const mobileBoardsRoot = ref<HTMLElement | null>(null)
let stripSyncSource: HTMLElement | null = null
let stripSyncTimer: ReturnType<typeof setTimeout> | null = null

function onStripScroll(e: Event) {
  const source = e.currentTarget as HTMLElement
  // 追従側の scrollLeft 代入で発火した scroll は無視する（同期の往復を防ぐ）
  if (stripSyncSource && stripSyncSource !== source) return

  const all = mobileBoardsRoot.value?.querySelectorAll<HTMLElement>('[data-board-strip]')
  const others = all ? [...all].filter(el => el !== source) : []
  if (stripSyncSource !== source) {
    stripSyncSource = source
    for (const el of others) el.style.scrollSnapType = 'none'
  }
  for (const el of others) el.scrollLeft = source.scrollLeft

  // 指を離してソースが吸着し終わってから、その位置で確定させて snap を戻す
  if (stripSyncTimer) clearTimeout(stripSyncTimer)
  stripSyncTimer = setTimeout(() => {
    stripSyncTimer = null
    for (const el of others) {
      el.scrollLeft = source.scrollLeft
      el.style.scrollSnapType = ''
    }
    requestAnimationFrame(() => { stripSyncSource = null })
  }, 160)
}

// --- DONE推移グラフ（週ごと／累積の切替・クリックで拡大） ---
const doneChartCumulative = ref(false)
const showChartModal = ref(false)
const chartModalHeight = ref(420)

function openChartModal() {
  chartModalHeight.value = Math.max(260, Math.min(560, Math.round(window.innerHeight * 0.6)))
  showChartModal.value = true
}

// --- ある1日の一覧（DOING / DONE）ポップアップ ---
// スマホ版の今日／明日カードと、今週の日別棒グラフ（PC・スマホ）から開く。
// 日付を入れると開く（'YYYY-MM-DD'）。null で閉じる。
const dayDetail = ref<string | null>(null)
const dayDetailDate = computed(() => dayDetail.value ?? todayDateKey.value)
const dayDetailPending = computed(() => pendingCardsForDate(dayDetailDate.value))
const dayDetailDone = computed(() =>
  boards.value.flatMap(board => (board.done[dayDetailDate.value] ?? []).map(item => ({ board, item })))
)
const dayDetailDoneHours = computed(() => weekTotalEffort([dayDetailDate.value]))
const dayDetailPlannedHours = computed(() => dayDetailDoneHours.value + pendingHoursForDates([dayDetailDate.value]))
const dayDetailPercent = computed(() => {
  if (dayDetailPlannedHours.value <= 0) return 0
  return Math.round((dayDetailDoneHours.value / dayDetailPlannedHours.value) * 100)
})
// 今日・明日は日付より呼び名のほうが分かりやすいので、そのときだけ見出しに使う
const dayDetailLabel = computed(() => {
  if (dayDetailDate.value === todayDateKey.value) return '今日'
  if (dayDetailDate.value === tomorrowDateKey.value) return '明日'
  return null
})

// 矢印で1日ずつ前後に動かす。DONEは表示期間ぶんしか読み込んでいないので期間の外へは出さない
// （出られると「完了タスクなし」が本当に無いのか未読み込みなのか分からなくなるため）。
const dayDetailMin = computed(() => periodStart.value)
const dayDetailMax = computed(() => {
  // 終了日未指定は「今週いっぱい」（useTaskBoards の periodRange と同じ扱い）。
  // 「明日」はヘッダーから直接開けるので、期間が今日までのときも矢印で行けるようにしておく
  const periodMax = periodEnd.value || addDays(mondayOf(todayJST()), 6)
  return periodMax > tomorrowDateKey.value ? periodMax : tomorrowDateKey.value
})
const dayDetailPrev = computed(() => {
  const prev = addDays(dayDetailDate.value, -1)
  return prev >= dayDetailMin.value ? prev : null
})
const dayDetailNext = computed(() => {
  const next = addDays(dayDetailDate.value, 1)
  return next <= dayDetailMax.value ? next : null
})

function openDayTask(row: { board: Board; card: Card; status: 'doing' | 'todo' }) {
  openEditTask(row.card, row.board.id, row.status)
}

// --- 振り返り（期間内のDONEタスクから「どのボードに時間を使ったか」をAIがフィードバック） ---
// 既定は今日が含まれる週（月〜日）。カレンダーで任意の期間に変えられる。
const reviewDialog = ref(false)
const reviewStart = ref(mondayOf(todayJST()))
const reviewEnd = ref(addDays(mondayOf(todayJST()), 6))
const reviewChars = ref(1000)
const reviewCharsOptions = [1000, 2000]
const reviewFeedback = ref('')
const reviewLoading = ref(false)
const reviewError = ref('')

const { history: reviewHistory, addHistory: addReviewHistory } = useHistory('task-review-history', 'task/review')
const showReviewResult = ref(false)
const showReviewHistory = ref(false)
const selectedReviewItem = ref<HistoryItem | null>(null)

const reviewDates = computed(() => {
  const start = reviewStart.value
  const end = reviewEnd.value
  if (!start || !end || end < start) return []
  const dates: string[] = []
  for (let d = start; d <= end && dates.length < 400; d = addDays(d, 1)) dates.push(d)
  return dates
})

// 集計元は読み込み済みのDONEデータ。ヘッダーの表示期間の外を選ぶと0件になるので、件数を出して気づけるようにする。
const reviewTasks = computed(() =>
  reviewDates.value.flatMap(date =>
    boards.value.flatMap(board =>
      (board.done[date] ?? []).map((card) => {
        const { displayName, effort } = parseTaskName(card.name)
        return { board: board.name, task: displayName, date, effort }
      })
    )
  )
)

// 0時間のボードも「その週は手が回らなかった」という事実なので落とさずに渡す
const reviewBoards = computed(() =>
  boards.value.map(board => ({
    name: board.name,
    desc: board.desc ?? '',
    hours: weekBoardEffort(board, reviewDates.value),
    count: weekBoardTotal(board, reviewDates.value),
  }))
)

const reviewTotalHours = computed(() => reviewBoards.value.reduce((s, b) => s + b.hours, 0))

function resetReviewToThisWeek() {
  const monday = mondayOf(todayJST())
  reviewStart.value = monday
  reviewEnd.value = addDays(monday, 6)
}

async function generateReview() {
  reviewDialog.value = false
  showReviewResult.value = true
  reviewLoading.value = true
  reviewFeedback.value = ''
  reviewError.value = ''
  try {
    const res = await $fetch<{ feedback: string }>('/api/task/review', {
      method: 'POST',
      body: {
        start: reviewStart.value,
        end: reviewEnd.value,
        chars: reviewChars.value,
        boards: reviewBoards.value,
        tasks: reviewTasks.value,
      },
    })
    reviewFeedback.value = res.feedback
    addReviewHistory(res.feedback, `${reviewStart.value}〜${reviewEnd.value}`)
  } catch (e: any) {
    reviewError.value = e?.data?.statusMessage || 'エラーが発生しました'
  } finally {
    reviewLoading.value = false
  }
}

// --- Page-level orchestration ---
function syncUrl() {
  const url = new URL(window.location.href)
  url.searchParams.set('start', periodStart.value)
  url.searchParams.set('end', periodEnd.value)
  url.searchParams.set('profile', activeProfileId.value)
  window.history.replaceState({}, '', url.toString())
}

async function load() {
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

const boardEditIndex = computed(() => {
  const target = boardEditTarget.value
  return target ? boards.value.findIndex(b => b.id === target.id) : -1
})

onMounted(async () => {
  await checkAuth()
  if (!isLoggedIn.value) return
  await init(route.query.profile as string | undefined)
  isMounted.value = true
  loadSns()
  loadGoal()
  if (hasCredentials.value) load()
  else openSettings()
})

watch(isLoggedIn, async (v) => {
  if (!v || isMounted.value) return
  await init(route.query.profile as string | undefined)
  isMounted.value = true
  loadSns()
  loadGoal()
  if (hasCredentials.value) load()
  else openSettings()
})
</script>

<template>
  <!-- 認証モーダル -->
  <AuthModal v-if="showAuthModal" accent="sky" />

  <!-- パスワード変更 -->
  <PasswordModal v-model:show="showPasswordModal" accent="sky" />

  <!-- Backdrop (month picker / settings menu) -->
  <div v-if="pickerOpen || showMobilePeriod || showSettingsMenu" class="fixed inset-0 z-40" @click="pickerOpen = null; showMobilePeriod = false; showSettingsMenu = false" />

  <!-- 振り返りダイアログ -->
  <div v-if="reviewDialog" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="reviewDialog = false" />
    <div class="relative bg-[#1e293b] border border-white/[0.12] rounded-2xl p-5 w-[340px] max-h-[calc(100vh-2rem)] overflow-y-auto shadow-2xl" @click.stop>
      <h3 class="text-[14px] font-semibold text-slate-200 mb-4">振り返りの設定</h3>
      <div class="flex flex-col gap-3 mb-5">
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-[11px] text-slate-500">期間</label>
            <button
              type="button"
              class="px-2 py-0.5 rounded-md border border-white/10 bg-white/[0.06] text-slate-400 text-[10px] cursor-pointer hover:bg-white/[0.12] hover:text-slate-200 transition-colors"
              @click="resetReviewToThisWeek"
            >今週</button>
          </div>
          <TaskRangeCalendar v-model:start="reviewStart" v-model:end="reviewEnd" />
          <div class="mt-2 text-[11px] text-slate-500">
            {{ reviewStart }} 〜 {{ reviewEnd }}
            <span class="text-slate-600">／ 完了 {{ reviewTasks.length }}件・{{ Math.round(reviewTotalHours * 10) / 10 }}時間</span>
          </div>
          <div v-if="reviewTasks.length === 0" class="mt-1 text-[11px] text-amber-400/80">
            この期間の完了タスクがありません（ヘッダーの表示期間の外は集計できません）
          </div>
        </div>
        <div>
          <label class="block text-[11px] text-slate-500 mb-1.5">文字数</label>
          <select
            v-model="reviewChars"
            class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-slate-200 cursor-pointer focus:outline-none focus:border-violet-400/50"
          >
            <option v-for="c in reviewCharsOptions" :key="c" :value="c" class="bg-[#1e293b] text-slate-200">{{ c }}文字</option>
          </select>
        </div>
      </div>
      <div class="flex justify-end gap-2">
        <button class="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 text-[12px] cursor-pointer hover:bg-white/[0.08]" @click="reviewDialog = false">キャンセル</button>
        <button class="px-4 py-1.5 rounded-lg border-none bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-[12px] font-semibold cursor-pointer hover:opacity-90" @click="generateReview">生成</button>
      </div>
    </div>
  </div>

  <!-- 振り返り結果ポップアップ -->
  <div v-if="showReviewResult" class="fixed inset-0 z-[200] flex items-center justify-center">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showReviewResult = false" />
    <div class="relative bg-[#1e293b] border border-white/[0.12] rounded-2xl shadow-2xl w-[560px] max-w-[calc(100vw-2rem)] max-h-[80vh] flex flex-col" @click.stop>
      <div class="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] flex-shrink-0">
        <h3 class="text-[14px] font-semibold text-slate-200 m-0">振り返り <span class="text-[11px] font-normal text-slate-500 ml-1">{{ reviewStart }}〜{{ reviewEnd }}</span></h3>
        <button class="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-300 text-xs cursor-pointer rounded hover:bg-white/[0.08]" @click="showReviewResult = false">✕</button>
      </div>
      <div class="overflow-y-auto flex-1 px-5 py-4">
        <div v-if="reviewLoading" class="flex flex-col gap-3">
          <div class="h-4 rounded bg-white/[0.06] animate-pulse w-full" />
          <div class="h-4 rounded bg-white/[0.06] animate-pulse w-4/5" />
          <div class="h-4 rounded bg-white/[0.06] animate-pulse w-full" />
          <div class="h-4 rounded bg-white/[0.06] animate-pulse w-3/4" />
          <div class="h-4 rounded bg-white/[0.06] animate-pulse w-full" />
          <div class="h-4 rounded bg-white/[0.06] animate-pulse w-3/5" />
        </div>
        <div v-else-if="reviewError" class="px-3.5 py-2.5 bg-red-500/12 border border-red-500/30 rounded-lg text-red-300 text-[13px]">⚠ {{ reviewError }}</div>
        <p v-else-if="reviewFeedback" class="m-0 text-[14px] leading-relaxed text-slate-200 whitespace-pre-wrap">{{ reviewFeedback }}</p>
      </div>
    </div>
  </div>

  <!-- 振り返り履歴モーダル -->
  <div v-if="showReviewHistory" class="fixed inset-0 z-[200] flex items-center justify-center">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showReviewHistory = false; selectedReviewItem = null" />
    <div class="relative bg-[#1e293b] border border-white/[0.12] rounded-2xl shadow-2xl w-[480px] max-w-[calc(100vw-2rem)] max-h-[80vh] flex flex-col" @click.stop>
      <div class="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] flex-shrink-0">
        <div class="flex items-center gap-2">
          <button v-if="selectedReviewItem" class="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-200 text-base cursor-pointer hover:bg-white/[0.08]" @click="selectedReviewItem = null">‹</button>
          <h3 class="text-[14px] font-semibold text-slate-200 m-0">{{ selectedReviewItem ? selectedReviewItem.title : '振り返り履歴' }}</h3>
        </div>
        <button class="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-300 text-xs cursor-pointer rounded hover:bg-white/[0.08]" @click="showReviewHistory = false; selectedReviewItem = null">✕</button>
      </div>
      <div class="overflow-y-auto flex-1 p-4">
        <template v-if="!selectedReviewItem">
          <div v-if="reviewHistory.length === 0" class="text-center py-10 text-slate-600 text-[13px]">履歴がありません</div>
          <ul v-else class="list-none m-0 p-0 flex flex-col gap-2">
            <li
              v-for="item in reviewHistory"
              :key="item.id"
              class="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 cursor-pointer hover:bg-white/[0.07] transition-colors"
              @click="selectedReviewItem = item"
            >
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-[13px] font-semibold text-slate-200">{{ item.title }}</span>
                <span class="text-[11px] text-slate-600 flex-shrink-0 ml-2">{{ item.timestamp.slice(0, 10) }}</span>
              </div>
              <p class="m-0 text-[12px] text-slate-500 leading-relaxed overflow-hidden" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">{{ item.text }}</p>
            </li>
          </ul>
        </template>
        <template v-else>
          <div class="text-[11px] text-slate-600 mb-3">{{ selectedReviewItem.timestamp.slice(0, 16).replace('T', ' ') }}</div>
          <p class="m-0 px-4 py-3.5 bg-violet-500/[0.08] border border-violet-400/25 rounded-xl text-[14px] leading-relaxed text-slate-200 whitespace-pre-wrap">{{ selectedReviewItem.text }}</p>
        </template>
      </div>
    </div>
  </div>

  <!-- DONE推移グラフ 拡大ポップアップ -->
  <div v-if="showChartModal" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="showChartModal = false" />
    <div class="relative bg-[#1e293b] border border-white/[0.12] rounded-2xl shadow-2xl w-[min(1100px,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] flex flex-col" @click.stop>
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-white/[0.08] flex-shrink-0">
        <h3 class="text-[14px] font-semibold text-slate-200 m-0">{{ doneChartCumulative ? '完了工数の累積推移' : '週ごとの完了工数' }}</h3>
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-1.5 text-[12px] text-slate-400 cursor-pointer select-none">
            <input v-model="doneChartCumulative" type="checkbox" class="w-3.5 h-3.5 accent-emerald-400 cursor-pointer" />
            累積推移
          </label>
          <button class="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-300 text-xs cursor-pointer rounded hover:bg-white/[0.08]" @click="showChartModal = false">✕</button>
        </div>
      </div>
      <div class="p-4 overflow-y-auto">
        <TaskDoneWeeklyChart
          v-if="doneChartData.weekLabels.length"
          :data="doneChartData"
          :cumulative="doneChartCumulative"
          :height="chartModalHeight"
        />
        <div v-else class="py-12 text-center text-slate-600 text-[13px]">表示できるデータがありません</div>
      </div>
    </div>
  </div>

  <!-- 投稿カウンター（Instagram / note）の入力カレンダー -->
  <TaskSnsModal
    v-if="showSnsModal"
    :counts="snsCounts"
    :totals="snsTotals"
    :saving="snsSaving"
    :error="snsError"
    @close="showSnsModal = false"
    @save="saveSns"
  />

  <!-- ある1日の一覧ポップアップ（スマホ版の今日／明日カード・今週の日別棒グラフから開く） -->
  <div v-if="dayDetail" class="fixed inset-0 z-[200] flex items-end md:items-center justify-center">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="dayDetail = null" />
    <!-- 高さは中身に関わらず固定。可変にすると日を送るたびにパネルの上端＝矢印の位置が動いて連打できない -->
    <div class="relative w-full md:w-[520px] bg-[#1e293b] border border-white/[0.12] rounded-t-2xl md:rounded-2xl shadow-2xl h-[86vh] flex flex-col" @click.stop>
      <div class="flex items-center gap-2 px-4 py-3 border-b border-white/[0.08] flex-shrink-0">
        <button
          class="w-7 h-7 -my-0.5 flex-shrink-0 flex items-center justify-center text-slate-400 text-[15px] rounded transition-colors enabled:hover:text-slate-200 enabled:hover:bg-white/[0.08] enabled:cursor-pointer disabled:opacity-25 disabled:cursor-default"
          :disabled="!dayDetailPrev"
          :title="dayDetailPrev ? `前の日（${mdWeekday(dayDetailPrev)}）` : '表示期間の先頭です'"
          @click="dayDetail = dayDetailPrev"
        >‹</button>
        <div class="flex items-baseline gap-2 min-w-0 flex-1">
          <h3 class="text-[14px] font-semibold text-slate-200 m-0 flex-shrink-0">{{ dayDetailLabel ?? mdWeekday(dayDetailDate) }}</h3>
          <span v-if="dayDetailLabel" class="text-[11px] text-slate-500 truncate">{{ mdWeekday(dayDetailDate) }}</span>
          <span class="text-[11px] text-slate-500 flex-shrink-0">{{ dayDetailDoneHours }}h / {{ dayDetailPlannedHours }}h（{{ dayDetailPercent }}%）</span>
        </div>
        <button
          class="w-7 h-7 -my-0.5 flex-shrink-0 flex items-center justify-center text-slate-400 text-[15px] rounded transition-colors enabled:hover:text-slate-200 enabled:hover:bg-white/[0.08] enabled:cursor-pointer disabled:opacity-25 disabled:cursor-default"
          :disabled="!dayDetailNext"
          :title="dayDetailNext ? `次の日（${mdWeekday(dayDetailNext)}）` : '表示期間の末尾です'"
          @click="dayDetail = dayDetailNext"
        >›</button>
        <button class="w-6 h-6 flex-shrink-0 flex items-center justify-center text-slate-500 hover:text-slate-300 text-xs cursor-pointer rounded hover:bg-white/[0.08]" @click="dayDetail = null">✕</button>
      </div>
      <div class="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-4">
        <!-- DOING（期限がその日の未完了） -->
        <div>
          <div class="flex items-baseline gap-2 mb-1.5">
            <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-[800] tracking-[0.1em] bg-sky-400/15 text-white border border-sky-400/30">DOING</span>
            <span class="text-[12px] font-bold text-slate-400">{{ dayDetailPlannedHours - dayDetailDoneHours }}h</span>
            <span class="text-[11px] text-slate-600">{{ dayDetailPending.length }}件</span>
          </div>
          <div v-if="dayDetailPending.length === 0" class="text-[12px] text-slate-600 py-3 text-center">未完了のタスクなし</div>
          <ul v-else class="list-none m-0 p-0 flex flex-col gap-1.5">
            <li
              v-for="row in dayDetailPending"
              :key="row.card.id"
              class="bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-2 flex items-start gap-2 cursor-pointer active:bg-white/[0.08]"
              @click="openDayTask(row)"
            >
              <button
                class="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-white/20 bg-white/[0.04] transition-all cursor-pointer"
                title="DONEにする"
                @click.stop="markDone(row.card, row.board)"
              />
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-1.5 flex-wrap">
                  <span class="text-[14px] leading-snug text-white break-words">{{ row.card.displayName }}</span>
                  <span class="inline-block px-1 rounded text-[10px] font-bold flex-shrink-0" :class="row.status === 'doing' ? 'bg-sky-400/15 text-sky-400' : 'bg-amber-500/15 text-amber-400'">{{ row.card.effort }}h</span>
                </div>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="text-[10px] font-bold" :style="{ color: boardColor(row.board) }">{{ row.board.name }}</span>
                  <span class="text-[10px] text-slate-600">{{ row.status === 'doing' ? 'DOING' : 'TODO' }}</span>
                </div>
              </div>
            </li>
          </ul>
        </div>
        <!-- DONE（その日に完了） -->
        <div>
          <div class="flex items-baseline gap-2 mb-1.5">
            <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-[800] tracking-[0.1em] bg-emerald-500/15 text-white border border-emerald-500/30">DONE</span>
            <span class="text-[12px] font-bold text-slate-400">{{ dayDetailDoneHours }}h</span>
            <span class="text-[11px] text-slate-600">{{ dayDetailDone.length }}件</span>
          </div>
          <div v-if="dayDetailDone.length === 0" class="text-[12px] text-slate-600 py-3 text-center">完了タスクなし</div>
          <ul v-else class="list-none m-0 p-0 flex flex-col gap-1.5">
            <li
              v-for="row in dayDetailDone"
              :key="row.item.id"
              class="bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-2 flex items-start gap-2 cursor-pointer active:bg-white/[0.08]"
              @click="openEditDoneTask(row.item, dayDetailDate, row.board)"
            >
              <button
                class="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-emerald-400/60 bg-emerald-400/10 text-emerald-400 flex items-center justify-center text-[10px] cursor-pointer"
                title="DOINGに戻す"
                @click.stop="unmarkDone(row.item, dayDetailDate, row.board)"
              >✓</button>
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-1.5 flex-wrap">
                  <span class="text-[14px] leading-snug text-white break-words">{{ parseTaskName(row.item.name).displayName }}</span>
                  <span class="inline-block px-1 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 flex-shrink-0">{{ parseTaskName(row.item.name).effort }}h</span>
                </div>
                <span class="text-[10px] font-bold block mt-0.5" :style="{ color: boardColor(row.board) }">{{ row.board.name }}</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <!-- ボード編集ダイアログ -->
  <div v-if="showBoardEditModal" class="fixed inset-0 z-[200] flex items-center justify-center">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showBoardEditModal = false" />
    <div class="relative w-[min(480px,100%)] bg-[#1e293b] border border-white/10 rounded-2xl p-7 flex flex-col gap-3" @click.stop>
      <h2 class="m-0 mb-1 text-lg font-bold text-slate-50">ボードを編集</h2>

      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em]">ボード名</label>
        <input
          v-model="boardEditForm.name"
          type="text"
          class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)]"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em]">概要 <span class="text-slate-600 normal-case">（AIによる振り返りに反映されます）</span></label>
        <textarea
          v-model="boardEditForm.description"
          rows="3"
          class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)] resize-y min-h-[80px] leading-relaxed"
          placeholder="このボードの目的・概要を入力..."
        />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em]">表示順</label>
        <div class="flex gap-2">
          <button
            type="button"
            class="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.06] text-slate-300 text-[13px] cursor-pointer hover:bg-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="boardEditIndex <= 0"
            @click="boardEditTarget && moveBoardLeft(boardEditTarget)"
          >← 左へ</button>
          <button
            type="button"
            class="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.06] text-slate-300 text-[13px] cursor-pointer hover:bg-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="boardEditIndex < 0 || boardEditIndex >= boards.length - 1"
            @click="boardEditTarget && moveBoardRight(boardEditTarget)"
          >右へ →</button>
        </div>
      </div>

      <div class="flex items-center gap-2 mt-1">
        <button class="px-4 py-2 rounded-lg bg-white/[0.08] border border-white/10 text-slate-400 text-[13px] cursor-pointer transition-all hover:bg-white/[0.12]" @click="showBoardEditModal = false">キャンセル</button>
        <button
          class="px-4 py-2 rounded-lg border-none bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-[13px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="saving"
          @click="saveBoardMeta"
        >{{ saving ? '保存中…' : '保存' }}</button>
      </div>
    </div>
  </div>

  <div class="min-h-screen pb-16 text-[#e2e8f0] text-sm">
    <!-- Header -->
    <header class="relative sticky top-0 z-[100] bg-[rgba(15,23,42,0.92)] backdrop-blur-[12px] border-b border-white/[0.08] shadow-[0_1px_0_0_rgba(16,185,129,0.08)]">
      <div class="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-400 to-teal-500" />
      <!-- タイトル行 -->
      <div class="flex items-center gap-2 px-3 md:px-5 py-2 md:py-3.5">
        <h1 class="flex-none m-0 text-xl font-bold bg-gradient-to-br from-emerald-400 to-teal-500 bg-clip-text text-transparent">タスクくん</h1>
        <!-- デスクトップ用コントロール -->
        <div v-if="hasCredentials" class="hidden md:flex items-center gap-2 ml-auto">
          <button
            class="px-3 py-1.5 rounded-lg border-none bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-[12px] font-semibold cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:opacity-90 hover:enabled:-translate-y-px"
            :disabled="reviewLoading"
            @click="reviewDialog = true"
          >{{ reviewLoading ? '生成中…' : '振り返る' }}</button>
          <button
            class="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-slate-400 text-[12px] font-medium cursor-pointer hover:bg-white/[0.12] hover:text-slate-200 transition-colors"
            @click="showReviewHistory = true"
          >振り返り履歴</button>
          <div class="w-px h-4 bg-white/[0.1]" />
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
              class="bg-white/[0.06] border border-white/10 rounded-md px-2.5 py-1.5 text-[#e2e8f0] text-[13px] cursor-pointer hover:bg-white/[0.1] transition-colors min-w-[110px] text-left"
              @click="togglePicker('start')"
            >{{ formatDateLabel(periodStart) }}</button>
            <div v-if="pickerOpen === 'start'" class="absolute top-full left-0 mt-1 bg-[#1e293b] border border-white/10 rounded-xl p-3 shadow-xl w-64">
              <div class="flex items-center justify-between mb-2">
                <button class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors text-sm cursor-pointer" @click="prevMonth('start')">‹</button>
                <span class="text-[13px] font-semibold text-slate-200">{{ monthLabel('start') }}</span>
                <button class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors text-sm cursor-pointer" @click="nextMonth('start')">›</button>
              </div>
              <div class="grid grid-cols-7 mb-1">
                <div v-for="w in ['月', '火', '水', '木', '金', '土', '日']" :key="w" class="text-center text-[10px] font-semibold py-0.5" :class="w === '土' ? 'text-sky-400' : w === '日' ? 'text-rose-400' : 'text-slate-500'">{{ w }}</div>
              </div>
              <div class="grid grid-cols-7 gap-y-0.5">
                <div v-for="(day, i) in gridDays('start')" :key="i" class="flex justify-center">
                  <button
                    v-if="day !== null"
                    type="button"
                    class="w-7 h-7 rounded-full text-[12px] transition-all cursor-pointer"
                    :class="isSelectedDay('start', day) ? 'bg-sky-500 text-white font-semibold' : isTodayDay('start', day) ? 'text-sky-400 font-semibold hover:bg-white/10' : 'text-slate-300 hover:bg-white/10'"
                    @click="selectDay('start', day)"
                  >{{ day }}</button>
                </div>
              </div>
            </div>
          </div>
          <span class="text-slate-600">〜</span>
          <div class="relative z-50" @click.stop>
            <button
              class="bg-white/[0.06] border border-white/10 rounded-md px-2.5 py-1.5 text-[#e2e8f0] text-[13px] cursor-pointer hover:bg-white/[0.1] transition-colors min-w-[110px] text-left"
              @click="togglePicker('end')"
            >{{ formatDateLabel(periodEnd) }}</button>
            <div v-if="pickerOpen === 'end'" class="absolute top-full left-0 mt-1 bg-[#1e293b] border border-white/10 rounded-xl p-3 shadow-xl w-64">
              <div class="flex items-center justify-between mb-2">
                <button class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors text-sm cursor-pointer" @click="prevMonth('end')">‹</button>
                <span class="text-[13px] font-semibold text-slate-200">{{ monthLabel('end') }}</span>
                <button class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors text-sm cursor-pointer" @click="nextMonth('end')">›</button>
              </div>
              <div class="grid grid-cols-7 mb-1">
                <div v-for="w in ['月', '火', '水', '木', '金', '土', '日']" :key="w" class="text-center text-[10px] font-semibold py-0.5" :class="w === '土' ? 'text-sky-400' : w === '日' ? 'text-rose-400' : 'text-slate-500'">{{ w }}</div>
              </div>
              <div class="grid grid-cols-7 gap-y-0.5">
                <div v-for="(day, i) in gridDays('end')" :key="i" class="flex justify-center">
                  <button
                    v-if="day !== null"
                    type="button"
                    class="w-7 h-7 rounded-full text-[12px] transition-all cursor-pointer"
                    :class="isSelectedDay('end', day) ? 'bg-sky-500 text-white font-semibold' : isTodayDay('end', day) ? 'text-sky-400 font-semibold hover:bg-white/10' : 'text-slate-300 hover:bg-white/10'"
                    @click="selectDay('end', day)"
                  >{{ day }}</button>
                </div>
              </div>
              <button
                type="button"
                class="mt-2 w-full py-1.5 rounded-md text-[12px] font-semibold border border-dashed border-white/15 text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors cursor-pointer"
                @click="clearEnd"
              >指定なし（今週まで）</button>
            </div>
          </div>
          <button
            class="px-4 py-1.5 rounded-lg border-none bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-[13px] font-semibold cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:opacity-90 hover:enabled:-translate-y-px"
            :disabled="loading"
            @click="load"
          >{{ loading ? '…' : '更新' }}</button>
        </div>
        <!-- モバイル: 振り返り・履歴ボタン（タイトル行右側） -->
        <div v-if="hasCredentials" class="md:hidden flex items-center gap-1.5 ml-auto">
          <button
            class="px-2.5 py-1 rounded-lg border-none bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-50"
            :disabled="reviewLoading"
            @click="reviewDialog = true"
          >{{ reviewLoading ? '…' : '振り返り' }}</button>
          <button
            class="px-2.5 py-1 rounded-lg border border-white/10 bg-white/[0.06] text-slate-400 text-[11px] cursor-pointer"
            @click="showReviewHistory = true"
          >履歴</button>
        </div>
        <!-- 歯車（常に1つ） -->
        <div class="relative" :class="hasCredentials ? 'ml-2 md:ml-0' : 'ml-auto'" @click.stop>
          <button
            class="w-9 h-9 rounded-lg border border-white/10 bg-white/[0.06] text-slate-400 text-lg cursor-pointer flex items-center justify-center transition-all hover:bg-white/[0.12] hover:text-[#e2e8f0]"
            title="設定"
            @click="openSettingsMenu"
          >⚙</button>
          <div v-if="showSettingsMenu" class="absolute right-0 top-full mt-1 bg-[#1e293b] border border-white/10 rounded-xl shadow-xl z-[200] min-w-[160px] py-1 overflow-hidden">
            <button class="w-full text-left px-4 py-2 text-[13px] text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-2" @click="openSettings(); closeSettingsMenu()">
              <span>🔑</span> アカウント設定
            </button>
            <button class="w-full text-left px-4 py-2 text-[13px] text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-2" @click="downloadDone">
              <span>⬇</span> ダウンロード
            </button>
            <button class="w-full text-left px-4 py-2 text-[13px] text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-2" @click="showPasswordModal = true; closeSettingsMenu()">
              <span>🔒</span> パスワード変更
            </button>
            <button class="w-full text-left px-4 py-2 text-[13px] text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-2" @click="logout(); closeSettingsMenu()">
              <span>🚪</span> ログアウト
            </button>
          </div>
        </div>
      </div>
      <!-- モバイル用コントロール行（期間・更新・プロファイル・全件のみ） -->
      <div v-if="hasCredentials" class="md:hidden flex items-center gap-2 px-3 pb-2">
        <select
          v-if="profiles.length > 1"
          :value="activeProfileId"
          class="bg-white/[0.06] border border-white/10 rounded-md px-2 py-1 text-[12px] text-[#e2e8f0] cursor-pointer flex-shrink-0 max-w-[100px]"
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
          >{{ formatDateShort(periodStart) }}〜{{ formatDateShort(periodEnd) }}</button>
          <div v-if="showMobilePeriod" class="absolute top-full left-0 mt-1 bg-[#1e293b] border border-white/10 rounded-xl p-3 shadow-xl z-50 flex flex-col gap-3 w-60">
            <div>
              <div class="text-[11px] text-slate-400 mb-1.5 font-semibold">開始</div>
              <div class="flex items-center justify-between mb-2">
                <button class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors text-sm cursor-pointer" @click="prevMonth('start')">‹</button>
                <span class="text-[12px] font-semibold text-slate-200">{{ monthLabel('start') }}</span>
                <button class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors text-sm cursor-pointer" @click="nextMonth('start')">›</button>
              </div>
              <div class="grid grid-cols-7 mb-1">
                <div v-for="w in ['月', '火', '水', '木', '金', '土', '日']" :key="w" class="text-center text-[10px] font-semibold py-0.5" :class="w === '土' ? 'text-sky-400' : w === '日' ? 'text-rose-400' : 'text-slate-500'">{{ w }}</div>
              </div>
              <div class="grid grid-cols-7 gap-y-0.5">
                <div v-for="(day, i) in gridDays('start')" :key="i" class="flex justify-center">
                  <button
                    v-if="day !== null"
                    type="button"
                    class="w-7 h-7 rounded-full text-[12px] transition-all cursor-pointer"
                    :class="isSelectedDay('start', day) ? 'bg-sky-500 text-white font-semibold' : isTodayDay('start', day) ? 'text-sky-400 font-semibold hover:bg-white/10' : 'text-slate-300 hover:bg-white/10'"
                    @click="selectDay('start', day)"
                  >{{ day }}</button>
                </div>
              </div>
            </div>
            <div>
              <div class="text-[11px] text-slate-400 mb-1.5 font-semibold">終了</div>
              <div class="flex items-center justify-between mb-2">
                <button class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors text-sm cursor-pointer" @click="prevMonth('end')">‹</button>
                <span class="text-[12px] font-semibold text-slate-200">{{ monthLabel('end') }}</span>
                <button class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors text-sm cursor-pointer" @click="nextMonth('end')">›</button>
              </div>
              <div class="grid grid-cols-7 mb-1">
                <div v-for="w in ['月', '火', '水', '木', '金', '土', '日']" :key="w" class="text-center text-[10px] font-semibold py-0.5" :class="w === '土' ? 'text-sky-400' : w === '日' ? 'text-rose-400' : 'text-slate-500'">{{ w }}</div>
              </div>
              <div class="grid grid-cols-7 gap-y-0.5">
                <div v-for="(day, i) in gridDays('end')" :key="i" class="flex justify-center">
                  <button
                    v-if="day !== null"
                    type="button"
                    class="w-7 h-7 rounded-full text-[12px] transition-all cursor-pointer"
                    :class="isSelectedDay('end', day) ? 'bg-sky-500 text-white font-semibold' : isTodayDay('end', day) ? 'text-sky-400 font-semibold hover:bg-white/10' : 'text-slate-300 hover:bg-white/10'"
                    @click="selectDay('end', day)"
                  >{{ day }}</button>
                </div>
              </div>
              <button
                type="button"
                class="mt-2 w-full py-1.5 rounded-md text-[11px] font-semibold border border-dashed border-white/15 text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors cursor-pointer"
                @click="clearEnd"
              >指定なし</button>
            </div>
          </div>
        </div>
        <button
          class="flex-shrink-0 px-3 py-1 rounded-lg border-none bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-[12px] font-semibold cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="loading"
          @click="load"
        >{{ loading ? '…' : '更新' }}</button>
      </div>
    </header>

    <!-- 今週の目標（DB保存・PC/スマホ共通表示） -->
    <div v-if="isMounted" class="flex items-center gap-2 px-3 md:px-5 py-2 border-b border-white/[0.06] bg-white/[0.02]">
      <span class="flex-none text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">🎯 今週の目標</span>
      <input
        v-model="weeklyGoalInput"
        type="text"
        maxlength="200"
        placeholder="今週の目標を入力"
        class="flex-1 min-w-0 bg-transparent border-none outline-none text-[13px] text-slate-200 placeholder:text-slate-600 py-0.5"
        @blur="commitWeeklyGoal"
        @keydown.enter="blurOnEnter"
      />
      <span v-if="goalSaving" class="flex-none text-[11px] text-slate-600">保存中…</span>
    </div>

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

    <!-- Loading state -->
    <div v-if="!isMounted" class="flex items-center justify-center min-h-[60vh]">
      <div class="w-7 h-7 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" />
    </div>

    <!-- No credentials -->
    <div v-else-if="isMounted && !hasCredentials" class="flex flex-col items-center justify-center gap-3 min-h-[60vh] text-slate-500">
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
            <!-- 今週の進捗（完了/今週が期限の工数・割合・プログレスバー） -->
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px]">
              <div class="flex items-center gap-1.5" title="今週が期限のタスクのうち、完了済みの工数">
                <span class="text-slate-500">週</span>
                <span class="font-bold text-slate-300">{{ thisWeekDoneHours }}h</span>
                <span class="text-slate-600">/</span>
                <span class="text-slate-500">{{ thisWeekPlannedHours }}h</span>
                <span class="text-slate-500">（{{ thisWeekPercent }}%）</span>
                <span class="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                  <span class="block h-full rounded-full bg-emerald-400 transition-all" :style="{ width: `${thisWeekPercent}%` }" />
                </span>
              </div>
              <span class="text-slate-700">|</span>
              <button
                type="button"
                class="flex items-center gap-1.5 -mx-1.5 px-1.5 py-0.5 rounded-lg bg-transparent border-none font-[inherit] text-[12px] cursor-pointer hover:bg-white/[0.08] transition-colors group"
                title="今日が期限のタスクのうち、完了済みの工数（クリックでその日の一覧）"
                @click="dayDetail = todayDateKey"
              >
                <span class="text-slate-500">今日</span>
                <span class="font-bold text-slate-300">{{ todayDoneHours }}h</span>
                <span class="text-slate-600">/</span>
                <span class="text-slate-500">{{ todayPlannedHours }}h</span>
                <span class="text-slate-500">（{{ todayPercent }}%）</span>
                <span class="text-slate-700 group-hover:text-slate-400">›</span>
              </button>
              <span class="text-slate-700">|</span>
              <button
                type="button"
                class="flex items-center gap-1.5 -mx-1.5 px-1.5 py-0.5 rounded-lg bg-transparent border-none font-[inherit] text-[12px] cursor-pointer hover:bg-white/[0.08] transition-colors group"
                title="明日が期限のタスクのうち、完了済みの工数（クリックでその日の一覧）"
                @click="dayDetail = tomorrowDateKey"
              >
                <span class="text-slate-500">明日</span>
                <span class="font-bold text-slate-300">{{ tomorrowDoneHours }}h</span>
                <span class="text-slate-600">/</span>
                <span class="text-slate-500">{{ tomorrowPlannedHours }}h</span>
                <span class="text-slate-500">（{{ tomorrowPercent }}%）</span>
                <span class="text-slate-700 group-hover:text-slate-400">›</span>
              </button>
              <span class="w-[210px] flex items-end gap-[3px] flex-shrink-0">
                <button
                  v-for="bar in thisWeekDailyBars"
                  :key="bar.date"
                  type="button"
                  class="flex-1 flex flex-col items-center gap-[3px] bg-transparent border-none p-0 font-[inherit] cursor-pointer group"
                  :title="`${mdWeekday(bar.date)} ${bar.hours}h（クリックでその日の一覧）`"
                  @click="dayDetail = bar.date"
                >
                  <span class="relative w-full h-[44px] flex items-end">
                    <span
                      class="w-full rounded-sm transition-all group-hover:brightness-125"
                      :class="bar.date === todayDateKey ? 'bg-emerald-400' : 'bg-emerald-400/70'"
                      :style="{ height: `${Math.max(bar.heightPct, 2)}%` }"
                    />
                    <span
                      v-if="bar.hours > 0"
                      class="absolute left-0 right-0 h-[1.5px] bg-white/80"
                      :style="{ bottom: `${bar.first3Pct}%` }"
                      title="先頭3ボードの合計値"
                    />
                  </span>
                  <span
                    class="text-[9px] leading-none group-hover:text-slate-300"
                    :class="bar.date === todayDateKey ? 'text-emerald-400 font-bold' : 'text-slate-500'"
                  >{{ bar.hours > 0 ? `${bar.hours}h` : '-' }}</span>
                </button>
              </span>
              <span class="text-slate-500" title="今週の月曜日から今日までの1日あたり平均完了工数">平均{{ thisWeekDailyAvgHours }}h/日</span>
              <span class="text-slate-700">|</span>
              <!-- 投稿カウンター（累計）。クリックでカレンダーを開いて日ごとに入力する -->
              <button
                type="button"
                class="flex items-center gap-2.5 -mx-1.5 px-1.5 py-0.5 rounded-lg bg-transparent border-none font-[inherit] text-[12px] cursor-pointer hover:bg-white/[0.08] transition-colors group"
                title="Instagram / note の投稿数の累計（クリックで日ごとに入力）"
                @click="showSnsModal = true"
              >
                <span class="text-slate-500">投稿</span>
                <span v-for="p in SNS_PLATFORMS" :key="p.key" class="flex items-center gap-1">
                  <TaskSnsIcon :platform="p.key" :size="13" :style="{ color: p.color }" />
                  <span class="text-slate-500">{{ p.label }}</span>
                  <span class="font-bold text-slate-300">{{ snsTotals[p.key] }}</span>
                </span>
                <span class="text-slate-700 group-hover:text-slate-400">›</span>
              </button>
            </div>
          </div>
          <!-- 今日やること / 今週中にやること（期限で振り分け） -->
          <div v-for="group in doingGroups" :key="group.key" class="mb-7 last:mb-0">
            <div class="flex items-center gap-2.5 mb-2.5">
              <span :class="['inline-block px-3 py-0.5 rounded-full text-[11px] font-[800] tracking-[0.05em] border', group.badgeClass]">{{ group.label }}</span>
              <span class="text-lg font-bold text-slate-600">{{ group.effort }}h</span>
            </div>
            <div class="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
              <div
                v-for="col in group.columns"
                :key="col.board.id"
                class="group flex-1 min-w-[150px] max-w-[280px] rounded-xl p-3 border flex flex-col"
                :style="boardBorderStyle(col.board)"
              >
                <div class="flex items-center gap-1 mb-2.5">
                  <span class="text-[12px] font-bold uppercase tracking-[0.05em]" :style="{ color: boardColor(col.board) }">{{ col.board.name }}<span v-if="col.effort" class="ml-1 opacity-70">({{ col.effort }}h)</span><TaskBoardDescTip :desc="col.board.desc" /></span>
                  <button class="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-slate-400 hover:text-slate-200 cursor-pointer" title="ボードを編集" @click.stop="openEditBoard(col.board)">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="10" height="10" fill="currentColor"><path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z"/></svg>
                  </button>
                </div>
                <ul :class="['list-none m-0 p-0 flex flex-col gap-1.5', showAll ? '' : 'overflow-y-auto max-h-[300px]']">
                  <li
                    v-for="card in col.cards"
                    :key="card.id"
                    :class="[
                      'bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-2 flex flex-col gap-0.5 transition-all hover:bg-white/[0.07] cursor-grab select-none',
                      dragging?.cardId === card.id ? 'opacity-40' : '',
                      dragOverCardId === card.id ? 'border-t-2 border-t-sky-400' : '',
                    ]"
                    draggable="true"
                    @dragstart="onDragStart($event, card, col.board.id, 'doing')"
                    @dragend="onDragEnd"
                    @dragover="onDragOverCard($event, card.id)"
                    @drop.prevent="onDropCard(card.id, col.board.id, 'doing', group.key)"
                    @click="openEditTask(card, col.board.id, 'doing')"
                  >
                    <div class="flex items-start gap-2">
                      <button
                        class="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-white/20 bg-white/[0.04] hover:border-emerald-400/60 hover:bg-emerald-400/10 transition-all cursor-pointer flex items-center justify-center"
                        title="DONEにする"
                        @click.stop="markDone(card, col.board)"
                      />
                      <div class="flex-1 min-w-0">
                        <div class="flex items-baseline gap-1.5">
                          <span class="text-[13px] leading-snug text-white">{{ card.displayName }}</span>
                          <span class="inline-block px-1 rounded text-[10px] font-bold bg-sky-400/15 text-sky-400 flex-shrink-0">{{ card.effort }}h</span>
                        </div>
                        <span v-if="card.desc" class="text-[11px] text-slate-500 block mt-0.5 truncate">{{ card.desc }}</span>
                      </div>
                    </div>
                    <span v-if="card.display" :class="['text-[11px] ml-6', card.isOverdue ? 'text-red-500 font-semibold' : card.isUrgent ? 'text-amber-500 font-semibold' : 'text-slate-500']">{{ card.display }}</span>
                  </li>
                </ul>
                <!-- 空の欄はカードが1枚も無く狙う先がないので、ドラッグ中だけ受け皿を出す -->
                <div
                  v-if="dragging && !col.cards.length"
                  :data-drop-end="`${col.board.id}:doing:${group.key}`"
                  :class="['rounded-lg border border-dashed text-[11px] text-center py-3 transition-colors', dragOverEndKey === `${col.board.id}:doing:${group.key}` ? 'border-sky-400 text-sky-400 bg-sky-400/10' : 'border-white/15 text-slate-600']"
                  @dragover="onDragOverEnd($event, `${col.board.id}:doing:${group.key}`)"
                  @drop.prevent="onDropEnd(col.board.id, 'doing', group.key)"
                >ここに移す</div>
                <button
                  :class="['mt-2 w-full py-1.5 rounded-lg border border-dashed text-[13px] cursor-pointer transition-all', dragOverEndKey === `${col.board.id}:doing:${group.key}` ? 'opacity-100 border-t-2 border-t-sky-400' : 'opacity-40 hover:opacity-80']"
                  :style="{ borderColor: dragOverEndKey === `${col.board.id}:doing:${group.key}` ? undefined : boardColor(col.board), color: boardColor(col.board) }"
                  @click="openAddTask(col.board.id, 'doing', group.newDue)"
                  @dragover="onDragOverEnd($event, `${col.board.id}:doing:${group.key}`)"
                  @drop.prevent="onDropEnd(col.board.id, 'doing', group.key)"
                >＋</button>
              </div>
            </div>
          </div>
        </section>

        <!-- TODO (PC only) -->
        <section class="hidden md:block px-5 mb-8">
          <div class="flex items-center gap-2.5 mb-3.5">
            <span class="inline-block px-3 py-0.5 rounded-full text-[11px] font-[800] tracking-[0.1em] bg-amber-500/15 text-white border border-amber-500/30">TODO</span>
            <span class="text-xl font-bold text-slate-600">{{ todoEffort }}h</span>
          </div>
          <div class="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
            <div
              v-for="board in boards"
              :key="board.id"
              class="group flex-1 min-w-[150px] max-w-[280px] rounded-xl p-3 border flex flex-col"
              :style="boardBorderStyle(board)"
            >
              <div class="flex items-center gap-1 mb-2.5">
                <span class="text-[12px] font-bold uppercase tracking-[0.05em]" :style="{ color: boardColor(board) }">{{ board.name }}<span v-if="boardTodoEffort(board)" class="ml-1 opacity-70">({{ boardTodoEffort(board) }}h)</span><TaskBoardDescTip :desc="board.desc" /></span>
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
                      <div class="flex items-baseline gap-1.5">
                        <span class="text-[13px] leading-snug text-white">{{ card.displayName }}</span>
                        <span class="inline-block px-1 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 flex-shrink-0">{{ card.effort }}h</span>
                      </div>
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
            <span class="text-xl font-bold text-slate-600">{{ boards.reduce((s, b) => s + doneEffort(b), 0) }}h</span>
          </div>
          <div class="flex items-end gap-4 mb-3">
            <div class="flex gap-2 overflow-x-auto pb-1 max-w-[45%] flex-shrink-0 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
              <button
                v-for="board in boards"
                :key="board.id"
                class="flex-shrink-0 px-2.5 py-1 rounded-lg border border-dashed text-[11px] cursor-pointer transition-all opacity-60 hover:opacity-100"
                :style="{ borderColor: boardColor(board), color: boardColor(board) }"
                @click="openAddTask(board.id, 'done')"
              >＋ {{ board.name }}</button>
            </div>
            <div v-if="doneChartData.weekLabels.length" class="flex-1 min-w-0">
              <div class="flex items-center justify-end gap-3 mb-0.5">
                <label class="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer select-none" @click.stop>
                  <input v-model="doneChartCumulative" type="checkbox" class="w-3.5 h-3.5 accent-emerald-400 cursor-pointer" />
                  累積推移
                </label>
                <button class="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer" @click="openChartModal">⤢ 拡大</button>
              </div>
              <div class="cursor-zoom-in" title="クリックで拡大" @click="openChartModal">
                <TaskDoneWeeklyChart :data="doneChartData" :cumulative="doneChartCumulative" />
              </div>
            </div>
          </div>
          <div v-if="allDates.length === 0" class="px-4 py-4 text-slate-600 text-[13px]">期間内の完了タスクなし</div>
          <template v-else>
            <!-- 週ごと（月曜〜日曜）に縦積み -->
            <div v-for="week in doneWeekGroups" :key="week.monday" class="mb-4 last:mb-0">
              <div class="flex items-baseline gap-2 mb-1.5">
                <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{{ week.label }}</span>
                <span class="text-[13px] font-bold text-slate-400">{{ weekTotalEffort(week.dates) }}h</span>
              </div>
              <!-- ボード別リスト -->
              <div class="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
                <div
                  v-for="board in boards"
                  :key="board.id"
                  class="group flex-1 min-w-[150px] max-w-[280px] rounded-xl p-3 border flex flex-col transition-colors"
                  :style="dragOverDoneBoardId === board.id ? { borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.08)' } : boardBorderStyle(board)"
                  @dragover="onDragOverDoneBoard($event, board.id)"
                  @drop.prevent="onDropDoneBoard(board.id)"
                >
                  <div class="flex items-center gap-1 mb-2.5">
                    <span class="text-[12px] font-bold uppercase tracking-[0.05em]" :style="{ color: boardColor(board) }">{{ board.name }}<span v-if="weekBoardEffort(board, week.dates)" class="ml-1 opacity-70">({{ weekBoardEffort(board, week.dates) }}h)</span><TaskBoardDescTip :desc="board.desc" /></span>
                    <button class="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-slate-400 hover:text-slate-200 cursor-pointer" title="ボードを編集" @click.stop="openEditBoard(board)">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="10" height="10" fill="currentColor"><path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z"/></svg>
                    </button>
                  </div>
                  <ul v-if="weekBoardTotal(board, week.dates)" class="list-none m-0 p-0 flex flex-col gap-1.5 overflow-y-auto max-h-[420px]">
                    <li
                      v-for="row in boardDoneFlatForDates(board, week.dates)"
                      :key="row.item.id"
                      :class="['flex items-center gap-1.5 px-1.5 py-1 rounded bg-white/[0.03] hover:bg-white/[0.06] cursor-grab select-none', draggingDone?.cardId === row.item.id ? 'opacity-40' : '']"
                      draggable="true"
                      @dragstart="onDragStartDone($event, row.item, board.id, row.date)"
                      @dragend="onDragEndDone"
                      @click="openEditDoneTask(row.item, row.date, board)"
                    >
                      <button
                        class="flex-shrink-0 w-3.5 h-3.5 rounded border border-white/40 bg-white/10 flex items-center justify-center text-white text-[10px] hover:bg-red-500/20 hover:border-red-400/60 hover:text-red-400 transition-all cursor-pointer"
                        title="DOINGに戻す"
                        @click.stop="unmarkDone(row.item, row.date, board)"
                      >✓</button>
                      <span class="leading-snug text-white text-[13px] truncate">{{ parseTaskName(row.item.name).displayName }}</span>
                      <span class="inline-block px-1 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 flex-shrink-0">{{ parseTaskName(row.item.name).effort }}h</span>
                    </li>
                  </ul>
                  <div v-else class="text-[12px] text-slate-600 py-3 text-center">完了タスクなし</div>
                </div>
              </div>
            </div>
          </template>
        </section>

        <!-- スマホ版レイアウト (md未満のみ表示) -->
        <div ref="mobileBoardsRoot" class="md:hidden px-2 pt-3 pb-8">
          <!-- ヘッダー: 今日・明日の進捗 -->
          <div class="mb-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              class="text-left rounded-xl p-2.5 border border-white/10 bg-white/[0.04] flex flex-col gap-1.5 cursor-pointer active:bg-white/[0.08]"
              @click="dayDetail = todayDateKey"
            >
              <span class="text-[11px] text-slate-500 font-semibold flex items-center justify-between">今日<span class="text-slate-600">一覧 ›</span></span>
              <div class="flex items-baseline gap-1">
                <span class="text-[16px] font-bold text-slate-200">{{ todayDoneHours }}h</span>
                <span class="text-slate-600 text-[12px]">/</span>
                <span class="text-[12px] text-slate-500">{{ todayPlannedHours }}h</span>
                <span class="text-[12px] text-slate-500">（{{ todayPercent }}%）</span>
              </div>
              <span class="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <span class="block h-full rounded-full bg-emerald-400 transition-all" :style="{ width: `${todayPercent}%` }" />
              </span>
            </button>
            <button
              type="button"
              class="text-left rounded-xl p-2.5 border border-white/10 bg-white/[0.04] flex flex-col gap-1.5 cursor-pointer active:bg-white/[0.08]"
              @click="dayDetail = tomorrowDateKey"
            >
              <span class="text-[11px] text-slate-500 font-semibold flex items-center justify-between">明日<span class="text-slate-600">一覧 ›</span></span>
              <div class="flex items-baseline gap-1">
                <span class="text-[16px] font-bold text-slate-200">{{ tomorrowDoneHours }}h</span>
                <span class="text-slate-600 text-[12px]">/</span>
                <span class="text-[12px] text-slate-500">{{ tomorrowPlannedHours }}h</span>
                <span class="text-[12px] text-slate-500">（{{ tomorrowPercent }}%）</span>
              </div>
              <span class="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <span class="block h-full rounded-full bg-emerald-400 transition-all" :style="{ width: `${tomorrowPercent}%` }" />
              </span>
            </button>
          </div>

          <!-- 日次工数推移（今週・月〜日） -->
          <div class="mb-3 rounded-xl p-2.5 border border-white/10 bg-white/[0.04]">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] text-slate-500 font-semibold">今週の完了工数（日別）</span>
              <div class="flex items-center gap-2.5">
                <span class="text-[11px] text-slate-500">平均{{ thisWeekDailyAvgHours }}h/日</span>
                <button
                  v-if="doneChartData.weekLabels.length"
                  type="button"
                  class="text-[11px] text-slate-500 active:text-slate-300 cursor-pointer"
                  @click="openChartModal"
                >⤢ 週推移</button>
              </div>
            </div>
            <div class="flex items-end gap-1.5">
              <button
                v-for="bar in thisWeekDailyBars"
                :key="bar.date"
                type="button"
                class="flex-1 flex flex-col items-center gap-1 bg-transparent border-none p-0 font-[inherit] cursor-pointer active:opacity-60"
                @click="dayDetail = bar.date"
              >
                <span class="text-[9px] text-slate-500 h-3 leading-3">{{ bar.hours > 0 ? `${bar.hours}h` : '' }}</span>
                <span class="w-full h-[46px] flex items-end">
                  <span
                    class="w-full rounded-sm transition-all"
                    :class="bar.date === todayDateKey ? 'bg-emerald-400' : 'bg-emerald-400/50'"
                    :style="{ height: `${Math.max(bar.heightPct, 4)}%` }"
                  />
                </span>
                <span class="text-[10px]" :class="bar.date === todayDateKey ? 'text-emerald-400 font-bold' : 'text-slate-500'">{{ weekdayJa(bar.date) }}</span>
              </button>
            </div>
          </div>

          <!-- 投稿カウンター（累計）。日別グラフとは別パネル。タップでカレンダーを開いて日ごとに入力する -->
          <button
            type="button"
            class="mb-3 w-full text-left rounded-xl p-2.5 border border-white/10 bg-white/[0.04] flex flex-col gap-2 cursor-pointer active:bg-white/[0.08]"
            @click="showSnsModal = true"
          >
            <span class="text-[11px] text-slate-500 font-semibold flex items-center justify-between">投稿カウンター（累計）<span class="text-slate-600">入力 ›</span></span>
            <span class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span v-for="p in SNS_PLATFORMS" :key="p.key" class="flex items-baseline gap-1.5">
                <TaskSnsIcon :platform="p.key" :size="15" class="self-center" :style="{ color: p.color }" />
                <span class="text-[11px] text-slate-500">{{ p.label }}</span>
                <span class="text-[16px] font-bold text-slate-200">{{ snsTotals[p.key] }}</span>
              </span>
            </span>
          </button>

          <!-- ボードごとに TODO / DOING(今日) / DOING(今週中) / DONE を横スクロールで並べる -->
          <div v-for="board in boards" :key="board.id" class="mb-3">
            <div
              class="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-[0.05em] mb-1.5 px-1.5 py-1 rounded-lg border-l-4"
              :style="{ color: boardColor(board), borderColor: boardColor(board), backgroundColor: boardColor(board) + '12' }"
            >
              <span class="flex-1 min-w-0">{{ board.name }}<TaskBoardDescTip :desc="board.desc" /></span>
              <button class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded opacity-60 active:opacity-100 text-current cursor-pointer" title="ボードを編集" @click.stop="openEditBoard(board)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="11" height="11" fill="currentColor"><path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z"/></svg>
              </button>
            </div>
            <div
              data-board-strip
              class="flex gap-1.5 overflow-x-auto snap-x snap-mandatory [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]"
              @scroll.passive="onStripScroll"
            >
              <!-- TODO (左) -->
              <div class="snap-start shrink-0 w-[44%] rounded-xl p-2 border flex flex-col" :style="boardBorderStyle(board)">
                <div class="text-[11px] font-bold mb-1 text-white/80">TODO<span v-if="boardTodoEffort(board)" class="ml-1">({{ boardTodoEffort(board) }}h)</span></div>
                <ul :class="['list-none m-0 p-0 flex flex-col gap-1 min-h-[28px]', showAll ? '' : 'overflow-y-auto max-h-[300px]']">
                  <li
                    v-for="card in board.todo"
                    :key="card.id"
                    :data-card-id="card.id"
                    :data-board-id="board.id"
                    data-status="todo"
                    :class="[
                      'bg-white/[0.04] border border-white/[0.07] rounded-lg px-2 py-1.5 flex items-start gap-1.5 cursor-grab active:bg-white/[0.07] select-none',
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
                    <div class="flex-1 min-w-0">
                      <div class="flex items-baseline gap-1.5">
                        <span class="text-[14px] leading-snug text-white break-words">{{ card.displayName }}</span>
                        <span class="inline-block px-1 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 flex-shrink-0">{{ card.effort }}h</span>
                      </div>
                    </div>
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
              <!-- DOING（今日やること / 今週中にやること の2列。期限で振り分け） -->
              <div
                v-for="group in doingGroups"
                :key="group.key"
                class="snap-start shrink-0 w-[44%] rounded-xl p-2 border flex flex-col"
                :style="boardBorderStyle(board)"
              >
                <div class="text-[11px] font-bold mb-1 text-white/80">DOING <span class="text-white/55">{{ group.short }}</span><span v-if="doingGroupEffort(board, group.key)" class="ml-1">({{ doingGroupEffort(board, group.key) }}h)</span></div>
                <ul :class="['list-none m-0 p-0 flex flex-col gap-1 min-h-[28px]', showAll ? '' : 'overflow-y-auto max-h-[300px]']">
                  <li
                    v-for="card in boardDoingCards(board, group.key)"
                    :key="card.id"
                    :data-card-id="card.id"
                    :data-board-id="board.id"
                    data-status="doing"
                    :data-group="group.key"
                    :class="[
                      'bg-white/[0.04] border border-white/[0.07] rounded-lg px-2 py-1.5 flex items-start gap-1.5 cursor-grab active:bg-white/[0.07] select-none',
                      dragging?.cardId === card.id ? 'opacity-40' : '',
                      dragOverCardId === card.id ? 'border-t-2 border-t-sky-400' : '',
                    ]"
                    draggable="true"
                    @dragstart="onDragStart($event, card, board.id, 'doing')"
                    @dragend="onDragEnd"
                    @dragover="onDragOverCard($event, card.id)"
                    @drop.prevent="onDropCard(card.id, board.id, 'doing', group.key)"
                    @touchstart="onMobileTouchStart($event, card, board.id, 'doing')"
                    @click="openEditTask(card, board.id, 'doing')"
                  >
                    <button
                      data-no-drag="true"
                      class="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-white/20 bg-white/[0.04] hover:border-emerald-400/60 hover:bg-emerald-400/10 transition-all cursor-pointer flex items-center justify-center"
                      @click.stop="markDone(card, board)"
                    />
                    <div class="flex-1 min-w-0">
                      <div class="flex items-baseline gap-1.5">
                        <span class="text-[14px] leading-snug text-white break-words">{{ card.displayName }}</span>
                        <span class="inline-block px-1 rounded text-[10px] font-bold bg-sky-400/15 text-sky-400 flex-shrink-0">{{ card.effort }}h</span>
                      </div>
                    </div>
                  </li>
                </ul>
                <!-- 空の欄はカードが1枚も無く狙う先がないので、ドラッグ中だけ受け皿を出す -->
                <div
                  v-if="dragging && !boardDoingCards(board, group.key).length"
                  :data-drop-end="`${board.id}:doing:${group.key}`"
                  :class="['rounded-lg border border-dashed text-[11px] text-center py-3 transition-colors', dragOverEndKey === `${board.id}:doing:${group.key}` ? 'border-sky-400 text-sky-400 bg-sky-400/10' : 'border-white/15 text-slate-600']"
                  @dragover="onDragOverEnd($event, `${board.id}:doing:${group.key}`)"
                  @drop.prevent="onDropEnd(board.id, 'doing', group.key)"
                >ここに移す</div>
                <button
                  :data-drop-end="`${board.id}:doing:${group.key}`"
                  :class="['mt-1.5 w-full py-1 rounded-lg border border-dashed text-[13px] cursor-pointer transition-all', dragOverEndKey === `${board.id}:doing:${group.key}` ? 'opacity-100 border-t-2 border-t-sky-400' : 'opacity-40 hover:opacity-80']"
                  :style="{ borderColor: dragOverEndKey === `${board.id}:doing:${group.key}` ? undefined : boardColor(board), color: boardColor(board) }"
                  @click="openAddTask(board.id, 'doing', group.newDue)"
                  @dragover="onDragOverEnd($event, `${board.id}:doing:${group.key}`)"
                  @drop.prevent="onDropEnd(board.id, 'doing', group.key)"
                >＋</button>
              </div>
              <!-- DONE (いちばん右・今週分) -->
              <div class="snap-start shrink-0 w-[44%] rounded-xl p-2 border flex flex-col" :style="boardBorderStyle(board)">
                <div class="text-[11px] font-bold mb-1 text-white/80">DONE<span v-if="weekBoardEffort(board, mobileDoneDates)" class="ml-1">({{ weekBoardEffort(board, mobileDoneDates) }}h)</span></div>
                <ul v-if="weekBoardTotal(board, mobileDoneDates)" :class="['list-none m-0 p-0 flex flex-col gap-1 min-h-[28px]', showAll ? '' : 'overflow-y-auto max-h-[300px]']">
                  <li
                    v-for="row in boardDoneFlatForDates(board, mobileDoneDates)"
                    :key="row.item.id"
                    class="bg-white/[0.04] border border-white/[0.07] rounded-lg px-2 py-1.5 flex items-start gap-1.5 select-none"
                    @click="openEditDoneTask(row.item, row.date, board)"
                  >
                    <button
                      data-no-drag="true"
                      class="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-emerald-400/60 bg-emerald-400/10 text-emerald-400 flex items-center justify-center text-[10px] cursor-pointer"
                      title="DOINGに戻す"
                      @click.stop="unmarkDone(row.item, row.date, board)"
                    >✓</button>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-baseline gap-1.5">
                        <span class="text-[14px] leading-snug text-white break-words">{{ parseTaskName(row.item.name).displayName }}</span>
                        <span class="inline-block px-1 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 flex-shrink-0">{{ parseTaskName(row.item.name).effort }}h</span>
                      </div>
                    </div>
                  </li>
                </ul>
                <div v-else class="text-[12px] text-slate-600 py-3 text-center">完了タスクなし</div>
                <button
                  class="mt-1.5 w-full py-1 rounded-lg border border-dashed text-[13px] cursor-pointer transition-all opacity-40 hover:opacity-80"
                  :style="{ borderColor: boardColor(board), color: boardColor(board) }"
                  @click="openAddTask(board.id, 'done')"
                >＋</button>
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
