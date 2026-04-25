<template>
  <div class="flex flex-col items-center px-4 pt-4 lg:pt-8 pb-12 min-h-screen">
    <div class="w-full max-w-[480px] bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-[10px] grid gap-5">

      <!-- Header -->
      <header class="text-center">
        <h1 class="m-0 text-[clamp(22px,4vw,30px)] font-bold bg-gradient-to-br from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          稽古 — 足さばき
        </h1>
        <p class="mt-1 mb-0 text-slate-500 text-sm">剣道の足さばきトレーナー</p>
      </header>

      <!-- Field visualization -->
      <div class="relative flex justify-center select-none">
        <!-- Direction labels outside the canvas -->
        <span class="absolute top-0 left-1/2 -translate-x-1/2 text-[11px] text-slate-600 pointer-events-none">前</span>
        <span class="absolute bottom-0 left-1/2 -translate-x-1/2 text-[11px] text-slate-600 pointer-events-none">後ろ</span>
        <span class="absolute left-0 top-1/2 -translate-y-1/2 text-[11px] text-slate-600 pointer-events-none">左</span>
        <span class="absolute right-0 top-1/2 -translate-y-1/2 text-[11px] text-slate-600 pointer-events-none">右</span>
        <canvas ref="canvasRef" width="260" height="260" class="block" />
        <!-- Command overlay -->
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Transition name="pop">
            <div
              v-if="currentCommand"
              :key="cmdKey"
              class="text-5xl font-black text-white"
              style="text-shadow: 0 2px 20px rgba(0,0,0,0.95), 0 0 40px rgba(96,165,250,0.4)"
            >{{ currentCommand }}</div>
          </Transition>
        </div>
      </div>

      <!-- Countdown bar -->
      <div class="h-1 bg-white/[0.05] rounded-full overflow-hidden -mt-2">
        <div
          class="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full transition-[width] duration-[50ms] ease-linear"
          :style="{ width: `${countdownPct}%` }"
        />
      </div>

      <!-- Status text -->
      <div class="text-center text-xs -mt-2 h-4">
        <span v-if="isRunning" class="text-slate-400 font-mono">
          中心から <span class="text-blue-300">{{ distFromCenter.toFixed(2) }}m</span> ／ 半径 {{ radius }}m
        </span>
        <span v-else-if="settingsInvalid" class="text-amber-400">
          ⚠ 歩幅が大きすぎます（歩幅 ≤ 半径 × 100 cm にしてください）
        </span>
        <span v-else class="text-slate-600">「開始」を押してトレーニングを開始</span>
      </div>

      <!-- Start / Stop -->
      <div class="flex justify-center">
        <button
          class="px-12 py-3 rounded-xl font-semibold text-base transition-all text-white min-w-[140px]"
          :class="isRunning
            ? 'bg-red-500/70 hover:bg-red-500/90 border border-red-400/30'
            : settingsInvalid
              ? 'bg-white/[0.04] border border-white/[0.08] text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-br from-blue-500 to-indigo-500 hover:opacity-90 border border-blue-400/20'"
          :disabled="!isRunning && settingsInvalid"
          @click="toggleTraining"
        >
          {{ isRunning ? '■ 停止' : '▶ 開始' }}
        </button>
      </div>

      <!-- Settings -->
      <div class="border-t border-white/[0.06] pt-4 grid gap-4">
        <h2 class="m-0 text-[11px] font-semibold text-slate-500 uppercase tracking-widest">設定</h2>

        <!-- Interval -->
        <div class="grid gap-1.5">
          <div class="flex justify-between items-baseline">
            <label class="text-sm text-slate-300">掛け声の間隔</label>
            <span class="text-sm font-mono text-blue-300">{{ interval }}秒</span>
          </div>
          <input
            type="range" v-model.number="interval" min="0.5" max="10" step="0.5"
            class="w-full h-1.5 rounded-full accent-blue-400 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="isRunning"
          />
          <div class="flex justify-between text-[10px] text-slate-600"><span>0.5秒</span><span>10秒</span></div>
        </div>

        <!-- Step size -->
        <div class="grid gap-1.5">
          <div class="flex justify-between items-baseline">
            <label class="text-sm text-slate-300">歩幅</label>
            <span class="text-sm font-mono text-blue-300">{{ stepSize }}cm</span>
          </div>
          <input
            type="range" v-model.number="stepSize" min="10" max="150" step="5"
            class="w-full h-1.5 rounded-full accent-blue-400 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="isRunning"
          />
          <div class="flex justify-between text-[10px] text-slate-600"><span>10cm</span><span>150cm</span></div>
        </div>

        <!-- Radius -->
        <div class="grid gap-1.5">
          <div class="flex justify-between items-baseline">
            <label class="text-sm text-slate-300">移動半径</label>
            <span class="text-sm font-mono text-blue-300">{{ radius }}m</span>
          </div>
          <input
            type="range" v-model.number="radius" min="0.5" max="5" step="0.5"
            class="w-full h-1.5 rounded-full accent-blue-400 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="isRunning"
          />
          <div class="flex justify-between text-[10px] text-slate-600"><span>0.5m</span><span>5m</span></div>
        </div>

        <p class="m-0 text-[11px] text-slate-600 leading-relaxed">
          歩幅 {{ stepSize }}cm × 最大 {{ Math.floor(maxStepRadius) }} 歩 ／ 半径 {{ radius }}m の円の中で移動します
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ alias: ['/keiko', '/keiko/'] })
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

useHead({
  title: '稽古 — 足さばき',
  link: [{ rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚔️</text></svg>` }],
})

const LS_KEY = 'keiko-settings'

// State
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isRunning = ref(false)
const currentCommand = ref('')
const cmdKey = ref(0)
const pos = ref({ x: 0, y: 0 })
const trail = ref<{ x: number; y: number }[]>([])
const countdownPct = ref(0)

// Settings
const interval = ref(2)   // seconds between commands
const stepSize = ref(30)  // cm per step
const radius = ref(1.5)   // meters radius constraint

// Timers
let stepTimerId: ReturnType<typeof setTimeout> | null = null
let countdownTimerId: ReturnType<typeof setInterval> | null = null
let stepStartTime = 0

// Computed
const maxStepRadius = computed(() => (radius.value * 100) / stepSize.value)
const settingsInvalid = computed(() => maxStepRadius.value < 1)
const distFromCenter = computed(() =>
  Math.sqrt(pos.value.x ** 2 + pos.value.y ** 2) * stepSize.value / 100
)

// Directions: dx/dy in step units. Y+ = forward (上 on canvas = -py)
type Dir = { label: string; dx: number; dy: number }
const DIRS: Dir[] = [
  { label: '前', dx: 0, dy: 1 },
  { label: '後ろ', dx: 0, dy: -1 },
  { label: '右', dx: 1, dy: 0 },
  { label: '左', dx: -1, dy: 0 },
]

const getValidDirs = (): Dir[] => {
  const max = maxStepRadius.value
  return DIRS.filter(d => {
    const nx = pos.value.x + d.dx
    const ny = pos.value.y + d.dy
    return Math.sqrt(nx * nx + ny * ny) <= max
  })
}

// Canvas
const CANVAS_R = 110 // pixel radius of boundary circle

const drawCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const W = canvas.width, H = canvas.height
  const cx = W / 2, cy = H / 2
  const scale = CANVAS_R / (radius.value * 100) // px per cm

  ctx.clearRect(0, 0, W, H)

  // Outer glow
  ctx.beginPath()
  ctx.arc(cx, cy, CANVAS_R + 8, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(99,102,241,0.04)'
  ctx.fill()

  // Boundary circle
  ctx.beginPath()
  ctx.arc(cx, cy, CANVAS_R, 0, Math.PI * 2)
  ctx.strokeStyle = isRunning.value ? 'rgba(99,102,241,0.55)' : 'rgba(99,102,241,0.28)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 4])
  ctx.stroke()
  ctx.setLineDash([])

  // Grid dots at each reachable integer step position
  const maxN = Math.ceil(maxStepRadius.value) + 1
  if (maxN <= 15) {
    for (let gx = -maxN; gx <= maxN; gx++) {
      for (let gy = -maxN; gy <= maxN; gy++) {
        if (Math.sqrt(gx * gx + gy * gy) > maxStepRadius.value + 0.01) continue
        const dpx = cx + gx * stepSize.value * scale
        const dpy = cy - gy * stepSize.value * scale
        ctx.beginPath()
        ctx.arc(dpx, dpy, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.1)'
        ctx.fill()
      }
    }
  }

  // Cross hairs
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(cx - CANVAS_R, cy); ctx.lineTo(cx + CANVAS_R, cy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, cy - CANVAS_R); ctx.lineTo(cx, cy + CANVAS_R); ctx.stroke()

  // Trail line
  if (trail.value.length > 1) {
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(96,165,250,0.22)'
    ctx.lineWidth = 1.5
    const first = trail.value[0]
    ctx.moveTo(cx + first.x * stepSize.value * scale, cy - first.y * stepSize.value * scale)
    for (let i = 1; i < trail.value.length; i++) {
      const t = trail.value[i]
      ctx.lineTo(cx + t.x * stepSize.value * scale, cy - t.y * stepSize.value * scale)
    }
    ctx.stroke()
  }

  // Trail dots (fading)
  for (let i = 0; i < trail.value.length; i++) {
    const t = trail.value[i]
    const alpha = ((i + 1) / 10) * 0.45
    const tx = cx + t.x * stepSize.value * scale
    const ty = cy - t.y * stepSize.value * scale
    ctx.beginPath()
    ctx.arc(tx, ty, 3.5, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(96,165,250,${alpha})`
    ctx.fill()
  }

  // Current position glow
  const ppx = cx + pos.value.x * stepSize.value * scale
  const ppy = cy - pos.value.y * stepSize.value * scale
  const glow = ctx.createRadialGradient(ppx, ppy, 0, ppx, ppy, 22)
  glow.addColorStop(0, isRunning.value ? 'rgba(96,165,250,0.5)' : 'rgba(99,102,241,0.35)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.beginPath()
  ctx.arc(ppx, ppy, 22, 0, Math.PI * 2)
  ctx.fillStyle = glow
  ctx.fill()

  // Position dot
  ctx.beginPath()
  ctx.arc(ppx, ppy, 7, 0, Math.PI * 2)
  ctx.fillStyle = isRunning.value ? '#60a5fa' : '#818cf8'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'
  ctx.lineWidth = 1.5
  ctx.stroke()
}

// Speech synthesis
const speak = (text: string) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = 'ja-JP'
  utt.rate = 1.0
  utt.pitch = 1.0
  utt.volume = 1.0
  window.speechSynthesis.speak(utt)
}

// Countdown bar updater
const startCountdown = () => {
  stepStartTime = Date.now()
  if (countdownTimerId) clearInterval(countdownTimerId)
  countdownPct.value = 100
  countdownTimerId = setInterval(() => {
    const elapsed = (Date.now() - stepStartTime) / 1000
    countdownPct.value = Math.max(0, (1 - elapsed / interval.value) * 100)
  }, 50)
}

// Issue one command, move position, schedule next
const doStep = () => {
  const valid = getValidDirs()
  if (!valid.length) return

  const dir = valid[Math.floor(Math.random() * valid.length)]
  trail.value = [...trail.value.slice(-9), { ...pos.value }]
  pos.value = { x: pos.value.x + dir.dx, y: pos.value.y + dir.dy }

  currentCommand.value = dir.label
  cmdKey.value++
  speak(dir.label)
  drawCanvas()
  startCountdown()

  stepTimerId = setTimeout(doStep, interval.value * 1000)
}

const toggleTraining = () => {
  if (isRunning.value) {
    if (stepTimerId) { clearTimeout(stepTimerId); stepTimerId = null }
    if (countdownTimerId) { clearInterval(countdownTimerId); countdownTimerId = null }
    isRunning.value = false
    currentCommand.value = ''
    pos.value = { x: 0, y: 0 }
    trail.value = []
    countdownPct.value = 0
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    drawCanvas()
  } else {
    isRunning.value = true
    pos.value = { x: 0, y: 0 }
    trail.value = []
    doStep()
  }
}

// Persist settings
const saveSettings = () => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      interval: interval.value,
      stepSize: stepSize.value,
      radius: radius.value,
    }))
  } catch {}
}

const loadSettings = () => {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return
    const p = JSON.parse(raw)
    if (typeof p.interval === 'number') interval.value = p.interval
    if (typeof p.stepSize === 'number') stepSize.value = p.stepSize
    if (typeof p.radius === 'number') radius.value = p.radius
  } catch {}
}

watch([interval, stepSize, radius], () => {
  saveSettings()
  if (!isRunning.value) drawCanvas()
})

onMounted(() => {
  loadSettings()
  nextTick(drawCanvas)
})

onUnmounted(() => {
  if (stepTimerId) clearTimeout(stepTimerId)
  if (countdownTimerId) clearInterval(countdownTimerId)
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
})
</script>

<style scoped>
.pop-enter-active {
  animation: pop-in 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.pop-leave-active {
  animation: pop-out 0.1s ease-in forwards;
}
@keyframes pop-in {
  from { opacity: 0; transform: scale(0.65); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes pop-out {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(1.2); }
}
</style>
