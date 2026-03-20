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
  <div class="min-h-screen pb-16 text-[#e2e8f0] text-sm">
    <!-- Header -->
    <header class="sticky top-0 z-[100] flex items-center gap-3 px-5 py-3.5 bg-[rgba(15,23,42,0.92)] backdrop-blur-[12px] border-b border-white/[0.08]">
      <NuxtLink to="/" class="text-slate-500 no-underline text-[13px] whitespace-nowrap transition-colors hover:text-slate-400">← ホーム</NuxtLink>
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
        class="w-9 h-9 rounded-lg border border-white/10 bg-white/[0.06] text-slate-400 text-lg cursor-pointer flex items-center justify-center transition-all hover:bg-white/[0.12] hover:text-[#e2e8f0] ml-auto"
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

    <!-- No credentials -->
    <div v-if="!hasCredentials" class="flex flex-col items-center justify-center gap-3 min-h-[60vh] text-slate-500">
      <div class="text-5xl">🔑</div>
      <p class="m-0">APIキーが未設定です</p>
      <button class="px-4 py-2 rounded-lg border-none bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-[13px] font-semibold cursor-pointer" @click="openSettings">設定を開く</button>
    </div>

    <template v-else>
      <!-- Error -->
      <div v-if="error" class="mx-5 my-3 px-3.5 py-2.5 bg-red-500/12 border border-red-500/30 rounded-lg text-red-300 text-[13px]">⚠ {{ error }}</div>

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
          <div v-if="doingTotal === 0" class="px-4 py-4 text-slate-600 text-[13px]">なし</div>
          <div v-else class="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
            <div v-for="board in boards" :key="board.id" class="w-[200px] flex-shrink-0 rounded-xl p-3 bg-sky-400/[0.05] border border-sky-400/15">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-[0.05em] mb-2.5">{{ board.name }}</div>
              <ul class="list-none m-0 p-0 flex flex-col gap-1.5">
                <li
                  v-for="(card, i) in board.doing"
                  :key="i"
                  :class="[
                    'bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-2 flex flex-col gap-0.5 transition-all hover:bg-white/[0.07]',
                    card.isOverdue ? 'border-red-500/40 bg-red-500/[0.06]' : '',
                    card.isUrgent ? 'border-amber-500/40 bg-amber-500/[0.06]' : '',
                  ]"
                >
                  <span class="text-[13px] leading-snug text-slate-300">{{ card.name }}</span>
                  <span v-if="card.display" :class="['text-[11px]', card.isOverdue ? 'text-red-500 font-semibold' : card.isUrgent ? 'text-amber-500 font-semibold' : 'text-slate-500']">{{ card.display }}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- TODO -->
        <section class="px-5 mb-8">
          <div class="flex items-center gap-2.5 mb-3.5">
            <span class="inline-block px-3 py-0.5 rounded-full text-[11px] font-[800] tracking-[0.1em] bg-amber-500/15 text-amber-500 border border-amber-500/30">TODO</span>
            <span class="text-xl font-bold text-slate-600">{{ todoTotal }}</span>
          </div>
          <div v-if="todoTotal === 0" class="px-4 py-4 text-slate-600 text-[13px]">なし</div>
          <div v-else class="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
            <div v-for="board in boards" :key="board.id" class="w-[200px] flex-shrink-0 rounded-xl p-3 bg-amber-500/[0.05] border border-amber-500/15">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-[0.05em] mb-2.5">{{ board.name }}</div>
              <ul class="list-none m-0 p-0 flex flex-col gap-1.5">
                <li
                  v-for="(card, i) in board.todo"
                  :key="i"
                  :class="[
                    'bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-2 flex flex-col gap-0.5 transition-all hover:bg-white/[0.07]',
                    card.isOverdue ? 'border-red-500/40 bg-red-500/[0.06]' : '',
                    card.isUrgent ? 'border-amber-500/40 bg-amber-500/[0.06]' : '',
                  ]"
                >
                  <span class="text-[13px] leading-snug text-slate-300">{{ card.name }}</span>
                  <span v-if="card.display" :class="['text-[11px]', card.isOverdue ? 'text-red-500 font-semibold' : card.isUrgent ? 'text-amber-500 font-semibold' : 'text-slate-500']">{{ card.display }}</span>
                </li>
              </ul>
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
                      <li v-for="(name, i) in board.done[date]" :key="i" class="px-1.5 py-0.5 bg-emerald-500/[0.08] rounded border-l-2 border-emerald-500/40 leading-snug text-[#a7f3d0] text-xs">{{ name }}</li>
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
