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
  isImportant: boolean
  redLabelId: string | null
}

export interface Board {
  id: string
  name: string
  desc: string
  doing: Card[]
  todo: Card[]
  done: Record<string, { id: string; name: string; desc: string }[]>
  doingListId: string
  todoListId: string
  doneListId: string
  redLabelId: string | null
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
  const taskForm = ref({ name: '', desc: '', due: '', boardId: '', status: 'todo' as 'todo' | 'doing' | 'done', isImportant: false })
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

  async function trelloDelete(path: string) {
    const sep = path.includes('?') ? '&' : '?'
    const res = await fetch(`https://api.trello.com/1${path}${sep}key=${apiKey.value}&token=${apiToken.value}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Trello API Error: ${res.status}`)
  }

  async function ensureRedLabel(board: Board): Promise<string> {
    if (board.redLabelId) return board.redLabelId
    const labels = await trelloGet(`/boards/${board.id}/labels`)
    const existing = labels.find((l: any) => l.color === 'red')
    if (existing) { board.redLabelId = existing.id; return existing.id }
    const created = await trelloPost(`/boards/${board.id}/labels`, { name: '重要', color: 'red' })
    board.redLabelId = created.id
    return created.id
  }

  async function syncImportantLabel(cardId: string, card: Card, board: Board, nowImportant: boolean) {
    if (card.isImportant === nowImportant) return
    if (nowImportant) {
      const labelId = await ensureRedLabel(board)
      await trelloPost(`/cards/${cardId}/idLabels`, { value: labelId })
    } else if (card.redLabelId) {
      await trelloDelete(`/cards/${cardId}/idLabels/${card.redLabelId}`)
    }
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
    const redLabel = Array.isArray(raw.labels) ? raw.labels.find((l: any) => l.color === 'red') : null
    const c: Card = { id: raw.id, name: raw.name, desc: raw.desc || '', due: raw.due || null, pos: raw.pos ?? 0, isOverdue: false, isUrgent: false, display: '', isImportant: !!redLabel, redLabelId: redLabel?.id ?? null }
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
    const key = toJSTDate(due).toISOString().slice(0, 10)
    ;(board.done[key] ??= []).push({ id: card.id, name: card.name, desc: card.desc ?? '' })
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
          const board: Board = { id: b.id, name: b.name, desc: b.desc || '', doing: [], todo: [], done: {}, doingListId: '', todoListId: '', doneListId: '', redLabelId: null }

          await Promise.all(
            lists.map(async (list: any) => {
              const lname = list.name.toLowerCase()
              if (!['doing', 'todo', 'done'].includes(lname)) return
              if (lname === 'doing') board.doingListId = list.id
              else if (lname === 'todo') board.todoListId = list.id
              else if (lname === 'done') board.doneListId = list.id

              const cards = await trelloGet(`/lists/${list.id}/cards?fields=id,name,desc,due,pos,labels`)
              for (const card of cards) {
                if (lname === 'doing' || lname === 'todo') {
                  const c = buildCard(card)
                  lname === 'doing' ? board.doing.push(c) : board.todo.push(c)
                } else {
                  if (!card.due) continue
                  const due = new Date(card.due)
                  if (due < rangeStart || due > rangeEnd) continue
                  const key = toJSTDate(due).toISOString().slice(0, 10)
                  ;(board.done[key] ??= []).push({ id: card.id, name: card.name, desc: card.desc ?? '' })
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
    taskForm.value = { name: '', desc: '', due: '', boardId, status, isImportant: false }
    showTaskModal.value = true
  }

  function openEditTask(card: Card, boardId: string, status: 'doing' | 'todo') {
    editTarget.value = { card, boardId, status }
    taskForm.value = { name: card.name, desc: card.desc, due: card.due ? toLocalDatetimeInput(card.due) : '', boardId, status, isImportant: card.isImportant }
    showTaskModal.value = true
  }

  function openEditDoneTask(item: { id: string; name: string }, dateKey: string, board: Board) {
    const dueForInput = dateKey + 'T12:00'
    const dueIso = new Date(dueForInput).toISOString()
    const card: Card = { id: item.id, name: item.name, desc: '', due: dueIso, pos: 0, isOverdue: false, isUrgent: false, display: '', isImportant: false, redLabelId: null }
    editTarget.value = { card, boardId: board.id, status: 'done', dateKey }
    taskForm.value = { name: item.name, desc: '', due: dueForInput, boardId: board.id, status: 'done', isImportant: false }
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
        const { card, boardId: oldBoardId, dateKey } = editTarget.value
        const oldBoard = boards.value.find(b => b.id === oldBoardId) ?? board
        const boardChanged = oldBoardId !== taskForm.value.boardId
        const effectiveDue = dueIso || card.due || new Date().toISOString()
        const newStatus = taskForm.value.status

        if (newStatus === 'done') {
          const putBody: Record<string, any> = { name: taskForm.value.name.trim(), desc: taskForm.value.desc.trim(), due: effectiveDue, dueComplete: true }
          if (boardChanged) putBody.idList = board.doneListId
          if (boardChanged) putBody.idBoard = board.id
          await trelloPut(`/cards/${card.id}`, putBody)
          if (boardChanged) {
            if (dateKey && oldBoard.done[dateKey]) {
              const idx = oldBoard.done[dateKey].findIndex(c => c.id === card.id)
              if (idx >= 0) oldBoard.done[dateKey].splice(idx, 1)
              if (oldBoard.done[dateKey].length === 0) delete oldBoard.done[dateKey]
            }
            addToDoneTable(board, { ...card, name: taskForm.value.name.trim(), due: effectiveDue })
            rebuildAllDates()
          } else {
            const newDateKey = toJSTDate(effectiveDue).toISOString().slice(0, 10)
            if (dateKey && newDateKey !== dateKey) {
              const oldArr = oldBoard.done[dateKey]
              if (oldArr) {
                const idx = oldArr.findIndex(c => c.id === card.id)
                if (idx >= 0) oldArr.splice(idx, 1)
                if (oldArr.length === 0) delete oldBoard.done[dateKey]
              }
              addToDoneTable(board, { ...card, name: taskForm.value.name.trim(), due: effectiveDue })
              rebuildAllDates()
            } else if (dateKey && board.done[dateKey]) {
              const idx = board.done[dateKey].findIndex(c => c.id === card.id)
              if (idx >= 0) board.done[dateKey][idx].name = taskForm.value.name.trim()
            }
          }
        } else {
          const newListId = newStatus === 'doing' ? board.doingListId : board.todoListId
          if (!newListId) throw new Error('対象リストが見つかりません')
          const raw = await trelloPut(`/cards/${card.id}`, { name: taskForm.value.name.trim(), desc: taskForm.value.desc.trim(), idList: newListId, ...(boardChanged ? { idBoard: board.id } : {}), dueComplete: false, due: dueIso || '' })
          if (dateKey && oldBoard.done[dateKey]) {
            const idx = oldBoard.done[dateKey].findIndex(c => c.id === card.id)
            if (idx >= 0) oldBoard.done[dateKey].splice(idx, 1)
            if (oldBoard.done[dateKey].length === 0) delete oldBoard.done[dateKey]
            rebuildAllDates()
          }
          const newCard = buildCard(raw)
          if (taskForm.value.isImportant) {
            const labelId = await ensureRedLabel(board)
            await trelloPost(`/cards/${raw.id}/idLabels`, { value: labelId })
            newCard.isImportant = true
            newCard.redLabelId = labelId
          }
          const dstArr = newStatus === 'doing' ? board.doing : board.todo
          dstArr.push(newCard)
        }
        showTaskModal.value = false
        return
      }

      if (taskForm.value.status === 'done') {
        if (!board.doneListId) throw new Error('Doneリストが見つかりません')
        if (isEditing.value && editTarget.value) {
          const { card, boardId: oldBoardId, status } = editTarget.value
          const oldBoard = boards.value.find(b => b.id === oldBoardId) ?? board
          const boardChanged = oldBoardId !== taskForm.value.boardId
          const effectiveDue = dueIso || card.due || new Date().toISOString()
          await trelloPut(`/cards/${card.id}`, { name: taskForm.value.name.trim(), desc: taskForm.value.desc.trim(), idList: board.doneListId, ...(boardChanged ? { idBoard: board.id } : {}), dueComplete: true, due: effectiveDue })
          const srcArr = status === 'doing' ? oldBoard.doing : oldBoard.todo
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
        const { card, boardId: oldBoardId, status } = editTarget.value
        const oldBoard = boards.value.find(b => b.id === oldBoardId) ?? board
        const boardChanged = oldBoardId !== taskForm.value.boardId
        const newStatus = taskForm.value.status
        const newListId = newStatus === 'doing' ? board.doingListId : board.todoListId
        const oldListId = status === 'doing' ? oldBoard.doingListId : oldBoard.todoListId
        if (boardChanged && !newListId) throw new Error('対象リストが見つかりません')
        if (boardChanged || (newListId && newListId !== oldListId)) body.idList = newListId
        if (boardChanged) body.idBoard = board.id
        const raw = await trelloPut(`/cards/${card.id}`, body)
        const updated = buildCard(raw)
        if (boardChanged) {
          // ボード移動後はラベルがリセットされるため、旧ボードのラベルIDを使わず再設定
          if (taskForm.value.isImportant) {
            const labelId = await ensureRedLabel(board)
            await trelloPost(`/cards/${raw.id}/idLabels`, { value: labelId })
            updated.isImportant = true
            updated.redLabelId = labelId
          }
        } else {
          await syncImportantLabel(card.id, card, board, taskForm.value.isImportant)
          updated.isImportant = taskForm.value.isImportant
          updated.redLabelId = taskForm.value.isImportant ? (board.redLabelId ?? card.redLabelId) : null
        }
        const srcArr = status === 'doing' ? oldBoard.doing : oldBoard.todo
        const idx = srcArr.findIndex(c => c.id === card.id)
        if (!boardChanged && newStatus === status) {
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
        if (taskForm.value.isImportant) {
          const labelId = await ensureRedLabel(board)
          await trelloPost(`/cards/${raw.id}/idLabels`, { value: labelId })
          newCard.isImportant = true
          newCard.redLabelId = labelId
        }
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
