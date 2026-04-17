import { ref, computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'

export interface Card {
  id: string
  name: string
  desc: string
  due: string | null
  pos: number
  isOverdue: boolean
  isUrgent: boolean
  display: string
}

export interface Board {
  id: string
  name: string
  desc: string
  doing: Card[]
  todo: Card[]
  done: Record<string, { id: string; name: string }[]>
  doingListId: string
  todoListId: string
  doneListId: string
}

export type EditTarget = {
  card: Card
  boardId: string
  status: 'doing' | 'todo' | 'done'
  dateKey?: string
} | null

export const BOARD_COLORS = ['#38bdf8', '#818cf8', '#34d399', '#fb923c', '#f472b6', '#a78bfa', '#4ade80', '#facc15']

export function useTaskBoards(
  apiKey: ComputedRef<string>,
  apiToken: ComputedRef<string>,
  excludedBoards: ComputedRef<string[]>,
  startMonth: Ref<string>,
  endMonth: Ref<string>,
) {
  const boards = ref<Board[]>([])
  const allDates = ref<string[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')

  // Board edit modal state
  const showBoardEditModal = ref(false)
  const boardEditTarget = ref<Board | null>(null)
  const boardEditForm = ref({ name: '', description: '' })

  function openEditBoard(board: Board) {
    boardEditTarget.value = board
    boardEditForm.value = {
      name: board.name,
      description: board.desc,
    }
    showBoardEditModal.value = true
  }

  async function saveBoardMeta() {
    if (!boardEditTarget.value) return
    saving.value = true
    error.value = ''
    try {
      const board = boardEditTarget.value
      const newName = boardEditForm.value.name.trim()
      const newDesc = boardEditForm.value.description
      const body: Record<string, string> = { desc: newDesc }
      if (newName && newName !== board.name) body.name = newName
      await trelloPut(`/boards/${board.id}`, body)
      if (newName) board.name = newName
      board.desc = newDesc
      showBoardEditModal.value = false
    } catch (e: any) {
      error.value = e.message
    } finally {
      saving.value = false
    }
  }

  // Task modal state
  const showTaskModal = ref(false)
  const editTarget = ref<EditTarget>(null)
  const taskForm = ref({ name: '', desc: '', due: '', boardId: '', status: 'todo' as 'todo' | 'doing' | 'done' })
  const isEditing = computed(() => editTarget.value !== null)
  const modalTitle = computed(() => isEditing.value ? 'タスクを編集' : 'タスクを追加')

  // DONE確認 (期限なし)
  const pendingDone = ref<{ card: Card; board: Board } | null>(null)
  const pendingDueInput = ref('')

  const doingTotal = computed(() => boards.value.reduce((s, b) => s + b.doing.length, 0))
  const todoTotal = computed(() => boards.value.reduce((s, b) => s + b.todo.length, 0))

  // --- Trello API ---
  async function trelloGet(path: string) {
    const sep = path.includes('?') ? '&' : '?'
    const res = await fetch(`https://api.trello.com/1${path}${sep}key=${apiKey.value}&token=${apiToken.value}`)
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

  // --- Utilities ---
  function timeRemaining(dueStr: string): Pick<Card, 'isOverdue' | 'isUrgent' | 'display'> {
    const diffH = (new Date(dueStr).getTime() - Date.now()) / 3_600_000
    if (diffH < 0) {
      const d = Math.floor(-diffH / 24)
      return { isOverdue: true, isUrgent: false, display: d > 0 ? `${d}日超過` : `${Math.floor(-diffH)}h超過` }
    }
    if (diffH < 24) return { isOverdue: false, isUrgent: true, display: `残り${Math.floor(diffH)}h` }
    return { isOverdue: false, isUrgent: false, display: `残り${Math.floor(diffH / 24)}日` }
  }

  function buildCard(raw: any): Card {
    const c: Card = { id: raw.id, name: raw.name, desc: raw.desc || '', due: raw.due || null, pos: raw.pos ?? 0, isOverdue: false, isUrgent: false, display: '' }
    if (raw.due) Object.assign(c, timeRemaining(raw.due))
    return c
  }

  function formatDate(dateStr: string) {
    const [y, m, d] = dateStr.split('-').map(Number)
    const day = ['日', '月', '火', '水', '木', '金', '土'][new Date(y, m - 1, d).getDay()]
    return `${m}/${d}(${day})`
  }

  function doneTotal(board: Board) {
    return Object.values(board.done).reduce((s, arr) => s + arr.length, 0)
  }

  function boardColor(board: Board): string {
    const idx = boards.value.findIndex(b => b.id === board.id)
    return BOARD_COLORS[idx % BOARD_COLORS.length]
  }

  function boardBorderStyle(board: Board): Record<string, string> {
    const c = boardColor(board)
    return { borderColor: c + '40', backgroundColor: c + '0d' }
  }

  function getArr(boardId: string, status: 'doing' | 'todo') {
    const b = boards.value.find(b => b.id === boardId)
    return b ? (status === 'doing' ? b.doing : b.todo) : null
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

  // --- Data loading ---
  async function load() {
    if (!apiKey.value || !apiToken.value) return
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
          const board: Board = { id: b.id, name: b.name, desc: b.desc || '', doing: [], todo: [], done: {}, doingListId: '', todoListId: '', doneListId: '' }

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
                  const c: Card = { id: card.id, name: card.name, desc: card.desc || '', due: card.due || null, pos: card.pos ?? 0, isOverdue: false, isUrgent: false, display: '' }
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

  // --- markDone ---
  function markDone(card: Card, board: Board) {
    if (!board.doneListId) { error.value = 'Doneリストが見つかりません'; return }
    execMarkDone(card, board, card.due || new Date().toISOString())
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

  async function unmarkDone(item: { id: string; name: string }, dateKey: string, board: Board) {
    if (!board.doingListId) { error.value = 'Doingリストが見つかりません'; return }
    saving.value = true
    error.value = ''
    try {
      const raw = await trelloPut(`/cards/${item.id}`, { idList: board.doingListId, dueComplete: false, due: '' })
      const arr = board.done[dateKey]
      if (arr) {
        const idx = arr.findIndex(c => c.id === item.id)
        if (idx >= 0) arr.splice(idx, 1)
        if (arr.length === 0) delete board.done[dateKey]
        rebuildAllDates()
      }
      board.doing.push(buildCard(raw))
    } catch (e: any) {
      error.value = e.message
    } finally {
      saving.value = false
    }
  }

  // --- Task modal ---
  function toLocalDatetimeInput(iso: string) {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  function openAddTask(boardId: string, status: 'todo' | 'doing') {
    editTarget.value = null
    taskForm.value = { name: '', desc: '', due: '', boardId, status }
    showTaskModal.value = true
  }

  function openEditTask(card: Card, boardId: string, status: 'doing' | 'todo') {
    editTarget.value = { card, boardId, status }
    taskForm.value = { name: card.name, desc: card.desc, due: card.due ? toLocalDatetimeInput(card.due) : '', boardId, status }
    showTaskModal.value = true
  }

  function openEditDoneTask(item: { id: string; name: string }, dateKey: string, board: Board) {
    const dueForInput = dateKey + 'T12:00'
    const dueIso = new Date(dueForInput).toISOString()
    const card: Card = { id: item.id, name: item.name, desc: '', due: dueIso, pos: 0, isOverdue: false, isUrgent: false, display: '' }
    editTarget.value = { card, boardId: board.id, status: 'done', dateKey }
    taskForm.value = { name: item.name, desc: '', due: dueForInput, boardId: board.id, status: 'done' }
    showTaskModal.value = true
  }

  async function saveTask() {
    if (!taskForm.value.name.trim()) return
    saving.value = true
    error.value = ''
    try {
      const board = boards.value.find(b => b.id === taskForm.value.boardId)
      if (!board) throw new Error('ボードが見つかりません')
      const dueIso = taskForm.value.due ? new Date(taskForm.value.due).toISOString() : ''

      if (isEditing.value && editTarget.value?.status === 'done') {
        const { card, dateKey } = editTarget.value
        const effectiveDue = dueIso || card.due || new Date().toISOString()
        const newStatus = taskForm.value.status

        if (newStatus === 'done') {
          await trelloPut(`/cards/${card.id}`, { name: taskForm.value.name.trim(), desc: taskForm.value.desc.trim(), due: effectiveDue, dueComplete: true })
          const newDue = new Date(effectiveDue)
          const jst = new Date(newDue.getTime() + 9 * 3_600_000)
          const newDateKey = jst.toISOString().slice(0, 10)
          if (dateKey && newDateKey !== dateKey) {
            const oldArr = board.done[dateKey]
            if (oldArr) {
              const idx = oldArr.findIndex(c => c.id === card.id)
              if (idx >= 0) oldArr.splice(idx, 1)
              if (oldArr.length === 0) delete board.done[dateKey]
            }
            addToDoneTable(board, { ...card, name: taskForm.value.name.trim(), due: effectiveDue })
            rebuildAllDates()
          } else if (dateKey && board.done[dateKey]) {
            const idx = board.done[dateKey].findIndex(c => c.id === card.id)
            if (idx >= 0) board.done[dateKey][idx].name = taskForm.value.name.trim()
          }
        } else {
          const newListId = newStatus === 'doing' ? board.doingListId : board.todoListId
          if (!newListId) throw new Error('対象リストが見つかりません')
          const raw = await trelloPut(`/cards/${card.id}`, { name: taskForm.value.name.trim(), desc: taskForm.value.desc.trim(), idList: newListId, dueComplete: false, due: dueIso || '' })
          if (dateKey && board.done[dateKey]) {
            const idx = board.done[dateKey].findIndex(c => c.id === card.id)
            if (idx >= 0) board.done[dateKey].splice(idx, 1)
            if (board.done[dateKey].length === 0) delete board.done[dateKey]
            rebuildAllDates()
          }
          const dstArr = newStatus === 'doing' ? board.doing : board.todo
          dstArr.push(buildCard(raw))
        }
        showTaskModal.value = false
        return
      }

      if (taskForm.value.status === 'done') {
        if (!board.doneListId) throw new Error('Doneリストが見つかりません')
        if (isEditing.value && editTarget.value) {
          const { card, status } = editTarget.value
          const effectiveDue = dueIso || card.due || new Date().toISOString()
          await trelloPut(`/cards/${card.id}`, { name: taskForm.value.name.trim(), desc: taskForm.value.desc.trim(), idList: board.doneListId, dueComplete: true, due: effectiveDue })
          const srcArr = status === 'doing' ? board.doing : board.todo
          const idx = srcArr.findIndex(c => c.id === card.id)
          if (idx >= 0) srcArr.splice(idx, 1)
          addToDoneTable(board, { ...card, name: taskForm.value.name.trim(), due: effectiveDue })
        } else {
          const raw = await trelloPost('/cards', { name: taskForm.value.name.trim(), desc: taskForm.value.desc.trim(), due: dueIso || new Date().toISOString(), dueComplete: true, idList: board.doneListId })
          addToDoneTable(board, buildCard(raw))
        }
        showTaskModal.value = false
        return
      }

      const body: Record<string, any> = { name: taskForm.value.name.trim(), desc: taskForm.value.desc.trim(), due: dueIso }
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
        const arr = taskForm.value.status === 'doing' ? board.doing : board.todo
        arr.push(buildCard(raw))
      }

      showTaskModal.value = false
    } catch (e: any) {
      error.value = e.message
    } finally {
      saving.value = false
    }
  }

  async function deleteTask() {
    if (!editTarget.value) return
    if (!confirm(`「${editTarget.value.card.name}」を削除しますか？`)) return
    saving.value = true
    error.value = ''
    try {
      const { card, boardId, status } = editTarget.value
      const res = await fetch(`https://api.trello.com/1/cards/${card.id}?key=${apiKey.value}&token=${apiToken.value}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Trello API Error: ${res.status}`)
      const board = boards.value.find(b => b.id === boardId)
      if (board) {
        if (status === 'done') {
          const dk = editTarget.value?.dateKey
          if (dk && board.done[dk]) {
            const idx = board.done[dk].findIndex(c => c.id === card.id)
            if (idx >= 0) board.done[dk].splice(idx, 1)
            if (board.done[dk].length === 0) delete board.done[dk]
            rebuildAllDates()
          }
        } else {
          const arr = status === 'doing' ? board.doing : board.todo
          const idx = arr.findIndex(c => c.id === card.id)
          if (idx >= 0) arr.splice(idx, 1)
        }
      }
      showTaskModal.value = false
    } catch (e: any) {
      error.value = e.message
    } finally {
      saving.value = false
    }
  }

  return {
    boards, allDates, loading, saving, error,
    showBoardEditModal, boardEditTarget, boardEditForm,
    openEditBoard, saveBoardMeta,
    showTaskModal, editTarget, taskForm, isEditing, modalTitle,
    pendingDone, pendingDueInput,
    doingTotal, todoTotal,
    trelloPut,
    load, buildCard, formatDate, doneTotal, boardColor, boardBorderStyle, getArr,
    rebuildAllDates, addToDoneTable,
    markDone, confirmMarkDone, unmarkDone,
    openAddTask, openEditTask, openEditDoneTask, saveTask, deleteTask,
  }
}
