<template>
  <div class="flex flex-col items-center py-6 px-3 min-h-full select-none">
    <div class="w-full max-w-5xl flex items-end justify-between mb-3">
      <div>
        <h1 class="m-0 text-2xl font-bold bg-gradient-to-br from-emerald-400 to-teal-400 bg-clip-text text-transparent">
          🥋 剣道 三本勝負 第2弾
        </h1>
        <p class="m-0 mt-1 text-xs text-slate-500">
          防御・返し技・突き。2人対戦・二本先取で勝ち ─
          <NuxtLink to="/games/kendo" class="text-slate-400 underline">第1弾はこちら</NuxtLink>
        </p>
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
        <button
          class="text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] cursor-pointer"
          @click="toggleConfig"
        >
          🎮 ボタン設定
        </button>
      </div>
    </div>

    <!-- ═══ ゲーム画面 ═══ -->
    <div ref="stageEl" class="relative w-full max-w-5xl aspect-video rounded-2xl overflow-hidden border border-white/[0.08] bg-[#e8dcc4]">
      <canvas ref="canvasEl" class="block w-full h-full" />

      <!-- スコア・状態・打てるまでのゲージ -->
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
                {{ hud.players[p.id].marks[i - 1] ?? '' }}
              </span>
            </div>
          </div>
          <div class="w-36 h-2 rounded-full bg-slate-800/40 overflow-hidden">
            <div
              :class="['h-full transition-[width] duration-75', hud.players[p.id].ready ? 'bg-emerald-500' : 'bg-amber-400']"
              :style="{ width: `${hud.players[p.id].charge * 10}%` }"
            />
          </div>
          <div
            v-if="STATUS_LABEL[hud.players[p.id].status]"
            :class="['px-2.5 py-0.5 rounded-full text-xs font-bold', STATUS_STYLE[hud.players[p.id].status]]"
          >
            {{ STATUS_LABEL[hud.players[p.id].status] }}
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
        <div class="mt-1 text-xs font-normal text-slate-400">{{ guide.current.value + 1 }} / {{ KENDO2_GUIDE.length }}</div>
      </div>

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
        <div>コントローラー: 十字キー左右＝歩く（連打で送り足）/ A＝面 / B＝小手 / Y＝胴 / X＝突き / L＝小手を守る / R＝面を守る / START＝再戦</div>
        <div>キーボード: {{ p.keys }} / スペース＝再戦</div>
      </div>
    </div>
    <p class="w-full max-w-5xl mt-3 text-xs text-slate-500 leading-relaxed">
      構えている相手には 面・突き、面を守っている相手には 小手・胴、小手を守っている相手には 面 が入ります。
      相手の打突を防いだら、0.5秒以内に打つと返し技（相手は崩れているので必ず入る）。
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import KendoButtonConfig from '~/components/kendo/KendoButtonConfig.vue'
import { useSpeechGuide } from '~/composables/kendo/useSpeechGuide'
import { ATTACK_COOLDOWN, DEFAULT_POINTS_TO_WIN, FPS } from '~/utils/kendo2/constants'
import { effectiveGuard } from '~/utils/kendo2/fighter'
import { classifyMaai, distanceBetween } from '~/utils/kendo2/maai'
import { createMatch, stepMatch } from '~/utils/kendo2/match'
import type { Action, Fighter, Maai, MatchPhase, MatchState, PlayerId, Technique } from '~/utils/kendo2/types'
import { KENDO2_GUIDE } from '~/utils/kendo-client/guide'
import { KENDO2_INPUT } from '~/utils/kendo-client/input'
import type { InputManager, PadBinding, PadStatus } from '~/utils/kendo-client/input'
import type { Kendo2Renderer } from '~/utils/kendo-client/renderer2'

useHead({
  title: '剣道 三本勝負 第2弾',
  link: [{ key: 'icon', rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🥋</text></svg>` }],
})

const POINTS_TO_WIN = DEFAULT_POINTS_TO_WIN
const STEP_MS = 1000 / FPS
const HAJIME_SHOW = 45
/** 「相打ち」「防いだ！」「外れ」を出しておくフレーム数 */
const FLASH_SHOW = 40
const WHITE_TEXT = 'text-white [-webkit-text-stroke:2px_#334155]'

const PLAYERS = [
  { id: 0 as PlayerId, label: '赤', badge: 'bg-red-600 text-white', keys: 'A/D＝移動・F＝面・G＝小手・H＝胴・T＝突き・Q＝小手を守る・E＝面を守る' },
  { id: 1 as PlayerId, label: '白', badge: 'bg-white text-slate-900', keys: '←/→＝移動・J＝面・K＝小手・L＝胴・I＝突き・U＝小手を守る・O＝面を守る' },
]
const TECHNIQUE_NAME: Record<Technique, string> = { men: '面', kote: '小手', do: '胴', tsuki: '突き' }
const TECHNIQUE_MARK: Record<Technique, string> = { men: 'メ', kote: 'コ', do: 'ド', tsuki: 'ツ' }
const MAAI_LABEL: Record<Maai, string> = { toma: '遠間', issoku: '一足一刀', chikama: '近間' }
const MAAI_STYLE: Record<Maai, string> = {
  toma: 'bg-slate-700/70 text-slate-100',
  issoku: 'bg-amber-400/90 text-slate-900',
  chikama: 'bg-rose-500/80 text-white',
}

type Status = 'none' | 'guardMen' | 'guardKote' | 'kuzure' | 'kaeshi' | 'blocked' | 'miss'
const STATUS_LABEL: Record<Status, string> = {
  none: '',
  guardMen: '🛡 面を守る',
  guardKote: '🛡 小手を守る',
  kuzure: '💫 崩れた！',
  kaeshi: '⚡ 返せ！',
  blocked: '✋ 防いだ！',
  miss: 'はずれ',
}
const STATUS_STYLE: Record<Status, string> = {
  none: '',
  guardMen: 'bg-sky-600/90 text-white',
  guardKote: 'bg-sky-600/90 text-white',
  kuzure: 'bg-slate-700/90 text-white',
  kaeshi: 'bg-amber-400 text-slate-900 animate-pulse',
  blocked: 'bg-sky-600/90 text-white',
  miss: 'bg-slate-500/80 text-white',
}

const CONFIG_ACTIONS: { key: Action; label: string }[] = [
  { key: 'men', label: '面' },
  { key: 'kote', label: '小手' },
  { key: 'do', label: '胴' },
  { key: 'tsuki', label: '突き' },
  { key: 'guardKote', label: '小手を守る' },
  { key: 'guardMen', label: '面を守る' },
  { key: 'start', label: 'スタート（再戦）' },
  { key: 'left', label: '左' },
  { key: 'right', label: '右' },
]

// ── UI に渡す最小限の状態（Three.js のオブジェクトや MatchState 全体はリアクティブにしない）──
interface PlayerHud {
  marks: string[]
  /** 打てるまでのゲージ 0〜10（10＝打てる） */
  charge: number
  ready: boolean
  status: Status
}

interface Hud {
  phase: MatchPhase
  phaseFrame: number
  players: [PlayerHud, PlayerHud]
  lastPoint: { by: PlayerId; technique: Technique; kaeshiFrom: Technique | null } | null
  winner: PlayerId | null
  maai: Maai
  aiuchi: boolean
  pads: [PadStatus, PadStatus]
}

/** 「防いだ！」「はずれ」を少しの間出しておくための、プレイヤーごとの表示期限（試合のフレーム） */
const flashes: [{ status: Status; until: number }, { status: Status; until: number }] = [
  { status: 'none', until: -1 },
  { status: 'none', until: -1 },
]

function statusOf(f: Fighter, frame: number): Status {
  if (f.kaeshiWindow > 0) return 'kaeshi'
  if (f.phase === 'kuzure') return 'kuzure'
  const guard = effectiveGuard(f)
  if (guard) return guard === 'men' ? 'guardMen' : 'guardKote'
  const flash = flashes[f.id]
  return frame < flash.until ? flash.status : 'none'
}

function hudOf(s: MatchState, aiuchi: boolean, pads: [PadStatus, PadStatus]): Hud {
  const player = (f: Fighter): PlayerHud => ({
    marks: s.points.filter((p) => p.by === f.id).map((p) => TECHNIQUE_MARK[p.technique]),
    charge: Math.round((1 - f.attackCooldown / ATTACK_COOLDOWN) * 10),
    ready: f.attackCooldown === 0,
    status: s.phase === 'fight' ? statusOf(f, s.frame) : 'none',
  })
  const last = s.points[s.points.length - 1]
  return {
    phase: s.phase,
    phaseFrame: Math.min(s.phaseFrame, HAJIME_SHOW),
    players: [player(s.fighters[0]), player(s.fighters[1])],
    lastPoint: last ? { by: last.by, technique: last.technique, kaeshiFrom: last.kaeshiFrom } : null,
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
    const [a, b] = [h.players[0].marks.length, h.players[1].marks.length]
    return { text: a + b === 0 ? 'はじめ！' : a === b ? '勝負！' : '二本目！', color: 'text-slate-800', sub: '' }
  }
  if (h.phase === 'fight' && h.aiuchi) return { text: '相打ち', color: 'text-slate-700', sub: '' }
  if (h.phase === 'ippon' && h.lastPoint) {
    const { by, technique, kaeshiFrom } = h.lastPoint
    const name = kaeshiFrom ? `${TECHNIQUE_NAME[kaeshiFrom]}返し${TECHNIQUE_NAME[technique]}` : TECHNIQUE_NAME[technique]
    return {
      text: `${name}あり！`,
      color: by === 0 ? 'text-red-600' : WHITE_TEXT,
      sub: h.winner !== null ? '' : `${PLAYERS[by]!.label}の一本`,
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
const guide = useSpeechGuide(KENDO2_GUIDE)
const guideLine = computed(() => KENDO2_GUIDE[guide.current.value] ?? null)

// ── ボタン設定 ──
const configOpen = ref(false)
const capture = ref<{ slot: PlayerId; action: Action } | null>(null)
type Binding = PadBinding<Action>
const bindingView = ref<[Binding, Binding]>([structuredClone(KENDO2_INPUT.defaultPad), structuredClone(KENDO2_INPUT.defaultPad)])

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
  applyBindings([structuredClone(KENDO2_INPUT.defaultPad), structuredClone(KENDO2_INPUT.defaultPad)])
  capture.value = null
}

// ── ゲームループ（固定タイムステップ）──
const stageEl = ref<HTMLDivElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
let match: MatchState = createMatch()
let renderer: Kendo2Renderer | null = null
let input: InputManager<Action> | null = null
let rafId: number | null = null
let resizeObserver: ResizeObserver | null = null
let lastTime = 0
let accumulator = 0
let aiuchiUntil = -1

function resetFlashes() {
  aiuchiUntil = -1
  for (const f of flashes) f.until = -1
}

function collectFlashes(s: MatchState) {
  for (const e of s.events) {
    if (e.type === 'aiuchi') aiuchiUntil = s.frame + FLASH_SHOW
    if (e.type === 'blocked') flashes[e.by] = { status: 'blocked', until: s.frame + FLASH_SHOW }
    if (e.type === 'miss') flashes[e.by] = { status: 'miss', until: s.frame + FLASH_SHOW }
  }
}

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
  } else if (guide.speaking.value) {
    // 読み上げ中は止めておく（聞いている間に試合が進まないように）
    input.clearPending()
    accumulator = 0
  } else {
    while (accumulator >= STEP_MS) {
      const prevFrame = match.frame
      match = stepMatch(match, input.take())
      if (match.frame < prevFrame) resetFlashes() // 再戦でフレーム数が0に戻った
      collectFlashes(match)
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
  const [{ Kendo2Renderer }, inputModule] = await Promise.all([
    import('~/utils/kendo-client/renderer2'),
    import('~/utils/kendo-client/input'),
  ])
  if (!canvasEl.value || !stageEl.value) return

  saveBindings = (b) => inputModule.savePadBindings(KENDO2_INPUT, b)
  input = new inputModule.InputManager(KENDO2_INPUT, inputModule.loadPadBindings(KENDO2_INPUT))
  bindingView.value = structuredClone(input.bindings)
  input.attach()

  renderer = new Kendo2Renderer(canvasEl.value)
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
