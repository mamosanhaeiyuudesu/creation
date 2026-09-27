<template>
  <div class="flex flex-col items-center py-6 px-3 min-h-full select-none">
    <div class="w-full max-w-5xl flex items-end justify-between mb-3">
      <div>
        <h1 class="m-0 text-2xl font-bold bg-gradient-to-br from-emerald-400 to-teal-400 bg-clip-text text-transparent">
          🥋 剣道 三本勝負
        </h1>
        <p class="m-0 mt-1 text-xs text-slate-500">2人対戦・二本先取で勝ち</p>
      </div>
      <div class="flex gap-2">
        <button
          v-if="guide.supported.value"
          :class="[
            'text-sm px-4 py-2 rounded-lg border cursor-pointer font-bold',
            guide.speaking.value
              ? 'border-amber-400/60 bg-amber-400/15 text-amber-300'
              : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20',
          ]"
          @click="guide.toggle"
        >
          {{ guide.speaking.value ? '⏹ とめる' : '🔊 あそびかた' }}
        </button>
        <button class="text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] cursor-pointer" @click="openSetup">
          👥 あいて
        </button>
        <button
          class="text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] cursor-pointer"
          @click="toggleConfig"
        >
          🎮 ボタン設定
        </button>
      </div>
    </div>

    <KendoTabs />

    <!-- ═══ ゲーム画面 ═══ -->
    <div ref="stageEl" class="relative w-full max-w-5xl aspect-video rounded-2xl overflow-hidden border border-white/[0.08] bg-[#e8dcc4]">
      <canvas ref="canvasEl" class="block w-full h-full" />

      <!-- スコア -->
      <div class="absolute top-3 inset-x-3 flex justify-between pointer-events-none">
        <div v-for="p in PLAYERS" :key="p.id" :class="['flex items-center gap-2', p.id === 1 && 'flex-row-reverse']">
          <div :class="['px-3 py-1 rounded-lg text-sm font-bold shadow', p.badge]">{{ p.label }}<span v-if="p.id === 1 && setup.vsCom" class="ml-1 text-xs">🤖{{ '★'.repeat(setup.level) }}</span></div>
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
        v-if="hud.phase === 'fight' && !guide.speaking.value"
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

      <!-- あそびかたの字幕（読み上げ中はゲームを止める） -->
      <div
        v-if="guide.speaking.value && guideLine"
        class="absolute inset-x-4 bottom-4 bg-slate-950/80 text-white text-lg sm:text-2xl font-bold leading-relaxed rounded-2xl px-5 py-4 text-center"
      >
        {{ guideLine.show }}
        <div class="mt-1 text-xs font-normal text-slate-400">{{ guide.current.value + 1 }} / {{ KENDO1_GUIDE.length }}</div>
      </div>

      <KendoSetup v-if="setupOpen && !configOpen" ref="setupEl" :initial="setup" @start="startGame" />

      <!-- ボタン設定 -->
      <KendoButtonConfig
        v-if="configOpen"
        :players="PLAYERS"
        :actions="CONFIG_ACTIONS"
        :bindings="bindingView"
        :pads="hud.pads"
        :capture="capture"
        @capture="startCapture"
        @reset="resetBindings"
        @close="toggleConfig"
      />
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
import KendoButtonConfig from '~/components/kendo/KendoButtonConfig.vue'
import KendoTabs from '~/components/kendo/KendoTabs.vue'
import KendoSetup from '~/components/kendo/KendoSetup.vue'
import { useSpeechGuide } from '~/composables/kendo/useSpeechGuide'
import { createKendo1Com } from '~/utils/kendo/com'
import type { Kendo1Com } from '~/utils/kendo/com'
import { copySetup, DEFAULT_SETUP, freshSeed, loadSetup, saveSetup } from '~/utils/kendo-client/setup'
import type { KendoSetupValue } from '~/utils/kendo-client/setup'
import { KENDO1_GUIDE } from '~/utils/kendo-client/guide'
import { KENDO1_INPUT } from '~/utils/kendo-client/input'
import type { InputManager, PadBinding, PadStatus } from '~/utils/kendo-client/input'
import type { KendoRenderer } from '~/utils/kendo-client/renderer'

useHead({
  title: '剣道 三本勝負 第1弾',
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
const CONFIG_ACTIONS: { key: Action; label: string }[] = [
  { key: 'men', label: '面' },
  { key: 'kote', label: '小手' },
  { key: 'do', label: '胴' },
  { key: 'start', label: 'スタート（再戦）' },
  { key: 'left', label: '左' },
  { key: 'right', label: '右' },
]

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
  if (setupOpen.value) return null
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

// ── 試合前の選択（ふたりで／COMと）──
const SETUP_KEY = 'kendo:setup'
const setup = ref<KendoSetupValue>(copySetup(DEFAULT_SETUP))
const setupOpen = ref(true)
const setupEl = ref<InstanceType<typeof KendoSetup> | null>(null)
let com: Kendo1Com | null = null

function openSetup() {
  guide.stop()
  setupOpen.value = true
}

function startGame(value: KendoSetupValue) {
  setup.value = value
  saveSetup(SETUP_KEY, value)
  setupOpen.value = false
  match = createMatch()
  aiuchiUntil = -1
  com = value.vsCom ? createKendo1Com(value.level, freshSeed(), 1) : null
  input?.clearPending()
}

// ── あそびかた（音声）──
const guide = useSpeechGuide(KENDO1_GUIDE)
const guideLine = computed(() => KENDO1_GUIDE[guide.current.value] ?? null)

// ── ボタン設定 ──
const configOpen = ref(false)
const capture = ref<{ slot: PlayerId; action: Action } | null>(null)
type Binding = PadBinding<Action>
const bindingView = ref<[Binding, Binding]>([structuredClone(KENDO1_INPUT.defaultPad), structuredClone(KENDO1_INPUT.defaultPad)])

function toggleConfig() {
  guide.stop()
  configOpen.value = !configOpen.value
  capture.value = null
  input?.clearPending()
}

function startCapture(slot: PlayerId, action: string) {
  capture.value = { slot, action: action as Action }
}

let saveBindings: ((b: [Binding, Binding]) => void) | null = null

function applyBindings(next: [Binding, Binding]) {
  if (!input) return
  input.bindings = next
  bindingView.value = structuredClone(next)
  saveBindings?.(next)
}

function resetBindings() {
  applyBindings([structuredClone(KENDO1_INPUT.defaultPad), structuredClone(KENDO1_INPUT.defaultPad)])
  capture.value = null
}

// ── ゲームループ（固定タイムステップ）──
const stageEl = ref<HTMLDivElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
let match: MatchState = createMatch()
let renderer: KendoRenderer | null = null
let input: InputManager<Action> | null = null
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
      const next: [Binding, Binding] = structuredClone(input.bindings)
      next[c.slot][c.action] = [pressed]
      applyBindings(next)
      capture.value = null
    }
    input.clearPending()
    accumulator = 0
  } else if (setupOpen.value) {
    // 選択画面: コントローラーの START（キーボードのスペース）で「はじめる」
    const [a, b] = input.take()
    if (a.pressed.start || b.pressed.start) setupEl.value?.submit()
    accumulator = 0
  } else if (guide.speaking.value) {
    // 読み上げ中は止めておく（聞いている間に試合が進まないように）
    input.clearPending()
    accumulator = 0
  } else {
    while (accumulator >= STEP_MS) {
      const prevFrame = match.frame
      const inputs = input.take()
      if (com) inputs[1] = com.decide(match)
      match = stepMatch(match, inputs)
      if (match.frame < prevFrame) {
        // 再戦でフレーム数が0に戻った: 表示の期限と COM を作り直す
        aiuchiUntil = -1
        if (com) com = createKendo1Com(setup.value.level, freshSeed(), 1)
      }
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
  setup.value = loadSetup(SETUP_KEY)
  // Three.js と Gamepad API はクライアントでだけ読み込む（SSR では動かさない）
  const [{ KendoRenderer }, inputModule] = await Promise.all([
    import('~/utils/kendo-client/renderer'),
    import('~/utils/kendo-client/input'),
  ])
  if (!canvasEl.value || !stageEl.value) return

  saveBindings = (b) => inputModule.savePadBindings(KENDO1_INPUT, b)
  input = new inputModule.InputManager(KENDO1_INPUT, inputModule.loadPadBindings(KENDO1_INPUT))
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
