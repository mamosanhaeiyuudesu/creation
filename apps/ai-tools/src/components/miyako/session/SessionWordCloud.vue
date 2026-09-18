<script setup lang="ts">
/**
 * 会期のバズ語ワードクラウド（/miyako「直近の傾向」）。語の大きさ・色・並び順は呼び出し側で決め、
 * ここでは大きい語から順に、中心から渦巻き状に空いている場所へ置いていくだけ。
 * 高さは親の class で決める（このコンポーネントは親いっぱいに広がる）。
 */
interface WcWord {
  name: string
  size: number
  color: string
  title?: string
}

const props = defineProps<{
  words: WcWord[]
  selected?: string | null
}>()

const emit = defineEmits<{
  'word-click': [word: string]
}>()

const wcContainerRef = ref<HTMLElement>()
const wcPositions = ref<Record<string, { x: number; y: number }>>({})
const wcReady = ref(false)

watch(() => props.words, () => {
  wcReady.value = false
  layoutWordcloud()
}, { flush: 'post' })

// 画面幅が変わったら並べ直す（初回の配置もここで走る）
let observer: ResizeObserver | null = null
let frame = 0
onMounted(() => {
  observer = new ResizeObserver(() => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(layoutWordcloud)
  })
  if (wcContainerRef.value) observer.observe(wcContainerRef.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  cancelAnimationFrame(frame)
})

function layoutWordcloud() {
  const container = wcContainerRef.value
  if (!container) return
  const cw = container.offsetWidth
  const ch = container.offsetHeight
  if (!cw || !ch) return

  const cx = cw / 2
  const cy = ch / 2
  const spans = Array.from(container.querySelectorAll<HTMLElement>('.wc-word'))
  const words = props.words
  if (!spans.length || spans.length !== words.length) return

  const newPos: Record<string, { x: number; y: number }> = {}
  const boxes: { x: number; y: number; hw: number; hh: number }[] = []

  for (const [i, el] of spans.entries()) {
    const hw = el.offsetWidth / 2 + 3
    const hh = el.offsetHeight / 2 + 2
    const name = words[i]!.name

    if (i === 0) {
      newPos[name] = { x: cx, y: cy }
      boxes.push({ x: cx, y: cy, hw, hh })
      continue
    }

    let px = cx, py = cy
    let placed = false
    for (let step = 0; step < 4000; step++) {
      const theta = step * 0.1
      const r = 1.2 * theta
      const x = cx + r * Math.cos(theta)
      const y = cy + r * Math.sin(theta) * (ch / cw)
      if (x - hw < 2 || x + hw > cw - 2) continue
      if (y - hh < 2 || y + hh > ch - 2) continue
      if (!boxes.some(b =>
        Math.abs(x - b.x) < hw + b.hw &&
        Math.abs(y - b.y) < hh + b.hh
      )) {
        px = x; py = y
        placed = true
        break
      }
    }
    // 入りきらなかった語は出さない（下のランキングには全部並ぶ）
    if (!placed) continue
    newPos[name] = { x: px, y: py }
    boxes.push({ x: px, y: py, hw, hh })
  }

  // 渦巻きは中心に固まるので、はみ出さない範囲で位置だけ広げて枠を使う（文字の大きさは変えない）。
  // 広げすぎるとまばらに見えるので1.3倍まで
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity
  for (const b of boxes) {
    left = Math.min(left, b.x - b.hw)
    right = Math.max(right, b.x + b.hw)
    top = Math.min(top, b.y - b.hh)
    bottom = Math.max(bottom, b.y + b.hh)
  }
  const scale = Math.min((cw - 8) / (right - left), (ch - 8) / (bottom - top), 1.3)
  if (scale > 1.02) {
    const mx = (left + right) / 2
    const my = (top + bottom) / 2
    for (const name in newPos) {
      const p = newPos[name]!
      newPos[name] = { x: cx + (p.x - mx) * scale, y: cy + (p.y - my) * scale }
    }
  }

  wcPositions.value = newPos
  wcReady.value = true
}
</script>

<template>
  <div ref="wcContainerRef" class="wordcloud-container">
    <button
      v-for="item in words"
      :key="item.name"
      type="button"
      class="wc-word"
      :class="{ 'wc-selected': selected === item.name, 'wc-dim': selected && selected !== item.name }"
      :style="{
        fontSize: item.size + 'px',
        color: item.color,
        left: (wcPositions[item.name]?.x ?? 0) + 'px',
        top: (wcPositions[item.name]?.y ?? 0) + 'px',
        visibility: wcReady && wcPositions[item.name] ? 'visible' : 'hidden',
      }"
      :title="item.title ?? item.name"
      @click="emit('word-click', item.name)"
    >{{ item.name }}</button>
  </div>
</template>

<style scoped>
.wordcloud-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.wc-word {
  position: absolute;
  transform: translate(-50%, -50%);
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  border-radius: 3px;
  transition: opacity 0.2s, background-color 0.2s;
}

.wc-word:hover {
  opacity: 0.6;
}

.wc-word:focus-visible {
  outline: 2px solid #a5b4fc;
  outline-offset: 2px;
}

.wc-dim {
  opacity: 0.35;
}

.wc-selected {
  opacity: 1;
  background-color: rgba(165, 180, 252, 0.22);
}
</style>
