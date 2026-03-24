<script setup lang="ts">
const LS_PROFILES = 'trello_profiles'
const LS_ACTIVE = 'trello_active_profile'
// Legacy keys for migration
const LS_KEY_LEGACY = 'trello_key'
const LS_TOKEN_LEGACY = 'trello_token'
const LS_EXCLUDED_LEGACY = 'trello_excluded'

const DEFAULT_EXCLUDED = ''

interface Profile {
  id: string
  name: string
  key: string
  token: string
  excluded: string
}

const route = useRoute()
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

const profiles = ref<Profile[]>([])
const activeProfileId = ref('')
const activeProfile = computed(() =>
  profiles.value.find(p => p.id === activeProfileId.value) ?? profiles.value[0]
)
const apiKey = computed(() => activeProfile.value?.key ?? '')
const apiToken = computed(() => activeProfile.value?.token ?? '')
const excludedText = computed(() => activeProfile.value?.excluded ?? '')

const showSettings = ref(false)
const settingsProfiles = ref<Profile[]>([])
const settingsActiveTab = ref(0)

const isMounted = ref(false)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const boards = ref<Board[]>([])
const allDates = ref<string[]>([])

const now = new Date()
const defaultStart = `${now.getFullYear()}-01`
const defaultEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const startMonth = ref((route.query.start as string) || defaultStart)
const endMonth = ref((route.query.end as string) || defaultEnd)

// --- Task modal ---
const showTaskModal = ref(false)
type EditTarget = { card: Card; boardId: string; status: 'doing' | 'todo' | 'done'; dateKey?: string } | null
const editTarget = ref<EditTarget>(null)
const taskForm = ref({ name: '', desc: '', due: '', boardId: '', status: 'todo' as 'todo' | 'doing' | 'done' })

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
  const stored = localStorage.getItem(LS_PROFILES)
  if (stored) {
    try { profiles.value = JSON.parse(stored) } catch {}
  }
  if (!profiles.value.length) {
    const key = localStorage.getItem(LS_KEY_LEGACY) || ''
    const token = localStorage.getItem(LS_TOKEN_LEGACY) || ''
    const excluded = localStorage.getItem(LS_EXCLUDED_LEGACY) || DEFAULT_EXCLUDED
    profiles.value = [{ id: '1', name: 'デフォルト', key, token, excluded }]
    localStorage.setItem(LS_PROFILES, JSON.stringify(profiles.value))
  }
  const fromUrl = route.query.profile as string | undefined
  const fromStorage = localStorage.getItem(LS_ACTIVE)
  const preferred = fromUrl || fromStorage
  activeProfileId.value = (preferred && profiles.value.find(p => p.id === preferred))
    ? preferred
    : profiles.value[0].id
  localStorage.setItem(LS_ACTIVE, activeProfileId.value)
  isMounted.value = true

  if (hasCredentials.value) {
    load()
  } else {
    openSettings()
  }
})

function openSettings() {
  settingsProfiles.value = JSON.parse(JSON.stringify(profiles.value))
  settingsActiveTab.value = Math.max(0, settingsProfiles.value.findIndex(p => p.id === activeProfileId.value))
  showSettings.value = true
}

function addSettingsProfile() {
  const id = Date.now().toString()
  settingsProfiles.value.push({ id, name: `アカウント${settingsProfiles.value.length + 1}`, key: '', token: '', excluded: DEFAULT_EXCLUDED })
  settingsActiveTab.value = settingsProfiles.value.length - 1
}

function removeSettingsProfile(idx: number) {
  if (settingsProfiles.value.length <= 1) return
  settingsProfiles.value.splice(idx, 1)
  settingsActiveTab.value = Math.max(0, Math.min(settingsActiveTab.value, settingsProfiles.value.length - 1))
}

function saveSettings() {
  const valid = settingsProfiles.value
    .map((p, i) => ({ ...p, key: p.key.trim(), token: p.token.trim(), name: p.name.trim() || `アカウント${i + 1}` }))
    .filter(p => p.key || p.token)
  if (!valid.length) return
  profiles.value = valid
  if (!profiles.value.find(p => p.id === activeProfileId.value)) {
    activeProfileId.value = profiles.value[0].id
  }
  localStorage.setItem(LS_PROFILES, JSON.stringify(profiles.value))
  localStorage.setItem(LS_ACTIVE, activeProfileId.value)
  showSettings.value = false
  if (hasCredentials.value) load()
}

function switchProfile(id: string) {
  if (activeProfileId.value === id) return
  activeProfileId.value = id
  localStorage.setItem(LS_ACTIVE, id)
  load()
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

function syncUrl() {
  const url = new URL(window.location.href)
  url.searchParams.set('start', startMonth.value)
  url.searchParams.set('end', endMonth.value)
  url.searchParams.set('view', doneView.value)
  url.searchParams.set('profile', activeProfileId.value)
  window.history.replaceState({}, '', url.toString())
}

async function load() {
  if (!hasCredentials.value) return
  syncUrl()
  loading.value = true
  error.value = ''
  boards.value = []
  selectedDate.value = null

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

function openEditDoneTask(item: { id: string; name: string }, dateKey: string, board: Board) {
  const dueForInput = dateKey + 'T12:00'
  const dueIso = new Date(dueForInput).toISOString()
  const card: Card = { id: item.id, name: item.name, desc: '', due: dueIso, pos: 0, isOverdue: false, isUrgent: false, display: '' }
  editTarget.value = { card, boardId: board.id, status: 'done', dateKey }
  taskForm.value = { name: item.name, desc: '', due: dueForInput, boardId: board.id, status: 'done' }
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

    // 編集中のDONEアイテムの処理
    if (isEditing.value && editTarget.value?.status === 'done') {
      const { card, dateKey } = editTarget.value
      const effectiveDue = dueIso || card.due || new Date().toISOString()
      const newStatus = taskForm.value.status

      if (newStatus === 'done') {
        await trelloPut(`/cards/${card.id}`, {
          name: taskForm.value.name.trim(),
          desc: taskForm.value.desc.trim(),
          due: effectiveDue,
          dueComplete: true,
        })
        // 日付が変わった場合は古いエントリを削除して再追加
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
        // DONEからDOING/TODOへ移動
        const newListId = newStatus === 'doing' ? board.doingListId : board.todoListId
        if (!newListId) throw new Error('対象リストが見つかりません')
        const raw = await trelloPut(`/cards/${card.id}`, {
          name: taskForm.value.name.trim(),
          desc: taskForm.value.desc.trim(),
          idList: newListId,
          dueComplete: false,
          due: dueIso || '',
        })
        if (dateKey && board.done[dateKey]) {
          const idx = board.done[dateKey].findIndex(c => c.id === card.id)
          if (idx >= 0) board.done[dateKey].splice(idx, 1)
          if (board.done[dateKey].length === 0) delete board.done[dateKey]
          rebuildAllDates()
        }
        const updatedCard = buildCard(raw)
        const dstArr = newStatus === 'doing' ? board.doing : board.todo
        dstArr.push(updatedCard)
      }
      showTaskModal.value = false
      return
    }

    // DONEステータスの処理（チェックボックスと同じ挙動）
    if (taskForm.value.status === 'done') {
      if (!board.doneListId) throw new Error('Doneリストが見つかりません')

      if (isEditing.value && editTarget.value) {
        const { card, status } = editTarget.value
        const effectiveDue = dueIso || card.due || new Date().toISOString()

        await trelloPut(`/cards/${card.id}`, {
          name: taskForm.value.name.trim(),
          desc: taskForm.value.desc.trim(),
          idList: board.doneListId,
          dueComplete: true,
          due: effectiveDue,
        })
        const srcArr = status === 'doing' ? board.doing : board.todo
        const idx = srcArr.findIndex(c => c.id === card.id)
        if (idx >= 0) srcArr.splice(idx, 1)
        addToDoneTable(board, { ...card, name: taskForm.value.name.trim(), due: effectiveDue })
      } else {
        const raw = await trelloPost('/cards', {
          name: taskForm.value.name.trim(),
          desc: taskForm.value.desc.trim(),
          due: dueIso || new Date().toISOString(),
          dueComplete: true,
          idList: board.doneListId,
        })
        addToDoneTable(board, buildCard(raw))
      }

      showTaskModal.value = false
      return
    }

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

// --- Month Picker ---
type PickerTarget = 'start' | 'end'
const pickerOpen = ref<PickerTarget | null>(null)
const pickerYearStart = ref(parseInt(startMonth.value.split('-')[0]))
const pickerYearEnd = ref(parseInt(endMonth.value.split('-')[0]))

function formatMonthLabel(val: string) {
  const [y, m] = val.split('-').map(Number)
  return `${y}年${m}月`
}

function formatMonthShort(val: string) {
  const [y, m] = val.split('-').map(Number)
  return `${y}年${m}月`
}

// モバイル用統合期間ピッカー
const showMobilePeriod = ref(false)
function toggleMobilePeriod() {
  if (showMobilePeriod.value) {
    showMobilePeriod.value = false
  } else {
    pickerYearStart.value = parseInt(startMonth.value.split('-')[0])
    pickerYearEnd.value = parseInt(endMonth.value.split('-')[0])
    showMobilePeriod.value = true
  }
}

function togglePicker(t: PickerTarget) {
  if (pickerOpen.value === t) {
    pickerOpen.value = null
  } else {
    if (t === 'start') pickerYearStart.value = parseInt(startMonth.value.split('-')[0])
    else pickerYearEnd.value = parseInt(endMonth.value.split('-')[0])
    pickerOpen.value = t
  }
}

function prevYear(t: PickerTarget) {
  if (t === 'start') pickerYearStart.value--
  else pickerYearEnd.value--
}

function nextYear(t: PickerTarget) {
  if (t === 'start') pickerYearStart.value++
  else pickerYearEnd.value++
}

function selectMonth(t: PickerTarget, m: number) {
  const year = t === 'start' ? pickerYearStart.value : pickerYearEnd.value
  const val = `${year}-${String(m).padStart(2, '0')}`
  if (t === 'start') startMonth.value = val
  else endMonth.value = val
  pickerOpen.value = null
}

function isSelectedMonth(t: PickerTarget, m: number) {
  const current = t === 'start' ? startMonth.value : endMonth.value
  const year = t === 'start' ? pickerYearStart.value : pickerYearEnd.value
  return current === `${year}-${String(m).padStart(2, '0')}`
}

// --- DONE chart ---
type DoneView = 'table' | 'line' | 'stacked' | 'total'
const DONE_VIEWS: DoneView[] = ['table', 'line', 'stacked', 'total']
const doneView = ref<DoneView>(
  DONE_VIEWS.includes(route.query.view as DoneView) ? (route.query.view as DoneView) : 'table',
)
const chartRef = ref<HTMLElement>()
let doneChart: any = null
let EC: any = null
const selectedDate = ref<string | null>(null)

const BOARD_COLORS = ['#38bdf8', '#818cf8', '#34d399', '#fb923c', '#f472b6', '#a78bfa', '#4ade80', '#facc15']

function boardColor(board: Board): string {
  const idx = boards.value.findIndex(b => b.id === board.id)
  return BOARD_COLORS[idx % BOARD_COLORS.length]
}

function boardBorderStyle(board: Board): Record<string, string> {
  const c = boardColor(board)
  return { borderColor: c + '40', backgroundColor: c + '0d' }
}

const doneViewOptions: { key: DoneView; label: string }[] = [
  { key: 'table', label: '表' },
  { key: 'line', label: '折れ線' },
  { key: 'stacked', label: '積み上げ' },
  { key: 'total', label: '合計棒' },
]

async function renderDoneChart() {
  if (!chartRef.value || doneView.value === 'table') return
  if (!EC) EC = await import('echarts')
  if (!doneChart || !EC.getInstanceByDom(chartRef.value)) {
    doneChart?.dispose()
    doneChart = EC.init(chartRef.value, 'dark')
  }

  const sortedDates = [...allDates.value].reverse()
  const baseOpts = {
    backgroundColor: 'transparent',
    grid: { left: 10, right: 20, top: 16, bottom: 56, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    legend: {
      bottom: 0,
      textStyle: { color: '#94a3b8', fontSize: 11 },
      itemWidth: 12,
      itemHeight: 8,
    },
  }

  if (doneView.value === 'line') {
    doneChart.setOption({
      ...baseOpts,
      xAxis: {
        type: 'category',
        data: sortedDates.map(d => formatDate(d)),
        axisLabel: { color: '#64748b', fontSize: 11, rotate: sortedDates.length > 10 ? 45 : 0 },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: '#64748b', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
      },
      series: boards.value.map((board, i) => ({
        name: board.name,
        type: 'line',
        smooth: true,
        data: sortedDates.map(d => board.done[d]?.length ?? 0),
        color: BOARD_COLORS[i % BOARD_COLORS.length],
        lineStyle: { width: 2 },
        symbol: 'circle',
        symbolSize: 6,
      })),
    }, true)
  } else if (doneView.value === 'stacked') {
    doneChart.setOption({
      ...baseOpts,
      xAxis: {
        type: 'category',
        data: sortedDates.map(d => formatDate(d)),
        axisLabel: { color: '#64748b', fontSize: 11, rotate: sortedDates.length > 10 ? 45 : 0 },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: '#64748b', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
      },
      series: boards.value.map((board, i) => ({
        name: board.name,
        type: 'bar',
        stack: 'total',
        data: sortedDates.map(d => board.done[d]?.length ?? 0),
        color: BOARD_COLORS[i % BOARD_COLORS.length],
        barMaxWidth: 40,
      })),
    }, true)
  } else if (doneView.value === 'total') {
    doneChart.setOption({
      ...baseOpts,
      legend: { show: false },
      xAxis: {
        type: 'category',
        data: boards.value.map(b => b.name),
        axisLabel: { color: '#64748b', fontSize: 11, rotate: 30 },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: '#64748b', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
      },
      series: [{
        type: 'bar',
        data: boards.value.map((board, i) => ({
          value: doneTotal(board),
          itemStyle: { color: BOARD_COLORS[i % BOARD_COLORS.length], borderRadius: [4, 4, 0, 0] },
        })),
        barMaxWidth: 60,
        label: { show: true, position: 'top', color: '#94a3b8', fontSize: 12, formatter: '{c}' },
      }],
    }, true)
  }

  doneChart.off('click')
  if (doneView.value === 'line' || doneView.value === 'stacked') {
    doneChart.on('click', (params: any) => {
      const date = sortedDates[params.dataIndex] ?? null
      selectedDate.value = selectedDate.value === date ? null : date
    })
  } else {
    selectedDate.value = null
  }
}

watch(doneView, async (v) => {
  if (v === 'table') {
    doneChart?.dispose()
    doneChart = null
    return
  }
  await nextTick()
  renderDoneChart()
})

watch(allDates, async () => {
  if (doneView.value !== 'table') {
    await nextTick()
    renderDoneChart()
  }
})

watch(selectedDate, async () => {
  await nextTick()
  doneChart?.resize()
})

// doneView変更は即座にURLへ反映（start/endはload()時に更新）
watch(doneView, () => {
  const url = new URL(window.location.href)
  url.searchParams.set('view', doneView.value)
  window.history.replaceState({}, '', url.toString())
})

onUnmounted(() => {
  doneChart?.dispose()
})

// --- 期限なしDONE確認 ---
const pendingDone = ref<{ card: Card; board: Board } | null>(null)
const pendingDueInput = ref('')

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
      if (srcBoardId !== targetBoardId) body.idBoard = targetBoardId
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
      if (srcBoardId !== targetBoardId) body.idBoard = targetBoardId
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

// --- スマホ版DONE用 ---

// 直近7日の日付キー（今日含む）
const thisWeekKeys = computed(() => {
  const keys: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const jst = new Date(d.getTime() + 9 * 3_600_000)
    keys.push(jst.toISOString().slice(0, 10))
  }
  return keys
})

// 先週7日の日付キー（7〜13日前）
const prevWeekKeys = computed(() => {
  const keys: string[] = []
  for (let i = 7; i < 14; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const jst = new Date(d.getTime() + 9 * 3_600_000)
    keys.push(jst.toISOString().slice(0, 10))
  }
  return keys
})

// 直近1週間のDONEタスク（ボード × 日付）
const thisWeekDone = computed(() =>
  boards.value.map(board => ({
    board,
    items: thisWeekKeys.value
      .filter(d => board.done[d]?.length)
      .map(d => ({ date: d, cards: board.done[d] })),
  })).filter(r => r.items.length > 0)
)

// 直近1週間のDONEタスク（フラット・完了日新しい順）
const thisWeekDoneFlat = computed(() => {
  const items: { card: any; board: any; date: string }[] = []
  // thisWeekKeys は新しい日から古い日の順なのでそのまま追加でOK
  for (const date of thisWeekKeys.value) {
    for (const board of boards.value) {
      const cards = board.done[date] ?? []
      for (const card of cards) {
        items.push({ card, board, date })
      }
    }
  }
  return items
})

// 今週 vs 先週の比較（ボード別）
const weekComparison = computed(() =>
  boards.value.map(board => ({
    name: board.name,
    thisWeek: thisWeekKeys.value.reduce((s, d) => s + (board.done[d]?.length ?? 0), 0),
    prevWeek: prevWeekKeys.value.reduce((s, d) => s + (board.done[d]?.length ?? 0), 0),
  }))
)

const weekCompTotal = computed(() => ({
  thisWeek: weekComparison.value.reduce((s, r) => s + r.thisWeek, 0),
  prevWeek: weekComparison.value.reduce((s, r) => s + r.prevWeek, 0),
}))

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
        <!-- プロファイル選択 -->
        <select
          v-if="profiles.length > 1"
          :value="activeProfileId"
          class="bg-white/[0.06] border border-white/10 rounded-md px-2 py-1 text-[12px] text-[#e2e8f0] cursor-pointer flex-shrink-0 max-w-[110px]"
          @change="switchProfile(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="p in profiles" :key="p.id" :value="p.id" class="bg-[#1e293b] text-[#e2e8f0]">{{ p.name }}</option>
        </select>
        <!-- 統合期間ピッカー -->
        <div class="relative flex-1 min-w-0 z-50" @click.stop>
          <button
            class="w-full bg-white/[0.06] border border-white/10 rounded-md px-2 py-1 text-[#e2e8f0] text-[12px] cursor-pointer hover:bg-white/[0.1] transition-colors text-left whitespace-nowrap"
            @click="toggleMobilePeriod"
          >{{ formatMonthShort(startMonth) }}〜{{ formatMonthShort(endMonth) }}</button>
          <div v-if="showMobilePeriod" class="absolute top-full left-0 mt-1 bg-[#1e293b] border border-white/10 rounded-xl p-3 shadow-xl z-50 flex gap-4">
            <!-- 開始月 -->
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
            <!-- 終了月 -->
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
        <!-- 更新 -->
        <button
          class="flex-shrink-0 px-3 py-1 rounded-lg border-none bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-[12px] font-semibold cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="loading"
          @click="load"
        >{{ loading ? '…' : '更新' }}</button>
      </div>
    </header>

    <!-- Settings Modal -->
    <Teleport to="body">
      <div v-if="showSettings" class="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5" @click.self="showSettings = false">
        <div class="w-[min(560px,100%)] bg-[#1e293b] border border-white/10 rounded-2xl p-7 flex flex-col gap-2.5 max-h-[90vh] overflow-y-auto">
          <h2 class="m-0 mb-1 text-lg font-bold text-slate-50">設定</h2>

          <!-- Account tabs -->
          <div class="flex items-end gap-0 border-b border-white/10 mb-2 overflow-x-auto">
            <button
              v-for="(p, i) in settingsProfiles"
              :key="p.id"
              :class="[
                'px-3 py-1.5 text-[13px] font-medium rounded-t-lg border-b-2 transition-all cursor-pointer whitespace-nowrap flex-shrink-0',
                settingsActiveTab === i
                  ? 'border-sky-400 text-sky-400 bg-white/[0.04]'
                  : 'border-transparent text-slate-500 hover:text-slate-300 bg-transparent',
              ]"
              @click="settingsActiveTab = i"
            >{{ p.name || `アカウント${i + 1}` }}</button>
            <button
              class="px-2.5 py-1.5 text-[18px] leading-none text-slate-500 hover:text-sky-400 border-b-2 border-transparent cursor-pointer transition-all flex-shrink-0"
              title="新しいアカウントを追加"
              @click="addSettingsProfile"
            >＋</button>
          </div>

          <!-- Current tab fields -->
          <template v-if="settingsProfiles[settingsActiveTab]">
            <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em] mt-1">アカウント名</label>
            <input v-model="settingsProfiles[settingsActiveTab].name" class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)]" type="text" :placeholder="`アカウント${settingsActiveTab + 1}`" />

            <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em] mt-1">Trello API Key</label>
            <input v-model="settingsProfiles[settingsActiveTab].key" class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)]" type="text" placeholder="API Key" />

            <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em] mt-1">Trello Token</label>
            <input v-model="settingsProfiles[settingsActiveTab].token" class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)]" type="text" placeholder="Token" />

            <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em] mt-1">非表示ボード（カンマ区切り）</label>
            <textarea v-model="settingsProfiles[settingsActiveTab].excluded" class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)] resize-y min-h-[80px] font-mono text-xs leading-relaxed" rows="4" />

            <div v-if="settingsProfiles.length > 1" class="flex justify-start mt-1">
              <button class="px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-[12px] cursor-pointer transition-all hover:bg-red-500/20" @click="removeSettingsProfile(settingsActiveTab)">このアカウントを削除</button>
            </div>
          </template>

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
              @keydown.enter="(e) => { if (!e.isComposing) saveTask() }"
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
                <option value="done">DONE</option>
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
                class="mt-2 w-full py-1.5 rounded-lg border border-dashed text-[13px] cursor-pointer transition-all opacity-40 hover:opacity-80"
                :style="{ borderColor: boardColor(board), color: boardColor(board) }"
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
                class="mt-2 w-full py-1.5 rounded-lg border border-dashed text-[13px] cursor-pointer transition-all opacity-40 hover:opacity-80"
                :style="{ borderColor: boardColor(board), color: boardColor(board) }"
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
              <!-- Date detail panel -->
              <transition name="slide-fade">
                <div v-if="selectedDate && (doneView === 'line' || doneView === 'stacked')" class="w-80 flex-none bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 self-stretch overflow-y-auto max-h-[480px]">
                  <div class="flex items-center justify-between mb-2.5">
                    <span class="text-[13px] font-bold text-white">{{ formatDate(selectedDate) }}</span>
                    <button class="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-300 text-xs cursor-pointer" @click="selectedDate = null">✕</button>
                  </div>
                  <template v-for="board in boards" :key="board.id">
                    <template v-if="board.done[selectedDate]?.length">
                      <p class="m-0 mb-1 text-[11px] font-bold uppercase tracking-wide" :style="{ color: boardColor(board) }">{{ board.name }}</p>
                      <ul class="list-none m-0 p-0 mb-2.5 flex flex-col gap-1">
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
            <!-- ボード名ヘッダー -->
            <div
              class="text-[13px] font-bold uppercase tracking-[0.05em] mb-1.5 px-1.5 py-1 rounded-lg border-l-4"
              :style="{ color: boardColor(board), borderColor: boardColor(board), backgroundColor: boardColor(board) + '12' }"
            >{{ board.name }}</div>
            <div class="grid grid-cols-2 gap-1.5">
              <!-- TODO (左) -->
              <div class="rounded-xl p-2 border flex flex-col" :style="boardBorderStyle(board)">
                <div class="text-[11px] font-bold mb-1 text-white/80">TODO<span v-if="board.todo.length" class="ml-1">({{ board.todo.length }})</span></div>
                <ul class="list-none m-0 p-0 flex flex-col gap-1 min-h-[28px] max-h-[168px] overflow-y-auto">
                  <li
                    v-for="card in board.todo.slice(0, 5)"
                    :key="card.id"
                    :class="[
                      'bg-white/[0.04] border border-white/[0.07] rounded-lg px-2 py-1.5 flex items-start gap-1.5 cursor-pointer active:bg-white/[0.07]',
                      card.isOverdue ? 'border-red-500/40 bg-red-500/[0.06]' : '',
                      card.isUrgent ? 'border-amber-500/40 bg-amber-500/[0.06]' : '',
                    ]"
                    @click="openEditTask(card, board.id, 'todo')"
                  >
                    <button
                      class="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-white/20 bg-white/[0.04] hover:border-emerald-400/60 hover:bg-emerald-400/10 transition-all cursor-pointer flex items-center justify-center"
                      @click.stop="markDone(card, board)"
                    />
                    <span class="text-[14px] leading-snug text-white flex-1 min-w-0 break-words">{{ card.name }}</span>
                  </li>
                </ul>
                <button
                  class="mt-1.5 w-full py-1 rounded-lg border border-dashed text-[13px] cursor-pointer transition-all opacity-40 hover:opacity-80"
                  :style="{ borderColor: boardColor(board), color: boardColor(board) }"
                  @click="openAddTask(board.id, 'todo')"
                >＋</button>
              </div>
              <!-- DOING (右) -->
              <div class="rounded-xl p-2 border flex flex-col" :style="boardBorderStyle(board)">
                <div class="text-[11px] font-bold mb-1 text-white/80">DOING<span v-if="board.doing.length" class="ml-1">({{ board.doing.length }})</span></div>
                <ul class="list-none m-0 p-0 flex flex-col gap-1 min-h-[28px] max-h-[168px] overflow-y-auto">
                  <li
                    v-for="card in board.doing.slice(0, 5)"
                    :key="card.id"
                    :class="[
                      'bg-white/[0.04] border border-white/[0.07] rounded-lg px-2 py-1.5 flex items-start gap-1.5 cursor-pointer active:bg-white/[0.07]',
                      card.isOverdue ? 'border-red-500/40 bg-red-500/[0.06]' : '',
                      card.isUrgent ? 'border-amber-500/40 bg-amber-500/[0.06]' : '',
                    ]"
                    @click="openEditTask(card, board.id, 'doing')"
                  >
                    <button
                      class="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-white/20 bg-white/[0.04] hover:border-emerald-400/60 hover:bg-emerald-400/10 transition-all cursor-pointer flex items-center justify-center"
                      @click.stop="markDone(card, board)"
                    />
                    <span class="text-[14px] leading-snug text-white flex-1 min-w-0 break-words">{{ card.name }}</span>
                  </li>
                </ul>
                <button
                  class="mt-1.5 w-full py-1 rounded-lg border border-dashed text-[13px] cursor-pointer transition-all opacity-40 hover:opacity-80"
                  :style="{ borderColor: boardColor(board), color: boardColor(board) }"
                  @click="openAddTask(board.id, 'doing')"
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
              <!-- 左半分: 直近1週間のDONEリスト（日付新しい順・フラット） -->
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
