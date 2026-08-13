import { ref, computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'

export function parseTaskName(name: string): { displayName: string; effort: number } {
  const m = name.match(/ (\d{1,2}(?:\.\d{1,2})?)$/)
  if (m) return { displayName: name.slice(0, -m[0].length), effort: parseFloat(m[1]) }
  return { displayName: name, effort: 1 }
}

export interface Card {
  id: string
  name: string
  displayName: string
  effort: number
  desc: string
  due: string | null
  pos: number
  isOverdue: boolean
  isUrgent: boolean
  isDueToday: boolean
  isDueTomorrow: boolean
  display: string
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
  profileId: Ref<string>,
  periodStart: Ref<string>,
  periodEnd: Ref<string>,
) {
  function periodRange(): [Date, Date] {
    const [sy, sm, sd] = periodStart.value.split('-').map(Number)
    const rangeStart = new Date(sy, sm - 1, sd)
    if (!periodEnd.value) return [rangeStart, new Date()]
    const [ey, em, ed] = periodEnd.value.split('-').map(Number)
    return [rangeStart, new Date(ey, em - 1, ed, 23, 59, 59)]
  }

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
  const taskForm = ref({ name: '', desc: '', due: '', boardId: '', status: 'todo' as 'todo' | 'doing' | 'done', effort: 1 })
  const isEditing = computed(() => editTarget.value !== null)
  const modalTitle = computed(() => isEditing.value ? 'タスクを編集' : 'タスクを追加')

  // DONE確認 (期限なし)
  const pendingDone = ref<{ card: Card; board: Board } | null>(null)
  const pendingDueInput = ref('')

  const doingTotal = computed(() => boards.value.reduce((s, b) => s + b.doing.length, 0))
  const todoTotal = computed(() => boards.value.reduce((s, b) => s + b.todo.length, 0))
  const doingEffort = computed(() => boards.value.reduce((s, b) => s + b.doing.reduce((a, c) => a + c.effort, 0), 0))
  const todoEffort = computed(() => boards.value.reduce((s, b) => s + b.todo.reduce((a, c) => a + c.effort, 0), 0))

  // --- Trello API ---
  async function trelloError(res: Response): Promise<Error> {
    const text = await res.text().catch(() => '')
    return new Error(`Trello API Error: ${res.status}${text ? ` - ${text}` : ''}`)
  }

  async function trelloGet(path: string) {
    const sep = path.includes('?') ? '&' : '?'
    const res = await fetch(`https://api.trello.com/1${path}${sep}key=${apiKey.value}&token=${apiToken.value}`)
    if (!res.ok) throw await trelloError(res)
    return res.json()
  }

  async function trelloPost(path: string, body: Record<string, any>) {
    const res = await fetch(`https://api.trello.com/1${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, key: apiKey.value, token: apiToken.value }),
    })
    if (!res.ok) throw await trelloError(res)
    return res.json()
  }

  async function trelloPut(path: string, body: Record<string, any>) {
    const res = await fetch(`https://api.trello.com/1${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, key: apiKey.value, token: apiToken.value }),
    })
    if (!res.ok) throw await trelloError(res)
    return res.json()
  }

  // --- Utilities ---
  /** 期限のJST暦日が今日と一致するか（時刻に関わらず「その日のうちに」を判定） */
  function isDueTodayJST(dueStr: string): boolean {
    const d = toJSTDate(dueStr)
    const now = nowJST()
    return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth() && d.getUTCDate() === now.getUTCDate()
  }

  /** 期限のJST暦日が明日と一致するか */
  function isDueTomorrowJST(dueStr: string): boolean {
    const d = toJSTDate(dueStr)
    const now = nowJST()
    const tomorrow = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    tomorrow.setDate(tomorrow.getDate() + 1)
    return d.getUTCFullYear() === tomorrow.getFullYear() && d.getUTCMonth() === tomorrow.getMonth() && d.getUTCDate() === tomorrow.getDate()
  }

  function timeRemaining(dueStr: string): Pick<Card, 'isOverdue' | 'isUrgent' | 'isDueToday' | 'isDueTomorrow' | 'display'> {
    const diffH = (new Date(dueStr).getTime() - Date.now()) / 3_600_000
    const isDueToday = isDueTodayJST(dueStr)
    const isDueTomorrow = isDueTomorrowJST(dueStr)
    if (diffH < 0) {
      const d = Math.floor(-diffH / 24)
      return { isOverdue: true, isUrgent: false, isDueToday, isDueTomorrow, display: d > 0 ? `${d}日超過` : `${Math.floor(-diffH)}h超過` }
    }
    if (diffH < 24) return { isOverdue: false, isUrgent: true, isDueToday, isDueTomorrow, display: `残り${Math.floor(diffH)}h` }
    return { isOverdue: false, isUrgent: false, isDueToday, isDueTomorrow, display: `残り${Math.floor(diffH / 24)}日` }
  }

  function buildCard(raw: any): Card {
    const { displayName, effort } = parseTaskName(raw.name)
    const c: Card = { id: raw.id, name: raw.name, displayName, effort, desc: raw.desc || '', due: raw.due || null, pos: raw.pos ?? 0, isOverdue: false, isUrgent: false, isDueToday: false, isDueTomorrow: false, display: '' }
    if (raw.due) Object.assign(c, timeRemaining(raw.due))
    return c
  }

  /** 期限が近い順（期限なしは末尾） */
  function compareByDue(a: Card, b: Card): number {
    if (!a.due && !b.due) return 0
    if (!a.due) return 1
    if (!b.due) return -1
    return new Date(a.due).getTime() - new Date(b.due).getTime()
  }

  function doneTotal(board: Board) {
    return Object.values(board.done).reduce((s, arr) => s + arr.length, 0)
  }

  function doneEffort(board: Board) {
    return Object.values(board.done).reduce((s, arr) => s + arr.reduce((a, c) => a + parseTaskName(c.name).effort, 0), 0)
  }

  function boardDoingEffort(board: Board) {
    return board.doing.reduce((s, c) => s + c.effort, 0)
  }

  function boardTodoEffort(board: Board) {
    return board.todo.reduce((s, c) => s + c.effort, 0)
  }

  // --- ボード表示順（端末のlocalStorageに保存） ---
  function boardOrderKey() {
    return `trello_board_order_${profileId.value}`
  }

  function applyBoardOrder(sorted: Board[]): Board[] {
    let order: string[] = []
    try { order = JSON.parse(localStorage.getItem(boardOrderKey()) ?? '[]') } catch { order = [] }
    const orderIndex = new Map(order.map((id, i) => [id, i]))
    return [...sorted].sort((a, b) => {
      const ai = orderIndex.has(a.id) ? orderIndex.get(a.id)! : Infinity
      const bi = orderIndex.has(b.id) ? orderIndex.get(b.id)! : Infinity
      return ai !== bi ? ai - bi : 0
    })
  }

  function saveBoardOrder() {
    localStorage.setItem(boardOrderKey(), JSON.stringify(boards.value.map(b => b.id)))
  }

  function moveBoard(board: Board, dir: -1 | 1) {
    const idx = boards.value.findIndex(b => b.id === board.id)
    if (idx < 0) return
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= boards.value.length) return
    const arr = boards.value
    ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
    saveBoardOrder()
  }

  function moveBoardLeft(board: Board) { moveBoard(board, -1) }
  function moveBoardRight(board: Board) { moveBoard(board, 1) }

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
    const [rangeStart, rangeEnd] = periodRange()
    if (due < rangeStart || due > rangeEnd) return
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

      const [rangeStart, rangeEnd] = periodRange()

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

          board.doing.sort(compareByDue)
          board.todo.sort(compareByDue)
          return board
        }),
      )

      results.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
      boards.value = applyBoardOrder(results)
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
      board.doing.sort(compareByDue)
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

  function openAddTask(boardId: string, status: 'todo' | 'doing' | 'done') {
    editTarget.value = null
    taskForm.value = { name: '', desc: '', due: '', boardId, status, effort: 1 }
    showTaskModal.value = true
  }

  function openEditTask(card: Card, boardId: string, status: 'doing' | 'todo') {
    editTarget.value = { card, boardId, status }
    taskForm.value = { name: card.displayName, desc: card.desc, due: card.due ? toLocalDatetimeInput(card.due) : '', boardId, status, effort: card.effort }
    showTaskModal.value = true
  }

  function openEditDoneTask(item: { id: string; name: string; desc: string }, dateKey: string, board: Board) {
    const { displayName, effort } = parseTaskName(item.name)
    const dueForInput = dateKey + 'T12:00'
    const dueIso = new Date(dueForInput).toISOString()
    const card: Card = { id: item.id, name: item.name, displayName, effort, desc: item.desc, due: dueIso, pos: 0, isOverdue: false, isUrgent: false, isDueToday: false, isDueTomorrow: false, display: '' }
    editTarget.value = { card, boardId: board.id, status: 'done', dateKey }
    taskForm.value = { name: displayName, desc: item.desc, due: dueForInput, boardId: board.id, status: 'done', effort }
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
      const baseName = taskForm.value.name.trim()
      const trelloName = taskForm.value.effort !== 1 ? `${baseName} ${taskForm.value.effort}` : baseName

      if (isEditing.value && editTarget.value?.status === 'done') {
        const { card, boardId: oldBoardId, dateKey } = editTarget.value
        const oldBoard = boards.value.find(b => b.id === oldBoardId) ?? board
        const boardChanged = oldBoardId !== taskForm.value.boardId
        const effectiveDue = dueIso || card.due || new Date().toISOString()
        const newStatus = taskForm.value.status

        if (newStatus === 'done') {
          const putBody: Record<string, any> = { name: trelloName, desc: taskForm.value.desc.trim(), due: effectiveDue, dueComplete: true }
          if (boardChanged) putBody.idList = board.doneListId
          if (boardChanged) putBody.idBoard = board.id
          await trelloPut(`/cards/${card.id}`, putBody)
          if (boardChanged) {
            if (dateKey && oldBoard.done[dateKey]) {
              const idx = oldBoard.done[dateKey].findIndex(c => c.id === card.id)
              if (idx >= 0) oldBoard.done[dateKey].splice(idx, 1)
              if (oldBoard.done[dateKey].length === 0) delete oldBoard.done[dateKey]
            }
            addToDoneTable(board, { ...card, name: trelloName, due: effectiveDue })
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
              addToDoneTable(board, { ...card, name: trelloName, due: effectiveDue })
              rebuildAllDates()
            } else if (dateKey && board.done[dateKey]) {
              const idx = board.done[dateKey].findIndex(c => c.id === card.id)
              if (idx >= 0) board.done[dateKey][idx].name = trelloName
            }
          }
        } else {
          const newListId = newStatus === 'doing' ? board.doingListId : board.todoListId
          if (!newListId) throw new Error('対象リストが見つかりません')
          const raw = await trelloPut(`/cards/${card.id}`, { name: trelloName, desc: taskForm.value.desc.trim(), idList: newListId, ...(boardChanged ? { idBoard: board.id } : {}), dueComplete: false, due: dueIso || '' })
          if (dateKey && oldBoard.done[dateKey]) {
            const idx = oldBoard.done[dateKey].findIndex(c => c.id === card.id)
            if (idx >= 0) oldBoard.done[dateKey].splice(idx, 1)
            if (oldBoard.done[dateKey].length === 0) delete oldBoard.done[dateKey]
            rebuildAllDates()
          }
          const newCard = buildCard(raw)
          const dstArr = newStatus === 'doing' ? board.doing : board.todo
          dstArr.push(newCard)
          dstArr.sort(compareByDue)
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
          await trelloPut(`/cards/${card.id}`, { name: trelloName, desc: taskForm.value.desc.trim(), idList: board.doneListId, ...(boardChanged ? { idBoard: board.id } : {}), dueComplete: true, due: effectiveDue })
          const srcArr = status === 'doing' ? oldBoard.doing : oldBoard.todo
          const idx = srcArr.findIndex(c => c.id === card.id)
          if (idx >= 0) srcArr.splice(idx, 1)
          addToDoneTable(board, { ...card, name: trelloName, due: effectiveDue })
        } else {
          const raw = await trelloPost('/cards', { name: trelloName, desc: taskForm.value.desc.trim(), due: dueIso || new Date().toISOString(), dueComplete: true, idList: board.doneListId })
          addToDoneTable(board, buildCard(raw))
        }
        showTaskModal.value = false
        return
      }

      const body: Record<string, any> = { name: trelloName, desc: taskForm.value.desc.trim(), due: dueIso }
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
        const srcArr = status === 'doing' ? oldBoard.doing : oldBoard.todo
        const idx = srcArr.findIndex(c => c.id === card.id)
        if (!boardChanged && newStatus === status) {
          if (idx >= 0) srcArr[idx] = updated
          srcArr.sort(compareByDue)
        } else {
          if (idx >= 0) srcArr.splice(idx, 1)
          const dstArr = newStatus === 'doing' ? board.doing : board.todo
          dstArr.push(updated)
          dstArr.sort(compareByDue)
        }
      } else {
        const listId = taskForm.value.status === 'doing' ? board.doingListId : board.todoListId
        if (!listId) throw new Error('対象リストが見つかりません')
        body.idList = listId
        const raw = await trelloPost('/cards', body)  // body.name already set to trelloName above
        const newCard = buildCard(raw)
        const arr = taskForm.value.status === 'doing' ? board.doing : board.todo
        arr.push(newCard)
        arr.sort(compareByDue)
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
    if (!confirm(`「${editTarget.value.card.displayName}」を削除しますか？`)) return
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
    doingTotal, todoTotal, doingEffort, todoEffort,
    trelloPut,
    load, buildCard, doneTotal, doneEffort, boardDoingEffort, boardTodoEffort, boardColor, boardBorderStyle, getArr,
    rebuildAllDates, addToDoneTable,
    moveBoardLeft, moveBoardRight,
    markDone, confirmMarkDone, unmarkDone,
    openAddTask, openEditTask, openEditDoneTask, saveTask, deleteTask,
  }
}
