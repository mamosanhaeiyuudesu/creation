<script setup lang="ts">
// 単語×感情の可視化。各単語を「その単語を含む記録のポジ/ネガ比率（valence）」で色づけする。
// 大きさ＝出現回数、色＝感情の傾き（オレンジ=ネガ寄り / グレー=両価 / エメラルド=ポジ寄り）。
const props = defineProps<{
  words: { word: string; count: number; pos: number; neg: number }[]
  height?: number
}>()

const emit = defineEmits<{
  'word-click': [{ name: string; count: number; pos: number; neg: number }]
}>()

const MIN_SIZE = 14
const MAX_SIZE = 68

// 出現回数の差を強調する指数（大きいほど回数の多い単語がより大きくなる）
const EMPHASIS = 2.4

// valence（-1:ネガ 〜 0:両価 〜 +1:ポジ）を色に変換する。
// ネガ=オレンジ / 両価=グレー / ポジ=エメラルドの発散配色。
// 弱い傾きでも色が乗るよう、強さは緩やかなカーブ（0.6乗）で持ち上げる。
const NEG_RGB = [251, 146, 60]   // orange-400
const MID_RGB = [148, 163, 184]  // slate-400
const POS_RGB = [52, 211, 153]   // emerald-400
function valenceColor(pos: number, neg: number): string {
  const total = pos + neg
  if (!total) return `rgb(${MID_RGB.join(',')})`
  const v = (pos - neg) / total // -1..1
  const strength = Math.pow(Math.abs(v), 0.6)
  const to = v >= 0 ? POS_RGB : NEG_RGB
  const rgb = MID_RGB.map((m, i) => Math.round(m + (to[i] - m) * strength))
  return `rgb(${rgb.join(',')})`
}

// 出現回数からフォントサイズを決める（回数の多い順）
const sized = computed(() => {
  const sorted = [...props.words].sort((a, b) => b.count - a.count)
  if (!sorted.length) return []
  const maxCount = sorted[0].count
  const minCount = sorted[sorted.length - 1].count
  const span = maxCount - minCount || 1
  return sorted.map((w) => {
    const t = (w.count - minCount) / span
    const scaled = Math.pow(t, EMPHASIS)
    const size = Math.round(MIN_SIZE + scaled * (MAX_SIZE - MIN_SIZE))
    return { name: w.word, count: w.count, pos: w.pos, neg: w.neg, size, color: valenceColor(w.pos, w.neg) }
  })
})

interface Placed { name: string; count: number; pos: number; neg: number; size: number; color: string; x: number; y: number }
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

    // アルキメデス螺旋で空き位置を探索（横長コンテナでは左右方向に広げる）
    let angle = 0
    const step = 0.25
    const spread = 3
    const aspect = Math.max(1, W / H)
    const spreadX = spread * Math.min(2.2, aspect * 0.85)
    const spreadY = spread
    let px = cx
    let py = cy
    let ok = false

    for (let n = 0; n < 1400; n++) {
      px = cx + spreadX * angle * Math.cos(angle)
      py = cy + spreadY * angle * Math.sin(angle)
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

function onWordClick(item: Placed) {
  emit('word-click', { name: item.name, count: item.count, pos: item.pos, neg: item.neg })
}

onMounted(() => {
  nextTick(layout)
  if (wrapEl.value) {
    ro = new ResizeObserver(() => layout())
    ro.observe(wrapEl.value)
  }
})
onBeforeUnmount(() => {
  ro?.disconnect()
})
</script>

<template>
  <div class="relative">
    <div ref="wrapEl" class="wc-wrap" :style="{ height: `${height ?? 360}px` }">
      <span
        v-for="item in placed"
        :key="item.name"
        class="wc-word"
        :style="{ left: `${item.x}px`, top: `${item.y}px`, fontSize: `${item.size}px`, color: item.color }"
        @click="onWordClick(item)"
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
