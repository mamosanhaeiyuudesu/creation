<template>
  <section class="kk-card p-4 flex flex-col" style="min-height: 380px">
    <div v-if="!words.length" class="flex-1 flex items-center justify-center text-[13px] text-[var(--kk-ink-soft)]">
      記録が増えると言葉が浮かびます。
    </div>

    <div v-else class="flex-1 relative">
      <svg
        viewBox="0 0 300 360"
        class="w-full h-full"
        style="max-height: 460px"
        aria-label="頭の中のワードクラウド"
      >
        <defs>
          <clipPath id="kk-brain-clip">
            <ellipse cx="150" cy="130" rx="105" ry="118" />
          </clipPath>
        </defs>

        <!-- 頭部の輪郭 -->
        <ellipse
          cx="150" cy="130" rx="105" ry="118"
          fill="var(--kk-bg)"
          stroke="var(--kk-ink-soft)"
          stroke-width="1.5"
        />
        <!-- 首 -->
        <rect x="120" y="242" width="60" height="36" rx="6"
          fill="var(--kk-bg)"
          stroke="var(--kk-ink-soft)"
          stroke-width="1.5"
        />
        <!-- 肩 -->
        <path
          d="M60,278 Q90,268 120,278 L120,310 Q90,318 60,310 Z"
          fill="var(--kk-bg)"
          stroke="var(--kk-ink-soft)"
          stroke-width="1.5"
        />
        <path
          d="M240,278 Q210,268 180,278 L180,310 Q210,318 240,310 Z"
          fill="var(--kk-bg)"
          stroke="var(--kk-ink-soft)"
          stroke-width="1.5"
        />
        <!-- 左目 -->
        <ellipse cx="118" cy="142" rx="10" ry="7"
          fill="var(--kk-panel)"
          stroke="var(--kk-ink-soft)"
          stroke-width="1"
        />
        <circle cx="119" cy="143" r="4" fill="var(--kk-ink-soft)" />
        <!-- 右目 -->
        <ellipse cx="182" cy="142" rx="10" ry="7"
          fill="var(--kk-panel)"
          stroke="var(--kk-ink-soft)"
          stroke-width="1"
        />
        <circle cx="183" cy="143" r="4" fill="var(--kk-ink-soft)" />
        <!-- 鼻 -->
        <path d="M146,158 Q150,172 154,158" fill="none" stroke="var(--kk-ink-soft)" stroke-width="1.2" stroke-linecap="round"/>
        <!-- 口 -->
        <path d="M130,188 Q150,200 170,188" fill="none" stroke="var(--kk-ink-soft)" stroke-width="1.5" stroke-linecap="round"/>

        <!-- 頭の中の単語 -->
        <g clip-path="url(#kk-brain-clip)">
          <circle
            v-for="item in placed"
            :key="item.word"
            :cx="item.x"
            :cy="item.y"
            :r="item.r"
            :fill="item.fill"
            :fill-opacity="item.alpha"
            stroke="none"
          />
          <text
            v-for="item in placed"
            :key="'t-' + item.word"
            :x="item.x"
            :y="item.y + item.fontSize * 0.35"
            :font-size="item.fontSize"
            text-anchor="middle"
            font-family="'Zen Kaku Gothic New', sans-serif"
            font-weight="700"
            :fill="item.textColor"
          >{{ item.word }}</text>
        </g>
      </svg>
    </div>
  </section>
</template>

<script setup lang="ts">
export interface BrainWord {
  word: string
  count: number
}

const props = defineProps<{ words: BrainWord[] }>()

const HEAD_CX = 150
const HEAD_CY = 120
const HEAD_RX = 98
const HEAD_RY = 108
const FACE_Y_MIN = 128
const FACE_Y_MAX = 205

const COLORS = [
  { fill: '#2f6f5e', text: '#fff' },
  { fill: '#b8853a', text: '#fff' },
  { fill: '#364a8a', text: '#fff' },
  { fill: '#c2453f', text: '#fff' },
  { fill: '#6a5acd', text: '#fff' },
  { fill: '#2a8a8a', text: '#fff' },
]

interface PlacedWord {
  word: string
  x: number
  y: number
  r: number
  fontSize: number
  fill: string
  textColor: string
  alpha: number
}

const placed = computed<PlacedWord[]>(() => {
  if (!props.words.length) return []

  const maxCount = props.words[0]!.count
  const result: PlacedWord[] = []

  function hash(s: string): number {
    let h = 0
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0
    return h
  }

  const occupied: Array<{ x: number; y: number; r: number }> = []

  function overlaps(x: number, y: number, r: number): boolean {
    for (const o of occupied) {
      const dx = x - o.x
      const dy = y - o.y
      if (dx * dx + dy * dy < (r + o.r + 2) ** 2) return true
    }
    return false
  }

  function insideHead(x: number, y: number, r: number): boolean {
    const nx = (x - HEAD_CX) / (HEAD_RX - r - 2)
    const ny = (y - HEAD_CY) / (HEAD_RY - r - 2)
    return nx * nx + ny * ny <= 1
  }

  function inFaceArea(y: number, r: number): boolean {
    return y + r > FACE_Y_MIN && y - r < FACE_Y_MAX
  }

  let colorIdx = 0

  for (const { word, count } of props.words) {
    const ratio = count / maxCount
    const fontSize = Math.round(10 + ratio * 10)
    const r = fontSize * 0.9 + ([...word].length - 1) * (fontSize * 0.32)

    const h = hash(word)
    const startAngle = (h % 360) * (Math.PI / 180)
    const spiralStep = 0.4

    let placed_ = false
    for (let step = 0; step < 200; step++) {
      const angle = startAngle + step * spiralStep
      const dist = step * 1.8
      const x = HEAD_CX + Math.cos(angle) * dist
      const y = HEAD_CY - 10 + Math.sin(angle) * dist * 0.85

      if (!insideHead(x, y, r)) continue
      if (inFaceArea(y, r)) continue
      if (overlaps(x, y, r)) continue

      const ci = colorIdx % COLORS.length
      const col = COLORS[ci]!
      colorIdx++

      result.push({
        word,
        x,
        y,
        r,
        fontSize,
        fill: col.fill,
        textColor: col.text,
        alpha: 0.6 + ratio * 0.35,
      })
      occupied.push({ x, y, r })
      placed_ = true
      break
    }
    if (!placed_) continue
  }

  return result
})
</script>
