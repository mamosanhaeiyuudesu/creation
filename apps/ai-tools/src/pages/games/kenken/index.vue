<template>
  <div class="flex flex-col items-center py-6 px-3 min-h-full select-none">
    <!-- ═══ Stage Clear overlay ═══ -->
    <Transition name="ovl">
      <div v-if="phase === 'clear'" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 backdrop-blur-sm px-4">
        <div class="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-emerald-400/40 rounded-3xl p-7 text-center max-w-sm w-full shadow-[0_0_60px_rgba(52,211,153,0.25)] animate-[pop_0.4s_cubic-bezier(0.34,1.56,0.64,1)]">
          <div class="flex justify-center gap-1.5 text-3xl mb-1">
            <span class="animate-[wiggle_0.5s_ease_infinite]">🎉</span>
            <span class="animate-[wiggle_0.5s_ease_0.1s_infinite]">🧠</span>
            <span class="animate-[wiggle_0.5s_ease_0.2s_infinite]">🎉</span>
          </div>
          <p class="text-emerald-400 text-sm font-semibold mb-1 tracking-wider">ステージ {{ stage + 1 }} クリア！</p>
          <h2 class="m-0 text-2xl font-extrabold bg-gradient-to-r from-yellow-300 via-emerald-300 to-teal-300 bg-clip-text text-transparent mb-1 leading-tight">
            {{ STAGES[stage].name }}
          </h2>
          <p class="font-mono text-3xl font-bold text-white mb-1">{{ formatTime(clearSeconds) }}</p>
          <p v-if="isNewBest" class="text-amber-300 text-xs font-bold mb-3">✨ 自己ベスト更新！</p>
          <p v-else class="text-slate-500 text-xs mb-3">ベスト: {{ bestTimes[stage] ? formatTime(bestTimes[stage]) : '—' }}</p>

          <!-- ランキング登録 -->
          <div v-if="!recorded" class="bg-white/[0.04] border border-white/10 rounded-2xl p-3 mb-3">
            <p class="text-slate-400 text-xs mb-2">🏆 ランキングに登録（3文字）</p>
            <div class="flex gap-2 items-center justify-center">
              <input
                v-model="nameInput"
                maxlength="3"
                placeholder="ABC"
                class="w-24 text-center uppercase font-mono text-lg tracking-widest py-2 rounded-lg bg-slate-900/60 border border-slate-600 text-white outline-none focus:border-emerald-400"
                @input="nameInput = nameInput.toUpperCase().replace(/[^A-Z]/g, '')"
                @keyup.enter="submitRecord"
              >
              <button
                class="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm cursor-pointer border-none disabled:opacity-40"
                :disabled="nameInput.length !== 3 || submitting"
                @click="submitRecord"
              >登録</button>
            </div>
          </div>
          <p v-else-if="myRank" class="text-emerald-300 text-sm font-bold mb-3">あなたは第 {{ myRank }} 位！</p>

          <!-- Top times -->
          <div v-if="leaderboard.length" class="text-left mb-4 max-h-40 overflow-y-auto">
            <div
              v-for="r in leaderboard" :key="r.rank"
              class="flex items-center justify-between text-xs py-1 px-2 rounded-lg"
              :class="r.rank <= 3 ? 'text-amber-200' : 'text-slate-400'"
            >
              <span class="font-mono">{{ ['🥇','🥈','🥉'][r.rank-1] || `${r.rank}.` }} {{ r.name }}</span>
              <span class="font-mono">{{ formatTime(r.seconds) }}</span>
            </div>
          </div>

          <button
            v-if="stage < STAGES.length - 1"
            class="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-base cursor-pointer border-none hover:opacity-90 transition-opacity mb-2"
            @click="goStage(stage + 1)"
          >次のステージへ →</button>
          <button
            v-else
            class="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base cursor-pointer border-none hover:opacity-90 transition-opacity mb-2"
            @click="phase = 'select'"
          >🏆 全ステージ制覇！</button>
          <button
            class="w-full py-2.5 rounded-xl border border-slate-600 text-slate-400 text-sm font-medium cursor-pointer bg-transparent hover:bg-white/[0.06] transition-colors"
            @click="phase = 'select'"
          >ステージ選択へ</button>
        </div>
      </div>
    </Transition>

    <!-- ═══ Stage select ═══ -->
    <template v-if="phase === 'select'">
      <h1 class="m-0 text-3xl font-bold bg-gradient-to-br from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-1">
        🧠 賢くなるパズル
      </h1>
      <p class="text-slate-500 text-sm mb-1">ケンケン（KenKen）</p>
      <p class="text-slate-500 text-xs mb-8 text-center max-w-md leading-relaxed">
        各タテ・ヨコの列に 1〜N の数字を1回ずつ。太線ブロック内の数字を計算すると、左上の目標値になるよ。四則計算の暗算力が鍛えられる！
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
        <button
          v-for="(s, i) in STAGES" :key="i"
          class="text-left no-underline border rounded-2xl p-5 flex flex-col gap-2 transition-all duration-200 cursor-pointer"
          :class="i <= unlocked
            ? 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:border-emerald-400/30 hover:shadow-[0_0_24px_rgba(52,211,153,0.12)]'
            : 'bg-white/[0.02] border-white/[0.04] opacity-40 cursor-not-allowed'"
          :disabled="i > unlocked"
          @click="i <= unlocked && goStage(i)"
        >
          <div class="flex items-center justify-between">
            <span class="text-2xl font-black text-slate-100">{{ s.size }}×{{ s.size }}</span>
            <span v-if="i > unlocked" class="text-lg">🔒</span>
            <span v-else-if="bestTimes[i]" class="text-xs font-mono text-emerald-400/80">⏱ {{ formatTime(bestTimes[i]) }}</span>
          </div>
          <div>
            <p class="m-0 text-sm font-bold text-slate-200">STAGE {{ i + 1 }} · {{ s.name }}</p>
            <p class="m-0 mt-0.5 text-xs text-slate-500">使う記号: {{ s.ops.join(' ') }}</p>
          </div>
        </button>
      </div>

      <NuxtLink to="/games" class="mt-8 text-slate-500 text-sm no-underline hover:text-slate-300 transition-colors">← ゲーム一覧へ</NuxtLink>
    </template>

    <!-- ═══ Playing ═══ -->
    <template v-else>
      <!-- Header -->
      <div class="w-full flex items-center justify-between mb-3" :style="{ maxWidth: boardPx + 'px' }">
        <button class="text-slate-400 text-sm cursor-pointer bg-transparent border-none hover:text-slate-200" @click="phase = 'select'">← 戻る</button>
        <div class="text-center">
          <p class="m-0 text-xs text-emerald-400 font-semibold">STAGE {{ stage + 1 }} · {{ STAGES[stage].size }}×{{ STAGES[stage].size }}</p>
          <p class="m-0 text-[11px] text-slate-500">{{ STAGES[stage].name }}</p>
        </div>
        <div class="font-mono text-base font-bold text-slate-200 tabular-nums w-16 text-right">{{ formatTime(elapsed) }}</div>
      </div>

      <!-- Board -->
      <div
        class="relative bg-slate-900/40 rounded-xl p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
      >
        <div
          class="grid rounded-md overflow-hidden"
          :style="{ gridTemplateColumns: `repeat(${size}, ${cellPx}px)`, width: (cellPx * size) + 'px' }"
        >
          <div
            v-for="i in size * size" :key="i - 1"
            class="relative flex items-center justify-center box-border"
            :style="cellStyle(i - 1)"
            @click="selectCell(i - 1)"
          >
            <!-- cage label -->
            <span
              v-if="cageLabelAt(i - 1)"
              class="absolute top-0 left-0.5 font-bold leading-none pointer-events-none"
              :class="cageErrorSet.has(cageOfCell[i - 1]) ? 'text-red-400' : 'text-slate-300'"
              :style="{ fontSize: (cellPx * 0.26) + 'px' }"
            >{{ cageLabelAt(i - 1) }}</span>

            <!-- value -->
            <span
              v-if="board[i - 1]"
              class="font-bold leading-none"
              :class="[
                fixed[i - 1] ? 'text-slate-400' : conflictSet.has(i - 1) ? 'text-red-400' : 'text-emerald-100',
                selVal && board[i - 1] === selVal && !conflictSet.has(i - 1) ? 'drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]' : ''
              ]"
              :style="{ fontSize: (cellPx * 0.5) + 'px' }"
            >{{ board[i - 1] }}</span>

            <!-- notes -->
            <div
              v-else-if="notes[i - 1].length"
              class="absolute inset-0 grid place-items-center p-1"
              :style="{ gridTemplateColumns: `repeat(${noteCols}, 1fr)` }"
            >
              <span
                v-for="n in size" :key="n"
                class="text-slate-500 leading-none text-center"
                :style="{ fontSize: (cellPx * 0.2) + 'px' }"
              >{{ notes[i - 1].includes(n) ? n : '' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Number pad -->
      <div class="flex flex-wrap gap-2 justify-center mt-4" :style="{ maxWidth: boardPx + 'px' }">
        <button
          v-for="n in size" :key="n"
          class="rounded-xl font-bold border transition-all cursor-pointer active:scale-95"
          :class="memoMode
            ? 'bg-amber-500/10 border-amber-400/40 text-amber-200 hover:bg-amber-500/20'
            : 'bg-white/[0.06] border-white/10 text-slate-100 hover:bg-emerald-500/20 hover:border-emerald-400/40'"
          :style="{ width: padPx + 'px', height: padPx + 'px', fontSize: (padPx * 0.42) + 'px' }"
          @click="inputNumber(n)"
        >{{ n }}</button>
      </div>

      <!-- Controls -->
      <div class="flex gap-2 justify-center mt-3 flex-wrap" :style="{ maxWidth: boardPx + 'px' }">
        <button
          class="px-4 py-2.5 rounded-xl font-semibold text-sm border transition-colors cursor-pointer"
          :class="memoMode ? 'bg-amber-500/20 border-amber-400/50 text-amber-200' : 'bg-white/[0.05] border-white/10 text-slate-300 hover:bg-white/[0.1]'"
          @click="memoMode = !memoMode"
        >✏️ メモ {{ memoMode ? 'ON' : 'OFF' }}</button>
        <button class="px-4 py-2.5 rounded-xl font-semibold text-sm bg-white/[0.05] border border-white/10 text-slate-300 hover:bg-white/[0.1] transition-colors cursor-pointer" @click="erase">🧽 消す</button>
        <button class="px-4 py-2.5 rounded-xl font-semibold text-sm bg-white/[0.05] border border-white/10 text-slate-300 hover:bg-white/[0.1] transition-colors cursor-pointer disabled:opacity-40" :disabled="!history.length" @click="undo">↩︎ 戻す</button>
        <button class="px-4 py-2.5 rounded-xl font-semibold text-sm bg-sky-500/10 border border-sky-400/40 text-sky-200 hover:bg-sky-500/20 transition-colors cursor-pointer" @click="hint">💡 ヒント</button>
      </div>

      <div class="flex gap-4 mt-4 text-xs text-slate-500">
        <button class="cursor-pointer bg-transparent border-none text-slate-500 hover:text-slate-300 transition-colors" @click="newPuzzle">🔄 別の問題</button>
        <span>ヒント使用: {{ hintsUsed }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

useHead({
  title: '賢くなるパズル（ケンケン）',
  link: [{ rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧠</text></svg>` }],
})

type Op = '+' | '-' | '×' | '÷'
interface StageDef { size: number; ops: Op[]; maxCage: number; name: string }
interface Cage { cells: number[]; op: Op | '='; target: number }

// ── ステージ定義（5まで。いずれ10まで拡張予定。ここに追加するだけでOK）──
const STAGES: StageDef[] = [
  { size: 3, ops: ['+', '-', '×', '÷'], maxCage: 3, name: 'はじめの一歩' },
  { size: 4, ops: ['+', '-', '×'],      maxCage: 3, name: 'かけ算あそび' },
  { size: 4, ops: ['+', '-', '×', '÷'], maxCage: 4, name: 'わり算とうじょう' },
  { size: 5, ops: ['+', '-', '×', '÷'], maxCage: 4, name: '五の試練' },
  { size: 6, ops: ['+', '-', '×', '÷'], maxCage: 4, name: '六マスの迷宮' },
]

// ── 状態 ──
const phase = ref<'select' | 'playing' | 'clear'>('select')
const stage = ref(0)
const size = ref(3)
const cages = ref<Cage[]>([])
const cageOfCell = ref<number[]>([])
const solution = ref<number[]>([])
const board = ref<number[]>([])
const notes = ref<number[][]>([])
const fixed = ref<boolean[]>([])
const selectedCell = ref<number | null>(null)
const memoMode = ref(false)
const history = ref<{ board: number[]; notes: number[][] }[]>([])
const hintsUsed = ref(0)

// ── 進捗（localStorage）──
const unlocked = ref(0)
const bestTimes = ref<Record<number, number>>({})

// ── タイマー ──
const elapsed = ref(0)
const clearSeconds = ref(0)
let timerId: ReturnType<typeof setInterval> | null = null

// ── ランキング ──
const nameInput = ref('')
const submitting = ref(false)
const recorded = ref(false)
const myRank = ref<number | null>(null)
const leaderboard = ref<{ rank: number; name: string; seconds: number }[]>([])
const isNewBest = ref(false)

// ── レイアウト ──
const boardPx = ref(400)
const cellPx = computed(() => Math.floor(boardPx.value / size.value))
const padPx = computed(() => Math.min(56, Math.floor((boardPx.value - (size.value - 1) * 8) / Math.max(size.value, 5))))
const noteCols = computed(() => Math.ceil(Math.sqrt(size.value)))

function computeBoardPx() {
  const avail = Math.min(window.innerWidth - 32, 460)
  boardPx.value = Math.max(240, avail)
}

// ═══════════════════ パズル生成 ═══════════════════
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ランダムなラテン方陣（各行・各列に1〜nが1回ずつ）
function genLatin(n: number): number[] {
  let sq: number[][] = Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => ((r + c) % n) + 1)
  )
  sq = shuffle(sq)                                    // 行シャッフル
  const colOrder = shuffle([...Array(n).keys()])       // 列シャッフル
  sq = sq.map(row => colOrder.map(c => row[c]))
  const relabel = shuffle([...Array(n).keys()].map(i => i + 1)) // 数字入れ替え
  sq = sq.map(row => row.map(v => relabel[v - 1]))
  return sq.flat()
}

function cageSizePick(max: number): number {
  const r = Math.random()
  if (max >= 4) return r < 0.12 ? 1 : r < 0.55 ? 2 : r < 0.85 ? 3 : 4
  if (max >= 3) return r < 0.18 ? 1 : r < 0.66 ? 2 : 3
  return r < 0.35 ? 1 : 2
}

function neighborsOf(cell: number, n: number): number[] {
  const r = Math.floor(cell / n), c = cell % n
  const res: number[] = []
  if (r > 0) res.push(cell - n)
  if (r < n - 1) res.push(cell + n)
  if (c > 0) res.push(cell - 1)
  if (c < n - 1) res.push(cell + 1)
  return res
}

// セルをブロック（ケージ）に分割
function partition(n: number, maxCage: number): number[] {
  const total = n * n
  const owner = new Array(total).fill(-1)
  let cageId = 0
  for (const start of shuffle([...Array(total).keys()])) {
    if (owner[start] !== -1) continue
    const target = cageSizePick(maxCage)
    const cage = [start]
    owner[start] = cageId
    while (cage.length < target) {
      const cand: number[] = []
      for (const cell of cage)
        for (const nb of neighborsOf(cell, n))
          if (owner[nb] === -1) cand.push(nb)
      if (!cand.length) break
      const pick = cand[Math.floor(Math.random() * cand.length)]
      owner[pick] = cageId
      cage.push(pick)
    }
    cageId++
  }

  // 単独セル（＝ヒント）を減らす：可能なら隣のケージに合流
  const sizes: Record<number, number> = {}
  owner.forEach(id => { sizes[id] = (sizes[id] || 0) + 1 })
  for (let cell = 0; cell < total; cell++) {
    if (sizes[owner[cell]] !== 1) continue
    const nb = neighborsOf(cell, n).find(x => sizes[owner[x]] < maxCage && owner[x] !== owner[cell])
    if (nb !== undefined) {
      sizes[owner[cell]]--
      owner[cell] = owner[nb]
      sizes[owner[cell]]++
    }
  }
  return owner
}

// ケージごとに演算子と目標値を決める
function assignOp(vals: number[], allowed: Op[]): { op: Op | '='; target: number } {
  if (vals.length === 1) return { op: '=', target: vals[0] }

  const options: { op: Op; target: number }[] = []
  const sum = vals.reduce((a, b) => a + b, 0)
  const prod = vals.reduce((a, b) => a * b, 1)

  if (vals.length === 2) {
    const [a, b] = vals
    const equal = a === b
    if (allowed.includes('+')) options.push({ op: '+', target: sum })
    if (allowed.includes('×')) options.push({ op: '×', target: prod })
    if (!equal && allowed.includes('-')) options.push({ op: '-', target: Math.abs(a - b) })
    if (!equal && allowed.includes('÷')) {
      const hi = Math.max(a, b), lo = Math.min(a, b)
      if (hi % lo === 0) options.push({ op: '÷', target: hi / lo })
    }
  } else {
    // 3マス以上は加算・乗算のみ（ケンケンの標準ルール）
    if (allowed.includes('+')) options.push({ op: '+', target: sum })
    if (allowed.includes('×')) options.push({ op: '×', target: prod })
  }
  if (!options.length) return { op: '+', target: sum }
  return options[Math.floor(Math.random() * options.length)]
}

function generate(def: StageDef) {
  const n = def.size
  const sol = genLatin(n)
  const owner = partition(n, def.maxCage)

  // ケージ組み立て（owner の id を cages 配列の index に振り直す）
  const byId: Record<number, number[]> = {}
  owner.forEach((id, cell) => { (byId[id] ||= []).push(cell) })
  const idToIndex: Record<number, number> = {}
  const built: Cage[] = []
  for (const [rawId, cells] of Object.entries(byId)) {
    const sorted = [...cells].sort((a, b) => a - b)
    const { op, target } = assignOp(sorted.map(c => sol[c]), def.ops)
    idToIndex[Number(rawId)] = built.length
    built.push({ cells: sorted, op, target })
  }
  const ownerIndex = owner.map(id => idToIndex[id])

  // 状態セット
  size.value = n
  solution.value = sol
  cages.value = built
  cageOfCell.value = ownerIndex
  board.value = new Array(n * n).fill(0)
  notes.value = Array.from({ length: n * n }, () => [])
  fixed.value = new Array(n * n).fill(false)
  // 単独ケージ（目標＝答え）は最初から確定として表示
  for (const cg of built) {
    if (cg.op === '=') {
      const c = cg.cells[0]
      board.value[c] = cg.target
      fixed.value[c] = true
    }
  }
  selectedCell.value = null
  memoMode.value = false
  history.value = []
  hintsUsed.value = 0
}

// ═══════════════════ 描画ヘルパー ═══════════════════
const EDGE = '#94a3b8'                    // 太線（ケージ境界）
const THIN = 'rgba(148,163,184,0.16)'     // 細線（同ケージ内）
const CAGE_TINTS = [
  'rgba(52,211,153,0.07)', 'rgba(96,165,250,0.07)', 'rgba(251,191,36,0.07)',
  'rgba(244,114,182,0.07)', 'rgba(167,139,250,0.07)', 'rgba(248,113,113,0.07)',
  'rgba(45,212,191,0.07)', 'rgba(163,230,53,0.07)', 'rgba(251,146,60,0.07)',
]

// 隣接ケージが同色にならないよう貪欲彩色
const cageTint = computed(() => {
  const tint: Record<number, number> = {}
  const adj: Record<number, Set<number>> = {}
  const n = size.value
  cageOfCell.value.forEach((id, cell) => {
    adj[id] ||= new Set()
    for (const nb of neighborsOf(cell, n)) {
      const o = cageOfCell.value[nb]
      if (o !== id) adj[id].add(o)
    }
  })
  Object.keys(adj).map(Number).sort((a, b) => a - b).forEach(id => {
    const used = new Set([...adj[id]].map(o => tint[o]).filter(v => v !== undefined))
    let c = 0
    while (used.has(c)) c++
    tint[id] = c % CAGE_TINTS.length
  })
  return tint
})

function cellStyle(i: number) {
  const n = size.value
  const r = Math.floor(i / n), c = i % n
  const id = cageOfCell.value[i]
  const diff = (nb: number | null) => nb === null || cageOfCell.value[nb] !== id
  const top = diff(r > 0 ? i - n : null)
  const bottom = diff(r < n - 1 ? i + n : null)
  const left = diff(c > 0 ? i - 1 : null)
  const right = diff(c < n - 1 ? i + 1 : null)

  const sel = selectedCell.value
  let bg = CAGE_TINTS[cageTint.value[id] ?? 0]
  if (sel !== null) {
    const sr = Math.floor(sel / n), sc = sel % n
    if (sel === i) bg = 'rgba(52,211,153,0.28)'
    else if (sr === r || sc === c) bg = 'rgba(148,163,184,0.09)'
  }

  return {
    width: cellPx.value + 'px',
    height: cellPx.value + 'px',
    background: bg,
    cursor: 'pointer',
    borderStyle: 'solid',
    borderTopWidth: top ? '2.5px' : '1px',
    borderBottomWidth: bottom ? '2.5px' : '1px',
    borderLeftWidth: left ? '2.5px' : '1px',
    borderRightWidth: right ? '2.5px' : '1px',
    borderTopColor: top ? EDGE : THIN,
    borderBottomColor: bottom ? EDGE : THIN,
    borderLeftColor: left ? EDGE : THIN,
    borderRightColor: right ? EDGE : THIN,
  }
}

const cageLabelCell = computed(() => {
  const map: Record<number, string> = {}
  for (const cg of cages.value) {
    const head = cg.cells[0]
    map[head] = cg.op === '=' ? String(cg.target) : `${cg.target}${cg.op}`
  }
  return map
})
function cageLabelAt(i: number): string | null {
  return cageLabelCell.value[i] ?? null
}

const selVal = computed(() => selectedCell.value === null ? 0 : board.value[selectedCell.value])

// 行・列の重複セル
const conflictSet = computed(() => {
  const n = size.value
  const bad = new Set<number>()
  for (let g = 0; g < n; g++) {
    const rowSeen: Record<number, number[]> = {}, colSeen: Record<number, number[]> = {}
    for (let k = 0; k < n; k++) {
      const rc = g * n + k, cc = k * n + g
      if (board.value[rc]) (rowSeen[board.value[rc]] ||= []).push(rc)
      if (board.value[cc]) (colSeen[board.value[cc]] ||= []).push(cc)
    }
    for (const arr of [...Object.values(rowSeen), ...Object.values(colSeen)])
      if (arr.length > 1) arr.forEach(x => bad.add(x))
  }
  return bad
})

// 埋まりきったのに計算が合わないケージ
const cageErrorSet = computed(() => {
  const bad = new Set<number>()
  cages.value.forEach((cg, idx) => {
    if (cg.cells.some(c => !board.value[c])) return
    if (!cageSatisfied(cg)) bad.add(idx)
  })
  return bad
})

function cageSatisfied(cg: Cage): boolean {
  const vals = cg.cells.map(c => board.value[c])
  switch (cg.op) {
    case '=': return vals[0] === cg.target
    case '+': return vals.reduce((a, b) => a + b, 0) === cg.target
    case '×': return vals.reduce((a, b) => a * b, 1) === cg.target
    case '-': return Math.abs(vals[0] - vals[1]) === cg.target
    case '÷': { const [a, b] = vals; return Math.max(a, b) / Math.min(a, b) === cg.target }
  }
}

// ═══════════════════ 操作 ═══════════════════
function selectCell(i: number) {
  selectedCell.value = i
}

function snapshot() {
  history.value.push({
    board: [...board.value],
    notes: notes.value.map(a => [...a]),
  })
  if (history.value.length > 200) history.value.shift()
}

function inputNumber(v: number) {
  const i = selectedCell.value
  if (i === null || fixed.value[i]) return
  if (memoMode.value) {
    if (board.value[i]) return
    snapshot()
    const arr = notes.value[i]
    const pos = arr.indexOf(v)
    if (pos >= 0) arr.splice(pos, 1)
    else { arr.push(v); arr.sort((a, b) => a - b) }
  } else {
    snapshot()
    board.value[i] = board.value[i] === v ? 0 : v
    notes.value[i] = []
    checkComplete()
  }
}

function erase() {
  const i = selectedCell.value
  if (i === null || fixed.value[i]) return
  snapshot()
  board.value[i] = 0
  notes.value[i] = []
}

function undo() {
  const prev = history.value.pop()
  if (!prev) return
  board.value = prev.board
  notes.value = prev.notes
}

function hint() {
  const i = selectedCell.value
  if (i === null || fixed.value[i] || board.value[i] === solution.value[i]) return
  snapshot()
  board.value[i] = solution.value[i]
  notes.value[i] = []
  hintsUsed.value++
  checkComplete()
}

function checkComplete() {
  if (board.value.some(v => !v)) return
  if (conflictSet.value.size) return
  if (!cages.value.every(cageSatisfied)) return
  onClear()
}

// ═══════════════════ フロー ═══════════════════
function goStage(idx: number) {
  stage.value = idx
  generate(STAGES[idx])
  phase.value = 'playing'
  elapsed.value = 0
  startTimer()
  computeBoardPx()
}

function newPuzzle() {
  generate(STAGES[stage.value])
  elapsed.value = 0
  startTimer()
}

function startTimer() {
  stopTimer()
  timerId = setInterval(() => { elapsed.value++ }, 1000)
}
function stopTimer() {
  if (timerId) { clearInterval(timerId); timerId = null }
}

async function onClear() {
  stopTimer()
  clearSeconds.value = elapsed.value
  const s = stage.value
  isNewBest.value = !bestTimes.value[s] || elapsed.value < bestTimes.value[s]
  if (isNewBest.value) bestTimes.value[s] = elapsed.value
  if (s + 1 > unlocked.value && s + 1 < STAGES.length) unlocked.value = s + 1
  else if (s === STAGES.length - 1) unlocked.value = Math.max(unlocked.value, s)
  saveProgress()

  recorded.value = false
  myRank.value = null
  nameInput.value = ''
  phase.value = 'clear'
  await loadLeaderboard()
}

async function submitRecord() {
  if (nameInput.value.length !== 3 || submitting.value) return
  submitting.value = true
  try {
    const res = await $fetch<{ ok: boolean; rank: number | null }>('/api/games/records', {
      method: 'POST',
      body: { game: `kenken-${stage.value}`, stage: stage.value + 1, name: nameInput.value, seconds: clearSeconds.value },
    })
    myRank.value = res.rank
    recorded.value = true
    await loadLeaderboard()
  } catch (e) {
    console.error(e)
  } finally {
    submitting.value = false
  }
}

async function loadLeaderboard() {
  try {
    leaderboard.value = await $fetch('/api/games/records', {
      params: { game: `kenken-${stage.value}`, stage: stage.value + 1 },
    })
  } catch {
    leaderboard.value = []
  }
}

// ═══════════════════ 進捗の保存/復元 ═══════════════════
function saveProgress() {
  try {
    localStorage.setItem('kenken-progress', JSON.stringify({
      unlocked: unlocked.value,
      best: bestTimes.value,
    }))
  } catch { /* noop */ }
}
function loadProgress() {
  try {
    const raw = localStorage.getItem('kenken-progress')
    if (raw) {
      const d = JSON.parse(raw)
      unlocked.value = d.unlocked ?? 0
      bestTimes.value = d.best ?? {}
    }
  } catch { /* noop */ }
}

// ═══════════════════ ユーティリティ ═══════════════════
function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function handleKey(e: KeyboardEvent) {
  if (phase.value !== 'playing') return
  const n = size.value
  const sel = selectedCell.value
  if (e.key >= '1' && e.key <= '9') {
    const v = Number(e.key)
    if (v <= n) { inputNumber(v); e.preventDefault() }
  } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
    erase(); e.preventDefault()
  } else if (e.key.toLowerCase() === 'm') {
    memoMode.value = !memoMode.value
  } else if (sel !== null && e.key.startsWith('Arrow')) {
    const r = Math.floor(sel / n), c = sel % n
    let nr = r, nc = c
    if (e.key === 'ArrowUp') nr = Math.max(0, r - 1)
    if (e.key === 'ArrowDown') nr = Math.min(n - 1, r + 1)
    if (e.key === 'ArrowLeft') nc = Math.max(0, c - 1)
    if (e.key === 'ArrowRight') nc = Math.min(n - 1, c + 1)
    selectedCell.value = nr * n + nc
    e.preventDefault()
  }
}

onMounted(() => {
  loadProgress()
  computeBoardPx()
  window.addEventListener('resize', computeBoardPx)
  window.addEventListener('keydown', handleKey)
})
onUnmounted(() => {
  stopTimer()
  window.removeEventListener('resize', computeBoardPx)
  window.removeEventListener('keydown', handleKey)
})
</script>

<style scoped>
@keyframes pop { 0% { transform: scale(0.85); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
@keyframes wiggle { 0%, 100% { transform: rotate(-8deg) } 50% { transform: rotate(8deg) } }
.ovl-enter-active, .ovl-leave-active { transition: opacity 0.25s }
.ovl-enter-from, .ovl-leave-to { opacity: 0 }
</style>
