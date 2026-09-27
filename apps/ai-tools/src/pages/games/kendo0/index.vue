<template>
  <div class="flex flex-col items-center py-6 px-3 min-h-full select-none">
    <div class="w-full max-w-5xl flex items-end justify-between mb-3 gap-2">
      <div>
        <h1 class="m-0 text-2xl font-bold bg-gradient-to-br from-emerald-400 to-teal-400 bg-clip-text text-transparent">
          🥋 剣道 三本勝負
        </h1>
        <p class="m-0 mt-1 text-xs text-slate-500">幼稚園児から大人まで互角・二本先取で勝ち</p>
      </div>
      <div class="flex gap-2 shrink-0">
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
        <button class="text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] cursor-pointer" @click="toggleConfig">
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
        <div v-for="p in PLAYERS" :key="p.id" :class="['flex flex-col gap-1.5', p.id === 1 ? 'items-end' : 'items-start']">
          <div :class="['flex items-center gap-2', p.id === 1 && 'flex-row-reverse']">
            <div :class="['px-3 py-1 rounded-lg text-sm font-bold shadow', p.badge]">{{ p.label }}</div>
            <div class="flex gap-1">
              <span
                v-for="i in POINTS_TO_WIN"
                :key="i"
                class="w-8 h-8 rounded-full border-2 border-slate-700/60 bg-white/80 flex items-center justify-center text-sm font-bold text-slate-800"
              >
                {{ i <= hud.scores[p.id] ? 'メ' : '' }}
              </span>
            </div>
          </div>
          <div class="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-900/60 text-white">{{ sideLabel(p.id) }}</div>
          <div v-if="hud.whiff[p.id]" class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/80 text-white">からぶり</div>
        </div>
      </div>

      <!-- いまだ！ -->
      <div
        v-if="hud.phase === 'fight' && hud.zone && !callout"
        class="absolute left-1/2 top-[22%] -translate-x-1/2 text-4xl sm:text-6xl font-black text-amber-400 [-webkit-text-stroke:2px_#7c2d12] pointer-events-none animate-pulse"
      >
        いまだ！
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
        <div class="mt-1 text-xs font-normal text-slate-400">{{ guide.current.value + 1 }} / {{ KENDO0_GUIDE.length }}</div>
      </div>

      <KendoSetup v-if="setupOpen && !configOpen" ref="setupEl" :initial="setup" show-ages @start="startGame" />

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
        <div>コントローラー: A・B・X・Y のどれでも＝面 / START＝はじめる・再戦</div>
        <div>キーボード: {{ p.keys }} / スペース＝はじめる・再戦</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import KendoButtonConfig from '~/components/kendo/KendoButtonConfig.vue'
import KendoTabs from '~/components/kendo/KendoTabs.vue'
import KendoSetup from '~/components/kendo/KendoSetup.vue'
import { useSpeechGuide } from '~/composables/kendo/useSpeechGuide'
import { createKendo0Com } from '~/utils/kendo0/com'
import type { Kendo0Com } from '~/utils/kendo0/com'
import { AGE_LABEL, DEFAULT_POINTS_TO_WIN, FPS } from '~/utils/kendo0/constants'
import { createMatch, inZone, stepMatch } from '~/utils/kendo0/match'
import type { Action, MatchPhase, MatchState, PlayerId } from '~/utils/kendo0/types'
import { KENDO0_GUIDE } from '~/utils/kendo-client/guide'
import { KENDO0_INPUT } from '~/utils/kendo-client/input'
import type { InputManager, PadBinding, PadStatus } from '~/utils/kendo-client/input'
import type { Kendo0Renderer } from '~/utils/kendo-client/renderer0'
import { COM_AGE, copySetup, DEFAULT_SETUP, freshSeed, loadSetup, saveSetup } from '~/utils/kendo-client/setup'
import type { KendoSetupValue } from '~/utils/kendo-client/setup'

useHead({
  title: '剣道 三本勝負 第0弾',
  link: [{ key: 'icon', rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🥋</text></svg>` }],
})

const SETUP_KEY = 'kendo0:setup'
const POINTS_TO_WIN = DEFAULT_POINTS_TO_WIN
const STEP_MS = 1000 / FPS
const HAJIME_SHOW = 45
const FLASH_SHOW = 40
const WHITE_TEXT = 'text-white [-webkit-text-stroke:2px_#334155]'

const PLAYERS = [
  { id: 0 as PlayerId, label: '赤', badge: 'bg-red-600 text-white', keys: 'F・G・H のどれでも＝面' },
  { id: 1 as PlayerId, label: '白', badge: 'bg-white text-slate-900', keys: 'J・K・L のどれでも＝面' },
]
const CONFIG_ACTIONS: { key: Action; label: string }[] = [
  { key: 'strike', label: '面（どれでも）' },
  { key: 'start', label: 'スタート' },
]

// ── 試合前の選択 ──
const setup = ref<KendoSetupValue>(copySetup(DEFAULT_SETUP))
const setupOpen = ref(true)
const setupEl = ref<InstanceType<typeof KendoSetup> | null>(null)
let com: Kendo0Com | null = null

function sideLabel(id: PlayerId) {
  if (id === 1 && setup.value.vsCom) return `🤖 COM ${'★'.repeat(setup.value.level)}`
  return AGE_LABEL[setup.value.ages[id]]
}

function openSetup() {
  guide.stop()
  setupOpen.value = true
}

function startGame(value: KendoSetupValue) {
  setup.value = value
  saveSetup(SETUP_KEY, value)
  setupOpen.value = false
  const ages: [typeof value.ages[0], typeof value.ages[1]] = [value.ages[0], value.vsCom ? COM_AGE : value.ages[1]]
  match = createMatch({ pointsToWin: DEFAULT_POINTS_TO_WIN, ages, seed: freshSeed() })
  com = value.vsCom ? createKendo0Com(value.level, freshSeed(), 1) : null
  resetFlashes()
  input?.clearPending()
}

// ── UI に渡す最小限の状態 ──
interface Hud {
  phase: MatchPhase
  phaseFrame: number
  scores: [number, number]
  lastBy: PlayerId | null
  winner: PlayerId | null
  zone: boolean
  aiuchi: boolean
  whiff: [boolean, boolean]
  pads: [PadStatus, PadStatus]
}

let aiuchiUntil = -1
const whiffUntil: [number, number] = [-1, -1]

function resetFlashes() {
  aiuchiUntil = -1
  whiffUntil[0] = -1
  whiffUntil[1] = -1
}

function hudOf(s: MatchState, pads: [PadStatus, PadStatus]): Hud {
  const last = s.points[s.points.length - 1]
  return {
    phase: s.phase,
    phaseFrame: Math.min(s.phaseFrame, HAJIME_SHOW),
    scores: [s.scores[0], s.scores[1]],
    lastBy: last?.by ?? null,
    winner: s.winner,
    zone: inZone(s),
    aiuchi: s.frame < aiuchiUntil,
    whiff: [s.frame < whiffUntil[0], s.frame < whiffUntil[1]],
    pads: [{ ...pads[0] }, { ...pads[1] }],
  }
}

const emptyPads = (): [PadStatus, PadStatus] => [{ connected: false, name: '' }, { connected: false, name: '' }]
const hud = shallowRef<Hud>(hudOf(createMatch(), emptyPads()))
let hudKey = ''

const callout = computed(() => {
  const h = hud.value
  if (setupOpen.value) return null
  if (h.phase === 'ready') return { text: '構えて', color: 'text-slate-800', sub: '' }
  if (h.phase === 'fight' && h.phaseFrame < HAJIME_SHOW) {
    const [a, b] = h.scores
    return { text: a + b === 0 ? 'はじめ！' : a === b ? '勝負！' : '二本目！', color: 'text-slate-800', sub: '' }
  }
  if (h.phase === 'fight' && h.aiuchi) return { text: '相打ち', color: 'text-slate-700', sub: '' }
  if (h.phase === 'ippon' && h.lastBy !== null) {
    return {
      text: '面あり！',
      color: h.lastBy === 0 ? 'text-red-600' : WHITE_TEXT,
      sub: h.winner !== null ? '' : `${PLAYERS[h.lastBy]!.label}の一本`,
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

// ── あそびかた（音声）──
const guide = useSpeechGuide(KENDO0_GUIDE)
const guideLine = computed(() => KENDO0_GUIDE[guide.current.value] ?? null)

// ── ボタン設定 ──
const configOpen = ref(false)
const capture = ref<{ slot: PlayerId; action: Action } | null>(null)
type Binding = PadBinding<Action>
const bindingView = ref<[Binding, Binding]>([structuredClone(KENDO0_INPUT.defaultPad), structuredClone(KENDO0_INPUT.defaultPad)])

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
  applyBindings([structuredClone(KENDO0_INPUT.defaultPad), structuredClone(KENDO0_INPUT.defaultPad)])
  capture.value = null
}

// ── ゲームループ（固定タイムステップ）──
const stageEl = ref<HTMLDivElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
let match: MatchState = createMatch()
let renderer: Kendo0Renderer | null = null
let input: InputManager<Action> | null = null
let rafId: number | null = null
let resizeObserver: ResizeObserver | null = null
let lastTime = 0
let accumulator = 0

function frame(now: number) {
  rafId = requestAnimationFrame(frame)
  if (!renderer || !input) return
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
        resetFlashes()
        if (com) com = createKendo0Com(setup.value.level, freshSeed(), 1)
      }
      for (const e of match.events) {
        if (e.type === 'aiuchi') aiuchiUntil = match.frame + FLASH_SHOW
        if (e.type === 'whiff') whiffUntil[e.by] = match.frame + FLASH_SHOW
      }
      accumulator -= STEP_MS
    }
  }

  renderer.render(match)
  const next = hudOf(match, input.pads)
  const key = JSON.stringify(next)
  if (key !== hudKey) {
    hudKey = key
    hud.value = next
  }
}

onMounted(async () => {
  setup.value = loadSetup(SETUP_KEY)
  // Three.js と Gamepad API はクライアントでだけ読み込む（SSR では動かさない）
  const [{ Kendo0Renderer }, inputModule] = await Promise.all([
    import('~/utils/kendo-client/renderer0'),
    import('~/utils/kendo-client/input'),
  ])
  if (!canvasEl.value || !stageEl.value) return

  saveBindings = (b) => inputModule.savePadBindings(KENDO0_INPUT, b)
  input = new inputModule.InputManager(KENDO0_INPUT, inputModule.loadPadBindings(KENDO0_INPUT))
  bindingView.value = structuredClone(input.bindings)
  input.attach()

  renderer = new Kendo0Renderer(canvasEl.value)
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
