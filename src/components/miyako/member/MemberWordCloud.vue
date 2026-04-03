<script setup lang="ts">
interface WcWord {
  name: string
  score: number
  size: number
  color: string
}

const props = defineProps<{
  speakerName: string | null
  category: string | null
  words: WcWord[]
}>()

const emit = defineEmits<{
  'word-click': [word: string]
}>()

const wcContainerRef = ref<HTMLElement>()
const wcPositions = ref<Record<string, { x: number; y: number }>>({})
const wcReady = ref(false)

watch([() => props.speakerName, () => props.category], () => {
  wcReady.value = false
  wcPositions.value = {}
})

watch(() => props.words, (words) => {
  if (!words.length) return
  layoutWordcloud()
}, { flush: 'post' })

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

  for (let i = 0; i < spans.length; i++) {
    const el = spans[i]
    const hw = el.offsetWidth / 2 + 1
    const hh = el.offsetHeight / 2 + 1
    const name = words[i].name

    if (i === 0) {
      newPos[name] = { x: cx, y: cy }
      boxes.push({ x: cx, y: cy, hw, hh })
      continue
    }

    let px = cx, py = cy
    for (let step = 0; step < 2000; step++) {
      const theta = step * 0.12
      const r = 1.5 * theta
      const x = cx + r * Math.cos(theta)
      const y = cy + r * Math.sin(theta) * 0.65
      if (x - hw < 2 || x + hw > cw - 2) continue
      if (y - hh < 2 || y + hh > ch - 2) continue
      if (!boxes.some(b =>
        Math.abs(x - b.x) < hw + b.hw &&
        Math.abs(y - b.y) < hh + b.hh
      )) {
        px = x; py = y
        break
      }
    }
    newPos[name] = { x: px, y: py }
    boxes.push({ x: px, y: py, hw, hh })
  }

  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity
  for (let i = 0; i < spans.length; i++) {
    const p = newPos[words[i].name]
    const hw = spans[i].offsetWidth / 2
    const hh = spans[i].offsetHeight / 2
    left   = Math.min(left,   p.x - hw)
    right  = Math.max(right,  p.x + hw)
    top    = Math.min(top,    p.y - hh)
    bottom = Math.max(bottom, p.y + hh)
  }
  const contentCx = (left + right) / 2
  const contentCy = (top + bottom) / 2
  const scaleX = (cw - 8) / (right - left)
  const scaleY = (ch - 8) / (bottom - top)
  const scale  = Math.min(scaleX, scaleY, 2.0)

  if (scale > 1.05) {
    for (const name in newPos) {
      newPos[name] = {
        x: cx + (newPos[name].x - contentCx) * scale,
        y: cy + (newPos[name].y - contentCy) * scale,
      }
    }
  }

  wcPositions.value = newPos
  wcReady.value = true
}
</script>

<template>
  <div class="bg-white border border-[#dde2ef] rounded-[10px] shadow-[0_1px_4px_rgba(28,45,90,0.07),0_0_0_1px_rgba(28,45,90,0.06)] overflow-hidden">
    <template v-if="speakerName && category">
      <div class="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#eef1fb] border-b border-[#dde2ef]">
        <span class="opacity-70">👤</span>
        <span class="text-xs font-semibold text-[#1c2d5a] tracking-[0.02em]">{{ speakerName }}</span>
        <span class="text-[10px] text-[#6878a8]">×</span>
        <span class="text-xs font-semibold text-[#3d5fc4]">{{ category }}</span>
      </div>
      <div class="p-0">
        <div ref="wcContainerRef" class="wordcloud-container">
          <span
            v-for="item in words"
            :key="item.name"
            class="wc-word"
            :style="{
              fontSize: item.size + 'px',
              color: item.color,
              left: (wcPositions[item.name]?.x ?? 0) + 'px',
              top: (wcPositions[item.name]?.y ?? 0) + 'px',
              opacity: wcReady ? 1 : 0,
            }"
            :title="`特徴度: ${item.score.toFixed(3)}`"
            @click="emit('word-click', item.name)"
          >{{ item.name }}</span>
        </div>
      </div>
    </template>

    <div v-else class="flex flex-col items-center justify-center min-h-[200px] gap-3 p-8 text-center text-[#6878a8] text-xs leading-relaxed">
      <span class="text-4xl opacity-25">👆</span>
      <p class="m-0">左のヒートマップのセルをクリックすると<br>ワードクラウドが表示されます</p>
    </div>
  </div>
</template>

<style scoped>
.wordcloud-container {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
}

.wc-word {
  position: absolute;
  transform: translate(-50%, -50%);
  cursor: pointer;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  transition: opacity 0.25s;
}

.wc-word:hover {
  opacity: 0.55 !important;
}
</style>
