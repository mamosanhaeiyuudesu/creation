<script setup lang="ts">
const LS_KEY = 'trello_key'
const LS_TOKEN = 'trello_token'
const LS_EXCLUDED = 'trello_excluded'

const DEFAULT_EXCLUDED =
  '3.otter,8.Basic-ph2,4:インベーダーゲーム,5:LINE-bot,5:アファーメーションbot,6:執筆活動,7:家族,7:運転,8:旨,8:釣り,8:転職,9:FLSアプリ,4:tableau,6.相関-α版,2.flaskでWebアプリ,3.おすすめキーワード検証,5.クラスタリングAPI,8.新時系列キーワード,9.新検索推移,新Trend,変化アラート'

interface Card {
  name: string
  isOverdue: boolean
  isUrgent: boolean
  display: string
}

interface Board {
  id: string
  name: string
  doing: Card[]
  todo: Card[]
  done: Record<string, string[]>
}

const apiKey = ref('')
const apiToken = ref('')
const excludedText = ref(DEFAULT_EXCLUDED)

const showSettings = ref(false)
const settingsKey = ref('')
const settingsToken = ref('')
const settingsExcluded = ref('')

const loading = ref(false)
const error = ref('')
const boards = ref<Board[]>([])
const allDates = ref<string[]>([])

const now = new Date()
const startMonth = ref(`${now.getFullYear()}-01`)
const endMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

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
        const board: Board = { id: b.id, name: b.name, doing: [], todo: [], done: {} }

        await Promise.all(
          lists.map(async (list: any) => {
            const lname = list.name.toLowerCase()
            if (!['doing', 'todo', 'done'].includes(lname)) return

            const cards = await trelloGet(`/lists/${list.id}/cards`)

            for (const card of cards) {
              if (lname === 'doing' || lname === 'todo') {
                const c: Card = { name: card.name, isOverdue: false, isUrgent: false, display: '' }
                if (card.due) Object.assign(c, timeRemaining(card.due))
                lname === 'doing' ? board.doing.push(c) : board.todo.push(c)
              } else {
                if (!card.due) continue
                const due = new Date(card.due)
                if (due < rangeStart || due > rangeEnd) continue
                const jst = new Date(due.getTime() + 9 * 3_600_000)
                const key = jst.toISOString().slice(0, 10)
                ;(board.done[key] ??= []).push(card.name)
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
</script>

<template>
  <div class="page">
    <!-- Header -->
    <header class="header">
      <NuxtLink to="/" class="back-link">← ホーム</NuxtLink>
      <h1 class="title">タスクくん</h1>
      <div v-if="hasCredentials" class="header__filter">
        <input v-model="startMonth" class="filter-bar__input" type="month" />
        <span class="filter-bar__sep">〜</span>
        <input v-model="endMonth" class="filter-bar__input" type="month" />
        <button class="btn btn--primary" :disabled="loading" @click="load">
          {{ loading ? '…' : '更新' }}
        </button>
      </div>
      <button class="settings-btn" title="設定" @click="openSettings">⚙</button>
    </header>

    <!-- Settings Modal -->
    <Teleport to="body">
      <div v-if="showSettings" class="overlay" @click.self="showSettings = false">
        <div class="modal">
          <h2 class="modal__title">設定</h2>

          <label class="modal__label">Trello API Key</label>
          <input v-model="settingsKey" class="modal__input" type="text" placeholder="API Key" />

          <label class="modal__label">Trello Token</label>
          <input v-model="settingsToken" class="modal__input" type="text" placeholder="Token" />

          <label class="modal__label">非表示ボード（カンマ区切り）</label>
          <textarea v-model="settingsExcluded" class="modal__textarea" rows="6" />

          <div class="modal__actions">
            <button class="btn btn--ghost" @click="showSettings = false">キャンセル</button>
            <button class="btn btn--primary" @click="saveSettings">保存して読み込む</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- No credentials -->
    <div v-if="!hasCredentials" class="empty-state">
      <div class="empty-state__icon">🔑</div>
      <p>APIキーが未設定です</p>
      <button class="btn btn--primary" @click="openSettings">設定を開く</button>
    </div>

    <template v-else>
      <!-- Error -->
      <div v-if="error" class="error-bar">⚠ {{ error }}</div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="skeleton-wrap">
        <div v-for="i in 3" :key="i" class="skeleton-section">
          <div class="skeleton-heading" />
          <div class="skeleton-cols">
            <div v-for="j in 4" :key="j" class="skeleton-col">
              <div class="skeleton-card" />
              <div class="skeleton-card skeleton-card--short" />
              <div class="skeleton-card" />
            </div>
          </div>
        </div>
      </div>

      <template v-else>
        <!-- ─── DOING ─── -->
        <section class="section section--doing">
          <div class="section__header">
            <span class="section__badge section__badge--doing">DOING</span>
            <span class="section__count">{{ doingTotal }}</span>
          </div>
          <div v-if="doingTotal === 0" class="section__empty">なし</div>
          <div v-else class="cols-scroll">
            <div v-for="board in boards" :key="board.id" class="col col--doing">
              <div class="col__name">{{ board.name }}</div>
              <ul class="col__list">
                <li
                  v-for="(card, i) in board.doing"
                  :key="i"
                  class="card"
                  :class="{ 'card--overdue': card.isOverdue, 'card--urgent': card.isUrgent }"
                >
                  <span class="card__name">{{ card.name }}</span>
                  <span v-if="card.display" class="card__due">{{ card.display }}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- ─── TODO ─── -->
        <section class="section section--todo">
          <div class="section__header">
            <span class="section__badge section__badge--todo">TODO</span>
            <span class="section__count">{{ todoTotal }}</span>
          </div>
          <div v-if="todoTotal === 0" class="section__empty">なし</div>
          <div v-else class="cols-scroll">
            <div v-for="board in boards" :key="board.id" class="col col--todo">
              <div class="col__name">{{ board.name }}</div>
              <ul class="col__list">
                <li
                  v-for="(card, i) in board.todo"
                  :key="i"
                  class="card"
                  :class="{ 'card--overdue': card.isOverdue, 'card--urgent': card.isUrgent }"
                >
                  <span class="card__name">{{ card.name }}</span>
                  <span v-if="card.display" class="card__due">{{ card.display }}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- ─── DONE ─── -->
        <section class="section section--done">
          <div class="section__header">
            <span class="section__badge section__badge--done">DONE</span>
            <span class="section__count">{{ boards.reduce((s, b) => s + doneTotal(b), 0) }}</span>
          </div>
          <div v-if="allDates.length === 0" class="section__empty">期間内の完了タスクなし</div>
          <div v-else class="done-wrap">
            <table class="done-table">
              <thead>
                <tr>
                  <th class="done-table__date-col">日付</th>
                  <th v-for="board in boards" :key="board.id" class="done-table__board-col">
                    {{ board.name }}
                  </th>
                </tr>
                <tr class="done-table__total-row">
                  <td class="done-table__date-col">合計</td>
                  <td v-for="board in boards" :key="board.id">{{ doneTotal(board) }}</td>
                </tr>
              </thead>
              <tbody>
                <tr v-for="date in allDates" :key="date">
                  <td class="done-table__date-cell">{{ formatDate(date) }}</td>
                  <td v-for="board in boards" :key="board.id" class="done-table__task-cell">
                    <ul v-if="board.done[date]" class="done-list">
                      <li v-for="(name, i) in board.done[date]" :key="i">{{ name }}</li>
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

<style scoped>
/* ── Base ── */
.page {
  min-height: 100vh;
  padding: 0 0 64px;
  color: #e2e8f0;
  font-size: 14px;
}

/* ── Header ── */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.back-link {
  color: #64748b;
  text-decoration: none;
  font-size: 13px;
  white-space: nowrap;
  transition: color 0.2s;
}
.back-link:hover {
  color: #94a3b8;
}

.title {
  flex: none;
  margin: 0 0 0 8px;
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #38bdf8, #6366f1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.settings-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
}
.settings-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
}

/* ── Header filter ── */
.header__filter {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.filter-bar__input {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 6px 10px;
  color: #e2e8f0;
  font-size: 13px;
  color-scheme: dark;
}

.filter-bar__sep {
  color: #475569;
}

/* ── Buttons ── */
.btn {
  padding: 7px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s, transform 0.15s;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn:not(:disabled):hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
.btn--primary {
  background: linear-gradient(135deg, #38bdf8, #6366f1);
  color: #fff;
}
.btn--ghost {
  background: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* ── Error ── */
.error-bar {
  margin: 12px 20px;
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #fca5a5;
  font-size: 13px;
}

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 60vh;
  color: #475569;
}
.empty-state__icon {
  font-size: 48px;
}

/* ── Skeleton ── */
.skeleton-wrap {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.skeleton-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.skeleton-heading {
  width: 120px;
  height: 24px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  animation: pulse 1.5s ease-in-out infinite;
}
.skeleton-cols {
  display: flex;
  gap: 12px;
}
.skeleton-col {
  width: 200px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.skeleton-card {
  height: 56px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  animation: pulse 1.5s ease-in-out infinite;
}
.skeleton-card--short {
  height: 40px;
}
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

/* ── Section ── */
.section {
  padding: 20px 20px 0;
  margin-bottom: 32px;
}

.section__header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.section__badge {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
}
.section__badge--doing {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
}
.section__badge--todo {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}
.section__badge--done {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.section__count {
  font-size: 20px;
  font-weight: 700;
  color: #475569;
}

.section__empty {
  padding: 16px;
  color: #475569;
  font-size: 13px;
}

/* ── Board columns ── */
.cols-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}

.col {
  width: 200px;
  flex-shrink: 0;
  border-radius: 12px;
  padding: 12px;
}
.col--doing {
  background: rgba(56, 189, 248, 0.05);
  border: 1px solid rgba(56, 189, 248, 0.15);
}
.col--todo {
  background: rgba(245, 158, 11, 0.05);
  border: 1px solid rgba(245, 158, 11, 0.15);
}

.col__name {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.05em;
  margin-bottom: 10px;
  text-transform: uppercase;
}

.col__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ── Card ── */
.card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  transition: border-color 0.2s, background 0.2s;
}
.card:hover {
  background: rgba(255, 255, 255, 0.07);
}
.card--urgent {
  border-color: rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.06);
}
.card--overdue {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.06);
}

.card__name {
  font-size: 13px;
  line-height: 1.4;
  color: #cbd5e1;
}

.card__due {
  font-size: 11px;
  color: #64748b;
}
.card--urgent .card__due {
  color: #f59e0b;
  font-weight: 600;
}
.card--overdue .card__due {
  color: #ef4444;
  font-weight: 600;
}

/* ── Done table ── */
.done-wrap {
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.done-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  table-layout: fixed;
}

.done-table th,
.done-table td {
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 8px 10px;
  text-align: left;
  vertical-align: top;
}

.done-table th {
  background: rgba(16, 185, 129, 0.08);
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.done-table__date-col {
  width: 90px;
  min-width: 90px;
}

.done-table__board-col {
  width: auto;
}

.done-table__total-row td {
  background: rgba(255, 255, 255, 0.03);
  font-weight: 700;
  color: #94a3b8;
}

.done-table__date-cell {
  white-space: nowrap;
  color: #64748b;
  font-size: 12px;
}

.done-table__task-cell {
  min-width: 140px;
}

.done-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.done-list li {
  padding: 3px 6px;
  background: rgba(16, 185, 129, 0.08);
  border-radius: 4px;
  border-left: 2px solid rgba(16, 185, 129, 0.4);
  line-height: 1.4;
  color: #a7f3d0;
  font-size: 12px;
}

/* ── Modal ── */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal {
  width: min(520px, 100%);
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal__title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
  color: #f1f5f9;
}

.modal__label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 0.05em;
  margin-top: 4px;
}

.modal__input,
.modal__textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 9px 12px;
  color: #e2e8f0;
  font-size: 13px;
  font-family: inherit;
  box-sizing: border-box;
}

.modal__textarea {
  resize: vertical;
  min-height: 120px;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.6;
}

.modal__input:focus,
.modal__textarea:focus {
  outline: none;
  border-color: rgba(56, 189, 248, 0.5);
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.1);
}

.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>
