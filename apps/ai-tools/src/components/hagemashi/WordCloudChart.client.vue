<script setup lang="ts">
const props = defineProps<{
  words: { word: string; count: number }[]
  height?: number
}>()

const emit = defineEmits<{
  'word-click': [word: string]
}>()

const COLORS = [
  '#f97316', '#fb7185', '#f59e0b', '#fbbf24',
  '#fda4af', '#fdba74', '#f472b6', '#facc15',
]

const MIN_SIZE = 14
const MAX_SIZE = 72

const LS_EMPHASIS = 'hagemashi-wordcloud-emphasis'

// 出現回数の差を強調する指数（大きいほど回数の多い単語がより大きくなる）
const emphasis = ref(2)
if (import.meta.client) {
  const saved = Number(localStorage.getItem(LS_EMPHASIS))
  if (saved >= 1 && saved <= 6) emphasis.value = saved
}
watch(emphasis, (v) => {
  if (import.meta.client) localStorage.setItem(LS_EMPHASIS, String(v))
})

// 出現回数からフォントサイズを決める（回数の多い順）
const sized = computed(() => {
  const sorted = [...props.words].sort((a, b) => b.count - a.count)
  if (!sorted.length) return []
  const maxCount = sorted[0].count
  const minCount = sorted[sorted.length - 1].count
  const span = maxCount - minCount || 1
  return sorted.map((w, i) => {
    const t = (w.count - minCount) / span
    const scaled = Math.pow(t, emphasis.value)
    const size = Math.round(MIN_SIZE + scaled * (MAX_SIZE - MIN_SIZE))
    return { name: w.word, count: w.count, size, color: COLORS[i % COLORS.length] }
  })
})

interface Placed { name: string; count: number; size: number; color: string; x: number; y: number }
const placed = ref<Placed[]>([])
const wrapEl = ref<HTMLElement>()
let measureCtx: CanvasRenderingContext2D | null = null

// 中心から螺旋状に、大きい単語を中央・小さい単語を周辺に配置する
function layout() {
  const el = wrapEl.value
  if (!el) return
  const W = el.clientWidth
  const H = props.height ?? 360
  const items = sized.value
  if (!W || !items.length) { placed.value = []; return }

  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')
  const ctx = measureCtx
  const family = getComputedStyle(el).fontFamily || 'sans-serif'
  const cx = W / 2
  const cy = H / 2
  const pad = 3

  const boxes: { x: number; y: number; w: number; h: number }[] = []
  const result: Placed[] = []

  for (const it of items) {
    if (ctx) ctx.font = `700 ${it.size}px ${family}`
    const wpx = (ctx ? ctx.measureText(it.name).width : it.name.length * it.size * 0.6) + pad * 2
    const hpx = it.size * 1.15 + pad * 2

    // アルキメデス螺旋で空き位置を探索
    let angle = 0
    const step = 0.25
    const spread = 3
    let px = cx
    let py = cy
    let ok = false

    for (let n = 0; n < 1400; n++) {
      const rad = spread * angle
      px = cx + rad * Math.cos(angle)
      py = cy + rad * Math.sin(angle)
      angle += step

      // コンテナ内に収まるか
      if (px - wpx / 2 < 0 || px + wpx / 2 > W || py - hpx / 2 < 0 || py + hpx / 2 > H) continue

      // 既配置と衝突しないか
      let hit = false
      for (const b of boxes) {
        if (Math.abs(px - b.x) < (wpx + b.w) / 2 && Math.abs(py - b.y) < (hpx + b.h) / 2) { hit = true; break }
      }
      if (!hit) { ok = true; break }
    }

    // 収まらなかった単語（周辺の低頻度語）は表示しない
    if (ok) {
      boxes.push({ x: px, y: py, w: wpx, h: hpx })
      result.push({ ...it, x: px, y: py })
    }
  }

  placed.value = result
}

let ro: ResizeObserver | null = null
watch(sized, () => nextTick(layout))
onMounted(() => {
  nextTick(layout)
  if (wrapEl.value) {
    ro = new ResizeObserver(() => layout())
    ro.observe(wrapEl.value)
  }
})
onBeforeUnmount(() => ro?.disconnect())
</script>

<template>
  <div class="relative">
    <!-- 大きさの差分（強調）調整スライダー -->
    <div class="absolute top-1 right-1 z-10 flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-white/[0.08] rounded-lg px-2.5 py-1.5">
      <span class="text-[10px] text-slate-400 shrink-0">強調</span>
      <input
        v-model.number="emphasis"
        type="range"
        min="1"
        max="6"
        step="0.5"
        class="w-24 accent-orange-500 cursor-pointer"
      />
      <span class="text-[10px] text-slate-300 tabular-nums w-6 text-right shrink-0">{{ emphasis.toFixed(1) }}</span>
    </div>

    <div ref="wrapEl" class="wc-wrap" :style="{ height: `${height ?? 360}px` }">
      <span
        v-for="item in placed"
        :key="item.name"
        class="wc-word"
        :style="{ left: `${item.x}px`, top: `${item.y}px`, fontSize: `${item.size}px`, color: item.color }"
        :title="`${item.name}: ${item.count}`"
        @click="emit('word-click', item.name)"
      >{{ item.name }}</span>
    </div>
  </div>
</template>

<style scoped>
.wc-wrap {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.wc-word {
  position: absolute;
  transform: translate(-50%, -50%);
  cursor: pointer;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  transition: opacity 0.15s;
}

.wc-word:hover {
  opacity: 0.55;
}
</style>
