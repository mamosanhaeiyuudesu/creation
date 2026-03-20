<script setup lang="ts">
const LS_KEY = 'trello_key'
const LS_TOKEN = 'trello_token'
const LS_EXCLUDED = 'trello_excluded'

const DEFAULT_EXCLUDED =
  '3.otter,8.Basic-ph2,4:インベーダーゲーム,5:LINE-bot,5:アファーメーションbot,6:執筆活動,7:家族,7:運転,8:旨,8:釣り,8:転職,9:FLSアプリ,4:tableau,6.相関-α版,2.flaskでWebアプリ,3.おすすめキーワード検証,5.クラスタリングAPI,8.新時系列キーワード,9.新検索推移,新Trend,変化アラート'

interface Card {
  id: string
  name: string
  desc: string
  due: string | null
  pos: number
  isOverdue: boolean
  isUrgent: boolean
  display: string
}

interface Board {
  id: string
  name: string
  doing: Card[]
  todo: Card[]
  done: Record<string, { id: string; name: string }[]>
  doingListId: string
  todoListId: string
  doneListId: string
}

const apiKey = ref('')
const apiToken = ref('')
const excludedText = ref(DEFAULT_EXCLUDED)

const showSettings = ref(false)
const settingsKey = ref('')
const settingsToken = ref('')
const settingsExcluded = ref('')

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const boards = ref<Board[]>([])
const allDates = ref<string[]>([])

const now = new Date()
const startMonth = ref(`${now.getFullYear()}-01`)
const endMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

// --- Task modal ---
const showTaskModal = ref(false)
type EditTarget = { card: Card; boardId: string; status: 'doing' | 'todo' } | null
const editTarget = ref<EditTarget>(null)
const taskForm = ref({ name: '', desc: '', due: '', boardId: '', status: 'todo' as 'todo' | 'doing' })

const isEditing = computed(() => editTarget.value !== null)
const modalTitle = computed(() => isEditing.value ? 'タスクを編集' : 'タスクを追加')

const hasCredentials = computed(() => !!(apiKey.value && apiToken.value))

const excludedBoards = computed(() =>
  excludedText.value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
)

const doingTotal = computed(() => boards.value.reduce((s, b) => s + b.doing.length, 0))
const todoTotal = computed(() => boards.value.reduce((s, b) => s + b.todo.length, 0))

onMounted(() => {
  apiKey.value = localStorage.getItem(LS_KEY) || ''
  apiToken.value = localStorage.getItem(LS_TOKEN) || ''
  excludedText.value = localStorage.getItem(LS_EXCLUDED) || DEFAULT_EXCLUDED

  if (hasCredentials.value) {
    load()
  } else {
    openSettings()
  }
})

function openSettings() {
  settingsKey.value = apiKey.value
  settingsToken.value = apiToken.value
  settingsExcluded.value = excludedText.value
  showSettings.value = true
}

function saveSettings() {
  apiKey.value = settingsKey.value.trim()
  apiToken.value = settingsToken.value.trim()
  excludedText.value = settingsExcluded.value
  localStorage.setItem(LS_KEY, apiKey.value)
  localStorage.setItem(LS_TOKEN, apiToken.value)
  localStorage.setItem(LS_EXCLUDED, excludedText.value)
  showSettings.value = false
  if (hasCredentials.value) load()
}

async function trelloGet(path: string) {
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(
    `https://api.trello.com/1${path}${sep}key=${apiKey.value}&token=${apiToken.value}`,
  )
  if (!res.ok) throw new Error(`Trello API Error: ${res.status}`)
  return res.json()
}

async function trelloPost(path: string, body: Record<string, any>) {
  const res = await fetch(`https://api.trello.com/1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, key: apiKey.value, token: apiToken.value }),
  })
  if (!res.ok) throw new Error(`Trello API Error: ${res.status}`)
  return res.json()
}

async function trelloPut(path: string, body: Record<string, any>) {
  const res = await fetch(`https://api.trello.com/1${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, key: apiKey.value, token: apiToken.value }),
  })
  if (!res.ok) throw new Error(`Trello API Error: ${res.status}`)
  return res.json()
}

function timeRemaining(dueStr: string): Pick<Card, 'isOverdue' | 'isUrgent' | 'display'> {
  const diffH = (new Date(dueStr).getTime() - Date.now()) / 3_600_000
  if (diffH < 0) {
    const d = Math.floor(-diffH / 24)
    return {
      isOverdue: true,
      isUrgent: false,
      display: d > 0 ? `${d}日超過` : `${Math.floor(-diffH)}h超過`,
    }
  }
  if (diffH < 24) {
    return { isOverdue: false, isUrgent: true, display: `残り${Math.floor(diffH)}h` }
  }
  return { isOverdue: false, isUrgent: false, display: `残り${Math.floor(diffH / 24)}日` }
}

async function load() {
  if (!hasCredentials.value) return
  loading.value = true
  error.value = ''
  boards.value = []

  try {
    const rawBoards = await trelloGet('/members/me/boards')
    const filtered = rawBoards.filter((b: any) => !excludedBoards.value.includes(b.name))

    const [sy, sm] = startMonth.value.split('-').map(Number)
    const [ey, em] = endMonth.value.split('-').map(Number)
    const rangeStart = new Date(sy, sm - 1, 1)
    const rangeEnd = new Date(ey, em, 0, 23, 59, 59)

    const results: Board[] = await Promise.all(
      filtered.map(async (b: any) => {
        const lists = await trelloGet(`/boards/${b.id}/lists`)
        const board: Board = {
          id: b.id,
          name: b.name,
          doing: [],
          todo: [],
          done: {},
          doingListId: '',
          todoListId: '',
          doneListId: '',
        }

        await Promise.all(
          lists.map(async (list: any) => {
            const lname = list.name.toLowerCase()
            if (!['doing', 'todo', 'done'].includes(lname)) return

            if (lname === 'doing') board.doingListId = list.id
            else if (lname === 'todo') board.todoListId = list.id
            else if (lname === 'done') board.doneListId = list.id

            const cards = await trelloGet(`/lists/${list.id}/cards`)

            for (const card of cards) {
              if (lname === 'doing' || lname === 'todo') {
                const c: Card = {
                  id: card.id,
                  name: card.name,
                  desc: card.desc || '',
                  due: card.due || null,
                  pos: card.pos ?? 0,
                  isOverdue: false,
                  isUrgent: false,
                  display: '',
                }
                if (card.due) Object.assign(c, timeRemaining(card.due))
                lname === 'doing' ? board.doing.push(c) : board.todo.push(c)
              } else {
                if (!card.due) continue
                const due = new Date(card.due)
                if (due < rangeStart || due > rangeEnd) continue
                const jst = new Date(due.getTime() + 9 * 3_600_000)
                const key = jst.toISOString().slice(0, 10)
                ;(board.done[key] ??= []).push({ id: card.id, name: card.name })
              }
            }
          }),
        )

        board.doing.sort((a, b) => {
          if (a.isOverdue !== b.isOverdue) return a.isOverdue ? 1 : -1
          if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1
          return 0
        })

        return board
      }),
    )

    boards.value = results.sort((a, b) => a.name.localeCompare(b.name, 'ja'))

    const dateSet = new Set<string>()
    results.forEach(b => Object.keys(b.done).forEach(d => dateSet.add(d)))
    allDates.value = [...dateSet].sort().reverse()
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const day = ['日', '月', '火', '水', '木', '金', '土'][new Date(y, m - 1, d).getDay()]
  return `${m}/${d}(${day})`
}

function doneTotal(board: Board) {
  return Object.values(board.done).reduce((s, arr) => s + arr.length, 0)
}

async function unmarkDone(item: { id: string; name: string }, dateKey: string, board: Board) {
  if (!board.doingListId) { error.value = 'Doingリストが見つかりません'; return }
  saving.value = true
  error.value = ''
  try {
    const raw = await trelloPut(`/cards/${item.id}`, {
      idList: board.doingListId,
      dueComplete: false,
      due: '',
    })
    // DONEテーブルから除去
    const arr = board.done[dateKey]
    if (arr) {
      const idx = arr.findIndex(c => c.id === item.id)
      if (idx >= 0) arr.splice(idx, 1)
      if (arr.length === 0) delete board.done[dateKey]
      rebuildAllDates()
    }
    // DOINGに追加
    board.doing.push(buildCard(raw))
  } catch (e: any) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

// --- Modal operations ---

function openAddTask(boardId: string, status: 'todo' | 'doing') {
  editTarget.value = null
  taskForm.value = { name: '', desc: '', due: '', boardId, status }
  showTaskModal.value = true
}

function openEditTask(card: Card, boardId: string, status: 'doing' | 'todo') {
  editTarget.value = { card, boardId, status }
  taskForm.value = {
    name: card.name,
    desc: card.desc,
    due: card.due ? toLocalDatetimeInput(card.due) : '',
    boardId,
    status,
  }
  showTaskModal.value = true
}

function toLocalDatetimeInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function buildCard(raw: any): Card {
  const c: Card = {
    id: raw.id,
    name: raw.name,
    desc: raw.desc || '',
    due: raw.due || null,
    pos: raw.pos ?? 0,
    isOverdue: false,
    isUrgent: false,
    display: '',
  }
  if (raw.due) Object.assign(c, timeRemaining(raw.due))
  return c
}

function rebuildAllDates() {
  const dateSet = new Set<string>()
  boards.value.forEach(b => Object.keys(b.done).forEach(d => dateSet.add(d)))
  allDates.value = [...dateSet].sort().reverse()
}

function addToDoneTable(board: Board, card: Card) {
  if (!card.due) return
  const due = new Date(card.due)
  const [sy, sm] = startMonth.value.split('-').map(Number)
  const [ey, em] = endMonth.value.split('-').map(Number)
  if (due < new Date(sy, sm - 1, 1) || due > new Date(ey, em, 0, 23, 59, 59)) return
  const jst = new Date(due.getTime() + 9 * 3_600_000)
  const key = jst.toISOString().slice(0, 10)
  ;(board.done[key] ??= []).push({ id: card.id, name: card.name })
  rebuildAllDates()
}

async function saveTask() {
  if (!taskForm.value.name.trim()) return
  saving.value = true
  error.value = ''
  try {
    const board = boards.value.find(b => b.id === taskForm.value.boardId)
    if (!board) throw new Error('ボードが見つかりません')

    const dueIso = taskForm.value.due ? new Date(taskForm.value.due).toISOString() : ''
    const body: Record<string, any> = {
      name: taskForm.value.name.trim(),
      desc: taskForm.value.desc.trim(),
      due: dueIso,
    }

    if (isEditing.value && editTarget.value) {
      const { card, status } = editTarget.value
      const newStatus = taskForm.value.status
      const newListId = newStatus === 'doing' ? board.doingListId : board.todoListId
      const oldListId = status === 'doing' ? board.doingListId : board.todoListId
      if (newListId && newListId !== oldListId) body.idList = newListId

      const raw = await trelloPut(`/cards/${card.id}`, body)
      const updated = buildCard(raw)

      const srcArr = status === 'doing' ? board.doing : board.todo
      const idx = srcArr.findIndex(c => c.id === card.id)
      if (newStatus === status) {
        if (idx >= 0) srcArr[idx] = updated
      } else {
        if (idx >= 0) srcArr.splice(idx, 1)
        const dstArr = newStatus === 'doing' ? board.doing : board.todo
        dstArr.push(updated)
      }
    } else {
      const listId = taskForm.value.status === 'doing' ? board.doingListId : board.todoListId
      if (!listId) throw new Error('対象リストが見つかりません')
      body.idList = listId
      const raw = await trelloPost('/cards', body)
      const newCard = buildCard(raw)
      const arr = taskForm.value.status === 'doing' ? board.doing : board.todo
      arr.push(newCard)
    }

    showTaskModal.value = false
  } catch (e: any) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

// --- 期限なしDONE確認 ---
const pendingDone = ref<{ card: Card; board: Board } | null>(null)
const pendingDueInput = ref('')

function markDone(card: Card, board: Board) {
  if (!board.doneListId) { error.value = 'Doneリストが見つかりません'; return }
  if (!card.due) {
    // 期限未設定 → カレンダーを表示
    pendingDueInput.value = toLocalDatetimeInput(new Date().toISOString())
    pendingDone.value = { card, board }
    return
  }
  execMarkDone(card, board, card.due)
}

async function confirmMarkDone() {
  if (!pendingDone.value || !pendingDueInput.value) return
  const { card, board } = pendingDone.value
  const dueIso = new Date(pendingDueInput.value).toISOString()
  pendingDone.value = null
  execMarkDone(card, board, dueIso)
}

async function execMarkDone(card: Card, board: Board, dueIso: string) {
  saving.value = true
  error.value = ''
  try {
    await trelloPut(`/cards/${card.id}`, { idList: board.doneListId, dueComplete: true, due: dueIso })

    const doingIdx = board.doing.findIndex(c => c.id === card.id)
    if (doingIdx >= 0) board.doing.splice(doingIdx, 1)
    else {
      const todoIdx = board.todo.findIndex(c => c.id === card.id)
      if (todoIdx >= 0) board.todo.splice(todoIdx, 1)
    }

    addToDoneTable(board, { ...card, due: dueIso })
  } catch (e: any) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

// --- Drag & Drop ---
const dragging = ref<{ cardId: string; boardId: string; status: 'doing' | 'todo' } | null>(null)
const dragOverCardId = ref<string | null>(null)
const dragOverEndKey = ref<string | null>(null) // `${boardId}:${status}`

function getArr(boardId: string, status: 'doing' | 'todo') {
  const b = boards.value.find(b => b.id === boardId)
  return b ? (status === 'doing' ? b.doing : b.todo) : null
}

function onDragStart(e: DragEvent, card: Card, boardId: string, status: 'doing' | 'todo') {
  dragging.value = { cardId: card.id, boardId, status }
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function onDragEnd() {
  dragging.value = null
  dragOverCardId.value = null
  dragOverEndKey.value = null
}

function onDragOverCard(e: DragEvent, cardId: string) {
  e.preventDefault()
  dragOverCardId.value = cardId
  dragOverEndKey.value = null
}

function onDragOverEnd(e: DragEvent, key: string) {
  e.preventDefault()
  dragOverCardId.value = null
  dragOverEndKey.value = key
}

async function onDropCard(targetCardId: string, targetBoardId: string, targetStatus: 'doing' | 'todo') {
  if (!dragging.value) return
  const { cardId: srcCardId, boardId: srcBoardId, status: srcStatus } = dragging.value
  dragging.value = null
  dragOverCardId.value = null

  if (srcCardId === targetCardId) return

  const targetBoard = boards.value.find(b => b.id === targetBoardId)
  if (!targetBoard) return
  const targetArr = targetStatus === 'doing' ? targetBoard.doing : targetBoard.todo
  const targetIdx = targetArr.findIndex(c => c.id === targetCardId)
  if (targetIdx < 0) return

  // すでに直前にある場合はスキップ
  if (targetArr[targetIdx - 1]?.id === srcCardId) return

  const prevPos = targetArr[targetIdx - 1]?.pos ?? 0
  const newPos = (prevPos + targetArr[targetIdx].pos) / 2

  try {
    const body: Record<string, any> = { pos: newPos }
    if (srcBoardId !== targetBoardId || srcStatus !== targetStatus) {
      body.idList = targetStatus === 'doing' ? targetBoard.doingListId : targetBoard.todoListId
    }
    await trelloPut(`/cards/${srcCardId}`, body)

    // 元配列から取り出す
    const srcArr = getArr(srcBoardId, srcStatus)
    if (!srcArr) return
    const srcIdx = srcArr.findIndex(c => c.id === srcCardId)
    if (srcIdx < 0) return
    const [movedCard] = srcArr.splice(srcIdx, 1)

    // posを更新して挿入（削除後にインデックス再取得）
    movedCard.pos = newPos
    const insertIdx = targetArr.findIndex(c => c.id === targetCardId)
    targetArr.splice(insertIdx, 0, movedCard)
  } catch (e: any) {
    error.value = e.message
  }
}

async function onDropEnd(targetBoardId: string, targetStatus: 'doing' | 'todo') {
  if (!dragging.value) return
  const { cardId: srcCardId, boardId: srcBoardId, status: srcStatus } = dragging.value
  dragging.value = null
  dragOverEndKey.value = null

  const targetBoard = boards.value.find(b => b.id === targetBoardId)
  if (!targetBoard) return
  const targetArr = targetStatus === 'doing' ? targetBoard.doing : targetBoard.todo

  // すでに末尾にある場合はスキップ
  if (targetArr[targetArr.length - 1]?.id === srcCardId) return

  const lastPos = targetArr[targetArr.length - 1]?.pos ?? 0
  const newPos = lastPos + 16384

  try {
    const body: Record<string, any> = { pos: newPos }
    if (srcBoardId !== targetBoardId || srcStatus !== targetStatus) {
      body.idList = targetStatus === 'doing' ? targetBoard.doingListId : targetBoard.todoListId
    }
    await trelloPut(`/cards/${srcCardId}`, body)

    const srcArr = getArr(srcBoardId, srcStatus)
    if (!srcArr) return
    const srcIdx = srcArr.findIndex(c => c.id === srcCardId)
    if (srcIdx < 0) return
    const [movedCard] = srcArr.splice(srcIdx, 1)

    movedCard.pos = newPos
    targetArr.push(movedCard)
  } catch (e: any) {
    error.value = e.message
  }
}

async function deleteTask() {
  if (!editTarget.value) return
  if (!confirm(`「${editTarget.value.card.name}」を削除しますか？`)) return
  saving.value = true
  error.value = ''
  try {
    const { card, boardId, status } = editTarget.value
    const sep = `/cards/${card.id}?key=${apiKey.value}&token=${apiToken.value}`
    const res = await fetch(`https://api.trello.com/1${sep}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Trello API Error: ${res.status}`)

    const board = boards.value.find(b => b.id === boardId)
    if (board) {
      const arr = status === 'doing' ? board.doing : board.todo
      const idx = arr.findIndex(c => c.id === card.id)
      if (idx >= 0) arr.splice(idx, 1)
    }
    showTaskModal.value = false
  } catch (e: any) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen pb-16 text-[#e2e8f0] text-sm">
    <!-- Header -->
    <header class="sticky top-0 z-[100] flex items-center gap-3 px-5 py-3.5 bg-[rgba(15,23,42,0.92)] backdrop-blur-[12px] border-b border-white/[0.08]">
      <h1 class="flex-none m-0 ml-2 text-xl font-bold bg-gradient-to-br from-sky-400 to-indigo-500 bg-clip-text text-transparent">タスクくん</h1>
      <div v-if="hasCredentials" class="flex items-center gap-2 ml-auto">
        <input v-model="startMonth" class="bg-white/[0.06] border border-white/10 rounded-md px-2.5 py-1.5 text-[#e2e8f0] text-[13px] [color-scheme:dark]" type="month" />
        <span class="text-slate-600">〜</span>
        <input v-model="endMonth" class="bg-white/[0.06] border border-white/10 rounded-md px-2.5 py-1.5 text-[#e2e8f0] text-[13px] [color-scheme:dark]" type="month" />
        <button
          class="px-4 py-1.5 rounded-lg border-none bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-[13px] font-semibold cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:opacity-90 hover:enabled:-translate-y-px"
          :disabled="loading"
          @click="load"
        >{{ loading ? '…' : '更新' }}</button>
      </div>
      <button
        class="w-9 h-9 rounded-lg border border-white/10 bg-white/[0.06] text-slate-400 text-lg cursor-pointer flex items-center justify-center transition-all hover:bg-white/[0.12] hover:text-[#e2e8f0]"
        :class="hasCredentials ? '' : 'ml-auto'"
        title="設定"
        @click="openSettings"
      >⚙</button>
    </header>

    <!-- Settings Modal -->
    <Teleport to="body">
      <div v-if="showSettings" class="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5" @click.self="showSettings = false">
        <div class="w-[min(520px,100%)] bg-[#1e293b] border border-white/10 rounded-2xl p-7 flex flex-col gap-2.5 max-h-[90vh] overflow-y-auto">
          <h2 class="m-0 mb-2 text-lg font-bold text-slate-50">設定</h2>

          <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em] mt-1">Trello API Key</label>
          <input v-model="settingsKey" class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)]" type="text" placeholder="API Key" />

          <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em] mt-1">Trello Token</label>
          <input v-model="settingsToken" class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)]" type="text" placeholder="Token" />

          <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em] mt-1">非表示ボード（カンマ区切り）</label>
          <textarea v-model="settingsExcluded" class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)] resize-y min-h-[120px] font-mono text-xs leading-relaxed" rows="6" />

          <div class="flex justify-end gap-2 mt-2">
            <button class="px-4 py-2 rounded-lg bg-white/[0.08] border border-white/10 text-slate-400 text-[13px] cursor-pointer transition-all hover:bg-white/[0.12]" @click="showSettings = false">キャンセル</button>
            <button class="px-4 py-2 rounded-lg border-none bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-[13px] font-semibold cursor-pointer" @click="saveSettings">保存して読み込む</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Task Add/Edit Modal -->
    <Teleport to="body">
      <div v-if="showTaskModal" class="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5" @click.self="showTaskModal = false">
        <div class="w-[min(480px,100%)] bg-[#1e293b] border border-white/10 rounded-2xl p-7 flex flex-col gap-3">
          <h2 class="m-0 mb-1 text-lg font-bold text-slate-50">{{ modalTitle }}</h2>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em]">タスク名 <span class="text-red-400">*</span></label>
            <input
              v-model="taskForm.name"
              class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)]"
              type="text"
              placeholder="タスク名を入力"
              autofocus
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em]">概要</label>
            <textarea
              v-model="taskForm.desc"
              class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)] resize-y min-h-[80px] leading-relaxed"
              rows="3"
              placeholder="概要・メモ"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em]">期限</label>
            <input
              v-model="taskForm.due"
              class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)] [color-scheme:dark]"
              type="datetime-local"
            />
          </div>

          <div class="flex gap-3">
            <div class="flex flex-col gap-1 flex-1">
              <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em]">ボード</label>
              <select
                v-model="taskForm.boardId"
                class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 [color-scheme:dark] cursor-pointer"
              >
                <option v-for="b in boards" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </div>
            <div class="flex flex-col gap-1 flex-1">
              <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em]">リスト</label>
              <select
                v-model="taskForm.status"
                class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 [color-scheme:dark] cursor-pointer"
              >
                <option value="todo">TODO</option>
                <option value="doing">DOING</option>
              </select>
            </div>
          </div>

          <div v-if="error" class="px-3 py-2 bg-red-500/12 border border-red-500/30 rounded-lg text-red-300 text-[13px]">⚠ {{ error }}</div>

          <div class="flex items-center gap-2 mt-1">
            <button
              v-if="isEditing"
              class="px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-[13px] cursor-pointer transition-all hover:bg-red-500/20 disabled:opacity-40"
              :disabled="saving"
              @click="deleteTask"
            >削除</button>
            <div class="flex-1" />
            <button class="px-4 py-2 rounded-lg bg-white/[0.08] border border-white/10 text-slate-400 text-[13px] cursor-pointer transition-all hover:bg-white/[0.12]" @click="showTaskModal = false">キャンセル</button>
            <button
              class="px-4 py-2 rounded-lg border-none bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-[13px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="saving || !taskForm.name.trim()"
              @click="saveTask"
            >{{ saving ? '保存中…' : '保存' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Due date picker for DONE (no due date) -->
    <Teleport to="body">
      <div v-if="pendingDone" class="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5" @click.self="pendingDone = null">
        <div class="w-[min(360px,100%)] bg-[#1e293b] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <h2 class="m-0 text-base font-bold text-slate-50">期限を設定してDONEにする</h2>
            <p class="m-0 mt-1 text-[13px] text-slate-500 truncate">{{ pendingDone.card.name }}</p>
          </div>
          <input
            v-model="pendingDueInput"
            class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)] [color-scheme:dark]"
            type="datetime-local"
          />
          <div class="flex justify-end gap-2">
            <button class="px-4 py-2 rounded-lg bg-white/[0.08] border border-white/10 text-slate-400 text-[13px] cursor-pointer hover:bg-white/[0.12]" @click="pendingDone = null">キャンセル</button>
            <button
              class="px-4 py-2 rounded-lg border-none bg-emerald-500/80 text-white text-[13px] font-semibold cursor-pointer hover:bg-emerald-500 disabled:opacity-40"
              :disabled="!pendingDueInput || saving"
              @click="confirmMarkDone"
            >{{ saving ? '…' : 'DONEにする' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- No credentials -->
    <div v-if="!hasCredentials" class="flex flex-col items-center justify-center gap-3 min-h-[60vh] text-slate-500">
      <div class="text-5xl">🔑</div>
      <p class="m-0">APIキーが未設定です</p>
      <button class="px-4 py-2 rounded-lg border-none bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-[13px] font-semibold cursor-pointer" @click="openSettings">設定を開く</button>
    </div>

    <template v-else>
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
        <!-- DOING -->
        <section class="px-5 pt-5 mb-8">
          <div class="flex items-center gap-2.5 mb-3.5">
            <span class="inline-block px-3 py-0.5 rounded-full text-[11px] font-[800] tracking-[0.1em] bg-sky-400/15 text-sky-400 border border-sky-400/30">DOING</span>
            <span class="text-xl font-bold text-slate-600">{{ doingTotal }}</span>
          </div>
          <div class="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
            <div v-for="board in boards" :key="board.id" class="w-[220px] flex-shrink-0 rounded-xl p-3 bg-sky-400/[0.05] border border-sky-400/15 flex flex-col">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-[0.05em] mb-2.5">{{ board.name }}</div>
              <ul class="list-none m-0 p-0 flex flex-col gap-1.5">
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
                      <span class="text-[13px] leading-snug text-slate-300 block">{{ card.name }}</span>
                      <span v-if="card.desc" class="text-[11px] text-slate-500 block mt-0.5 truncate">{{ card.desc }}</span>
                    </div>
                  </div>
                  <span v-if="card.display" :class="['text-[11px] ml-6', card.isOverdue ? 'text-red-500 font-semibold' : card.isUrgent ? 'text-amber-500 font-semibold' : 'text-slate-500']">{{ card.display }}</span>
                </li>
              </ul>
              <button
                :class="[
                  'mt-2 w-full py-1.5 rounded-lg border border-dashed text-[13px] cursor-pointer transition-all',
                  dragOverEndKey === `${board.id}:doing`
                    ? 'border-sky-400/60 bg-sky-400/[0.08] text-sky-400/80'
                    : 'border-sky-400/20 text-sky-400/40 hover:border-sky-400/50 hover:text-sky-400/70 hover:bg-sky-400/[0.04]',
                ]"
                @click="openAddTask(board.id, 'doing')"
                @dragover="onDragOverEnd($event, `${board.id}:doing`)"
                @drop.prevent="onDropEnd(board.id, 'doing')"
              >＋</button>
            </div>
          </div>
        </section>

        <!-- TODO -->
        <section class="px-5 mb-8">
          <div class="flex items-center gap-2.5 mb-3.5">
            <span class="inline-block px-3 py-0.5 rounded-full text-[11px] font-[800] tracking-[0.1em] bg-amber-500/15 text-amber-500 border border-amber-500/30">TODO</span>
            <span class="text-xl font-bold text-slate-600">{{ todoTotal }}</span>
          </div>
          <div class="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
            <div v-for="board in boards" :key="board.id" class="w-[220px] flex-shrink-0 rounded-xl p-3 bg-amber-500/[0.05] border border-amber-500/15 flex flex-col">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-[0.05em] mb-2.5">{{ board.name }}</div>
              <ul class="list-none m-0 p-0 flex flex-col gap-1.5">
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
                      <span class="text-[13px] leading-snug text-slate-300 block">{{ card.name }}</span>
                      <span v-if="card.desc" class="text-[11px] text-slate-500 block mt-0.5 truncate">{{ card.desc }}</span>
                    </div>
                  </div>
                  <span v-if="card.display" :class="['text-[11px] ml-6', card.isOverdue ? 'text-red-500 font-semibold' : card.isUrgent ? 'text-amber-500 font-semibold' : 'text-slate-500']">{{ card.display }}</span>
                </li>
              </ul>
              <button
                :class="[
                  'mt-2 w-full py-1.5 rounded-lg border border-dashed text-[13px] cursor-pointer transition-all',
                  dragOverEndKey === `${board.id}:todo`
                    ? 'border-amber-400/60 bg-amber-400/[0.08] text-amber-400/80'
                    : 'border-amber-500/20 text-amber-500/40 hover:border-amber-500/50 hover:text-amber-500/70 hover:bg-amber-500/[0.04]',
                ]"
                @click="openAddTask(board.id, 'todo')"
                @dragover="onDragOverEnd($event, `${board.id}:todo`)"
                @drop.prevent="onDropEnd(board.id, 'todo')"
              >＋</button>
            </div>
          </div>
        </section>

        <!-- DONE -->
        <section class="px-5">
          <div class="flex items-center gap-2.5 mb-3.5">
            <span class="inline-block px-3 py-0.5 rounded-full text-[11px] font-[800] tracking-[0.1em] bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">DONE</span>
            <span class="text-xl font-bold text-slate-600">{{ boards.reduce((s, b) => s + doneTotal(b), 0) }}</span>
          </div>
          <div v-if="allDates.length === 0" class="px-4 py-4 text-slate-600 text-[13px]">期間内の完了タスクなし</div>
          <div v-else class="overflow-x-auto rounded-xl border border-white/[0.07]">
            <table class="w-full border-collapse text-[13px] table-fixed">
              <thead>
                <tr>
                  <th class="border border-white/[0.06] px-2.5 py-2 text-left text-slate-500 text-[11px] font-bold whitespace-nowrap w-[90px] min-w-[90px] bg-emerald-500/[0.08]">日付</th>
                  <th v-for="board in boards" :key="board.id" class="border border-white/[0.06] px-2.5 py-2 text-left text-slate-500 text-[11px] font-bold whitespace-nowrap bg-emerald-500/[0.08]">{{ board.name }}</th>
                </tr>
                <tr>
                  <td class="border border-white/[0.06] px-2.5 py-2 text-slate-400 font-bold bg-white/[0.03]">合計</td>
                  <td v-for="board in boards" :key="board.id" class="border border-white/[0.06] px-2.5 py-2 text-slate-400 font-bold bg-white/[0.03]">{{ doneTotal(board) }}</td>
                </tr>
              </thead>
              <tbody>
                <tr v-for="date in allDates" :key="date">
                  <td class="border border-white/[0.06] px-2.5 py-2 whitespace-nowrap text-slate-500 text-xs">{{ formatDate(date) }}</td>
                  <td v-for="board in boards" :key="board.id" class="border border-white/[0.06] px-2.5 py-2 min-w-[140px] align-top">
                    <ul v-if="board.done[date]" class="list-none m-0 p-0 flex flex-col gap-1">
                      <li v-for="item in board.done[date]" :key="item.id" class="flex items-center gap-1.5 px-1.5 py-0.5 bg-emerald-500/[0.08] rounded border-l-2 border-emerald-500/40">
                        <button
                          class="flex-shrink-0 w-3.5 h-3.5 rounded border border-emerald-500/60 bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[10px] hover:bg-red-500/20 hover:border-red-400/60 hover:text-red-400 transition-all cursor-pointer"
                          title="DOINGに戻す"
                          @click="unmarkDone(item, date, board)"
                        >✓</button>
                        <span class="leading-snug text-[#a7f3d0] text-xs">{{ item.name }}</span>
                      </li>
                    </ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </template>
  </div>
</template>
