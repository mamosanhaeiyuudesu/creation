<template>
  <div class="flex flex-col gap-3">
    <!-- 期間トグル -->
    <div class="flex items-center gap-1.5">
      <button
        v-for="opt in periods"
        :key="opt.days"
        class="px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer"
        :class="days === opt.days ? 'border-white/20 bg-white/10 text-slate-100' : 'border-white/[0.08] text-slate-500 hover:text-slate-300'"
        @click="setDays(opt.days)"
      >{{ opt.label }}</button>
    </div>

    <div v-if="loading" class="h-[200px] flex items-center justify-center text-slate-500 text-sm animate-pulse">読み込み中…</div>
    <div v-else-if="!bars.length" class="h-[200px] flex items-center justify-center text-slate-600 text-sm">データがありません</div>

    <template v-else>
      <div class="flex items-center justify-between">
        <div class="text-[10px] text-slate-500">棒の上端＝就寝、下端＝起床</div>
        <div class="flex items-center gap-2.5">
          <span v-for="lv in stageLevels" :key="lv.stage" class="flex items-center gap-1 text-[10px] text-slate-500">
            <span class="w-2 h-2 rounded-full" :style="{ background: stageColor(lv.stage) }" />{{ lv.jp }}
          </span>
        </div>
      </div>
      <div ref="wrap" class="relative" :style="{ height: `${H}px` }">
        <!-- touch-pan-y: タップで値を出しつつ、縦ドラッグはモーダルのスクロールに使えるようにする -->
        <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="w-full h-full block touch-pan-y" @pointermove="onMove" @pointerdown="onDown" @pointerleave="onLeave" @pointercancel="onCancel">
          <!-- 時刻グリッド -->
          <g v-for="(g, i) in gridLines" :key="`g${i}`">
            <line :x1="padL" :x2="W - padR" :y1="g.y" :y2="g.y" class="stroke-white/[0.06]" stroke-width="1" vector-effect="non-scaling-stroke" />
            <text :x="padL - 6" :y="g.y + 3" text-anchor="end" class="fill-slate-600" :style="labelStyle">{{ g.label }}</text>
          </g>
          <!-- 就寝→起床 の帯（ステージ別に色分け。タイムラインが無ければ単色帯にフォールバック） -->
          <template v-for="b in bars" :key="`b${b.i}`">
            <template v-if="b.segments.length">
              <rect
                v-for="(seg, si) in b.segments"
                :key="`s${b.i}-${si}`"
                :x="b.x"
                :y="seg.y"
                :width="b.width"
                :height="seg.height"
                rx="1"
                :fill="stageColor(seg.stage)"
                :fill-opacity="hover === b.i ? 1 : 0.75"
              />
            </template>
            <rect
              v-else
              :x="b.x"
              :y="b.y"
              :width="b.width"
              :height="b.height"
              rx="2"
              fill="#818cf8"
              :fill-opacity="hover === b.i ? 1 : 0.7"
            />
          </template>
          <!-- X ラベル -->
          <text v-for="(lbl, i) in xLabels" :key="`x${i}`" :x="lbl.x" :y="H - 4" text-anchor="middle" class="fill-slate-600" :style="labelStyle">{{ lbl.text }}</text>
        </svg>
        <!-- ツールチップ -->
        <div
          v-if="hovered"
          class="pointer-events-none absolute z-50 px-2 py-1 rounded-md bg-slate-900/95 border border-white/10 text-[11px] whitespace-nowrap -translate-x-1/2 shadow-lg"
          :style="tooltipStyle"
        >
          <div class="text-slate-400 text-[10px]">{{ hovered.dateLabel }}</div>
          <div class="font-semibold text-slate-100 tabular-nums">{{ hovered.bedtime }} → {{ hovered.waketime }}</div>
          <div class="text-slate-500 text-[10px] tabular-nums">{{ hovered.duration }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { mdWeekday } from '~/utils/jst'
import type { SleepStage } from '~/types/fitbit'
import { SLEEP_STAGE_LEVELS, sleepStageColor } from '~/utils/sleepStage'

const props = withDefaults(defineProps<{
  date?: string
  defaultDays?: number
}>(), { defaultDays: 7 })

interface SleepDay {
  date: string; bedtime: string; waketime: string; totalMinutes: number
  timeline: { stage: SleepStage; start: number; duration: number }[]
}

const stageLevels = SLEEP_STAGE_LEVELS
const stageColor = sleepStageColor

const periods = [
  { days: 7, label: '7日' },
  { days: 30, label: '1か月' },
]

const days = ref(props.defaultDays)
const series = ref<SleepDay[]>([])
const loading = ref(true)

// SVG レイアウト（viewBox 単位）。W は実ピクセル幅で測る（固定値だと preserveAspectRatio=none 下で
// X/Yの拡縮比がずれ、文字が横長に歪むため。棒グラフ（useBarChart）と同じ考え方）。
const W = ref(320)
const H = 200
const padL = 40
const padR = 8
const padT = 10
const padB = 20
const labelStyle = 'font-size:9px'

const wrap = ref<HTMLElement>()
const hover = ref(-1)

/** "HH:MM" → 18時基準の経過分（0時〜11時台は翌日扱い）。就寝＝小、起床＝大 になる。 */
function toAxis(hhmm: string): number | null {
  if (!hhmm || !hhmm.includes(':')) return null
  const [h, m] = hhmm.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  let mins = h * 60 + m
  if (h < 12) mins += 1440
  return mins - 1080
}

/** 18時基準の経過分 → "HH:00" */
function axisToClock(axis: number): string {
  const total = ((Math.round(axis) + 1080) % 1440 + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:00`
}

const valid = computed(() =>
  series.value
    .map(d => ({ ...d, bed: toAxis(d.bedtime), wake: toAxis(d.waketime) }))
    .filter(d => d.bed != null && d.wake != null && d.totalMinutes > 0 && (d.wake as number) > (d.bed as number)),
)

// Y ドメイン（就寝の最小〜起床の最大、30分パディング）
const domain = computed(() => {
  if (!valid.value.length) return { min: 0, max: 1 }
  let min = Infinity, max = -Infinity
  for (const d of valid.value) { min = Math.min(min, d.bed as number); max = Math.max(max, d.wake as number) }
  return { min: min - 30, max: max + 30 }
})

const yScale = (axis: number) => {
  const { min, max } = domain.value
  return padT + ((axis - min) / (max - min || 1)) * (H - padT - padB)
}

const band = computed(() => (W.value - padL - padR) / Math.max(1, series.value.length))

const bars = computed(() =>
  valid.value.map((d) => {
    const idx = series.value.findIndex(s => s.date === d.date)
    const x = padL + (idx + 0.5) * band.value
    const bw = Math.min(band.value * 0.6, 18)
    const bedAxis = d.bed as number
    const yTop = yScale(bedAxis)
    const yBot = yScale(d.wake as number)
    const h = Math.floor(d.totalMinutes / 60)
    const m = d.totalMinutes % 60
    // ステージ帯（覚醒/レム/浅い/深い）を就寝軸に沿って描く。データが無ければ空配列→単色帯にフォールバック。
    const segments = (d.timeline ?? []).map((seg) => {
      const segTop = yScale(bedAxis + seg.start)
      const segBot = yScale(bedAxis + seg.start + seg.duration)
      return { stage: seg.stage, y: segTop, height: Math.max(1, segBot - segTop) }
    })
    return {
      i: idx,
      x: x - bw / 2,
      y: yTop,
      width: bw,
      height: Math.max(2, yBot - yTop),
      segments,
      cx: x,
      date: d.date,
      dateLabel: mdWeekday(d.date),
      bedtime: d.bedtime,
      waketime: d.waketime,
      duration: h > 0 ? `${h}時間${m}分` : `${m}分`,
    }
  }),
)

// 2時間おきの時刻グリッド
const gridLines = computed(() => {
  const { min, max } = domain.value
  const out: { y: number; label: string }[] = []
  const startHour = Math.ceil(min / 120) * 120
  for (let a = startHour; a <= max; a += 120) out.push({ y: yScale(a), label: axisToClock(a) })
  return out
})

// X ラベル（多すぎる時は間引く）
const xLabels = computed(() => {
  const n = series.value.length
  if (!n) return []
  const step = Math.max(1, Math.ceil(n / 7))
  const out: { x: number; text: string }[] = []
  for (let i = 0; i < n; i += step) {
    out.push({ x: padL + (i + 0.5) * band.value, text: mdWeekday(series.value[i].date) })
  }
  return out
})

const hovered = computed(() => bars.value.find(b => b.i === hover.value) ?? null)
const tooltipStyle = computed(() => {
  const b = hovered.value
  if (!b) return {}
  return { left: `${(b.cx / W.value) * 100}%`, top: `${(b.y / H) * 100}%`, transform: 'translate(-50%, calc(-100% - 6px))' }
})

function pick(e: PointerEvent) {
  const el = wrap.value
  if (!el || !series.value.length) return
  const rect = el.getBoundingClientRect()
  const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  const px = frac * W.value
  const idx = Math.floor((px - padL) / band.value)
  hover.value = bars.value.some(b => b.i === idx) ? idx : -1
}
// マウスはホバー追従、タッチはタップした棒だけを選ぶ（スクロール中に出ないように）
function onMove(e: PointerEvent) { if (e.pointerType === 'touch') return; pick(e) }
function onDown(e: PointerEvent) { pick(e) }
function onLeave(e: PointerEvent) { if (e.pointerType !== 'touch') hover.value = -1 }
// ブラウザがスクロール操作として引き取ったとき（縦ドラッグ）はタップ扱いにしない
function onCancel() { hover.value = -1 }
// タッチで出したツールチップは、グラフ以外をタップしたら閉じる
function onDocDown(e: PointerEvent) {
  if (e.pointerType !== 'touch') return
  if (!wrap.value?.contains(e.target as Node)) hover.value = -1
}

function measure() { if (wrap.value) W.value = wrap.value.clientWidth || 320 }

let ro: ResizeObserver | null = null
onMounted(() => {
  ro = new ResizeObserver(measure)
  watch(wrap, (el) => { if (el) { measure(); ro?.observe(el) } }, { immediate: true })
  document.addEventListener('pointerdown', onDocDown as EventListener)
})
onBeforeUnmount(() => {
  ro?.disconnect()
  document.removeEventListener('pointerdown', onDocDown as EventListener)
})

async function load() {
  loading.value = true
  hover.value = -1
  try {
    const res = await $fetch<{ days: SleepDay[] }>('/api/fitbit/sleep-trend', { params: { days: days.value, date: props.date } })
    series.value = res.days
  } catch {
    series.value = []
  } finally {
    loading.value = false
    requestAnimationFrame(measure)
  }
}

function setDays(d: number) {
  if (days.value === d) return
  days.value = d
  load()
}

onMounted(load)
watch(() => props.date, load)
</script>
