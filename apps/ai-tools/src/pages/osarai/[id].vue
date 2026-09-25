<template>
  <div class="min-h-[100dvh] flex flex-col">
    <header class="shrink-0 flex items-center gap-2 px-3 sm:px-5 h-14">
      <NuxtLink to="/osarai" class="os-icon-btn" aria-label="おさらいのトップへ">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </NuxtLink>
      <div v-if="set && phase === 'quiz'" class="flex-1 min-w-0 flex items-center gap-3">
        <div class="os-progress flex-1"><span :style="{ width: `${progressPct}%` }" /></div>
        <span class="shrink-0 text-[13px] tabular-nums text-[var(--os-ink-soft)]">{{ pos + 1 }} / {{ order.length }}</span>
      </div>
      <span v-else class="flex-1 min-w-0 truncate os-display text-[14px] font-bold text-[var(--os-accent-deep)]">おさらい</span>
      <button v-if="set" class="os-icon-btn" aria-label="この問題を共有する" @click="share">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3v12M7.5 7.5L12 3l4.5 4.5M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" />
        </svg>
      </button>
    </header>

    <main class="flex-1 w-full max-w-[600px] mx-auto px-4 sm:px-6 pb-10 flex flex-col">
      <!-- 読み込み中・見つからない -->
      <div v-if="pending" class="flex-1 grid place-items-center">
        <div class="os-dots" aria-label="読み込み中"><span /><span /><span /></div>
      </div>
      <div v-else-if="!set" class="flex-1 flex flex-col items-center justify-center text-center">
        <p class="text-[15px]">この問題は見つかりませんでした</p>
        <p class="mt-2 text-[13px] text-[var(--os-ink-soft)]">リンクがまちがっているかもしれません</p>
        <NuxtLink to="/osarai" class="os-btn mt-8 inline-flex items-center">自分で問題をつくる</NuxtLink>
      </div>

      <!-- はじめる前。共有で開いた人にも、何の問題かがわかるように -->
      <div v-else-if="phase === 'intro'" class="flex-1 flex flex-col justify-center pb-[8vh] os-rise">
        <p class="text-center text-[12.5px] text-[var(--os-ink-faint)]">{{ set.questions.length }}問・選択式</p>
        <h1 class="mt-3 os-display text-center text-[26px] font-bold leading-snug">{{ set.title }}</h1>
        <p v-if="set.level" class="mt-3 text-center text-[13.5px] text-[var(--os-ink-soft)]">{{ set.level }}</p>
        <div class="mt-12 flex justify-center">
          <button class="os-btn min-w-[220px]" @click="start(allIndexes)">はじめる</button>
        </div>
        <p class="mt-6 text-center text-[12px] text-[var(--os-ink-faint)]">テーマ：{{ set.theme }}</p>
      </div>

      <!-- 出題 -->
      <div v-else-if="phase === 'quiz' && current" :key="`${runId}-${pos}`" class="pt-4 os-rise">
        <p class="text-[17px] sm:text-[18px] leading-[1.75] font-medium whitespace-pre-wrap">{{ current.q }}</p>

        <div class="mt-6 flex flex-col gap-2.5">
          <button
            v-for="(c, i) in current.choices"
            :key="i"
            class="os-choice"
            :class="choiceClass(i)"
            :disabled="picked !== null"
            @click="pick(i)"
          >
            <span class="os-choice__mark">{{ choiceMark(i) }}</span>
            <span class="flex-1">{{ c }}</span>
          </button>
        </div>

        <div v-if="picked !== null" class="mt-5 os-rise">
          <div class="os-card px-4 py-4">
            <p class="flex items-center gap-2 text-[15px] font-bold" :class="isCorrect ? 'text-[var(--os-good)]' : 'text-[var(--os-bad)]'">
              <span class="os-pop inline-block">{{ isCorrect ? '◯' : '✕' }}</span>
              {{ isCorrect ? '正解' : `正解は ${LABELS[current.answer]}` }}
            </p>
            <p v-if="current.explanation" class="mt-2 text-[14px] leading-[1.85] text-[var(--os-ink-soft)]">
              {{ current.explanation }}
            </p>
          </div>
          <div class="mt-5 flex justify-center">
            <button ref="nextEl" class="os-btn min-w-[220px]" @click="next">
              {{ pos + 1 < order.length ? '次へ' : '結果を見る' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 結果 -->
      <div v-else-if="phase === 'result'" class="pt-6 os-rise">
        <div class="text-center">
          <p class="text-[13px] text-[var(--os-ink-soft)]">{{ set.title }}{{ reviewOnly ? '（間違えた問題）' : '' }}</p>
          <p class="mt-3 os-display font-bold leading-none text-[var(--os-accent-deep)]">
            <span class="text-[64px] tabular-nums">{{ score }}</span><span class="text-[24px] ml-1">%</span>
          </p>
          <p class="mt-3 text-[14px] text-[var(--os-ink-soft)]">{{ order.length }}問中 {{ correctCount }}問 正解</p>
        </div>

        <div class="mt-8 flex flex-col sm:flex-row gap-2.5 justify-center">
          <button v-if="wrongIndexes.length" class="os-btn" @click="start(wrongIndexes, true)">
            間違えた{{ wrongIndexes.length }}問を解き直す
          </button>
          <button class="os-btn-ghost" @click="start(allIndexes)">最初からもう一度</button>
        </div>

        <div class="mt-5 flex gap-2 justify-center">
          <a :href="lineUrl" target="_blank" rel="noopener" class="os-chip inline-flex items-center">LINEで送る</a>
          <button class="os-chip" @click="copyLink">{{ copied ? 'コピーしました' : 'リンクをコピー' }}</button>
        </div>

        <section v-if="wrongIndexes.length" class="mt-10">
          <h2 class="text-[13px] font-bold text-[var(--os-ink-soft)] mb-3 px-1">間違えた問題の解説</h2>
          <ol class="flex flex-col gap-3">
            <li v-for="w in wrongReview" :key="w.qi" class="os-card px-4 py-4">
              <p class="text-[14.5px] leading-[1.75] font-medium">{{ w.q }}</p>
              <p class="mt-3 text-[13px] text-[var(--os-bad)]">あなたの答え：{{ w.mine }}</p>
              <p class="mt-1 text-[13.5px] font-bold text-[var(--os-good)]">正解：{{ w.correct }}</p>
              <p v-if="w.explanation" class="mt-2 text-[13.5px] leading-[1.85] text-[var(--os-ink-soft)]">
                {{ w.explanation }}
              </p>
            </li>
          </ol>
        </section>
        <p v-else class="mt-10 text-center text-[14px] text-[var(--os-ink-soft)]">全問正解です</p>

        <div class="mt-12 flex justify-center">
          <NuxtLink to="/osarai" class="text-[13.5px] text-[var(--os-accent-deep)] underline underline-offset-4">
            別のテーマで問題をつくる
          </NuxtLink>
        </div>
      </div>
    </main>

    <div
      v-if="toast"
      class="fixed left-1/2 bottom-8 -translate-x-1/2 z-10 px-4 py-2 rounded-full text-[13px] text-white bg-[rgba(30,34,31,0.88)] os-rise"
      role="status"
    >
      {{ toast }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OsaraiSet } from '~/types/osarai'
import { useOsaraiRecent } from '~/composables/osarai/useOsaraiRecent'

definePageMeta({ layout: 'osarai' })

const LABELS = ['A', 'B', 'C', 'D']

const route = useRoute()
const id = String(route.params.id || '')
const { data: set, pending } = await useFetch<OsaraiSet>(`/api/osarai/sets/${id}`, { key: `osarai-set-${id}` })

// LINE などに貼ったときのプレビューに題が出るように、サーバー側で描画する時点で入れておく
useHead(() => ({
  title: set.value ? `${set.value.title}｜おさらい` : 'おさらい',
  meta: [
    { property: 'og:title', content: set.value ? `${set.value.title}（${set.value.questions.length}問）` : 'おさらい' },
    { property: 'og:description', content: '選択式の問題でおさらい。タップしてすぐ解けます。' },
    { name: 'theme-color', content: '#f7f6f1', media: '(prefers-color-scheme: light)' },
    { name: 'theme-color', content: '#141715', media: '(prefers-color-scheme: dark)' },
  ],
}))

const { touch, recordScore } = useOsaraiRecent()

type Phase = 'intro' | 'quiz' | 'result'
const phase = ref<Phase>('intro')
/** 今回解く問題（set.questions の添字）。やり直しでは間違えた問題だけになる */
const order = ref<number[]>([])
const pos = ref(0)
/** 今回の回答。問題の添字 → 選んだ選択肢 */
const picks = ref<Record<number, number>>({})
const reviewOnly = ref(false)
const runId = ref(0)
const nextEl = ref<HTMLButtonElement | null>(null)

const allIndexes = computed(() => (set.value ? set.value.questions.map((_, i) => i) : []))
const currentIndex = computed(() => order.value[pos.value])
const current = computed(() => (set.value && currentIndex.value !== undefined ? set.value.questions[currentIndex.value] ?? null : null))
const picked = computed<number | null>(() => (currentIndex.value !== undefined ? picks.value[currentIndex.value] ?? null : null))
const isCorrect = computed(() => current.value !== null && picked.value === current.value.answer)
const progressPct = computed(() => (order.value.length ? ((pos.value + (picked.value !== null ? 1 : 0)) / order.value.length) * 100 : 0))

const correctCount = computed(() => order.value.filter((qi) => picks.value[qi] === set.value?.questions[qi]?.answer).length)
const wrongIndexes = computed(() => order.value.filter((qi) => picks.value[qi] !== set.value?.questions[qi]?.answer))
const wrongReview = computed(() =>
  wrongIndexes.value.flatMap((qi) => {
    const q = set.value?.questions[qi]
    if (!q) return []
    return [{ qi, q: q.q, mine: q.choices[picks.value[qi] ?? -1] ?? '', correct: q.choices[q.answer] ?? '', explanation: q.explanation }]
  })
)
const score = computed(() => (order.value.length ? Math.round((correctCount.value / order.value.length) * 100) : 0))

onMounted(() => {
  if (set.value) touch({ id: set.value.id, title: set.value.title, count: set.value.questions.length })
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const start = (indexes: number[], onlyWrong = false) => {
  order.value = [...indexes]
  picks.value = {}
  pos.value = 0
  reviewOnly.value = onlyWrong
  runId.value++
  phase.value = 'quiz'
  window.scrollTo({ top: 0 })
}

const pick = (i: number) => {
  if (picked.value !== null || currentIndex.value === undefined) return
  picks.value = { ...picks.value, [currentIndex.value]: i }
  // 解説を読んだら親指の位置のまま「次へ」を押せるように、ボタンまで寄せる
  nextTick(() => nextEl.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
}

const next = () => {
  if (picked.value === null) return
  if (pos.value + 1 < order.value.length) {
    pos.value++
    window.scrollTo({ top: 0 })
    return
  }
  phase.value = 'result'
  window.scrollTo({ top: 0 })
  // 点数の控えは「全問を通して解いたとき」だけ残す（間違えた問題だけの解き直しは100%になりやすいので混ぜない）
  if (set.value && !reviewOnly.value) recordScore(set.value.id, score.value)
}

// PCでは 1〜4 / A〜D で選び、Enter で次へ
const onKey = (e: KeyboardEvent) => {
  if (phase.value !== 'quiz' || e.metaKey || e.ctrlKey || e.altKey) return
  if (picked.value === null) {
    const k = e.key.toLowerCase()
    const i = ['1', '2', '3', '4'].indexOf(k) >= 0 ? Number(k) - 1 : ['a', 'b', 'c', 'd'].indexOf(k)
    if (i >= 0 && current.value && i < current.value.choices.length) pick(i)
  } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
    e.preventDefault()
    next()
  }
}

const choiceMark = (i: number) => {
  if (picked.value === null || !current.value) return LABELS[i]
  if (i === current.value.answer) return '◯'
  if (i === picked.value) return '✕'
  return LABELS[i]
}

const choiceClass = (i: number) => {
  if (picked.value === null || !current.value) return ''
  if (i === current.value.answer) return 'os-choice--good'
  if (i === picked.value) return 'os-choice--bad'
  return 'os-choice--dim'
}

// ── 共有 ──────────────────────────────

// origin はブラウザでしか分からないので、描画後に入れる（SSRとの食い違いを出さない）
const origin = ref('')
onMounted(() => (origin.value = location.origin))
const shareUrl = () => `${origin.value}/osarai/${id}`
const shareText = computed(() => (set.value ? `「${set.value.title}」${set.value.questions.length}問、解いてみて！` : ''))
const lineUrl = computed(() => `https://line.me/R/share?text=${encodeURIComponent(`${shareText.value}\n${shareUrl()}`)}`)

const toast = ref('')
const copied = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | null = null
const showToast = (msg: string) => {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2000)
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(shareUrl())
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    showToast('コピーできませんでした')
  }
}

// スマホは端末の共有シート（LINE も選べる）、PCはリンクのコピー
const share = async () => {
  if (navigator.share) {
    try {
      await navigator.share({ title: set.value?.title, text: shareText.value, url: shareUrl() })
    } catch {
      /* 閉じただけ */
    }
    return
  }
  try {
    await navigator.clipboard.writeText(shareUrl())
    showToast('リンクをコピーしました')
  } catch {
    showToast('コピーできませんでした')
  }
}
</script>
