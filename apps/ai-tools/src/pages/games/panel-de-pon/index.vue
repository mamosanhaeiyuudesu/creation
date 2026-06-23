<template>
  <div class="flex flex-col items-center py-4 px-0 lg:px-2 min-h-full select-none">
    <AuthModal v-if="showAuthModal" accent="sky" />

    <!-- Pause overlay -->
    <Transition name="ovl">
      <div v-if="phase === 'paused'" class="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div class="text-center">
          <div class="text-6xl mb-4">⏸</div>
          <p class="text-slate-400 text-sm">スタートボタンで再開</p>
        </div>
      </div>
    </Transition>

    <!-- Stage Clear overlay -->
    <Transition name="ovl">
      <div v-if="phase === 'stageclear'" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 backdrop-blur-sm">
        <div class="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-emerald-400/40 rounded-3xl p-8 text-center max-w-xs mx-4 shadow-[0_0_60px_rgba(52,211,153,0.25)]">
          <div class="text-5xl mb-3">🎉</div>
          <h2 class="m-0 text-2xl font-bold text-emerald-400 mb-6">ステージ {{ stage }} クリア！</h2>
          <button
            v-if="stage < STAGE_TARGETS.length"
            class="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-base cursor-pointer border-none hover:opacity-90 transition-opacity"
            @click="goNextStage"
          >次のステージへ →</button>
          <button
            v-else
            class="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base cursor-pointer border-none hover:opacity-90 transition-opacity"
            @click="resetToStart"
          >🏆 全クリア！最初から</button>
        </div>
      </div>
    </Transition>

    <!-- Game Over overlay -->
    <Transition name="ovl">
      <div v-if="phase === 'gameover'" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 backdrop-blur-sm">
        <div class="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-red-400/40 rounded-3xl p-8 text-center max-w-xs mx-4 shadow-[0_0_60px_rgba(248,113,113,0.2)]">
          <div class="text-5xl mb-3">💀</div>
          <h2 class="m-0 text-2xl font-bold text-red-400 mb-1">ゲームオーバー</h2>
          <p class="text-slate-400 text-sm mb-6">ステージ {{ stage }}</p>
          <button
            class="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold text-base cursor-pointer border-none hover:opacity-90 transition-opacity mb-2"
            @click="startGame"
          >このステージからリトライ</button>
          <button
            class="w-full py-2.5 rounded-xl border border-slate-600 text-slate-400 text-sm font-medium cursor-pointer bg-transparent hover:bg-white/[0.06] transition-colors"
            @click="resetToStart"
          >ステージ1から</button>
        </div>
      </div>
    </Transition>

    <!-- Name Entry Modal -->
    <Transition name="ovl">
      <div v-if="showNameEntry" class="fixed inset-0 bg-black/85 flex items-center justify-center z-[60] backdrop-blur-sm">
        <div class="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-amber-400/40 rounded-3xl p-8 text-center max-w-xs mx-4 shadow-[0_0_60px_rgba(251,191,36,0.2)]">
          <div class="text-4xl mb-3">🏆</div>
          <h2 class="m-0 text-xl font-bold text-amber-400 mb-1">記録達成！</h2>
          <p class="text-slate-400 text-sm mb-1">ステージ {{ stage }} クリアタイム</p>
          <p class="font-mono text-2xl font-bold text-white mb-4">{{ formatTime(clearSeconds) }}</p>
          <p class="text-slate-500 text-xs mb-3">名前を3文字で入力（↑↓で変更・Enter登録）</p>

          <div class="flex gap-2 justify-center mb-3">
            <div
              v-for="(ch, i) in nameChars" :key="i"
              class="w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold font-mono cursor-pointer transition-colors"
              :class="nameInputIdx === i ? 'border-amber-400 bg-amber-400/10 text-amber-300' : 'border-slate-600 bg-white/[0.05] text-white'"
              @click="nameInputIdx = i"
            >{{ ch }}</div>
          </div>

          <div class="flex gap-2 justify-center mb-5">
            <div v-for="(_, i) in nameChars" :key="i" class="flex flex-col items-center gap-1">
              <button class="w-11 h-8 rounded-lg bg-white/[0.08] border border-white/10 text-white text-xs hover:bg-white/[0.15] transition-colors cursor-pointer" @click="changeLetter(i, 1); nameInputIdx = i">▲</button>
              <button class="w-11 h-8 rounded-lg bg-white/[0.08] border border-white/10 text-white text-xs hover:bg-white/[0.15] transition-colors cursor-pointer" @click="changeLetter(i, -1); nameInputIdx = i">▼</button>
            </div>
          </div>

          <button
            class="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base cursor-pointer border-none hover:opacity-90 transition-opacity mb-2"
            @click="submitRecord"
          >登録する</button>
          <button
            class="w-full py-2 rounded-xl border border-slate-700 text-slate-500 text-sm cursor-pointer bg-transparent hover:bg-white/[0.04] transition-colors"
            @click="showNameEntry = false"
          >スキップ</button>
        </div>
      </div>
    </Transition>

    <!-- Ranking Popup -->
    <Transition name="ovl">
      <div
        v-if="showRankingPopup"
        class="fixed inset-0 bg-black/85 flex items-center justify-center z-[70] backdrop-blur-sm"
        @click.self="showRankingPopup = false"
      >
        <div class="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-slate-700/60 rounded-3xl p-6 text-center w-72 mx-4 shadow-[0_0_60px_rgba(0,0,0,0.6)]">
          <div class="text-3xl mb-2">🏆</div>
          <h2 class="m-0 text-lg font-bold text-slate-200 mb-1">ステージ {{ stage }} ランキング</h2>
          <p class="text-slate-500 text-xs mb-4">あなたの記録: {{ formatTime(submittedSeconds) }}</p>

          <div class="flex flex-col gap-1 text-left mb-5">
            <div
              v-for="rec in records" :key="rec.rank"
              class="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-colors"
              :class="rec.rank === submittedRank
                ? 'bg-amber-400/15 border border-amber-400/50'
                : 'bg-white/[0.03]'"
            >
              <span
                class="w-5 text-right font-bold text-[11px] shrink-0"
                :class="rec.rank === submittedRank ? 'text-amber-300' : rec.rank === 1 ? 'text-amber-400' : 'text-slate-600'"
              >{{ rec.rank }}</span>
              <span
                class="font-mono font-bold w-10 shrink-0"
                :class="rec.rank === submittedRank ? 'text-amber-200' : 'text-slate-300'"
              >{{ rec.name }}</span>
              <span
                class="flex-1 font-mono text-right"
                :class="rec.rank === submittedRank ? 'text-amber-300' : 'text-slate-500'"
              >{{ formatTime(rec.seconds) }}</span>
              <span
                v-if="rec.rank === submittedRank"
                class="text-[9px] font-bold text-amber-400 bg-amber-400/20 px-1.5 py-0.5 rounded-full shrink-0"
              >NEW</span>
            </div>
          </div>

          <button
            class="w-full py-2.5 rounded-xl bg-white/[0.07] border border-white/10 text-slate-300 font-medium text-sm cursor-pointer hover:bg-white/[0.12] transition-colors"
            @click="showRankingPopup = false"
          >閉じる</button>
        </div>
      </div>
    </Transition>

    <!-- Header -->
    <h1 class="m-0 text-base font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-3">
      🎴 パネルでポン
    </h1>

    <!-- Board area: mobile=[dpad|game|buttons], desktop=[game|leaderboard] -->
    <div class="flex items-center gap-1 lg:gap-4 lg:items-stretch">

      <!-- D-pad (mobile only, left side) -->
      <div class="flex-shrink-0 lg:hidden">
        <div class="grid grid-cols-3" style="width: 98px; gap: 4px">
          <div />
          <button class="dpad-sm" @touchstart.prevent="moveCursor(-1, 0)">▲</button>
          <div />
          <button class="dpad-sm" @touchstart.prevent="moveCursor(0, -1)">◄</button>
          <div style="width:30px;height:30px" />
          <button class="dpad-sm" @touchstart.prevent="moveCursor(0, 1)">►</button>
          <div />
          <button class="dpad-sm" @touchstart.prevent="moveCursor(1, 0)">▼</button>
          <div />
        </div>
      </div>

      <!-- Game column -->
      <div class="flex flex-col items-center lg:items-start flex-shrink-0">
        <!-- Stage + score above board -->
        <div class="flex items-center gap-3 mb-1.5">
          <span class="text-sm font-bold text-slate-300">ステージ {{ stage }}</span>
          <Transition name="chain">
            <span v-if="chainLevel >= 2" class="text-xs font-bold text-amber-400 animate-bounce">{{ chainLevel }}チェーン!</span>
          </Transition>
        </div>

        <!-- Vertical score meter + board -->
        <div class="flex gap-2 items-start">
          <!-- Vertical score meter (desktop only) -->
          <div class="hidden lg:flex flex-col items-center gap-1 flex-shrink-0" :style="{ height: `${ROWS * CELL}px` }">
            <div class="text-[9px] text-slate-600 leading-none font-mono">
              {{ stageTarget >= 1000 ? (stageTarget / 1000).toFixed(1) + 'k' : stageTarget }}
            </div>
            <div class="relative flex-1 overflow-hidden" style="width: 8px; background: rgba(255,255,255,0.06); border-radius: 4px;">
              <div
                class="absolute bottom-0 left-0 w-full transition-all duration-300"
                style="border-radius: 4px; background: linear-gradient(to top, #10b981, #2dd4bf)"
                :style="{ height: `${progressPct}%` }"
              />
            </div>
            <div class="text-[9px] text-slate-700 leading-none font-mono">0</div>
          </div>

          <!-- Game board container -->
          <div
            class="relative border-2 border-slate-700 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.7)] flex-shrink-0"
            :style="{ width: `${COLS * CELL}px`, height: `${ROWS * CELL}px` }"
          >
            <!-- Inner board (transforms for rise effect) -->
            <div
              class="absolute top-0 left-0"
              :style="{
                width: `${COLS * CELL}px`,
                transform: `translateY(${-riseOffset}px)`,
              }"
            >
              <!-- Panel rows (ROWS+1 total: ROWS from grid + nextRow) -->
              <div v-for="(row, r) in allRows" :key="r" class="flex">
                <div
                  v-for="(color, c) in row"
                  :key="c"
                  class="panel-cell"
                  :class="{ 'panel-flashing': r < ROWS && flashSet.has(`${r},${c}`) }"
                  :style="cellStyle(color)"
                >
                  <span v-if="color" class="panel-sym">{{ PANEL_CFG[color as Color].sym }}</span>
                </div>
              </div>

              <!-- Cursor -->
              <div
                v-if="phase === 'playing' || phase === 'idle'"
                class="pointer-events-none absolute z-10 cursor-box"
                :style="{
                  left: `${cursor.col * CELL}px`,
                  top: `${cursor.row * CELL}px`,
                  width:  cursorDir === 'h' ? `${2 * CELL}px` : `${CELL}px`,
                  height: cursorDir === 'h' ? `${CELL}px`     : `${2 * CELL}px`,
                }"
              />
            </div>

            <!-- Danger flash overlay -->
            <div
              v-if="isDanger"
              class="absolute inset-0 pointer-events-none animate-[dangerPulse_0.5s_ease_infinite]"
              style="background: rgba(239,68,68,0.08)"
            />

            <!-- Idle overlay -->
            <div
              v-if="phase === 'idle'"
              class="absolute inset-0 bg-black/60 flex items-center justify-center"
            >
              <button
                class="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-base border-none cursor-pointer hover:opacity-90 transition-opacity shadow-lg"
                @click="startGame"
              >
                {{ savedStage > 1 ? `ST${savedStage}から再開` : 'スタート' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Stage selector (mobile only, below board) -->
        <div class="lg:hidden mt-2 w-full">
          <div class="text-[9px] text-slate-600 text-center mb-1.5">ステージ選択</div>
          <div class="grid grid-cols-5 gap-1">
            <button
              v-for="n in STAGE_TARGETS.length" :key="n"
              class="h-7 rounded-lg text-xs font-bold border transition-colors cursor-pointer"
              :class="stage === n && phase !== 'idle'
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-400'
                : 'bg-black/40 border-white/10 text-slate-500 hover:bg-white/[0.10] hover:text-slate-200'"
              @click="jumpToStage(n)"
            >{{ n }}</button>
          </div>
        </div>
      </div><!-- /game column -->

      <!-- Action buttons (mobile only, right side) -->
      <div class="flex-shrink-0 lg:hidden flex gap-1">
        <button class="dpad-action" @touchstart.prevent="toggleDir">{{ cursorDir === 'h' ? '⇄' : '⇅' }}</button>
        <button class="dpad-action dpad-action--swap" @touchstart.prevent="doSwap">入替</button>
      </div>

      <!-- Leaderboard (desktop only) -->
      <div class="hidden lg:flex w-44 flex-shrink-0 flex-col">
        <div class="text-[10px] font-medium tracking-widest text-slate-500 mb-2 text-center">
          ランキング
        </div>
        <div v-if="recordsLoading" class="text-slate-600 text-xs text-center py-2">…</div>
        <div v-else-if="records.length === 0" class="text-slate-600 text-xs text-center py-2">記録なし</div>
        <div v-else class="flex flex-col gap-0.5">
          <div
            v-for="rec in records" :key="rec.rank"
            class="flex items-center gap-1.5 px-1 py-0.5 rounded text-xs"
            :class="rec.rank === 1 ? 'bg-amber-400/10' : ''"
          >
            <span class="text-[10px] w-4 text-right shrink-0" :class="rec.rank === 1 ? 'text-amber-400' : 'text-slate-600'">{{ rec.rank }}</span>
            <span class="font-mono font-bold w-8 shrink-0" :class="rec.rank === 1 ? 'text-amber-300' : 'text-slate-300'">{{ rec.name }}</span>
            <span class="font-mono text-right flex-1" :class="rec.rank === 1 ? 'text-amber-400' : 'text-slate-500'">{{ formatTime(rec.seconds) }}</span>
          </div>
        </div>

        <!-- Stage selector (desktop) -->
        <div class="mt-auto pt-3">
          <div class="text-[9px] text-slate-600 text-center mb-1.5">ステージ選択</div>
          <div class="grid grid-cols-5 gap-1">
            <button
              v-for="n in STAGE_TARGETS.length" :key="n"
              class="h-7 rounded-lg text-xs font-bold border transition-colors cursor-pointer"
              :class="stage === n && phase !== 'idle'
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-400'
                : 'bg-black/40 border-white/10 text-slate-500 hover:bg-white/[0.10] hover:text-slate-200'"
              @click="jumpToStage(n)"
            >{{ n }}</button>
          </div>
        </div>
      </div>
    </div><!-- /board area -->

    <!-- Controls hint -->
    <div class="mt-4 flex flex-col items-center gap-2">
      <!-- Gamepad status -->
      <div class="flex items-center gap-1.5 text-xs" :class="gpConnected ? 'text-emerald-400' : 'text-slate-600'">
        <span>🎮</span>
        <span>{{ gpConnected ? 'コントローラー接続中' : 'コントローラー未接続（繋いでボタンを押すと認識）' }}</span>
      </div>
      <!-- Keyboard hint (PC only) -->
      <div class="hidden lg:flex items-center gap-4 text-xs text-slate-500">
        <span class="flex items-center gap-1.5">
          <kbd class="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/10 font-mono text-[11px]">↑↓←→</kbd>
          移動
        </span>
        <span class="flex items-center gap-1.5">
          <kbd class="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/10 font-mono text-[11px]">Z</kbd>
          <kbd class="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/10 font-mono text-[11px]">Space</kbd>
          入替
        </span>
        <span class="flex items-center gap-1.5">
          <kbd class="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/10 font-mono text-[11px]">X</kbd>
          縦横切替
        </span>
        <span class="text-slate-700">｜</span>
        <span class="flex items-center gap-1.5">
          <kbd class="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/10 font-mono text-[11px]">Enter</kbd>
          <kbd class="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/10 font-mono text-[11px]">Esc</kbd>
          開始/停止
        </span>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAuth } from '~/composables/useAuth'

useHead({
  title: 'パネルでポン',
  link: [{ rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎴</text></svg>` }],
})

// ── Constants ─────────────────────────────────────────────────
const COLS = 6
const ROWS = 12

const isMobile = ref(false)
const checkMobile = () => { isMobile.value = window.innerWidth < 1024 }
const CELL = computed(() => isMobile.value ? 28 : 40)

const COLORS = ['r', 'b', 'y', 'g', 'p'] as const
type Color = (typeof COLORS)[number]

const PANEL_CFG: Record<Color, { sym: string; bg: string; lt: string; dk: string }> = {
  r: { sym: '♥', bg: '#dc2626', lt: '#f87171', dk: '#991b1b' },
  b: { sym: '◆', bg: '#2563eb', lt: '#60a5fa', dk: '#1e40af' },
  y: { sym: '★', bg: '#ca8a04', lt: '#fde047', dk: '#92400e' },
  g: { sym: '●', bg: '#16a34a', lt: '#4ade80', dk: '#14532d' },
  p: { sym: '▲', bg: '#7c3aed', lt: '#c084fc', dk: '#4c1d95' },
}

// Score targets per stage (cumulative within each stage)
const STAGE_TARGETS = [300, 550, 850, 1200, 1600, 2100, 2700, 3400, 4200, 5200]

// Rise speed: px/sec per stage
const RISE_SPEEDS = [13, 16, 19, 22, 26, 30, 35, 40, 46, 53]

const FLASH_MS = 550

// ── Auth ──────────────────────────────────────────────────────
const { isLoggedIn, checked, checkAuth } = useAuth()
const showAuthModal = computed(() => !import.meta.dev && !isLoggedIn.value && checked.value)

// ── Game state ────────────────────────────────────────────────
const grid       = ref<(Color | null)[][]>([])
const nextRow    = ref<Color[]>([])
const flashSet   = ref(new Set<string>())
const cursor     = ref({ row: 8, col: 2 })
const cursorDir  = ref<'h' | 'v'>('h')  // h=横並び, v=縦並び
const phase      = ref<'idle' | 'playing' | 'paused' | 'gameover' | 'stageclear'>('idle')
const score      = ref(0)
const stage      = ref(1)
const chainLevel = ref(0)
const highScore  = ref(0)
const savedStage = ref(1)
const riseOffset = ref(0)   // 0..CELL pixels
const isBusy     = ref(false) // true while flash/fall is processing

// ── Leaderboard & record entry ─────────────────────────────────
const stageStartTime = ref(0)
const clearSeconds   = ref(0)
const showNameEntry  = ref(false)
const nameChars      = ref<string[]>(['A', 'A', 'A'])
const nameInputIdx   = ref(0)

type RecordRow = { rank: number; name: string; seconds: number; recorded_at: string }
const records         = ref<RecordRow[]>([])
const recordsLoading  = ref(false)
const showRankingPopup = ref(false)
const submittedRank   = ref<number | null>(null)
const submittedSeconds = ref(0)

// ── Gamepad debug ─────────────────────────────────────────────
const gpDebug = ref<{ btns: number[]; axes: Array<[number, number]> }>({ btns: [], axes: [] })

// ── Computed ──────────────────────────────────────────────────
const stageTarget  = computed(() => STAGE_TARGETS[Math.min(stage.value - 1, STAGE_TARGETS.length - 1)])
const progressPct  = computed(() => Math.min(100, (score.value / stageTarget.value) * 100))
const allRows      = computed<(Color | null)[][]>(() =>
  grid.value.length ? [...grid.value, nextRow.value as (Color | null)[]] : []
)
const riseSpeedPx  = computed(() => RISE_SPEEDS[Math.min(stage.value - 1, RISE_SPEEDS.length - 1)])
const isDanger = computed(() =>
  phase.value === 'playing' && grid.value[1]?.some(c => c !== null)
)

// ── Style helpers ──────────────────────────────────────────────
function cellStyle(color: Color | null): Record<string, string> {
  if (!color) {
    return {
      width: `${CELL.value}px`,
      height: `${CELL.value}px`,
      background: 'rgba(0,0,0,0.35)',
      borderRight: '1px solid rgba(255,255,255,0.04)',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      boxSizing: 'border-box',
    }
  }
  const cfg = PANEL_CFG[color]
  return {
    width: `${CELL.value}px`,
    height: `${CELL.value}px`,
    background: `linear-gradient(145deg, ${cfg.lt} 0%, ${cfg.bg} 40%, ${cfg.dk} 100%)`,
    borderTop: `2px solid ${cfg.lt}`,
    borderLeft: `2px solid ${cfg.lt}`,
    borderRight: `2px solid ${cfg.dk}`,
    borderBottom: `2px solid ${cfg.dk}`,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
}

// ── Grid helpers ───────────────────────────────────────────────
function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function makeRow(): Color[] {
  return Array.from({ length: COLS }, () => rand(COLORS))
}

function initGrid(): (Color | null)[][] {
  const g: (Color | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null) as (Color | null)[])
  // ステージが上がるほど初期パネルを増やす（ST1=2行〜ST7+=8行）
  const fillRows = Math.min(1 + stage.value, 8)
  const startRow = ROWS - fillRows
  for (let r = startRow; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let color: Color
      let tries = 0
      do {
        color = rand(COLORS)
        tries++
      } while (tries < 10 && (
        (c >= 2 && g[r][c - 1] === color && g[r][c - 2] === color) ||
        (r >= 2 && g[r - 1]?.[c] === color && g[r - 2]?.[c] === color)
      ))
      g[r][c] = color
    }
  }
  return g
}

// ── Match detection ────────────────────────────────────────────
function findMatches(g: (Color | null)[][]): Array<[number, number]> {
  const matched = new Set<string>()
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 3; c++) {
      const col = g[r][c]
      if (!col || col !== g[r][c + 1] || col !== g[r][c + 2]) continue
      let end = c + 2
      while (end + 1 < COLS && g[r][end + 1] === col) end++
      for (let k = c; k <= end; k++) matched.add(`${r},${k}`)
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 3; r++) {
      const col = g[r][c]
      if (!col || col !== g[r + 1][c] || col !== g[r + 2][c]) continue
      let end = r + 2
      while (end + 1 < ROWS && g[end + 1][c] === col) end++
      for (let k = r; k <= end; k++) matched.add(`${k},${c}`)
    }
  }
  return [...matched].map(s => s.split(',').map(Number) as [number, number])
}

// ── Gravity ────────────────────────────────────────────────────
function applyGravity(g: (Color | null)[][]): boolean {
  let changed = false
  for (let c = 0; c < COLS; c++) {
    const filled = g.map(row => row[c]).filter(v => v !== null) as Color[]
    const newCol: (Color | null)[] = [
      ...Array<null>(ROWS - filled.length).fill(null),
      ...filled,
    ]
    for (let r = 0; r < ROWS; r++) {
      if (g[r][c] !== newCol[r]) { g[r][c] = newCol[r]; changed = true }
    }
  }
  return changed
}

// ── Match cycle ────────────────────────────────────────────────
let chainTimer: ReturnType<typeof setTimeout> | null = null

function processMatches(isChain: boolean) {
  if (phase.value !== 'playing') return

  const matches = findMatches(grid.value)

  if (matches.length === 0) {
    const g = grid.value.map(r => [...r])
    if (applyGravity(g)) {
      grid.value = g
      setTimeout(() => processMatches(true), 130)
    } else {
      chainLevel.value = 0
      isBusy.value = false
    }
    return
  }

  chainLevel.value = isChain ? chainLevel.value + 1 : 1
  isBusy.value = true

  // Flash matched cells
  const newFlash = new Set(flashSet.value)
  for (const [r, c] of matches) newFlash.add(`${r},${c}`)
  flashSet.value = newFlash

  // Score: panel_count × 10 × chain_multiplier
  score.value += matches.length * 10 * chainLevel.value
  if (score.value > highScore.value) highScore.value = score.value

  if (chainTimer) clearTimeout(chainTimer)
  chainTimer = setTimeout(() => {
    const g = grid.value.map(r => [...r])
    const nf = new Set(flashSet.value)
    for (const [r, c] of matches) { g[r][c] = null; nf.delete(`${r},${c}`) }
    flashSet.value = nf
    applyGravity(g)
    grid.value = g

    // Check stage clear
    if (score.value >= stageTarget.value) {
      clearSeconds.value = Math.round((Date.now() - stageStartTime.value) / 10) / 100
      phase.value = 'stageclear'
      isBusy.value = false
      saveProgress(stage.value + 1)
      checkIsRecord()
      return
    }
    setTimeout(() => processMatches(true), 130)
  }, FLASH_MS)
}

// ── Swap ───────────────────────────────────────────────────────
function doSwap() {
  if (phase.value !== 'playing') return
  const { row, col } = cursor.value
  const g = grid.value.map(r => [...r])
  if (cursorDir.value === 'h') {
    ;[g[row][col], g[row][col + 1]] = [g[row][col + 1], g[row][col]]
  } else {
    ;[g[row][col], g[row + 1][col]] = [g[row + 1][col], g[row][col]]
  }
  grid.value = g
  processMatches(false)
}

function toggleDir() {
  cursorDir.value = cursorDir.value === 'h' ? 'v' : 'h'
  // 向き変更後にはみ出さないようクランプ
  cursor.value = {
    row: Math.min(cursor.value.row, cursorDir.value === 'v' ? ROWS - 2 : ROWS - 1),
    col: Math.min(cursor.value.col, cursorDir.value === 'h' ? COLS - 2 : COLS - 1),
  }
}

// ── Cursor ─────────────────────────────────────────────────────
function moveCursor(dr: number, dc: number) {
  if (phase.value !== 'playing') return
  const maxCol = cursorDir.value === 'h' ? COLS - 2 : COLS - 1
  const maxRow = cursorDir.value === 'v' ? ROWS - 2 : ROWS - 1
  cursor.value = {
    row: Math.max(0, Math.min(maxRow, cursor.value.row + dr)),
    col: Math.max(0, Math.min(maxCol, cursor.value.col + dc)),
  }
}

// ── Gamepad ────────────────────────────────────────────────────
const REPEAT_DELAY = 280  // ms ─ 押し続けてリピート開始するまでの時間
const REPEAT_RATE  = 110  // ms ─ リピート間隔

interface BtnState { held: boolean; heldAt: number; lastRepeat: number }
const gpDir: Record<string, BtnState> = {}   // 方向系（リピートあり）
const gpAct: Record<string, boolean>  = {}   // アクション系（エッジのみ）

const gpConnected = ref(false)

function pollGamepad(now: number) {
  const gp = [...(navigator.getGamepads?.() ?? [])].find(g => g !== null)
  gpConnected.value = !!gp
  if (!gp) return

  // ── デバッグ情報（閾値0.05で下方向の0.14も拾う） ──────────────
  gpDebug.value = {
    btns: Array.from(gp.buttons).map((b, i) => b.pressed ? i : -1).filter(i => i >= 0),
    axes: Array.from(gp.axes).map((v, i) => (Math.abs(v) > 0.05 ? [i, v] as [number, number] : null)).filter(Boolean) as [number, number][],
  }

  // ── 十字キー検出 ──────────────────────────────────────────────
  // このPS2アダプター: axes[0]=左右（左=-1, 右=+1）/ axes[1]=上下（上=-1, 下=+1）
  // 標準マッピング buttons[12-15] も念のため併用
  const THR = 0.5
  const dUp    = (gp.buttons[12]?.pressed ?? false) || (gp.axes[1] ?? 0) < -THR
  const dDown  = (gp.buttons[13]?.pressed ?? false) || (gp.axes[1] ?? 0) >  THR
  const dLeft  = (gp.buttons[14]?.pressed ?? false) || (gp.axes[0] ?? 0) < -THR
  const dRight = (gp.buttons[15]?.pressed ?? false) || (gp.axes[0] ?? 0) >  THR

  const dpadState: Record<string, boolean> = { up: dUp, down: dDown, left: dLeft, right: dRight }
  const dpadDelta: Record<string, [number, number]> = {
    up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1],
  }

  for (const [key, [dr, dc]] of Object.entries(dpadDelta)) {
    const pressed = dpadState[key]
    const s = gpDir[key] ?? { held: false, heldAt: 0, lastRepeat: 0 }
    if (pressed) {
      if (!s.held) {
        moveCursor(dr, dc)
        gpDir[key] = { held: true, heldAt: now, lastRepeat: now }
      } else if (now - s.heldAt > REPEAT_DELAY && now - s.lastRepeat > REPEAT_RATE) {
        moveCursor(dr, dc)
        gpDir[key] = { ...s, lastRepeat: now }
      }
    } else {
      gpDir[key] = { held: false, heldAt: 0, lastRepeat: 0 }
    }
  }

  // ── アクションボタン（エッジ検出のみ） ────────────────────────
  // A=0: 入替 / B=1: 縦横切替
  // Start: PS2アダプターによってindex違うので 6〜11 を全部試す
  const startPressed = [6, 7, 8, 9, 10, 11].some(i => gp.buttons[i]?.pressed ?? false)
  const actMap: Record<string, boolean> = {
    // ○=1: 入替 / ✕(0 or 2): 縦横切替
    swap:      gp.buttons[1]?.pressed ?? false,
    toggleDir: (gp.buttons[0]?.pressed ?? false) || (gp.buttons[2]?.pressed ?? false),
    start:     startPressed,
  }

  for (const [key, pressed] of Object.entries(actMap)) {
    if (pressed && !gpAct[key]) {
      if (key === 'swap')      doSwap()
      if (key === 'toggleDir') toggleDir()
      if (key === 'start')     handleStart()
    }
    gpAct[key] = pressed
  }
}

// ── Records ────────────────────────────────────────────────────
async function fetchRecords(stageNum: number) {
  recordsLoading.value = true
  try {
    const data = await $fetch<RecordRow[]>('/api/games/records', {
      query: { game: 'panel-de-pon', stage: stageNum },
    })
    records.value = data
  } catch {}
  recordsLoading.value = false
}

async function checkIsRecord() {
  try {
    const data = await $fetch<RecordRow[]>('/api/games/records', {
      query: { game: 'panel-de-pon', stage: stage.value },
    })
    records.value = data
    const isRecord = data.length < 10 || clearSeconds.value < data[data.length - 1].seconds
    if (isRecord) {
      nameChars.value = ['A', 'A', 'A']
      nameInputIdx.value = 0
      showNameEntry.value = true
    }
  } catch {}
}

async function submitRecord() {
  const name = nameChars.value.join('')
  submittedSeconds.value = clearSeconds.value
  try {
    const res = await $fetch<{ ok: boolean; rank: number | null }>('/api/games/records', {
      method: 'POST',
      body: { game: 'panel-de-pon', stage: stage.value, name, seconds: clearSeconds.value },
    })
    submittedRank.value = res.rank
  } catch {
    submittedRank.value = null
  }
  showNameEntry.value = false
  await fetchRecords(stage.value)
  showRankingPopup.value = true
}

function changeLetter(idx: number, delta: number) {
  const code = nameChars.value[idx].charCodeAt(0) + delta
  nameChars.value[idx] = String.fromCharCode(code > 90 ? 65 : code < 65 ? 90 : code)
}

function handleNameKey(e: KeyboardEvent) {
  e.preventDefault()
  const i = nameInputIdx.value
  if (e.key === 'ArrowRight' || e.key === 'Tab') {
    nameInputIdx.value = Math.min(2, i + 1)
  } else if (e.key === 'ArrowLeft') {
    nameInputIdx.value = Math.max(0, i - 1)
  } else if (e.key === 'ArrowUp') {
    changeLetter(i, 1)
  } else if (e.key === 'ArrowDown') {
    changeLetter(i, -1)
  } else if (/^[a-zA-Z]$/.test(e.key)) {
    nameChars.value[i] = e.key.toUpperCase()
    if (i < 2) nameInputIdx.value = i + 1
  } else if (e.key === 'Backspace') {
    if (i > 0) { nameInputIdx.value = i - 1; nameChars.value[i - 1] = 'A' }
  } else if (e.key === 'Enter') {
    submitRecord()
  } else if (e.key === 'Escape') {
    showNameEntry.value = false
  }
}

function formatTime(s: number): string {
  if (s < 60) return s.toFixed(1) + 's'
  const m = Math.floor(s / 60)
  const sec = (s % 60).toFixed(1).padStart(4, '0')
  return `${m}:${sec}`
}

function handleStart() {
  if      (phase.value === 'playing')    phase.value = 'paused'
  else if (phase.value === 'paused')     phase.value = 'playing'
  else if (phase.value === 'idle' || phase.value === 'gameover') startGame()
  else if (phase.value === 'stageclear') goNextStage()
}

// ── Rise loop ──────────────────────────────────────────────────
let animFrame: number | null = null
let prevTime = 0

function tick(now: number) {
  pollGamepad(now)

  if (phase.value === 'playing' && !isBusy.value && !flashSet.value.size) {
    const dt = Math.min(now - prevTime, 80)
    riseOffset.value += riseSpeedPx.value * dt / 1000

    if (riseOffset.value >= CELL.value) {
      riseOffset.value -= CELL.value
      shiftUp()
    }
  }
  prevTime = now
  animFrame = requestAnimationFrame(tick)
}

function shiftUp() {
  if (phase.value !== 'playing') return

  // Game over: panel in top row
  if (grid.value[0].some(c => c !== null)) {
    phase.value = 'gameover'
    return
  }

  const g = grid.value.map(r => [...r])
  for (let r = 0; r < ROWS - 1; r++) g[r] = [...g[r + 1]]
  g[ROWS - 1] = [...nextRow.value] as (Color | null)[]
  grid.value = g
  cursor.value.row = Math.max(0, cursor.value.row - 1)
  nextRow.value = makeRow()
  setTimeout(() => processMatches(false), 50)
}

// ── Game flow ──────────────────────────────────────────────────
function startGame() {
  if (chainTimer) clearTimeout(chainTimer)
  flashSet.value = new Set()
  chainLevel.value = 0
  isBusy.value = false
  score.value = 0
  grid.value = initGrid()
  nextRow.value = makeRow()
  // カーソルは初期パネルの1行上に配置
  const fillRows = 1 + stage.value
  cursor.value = { row: Math.max(1, ROWS - fillRows - 1), col: 2 }
  riseOffset.value = 0
  showNameEntry.value = false
  phase.value = 'playing'
  stageStartTime.value = Date.now()
}

function goNextStage() {
  stage.value = Math.min(stage.value + 1, STAGE_TARGETS.length)
  startGame()
}

function resetToStart() {
  stage.value = 1
  startGame()
}

function jumpToStage(n: number) {
  stage.value = n
  startGame()
}



// ── Progress ───────────────────────────────────────────────────
async function loadProgress() {
  if (import.meta.dev || !isLoggedIn.value) return
  try {
    const data = await $fetch<{ stage: number; highScore: number }>('/api/games/progress', {
      query: { game: 'panel-de-pon' },
    })
    savedStage.value = data.stage
    stage.value = data.stage
    highScore.value = data.highScore
  } catch {}
}

async function saveProgress(nextStage: number) {
  if (import.meta.dev || !isLoggedIn.value) return
  const ns = Math.min(nextStage, STAGE_TARGETS.length)
  savedStage.value = Math.max(savedStage.value, ns)
  try {
    await $fetch('/api/games/progress', {
      method: 'POST',
      body: { game: 'panel-de-pon', stage: ns, highScore: highScore.value },
    })
  } catch {}
}

// ── Keyboard ───────────────────────────────────────────────────
function handleKey(e: KeyboardEvent) {
  if (showNameEntry.value) { handleNameKey(e); return }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
    e.preventDefault()
  }
  switch (e.key) {
    case 'ArrowLeft':  moveCursor(0, -1); break
    case 'ArrowRight': moveCursor(0,  1); break
    case 'ArrowUp':    moveCursor(-1, 0); break
    case 'ArrowDown':  moveCursor( 1, 0); break
    case 'z': case 'Z': case ' ': doSwap(); break
    case 'x': case 'X': toggleDir(); break
    case 'Escape': case 'Enter': handleStart(); break
  }
}

// ── Lifecycle ──────────────────────────────────────────────────
watch(stage, (s) => fetchRecords(s))

onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  if (!import.meta.dev) await checkAuth()
  await loadProgress()
  fetchRecords(stage.value)
  window.addEventListener('keydown', handleKey)
  prevTime = performance.now()
  animFrame = requestAnimationFrame(tick)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('keydown', handleKey)
  if (animFrame) cancelAnimationFrame(animFrame)
  if (chainTimer) clearTimeout(chainTimer)
})
</script>

<style scoped>
.panel-cell {
  flex-shrink: 0;
  position: relative;
  font-size: 20px;
  line-height: 1;
}

.panel-sym {
  display: block;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  user-select: none;
}

.panel-flashing {
  animation: panelFlash 0.1s ease-in-out infinite;
}

@keyframes panelFlash {
  0%, 100% { filter: brightness(1); }
  50%       { filter: brightness(2.8) saturate(0.2); }
}

.cursor-box {
  border: 3px solid #fff;
  box-shadow: 0 0 10px rgba(255,255,255,0.9), inset 0 0 4px rgba(255,255,255,0.3);
  animation: cursorBlink 0.8s ease infinite;
}

@keyframes cursorBlink {
  0%, 100% { border-color: #fff; box-shadow: 0 0 10px rgba(255,255,255,0.9); }
  50%       { border-color: rgba(255,255,255,0.5); box-shadow: 0 0 4px rgba(255,255,255,0.3); }
}

@keyframes dangerPulse {
  0%, 100% { opacity: 0; }
  50%       { opacity: 1; }
}

.dpad {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  color: #e2e8f0;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s;
}
.dpad:active { background: rgba(255,255,255,0.2); }

.dpad-sm {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  color: #e2e8f0;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s;
}
.dpad-sm:active { background: rgba(255,255,255,0.2); }

.dpad-action {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  color: #e2e8f0;
  font-size: 11px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s;
}
.dpad-action:active { transform: scale(0.92); }
.dpad-action--swap {
  background: linear-gradient(135deg, #10b981, #14b8a6);
  border-color: transparent;
  color: #fff;
}

@media (max-width: 1023px) {
  .panel-cell { font-size: 13px; }
}

/* Overlay transitions */
.ovl-enter-active, .ovl-leave-active { transition: opacity 0.25s ease; }
.ovl-enter-from, .ovl-leave-to       { opacity: 0; }

/* Chain badge */
.chain-enter-active { transition: all 0.2s ease; }
.chain-leave-active { transition: all 0.15s ease; }
.chain-enter-from   { transform: scale(0.5); opacity: 0; }
.chain-leave-to     { transform: scale(1.3); opacity: 0; }
</style>
