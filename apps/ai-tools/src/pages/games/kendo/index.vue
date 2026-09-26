<template>
  <div class="flex flex-col items-center py-6 px-3 min-h-full select-none">
    <div class="w-full max-w-5xl flex items-end justify-between mb-3">
      <div>
        <h1 class="m-0 text-2xl font-bold bg-gradient-to-br from-emerald-400 to-teal-400 bg-clip-text text-transparent">
          🥋 剣道 三本勝負
        </h1>
        <p class="m-0 mt-1 text-xs text-slate-500">2人対戦・二本先取で勝ち</p>
      </div>
      <button
        class="text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] cursor-pointer"
        @click="toggleConfig"
      >
        🎮 ボタン設定
      </button>
    </div>

    <!-- ═══ ゲーム画面 ═══ -->
    <div ref="stageEl" class="relative w-full max-w-5xl aspect-video rounded-2xl overflow-hidden border border-white/[0.08] bg-[#e8dcc4]">
      <canvas ref="canvasEl" class="block w-full h-full" />

      <!-- スコア -->
      <div class="absolute top-3 inset-x-3 flex justify-between pointer-events-none">
        <div v-for="p in PLAYERS" :key="p.id" :class="['flex items-center gap-2', p.id === 1 && 'flex-row-reverse']">
          <div :class="['px-3 py-1 rounded-lg text-sm font-bold shadow', p.badge]">{{ p.label }}</div>
          <div class="flex gap-1">
            <span
              v-for="i in POINTS_TO_WIN"
              :key="i"
              class="w-8 h-8 rounded-full border-2 border-slate-700/60 bg-white/80 flex items-center justify-center text-sm font-bold text-slate-800"
            >
              {{ hud.marks[p.id][i - 1] ?? '' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 間合い -->
      <div
        v-if="hud.phase === 'fight'"
        :class="['absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold pointer-events-none', MAAI_STYLE[hud.maai]]"
      >
        {{ MAAI_LABEL[hud.maai] }}
      </div>

      <!-- 掛け声・判定 -->
      <div v-if="callout" class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div :class="['text-5xl sm:text-7xl font-black tracking-widest drop-shadow-[0_4px_0_rgba(0,0,0,0.35)]', callout.color]">
          {{ callout.text }}
        </div>
        <div v-if="callout.sub" class="mt-3 text-sm sm:text-base font-bold text-slate-800 bg-white/80 px-4 py-1.5 rounded-full">
          {{ callout.sub }}
        </div>
      </div>

      <!-- ボタン設定 -->
      <div v-if="configOpen" class="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="w-full max-w-2xl">
          <p class="m-0 mb-3 text-sm text-slate-300">
            「変更」を押してから、コントローラーのボタンを押すと割り当てが変わります（コントローラーごとに保存）。
          </p>
          <div class="grid grid-cols-2 gap-4">
            <div v-for="p in PLAYERS" :key="p.id" class="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
              <div class="flex items-center justify-between mb-2">
                <span :class="['px-2 py-0.5 rounded text-xs font-bold', p.badge]">{{ p.label }}</span>
                <span class="text-[11px] text-slate-500 truncate max-w-[60%]">
                  {{ hud.pads[p.id].connected ? hud.pads[p.id].name : '未接続' }}
                </span>
              </div>
              <div v-for="a in CONFIG_ACTIONS" :key="a" class="flex items-center justify-between py-1 text-sm">
                <span class="text-slate-300">{{ ACTION_LABEL[a] }}</span>
                <span class="flex items-center gap-2">
                  <code class="text-xs text-slate-400">{{ bindingView[p.id][a].join(', ') }}</code>
                  <button
                    :class="[
                      'text-xs px-2 py-0.5 rounded border cursor-pointer',
                      capture?.slot === p.id && capture.action === a
                        ? 'border-amber-400 text-amber-300 bg-amber-400/10'
                        : 'border-white/10 text-slate-300 bg-white/[0.04] hover:bg-white/[0.08]',
                    ]"
                    @click="startCapture(p.id, a)"
                  >
                    {{ capture?.slot === p.id && capture.action === a ? 'ボタンを押して…' : '変更' }}
                  </button>
                </span>
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button class="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 bg-transparent cursor-pointer hover:bg-white/[0.06]" @click="resetBindings">
              初期値に戻す
            </button>
            <button class="text-xs px-3 py-1.5 rounded-lg border-none bg-emerald-500 text-slate-950 font-bold cursor-pointer hover:bg-emerald-400" @click="toggleConfig">
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ 操作説明 ═══ -->
    <div class="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs text-slate-400">
      <div v-for="p in PLAYERS" :key="p.id" class="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
        <div class="flex items-center gap-2 mb-1.5">
          <span :class="['px-2 py-0.5 rounded font-bold', p.badge]">{{ p.label }}</span>
          <span :class="hud.pads[p.id].connected ? 'text-emerald-400' : 'text-slate-500'">
            {{ hud.pads[p.id].connected ? '🎮 接続中' : '🎮 未接続（キーボードで操作）' }}
          </span>
        </div>
        <div>コントローラー: 十字キー左右＝前進・後退 / A＝面 / B＝小手 / Y＝胴 / START＝再戦</div>
        <div>キーボード: {{ p.keys }} / スペース＝再戦</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { DEFAULT_POINTS_TO_WIN, FPS } from '~/utils/kendo/constants'
import { createMatch, stepMatch } from '~/utils/kendo/match'
import { classifyMaai, distanceBetween } from '~/utils/kendo/maai'
import type { Action, Maai, MatchPhase, MatchState, PlayerId, Technique } from '~/utils/kendo/types'
import type { InputManager, PadBinding, PadStatus } from '~/utils/kendo-client/input'
import type { KendoRenderer } from '~/utils/kendo-client/renderer'

useHead({
  title: '剣道 三本勝負',
  link: [{ key: 'icon', rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🥋</text></svg>` }],
})

const POINTS_TO_WIN = DEFAULT_POINTS_TO_WIN
const STEP_MS = 1000 / FPS
/** 「はじめ！」を出しておくフレーム数 */
const HAJIME_SHOW = 45
const AIUCHI_SHOW = 40
/** 白の文字は明るい床の上で見えにくいので縁取りする */
const WHITE_TEXT = 'text-white [-webkit-text-stroke:2px_#334155]'

const PLAYERS = [
  { id: 0 as PlayerId, label: '赤', badge: 'bg-red-600 text-white', keys: 'A/D＝移動・F＝面・G＝小手・H＝胴' },
  { id: 1 as PlayerId, label: '白', badge: 'bg-white text-slate-900', keys: '←/→＝移動・J＝面・K＝小手・L＝胴' },
]
const TECHNIQUE_MARK: Record<Technique, string> = { men: 'メ', kote: 'コ', do: 'ド' }
const TECHNIQUE_CALL: Record<Technique, string> = { men: '面あり！', kote: '小手あり！', do: '胴あり！' }
const MAAI_LABEL: Record<Maai, string> = { toma: '遠間', issoku: '一足一刀', chikama: '近間' }
const MAAI_STYLE: Record<Maai, string> = {
  toma: 'bg-slate-700/70 text-slate-100',
  issoku: 'bg-amber-400/90 text-slate-900',
  chikama: 'bg-rose-500/80 text-white',
}
const CONFIG_ACTIONS: Action[] = ['men', 'kote', 'do', 'start', 'left', 'right']
const ACTION_LABEL: Record<Action, string> = { men: '面', kote: '小手', do: '胴', start: 'スタート（再戦）', left: '左', right: '右' }

// ── UI に渡す最小限の状態（Three.js のオブジェクトや MatchState 全体はリアクティブにしない）──
interface Hud {
  phase: MatchPhase
  phaseFrame: number
  marks: [string[], string[]]
  lastPoint: { by: PlayerId; technique: Technique } | null
  winner: PlayerId | null
  maai: Maai
  aiuchi: boolean
  pads: [PadStatus, PadStatus]
}

function hudOf(s: MatchState, aiuchi: boolean, pads: [PadStatus, PadStatus]): Hud {
  const marks: [string[], string[]] = [[], []]
  for (const p of s.points) marks[p.by].push(TECHNIQUE_MARK[p.technique])
  const last = s.points[s.points.length - 1]
  return {
    phase: s.phase,
    // 表示の切り替えに要るところまでで止め、毎フレームの再描画を避ける
    phaseFrame: Math.min(s.phaseFrame, HAJIME_SHOW),
    marks,
    lastPoint: last ? { by: last.by, technique: last.technique } : null,
    winner: s.winner,
    maai: classifyMaai(distanceBetween(s.fighters[0], s.fighters[1])),
    aiuchi,
    pads: [{ ...pads[0] }, { ...pads[1] }],
  }
}

const emptyPads = (): [PadStatus, PadStatus] => [{ connected: false, name: '' }, { connected: false, name: '' }]
const hud = shallowRef<Hud>(hudOf(createMatch(), false, emptyPads()))
let hudKey = ''

const callout = computed(() => {
  const h = hud.value
  if (h.phase === 'ready') return { text: '構えて', color: 'text-slate-800', sub: '' }
  if (h.phase === 'fight' && h.phaseFrame < HAJIME_SHOW) {
    // 審判の号令: 最初は「はじめ」、一本入った後は「二本目」、一本ずつなら「勝負」
    const total = h.marks[0].length + h.marks[1].length
    return { text: total === 0 ? 'はじめ！' : h.marks[0].length === h.marks[1].length ? '勝負！' : '二本目！', color: 'text-slate-800', sub: '' }
  }
  if (h.phase === 'fight' && h.aiuchi) return { text: '相打ち', color: 'text-slate-700', sub: '' }
  if (h.phase === 'ippon' && h.lastPoint) {
    return {
      text: TECHNIQUE_CALL[h.lastPoint.technique],
      color: h.lastPoint.by === 0 ? 'text-red-600' : WHITE_TEXT,
      sub: h.winner !== null ? '' : `${PLAYERS[h.lastPoint.by]!.label}の一本`,
    }
  }
  if (h.phase === 'end' && h.winner !== null) {
    return {
      text: '勝負あり！',
      color: h.winner === 0 ? 'text-red-600' : WHITE_TEXT,
      sub: `${PLAYERS[h.winner]!.label}の勝ち ─ START（スペース）でもう一回`,
    }
  }
  return null
})

// ── ボタン設定 ──
const configOpen = ref(false)
const capture = ref<{ slot: PlayerId; action: Action } | null>(null)
const bindingView = ref<[PadBinding, PadBinding]>([
  { left: [], right: [], men: [], kote: [], do: [], start: [] },
  { left: [], right: [], men: [], kote: [], do: [], start: [] },
])

function toggleConfig() {
  configOpen.value = !configOpen.value
  capture.value = null
  input?.clearPending()
}

function startCapture(slot: PlayerId, action: Action) {
  capture.value = { slot, action }
}

let saveBindings: ((b: [PadBinding, PadBinding]) => void) | null = null
let defaultBinding: PadBinding | null = null

function applyBindings(next: [PadBinding, PadBinding]) {
  if (!input) return
  input.bindings = next
  bindingView.value = structuredClone(next)
  saveBindings?.(next)
}

function resetBindings() {
  if (!defaultBinding) return
  applyBindings([structuredClone(defaultBinding), structuredClone(defaultBinding)])
  capture.value = null
}

// ── ゲームループ（固定タイムステップ）──
const stageEl = ref<HTMLDivElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
let match: MatchState = createMatch()
let renderer: KendoRenderer | null = null
let input: InputManager | null = null
let rafId: number | null = null
let resizeObserver: ResizeObserver | null = null
let lastTime = 0
let accumulator = 0
let aiuchiUntil = -1

function frame(now: number) {
  rafId = requestAnimationFrame(frame)
  if (!renderer || !input) return
  // タブが裏に回って戻ったときに大量のステップを一気に回さない
  accumulator += Math.min(now - (lastTime || now), 250)
  lastTime = now

  input.update()
  if (configOpen.value) {
    const c = capture.value
    const pressed = c ? input.lastRawPress[c.slot] : null
    if (c && pressed !== null) {
      const next: [PadBinding, PadBinding] = structuredClone(input.bindings)
      next[c.slot][c.action] = [pressed]
      applyBindings(next)
      capture.value = null
    }
    input.clearPending()
    accumulator = 0
  } else {
    while (accumulator >= STEP_MS) {
      match = stepMatch(match, input.take())
      if (match.events.some((e) => e.type === 'aiuchi')) aiuchiUntil = match.frame + AIUCHI_SHOW
      accumulator -= STEP_MS
    }
  }

  renderer.render(match)
  syncHud()
}

function syncHud() {
  if (!input) return
  const next = hudOf(match, match.frame < aiuchiUntil, input.pads)
  const key = JSON.stringify(next)
  if (key !== hudKey) {
    hudKey = key
    hud.value = next
  }
}

onMounted(async () => {
  // Three.js と Gamepad API はクライアントでだけ読み込む（SSR では動かさない）
  const [{ KendoRenderer }, inputModule] = await Promise.all([
    import('~/utils/kendo-client/renderer'),
    import('~/utils/kendo-client/input'),
  ])
  if (!canvasEl.value || !stageEl.value) return

  defaultBinding = inputModule.DEFAULT_PAD_BINDING
  saveBindings = inputModule.savePadBindings
  input = new inputModule.InputManager(inputModule.loadPadBindings())
  bindingView.value = structuredClone(input.bindings)
  input.attach()

  renderer = new KendoRenderer(canvasEl.value)
  const el = stageEl.value
  renderer.resize(el.clientWidth, el.clientHeight)
  resizeObserver = new ResizeObserver(() => renderer?.resize(el.clientWidth, el.clientHeight))
  resizeObserver.observe(el)

  rafId = requestAnimationFrame(frame)
})

onUnmounted(() => {
  if (rafId !== null) cancelAnimationFrame(rafId)
  resizeObserver?.disconnect()
  input?.detach()
  renderer?.dispose()
  renderer = null
  input = null
})
</script>
