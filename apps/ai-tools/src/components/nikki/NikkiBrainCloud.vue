<template>
  <section
    class="nk-card p-4 flex flex-col h-full min-h-[400px] cursor-pointer"
    @click="isExpanded = true"
  >
    <h2 class="nk-serif text-[17px] leading-none mb-3">頭の中</h2>
    <p class="text-[11.5px] text-[var(--nk-ink-soft)] mb-4 mt-0">
      日記に出てくる言葉。よく出るほどたくさん浮かんでいる。
    </p>

    <div v-if="!words.length" class="flex-1 flex items-center justify-center text-[13px] text-[var(--nk-ink-soft)]">
      記録が増えると言葉が浮かびます。
    </div>

    <div v-else class="flex-1 relative">
      <svg
        viewBox="0 0 300 360"
        class="w-full h-full"
        :style="{ maxHeight: '500px' }"
        aria-label="頭の中のワードクラウド"
      >
        <defs>
          <clipPath id="nk-brain-clip">
            <ellipse cx="150" cy="130" rx="105" ry="118" />
          </clipPath>
        </defs>

        <g class="nk-head-outline">
          <ellipse
            cx="150" cy="130" rx="105" ry="118"
            fill="var(--nk-paper-deep)"
            stroke="var(--nk-ink-soft)"
            stroke-width="1.5"
          />
          <rect x="120" y="242" width="60" height="36" rx="6"
            fill="var(--nk-paper-deep)"
            stroke="var(--nk-ink-soft)"
            stroke-width="1.5"
          />
          <path
            d="M60,278 Q90,268 120,278 L120,310 Q90,318 60,310 Z"
            fill="var(--nk-paper-deep)"
            stroke="var(--nk-ink-soft)"
            stroke-width="1.5"
          />
          <path
            d="M240,278 Q210,268 180,278 L180,310 Q210,318 240,310 Z"
            fill="var(--nk-paper-deep)"
            stroke="var(--nk-ink-soft)"
            stroke-width="1.5"
          />
          <ellipse cx="118" cy="142" rx="10" ry="7"
            fill="var(--nk-card)"
            stroke="var(--nk-ink-soft)"
            stroke-width="1"
          />
          <circle cx="119" cy="143" r="4" fill="var(--nk-ink-soft)" />
          <ellipse cx="182" cy="142" rx="10" ry="7"
            fill="var(--nk-card)"
            stroke="var(--nk-ink-soft)"
            stroke-width="1"
          />
          <circle cx="183" cy="143" r="4" fill="var(--nk-ink-soft)" />
          <path d="M146,158 Q150,172 154,158" fill="none" stroke="var(--nk-ink-soft)" stroke-width="1.2" stroke-linecap="round"/>
          <path d="M130,188 Q150,200 170,188" fill="none" stroke="var(--nk-ink-soft)" stroke-width="1.5" stroke-linecap="round"/>
        </g>

        <g clip-path="url(#nk-brain-clip)">
          <circle
            v-for="item in placed"
            :key="item.word"
            :cx="item.x" :cy="item.y" :r="item.r"
            :fill="item.fill" :fill-opacity="item.alpha"
            stroke="none"
          />
          <text
            v-for="item in placed"
            :key="'t-' + item.word"
            :x="item.x" :y="item.y + item.fontSize * 0.35"
            :font-size="item.fontSize"
            text-anchor="middle"
            font-family="'Zen Kaku Gothic New', sans-serif"
            font-weight="700"
            :fill="item.textColor"
          >{{ item.word }}</text>
        </g>
      </svg>
      <p class="absolute bottom-0 right-0 text-[10px] text-[var(--nk-ink-soft)] opacity-50 select-none pointer-events-none">拡大 ↗</p>
    </div>
  </section>

  <Teleport to="body">
    <div
      v-if="isExpanded"
      class="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4"
      @click.self="isExpanded = false"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl p-4 w-full max-w-[640px] overflow-y-auto"
        style="max-height: 90vh"
      >
        <div class="flex justify-between items-center mb-2">
          <span class="text-[12px] text-gray-500">頭の中 — よく出てくる言葉</span>
          <button
            class="text-gray-400 hover:text-gray-700 text-xl leading-none px-1"
            @click="isExpanded = false"
            aria-label="閉じる"
          >✕</button>
        </div>
        <svg
          viewBox="0 0 300 360"
          class="w-full"
          aria-label="頭の中のワードクラウド（拡大）"
        >
          <defs>
            <clipPath id="nk-brain-clip-ex">
              <ellipse cx="150" cy="130" rx="105" ry="118" />
            </clipPath>
          </defs>

          <ellipse cx="150" cy="130" rx="105" ry="118"
            fill="var(--nk-paper-deep)" stroke="var(--nk-ink-soft)" stroke-width="1.5" />
          <rect x="120" y="242" width="60" height="36" rx="6"
            fill="var(--nk-paper-deep)" stroke="var(--nk-ink-soft)" stroke-width="1.5" />
          <path d="M60,278 Q90,268 120,278 L120,310 Q90,318 60,310 Z"
            fill="var(--nk-paper-deep)" stroke="var(--nk-ink-soft)" stroke-width="1.5" />
          <path d="M240,278 Q210,268 180,278 L180,310 Q210,318 240,310 Z"
            fill="var(--nk-paper-deep)" stroke="var(--nk-ink-soft)" stroke-width="1.5" />
          <ellipse cx="118" cy="142" rx="10" ry="7"
            fill="var(--nk-card)" stroke="var(--nk-ink-soft)" stroke-width="1" />
          <circle cx="119" cy="143" r="4" fill="var(--nk-ink-soft)" />
          <ellipse cx="182" cy="142" rx="10" ry="7"
            fill="var(--nk-card)" stroke="var(--nk-ink-soft)" stroke-width="1" />
          <circle cx="183" cy="143" r="4" fill="var(--nk-ink-soft)" />
          <path d="M146,158 Q150,172 154,158" fill="none" stroke="var(--nk-ink-soft)" stroke-width="1.2" stroke-linecap="round"/>
          <path d="M130,188 Q150,200 170,188" fill="none" stroke="var(--nk-ink-soft)" stroke-width="1.5" stroke-linecap="round"/>

          <g clip-path="url(#nk-brain-clip-ex)">
            <circle
              v-for="item in expandedPlaced"
              :key="'ex-' + item.word"
              :cx="item.x" :cy="item.y" :r="item.r"
              :fill="item.fill" :fill-opacity="item.alpha"
              stroke="none"
            />
            <text
              v-for="item in expandedPlaced"
              :key="'ext-' + item.word"
              :x="item.x" :y="item.y + item.fontSize * 0.35"
              :font-size="item.fontSize"
              text-anchor="middle"
              font-family="'Zen Kaku Gothic New', sans-serif"
              font-weight="700"
              :fill="item.textColor"
            >{{ item.word }}</text>
          </g>
        </svg>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { BrainWord } from '~/composables/nikki/useNikkiBrainWords'

const props = defineProps<{ words: BrainWord[] }>()

const isExpanded = ref(false)

const handleKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') isExpanded.value = false
}
onMounted(() => window.addEventListener('keydown', handleKey))
onUnmounted(() => window.removeEventListener('keydown', handleKey))

const HEAD_CX = 150
const HEAD_CY = 120
const HEAD_RX = 98
const HEAD_RY = 108
const FACE_Y_MIN = 128
const FACE_Y_MAX = 205

const COLORS = [
  { fill: '#364a8a', text: '#fff' },
  { fill: '#b8853a', text: '#fff' },
  { fill: '#3a7a5a', text: '#fff' },
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

function computePlaced(words: BrainWord[], fontMin: number, fontMax: number): PlacedWord[] {
  if (!words.length) return []

  const maxCount = words[0]!.count
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

  for (const { word, count } of words) {
    const ratio = count / maxCount
    const fontSize = Math.round(fontMin + ratio * (fontMax - fontMin))
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

      result.push({ word, x, y, r, fontSize, fill: col.fill, textColor: col.text, alpha: 0.6 + ratio * 0.35 })
      occupied.push({ x, y, r })
      placed_ = true
      break
    }
    if (!placed_) continue
  }

  return result
}

const placed = computed<PlacedWord[]>(() => computePlaced(props.words, 10, 20))
const expandedPlaced = computed<PlacedWord[]>(() => isExpanded.value ? computePlaced(props.words, 6, 12) : [])
</script>
