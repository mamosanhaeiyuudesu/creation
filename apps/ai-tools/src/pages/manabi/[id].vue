<template>
  <div class="min-h-[100dvh] flex flex-col">
    <header class="shrink-0 flex items-center gap-2 px-3 sm:px-5 h-14">
      <NuxtLink to="/manabi" class="mb-icon-btn" aria-label="まなびのトップへ">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </NuxtLink>
      <div v-if="set && phase === 'quiz'" class="flex-1 min-w-0 flex items-center gap-3">
        <div class="mb-progress flex-1"><span :style="{ width: `${progressPct}%` }" /></div>
        <span class="shrink-0 text-[13px] tabular-nums text-[var(--mb-ink-soft)]">{{ pos + 1 }} / {{ order.length }}</span>
      </div>
      <span v-else class="flex-1 min-w-0 truncate mb-display text-[14px] font-bold text-[var(--mb-accent-deep)]">まなび</span>
      <button v-if="set" class="mb-icon-btn" aria-label="この問題を共有する" @click="share">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3v12M7.5 7.5L12 3l4.5 4.5M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" />
        </svg>
      </button>
    </header>

    <main class="flex-1 w-full max-w-[600px] mx-auto px-4 sm:px-6 pb-10 flex flex-col">
      <!-- 読み込み中・見つからない -->
      <div v-if="pending || (set && !ready)" class="flex-1 grid place-items-center">
        <div class="mb-dots" aria-label="読み込み中"><span /><span /><span /></div>
      </div>
      <div v-else-if="!set" class="flex-1 flex flex-col items-center justify-center text-center">
        <p class="text-[15px]">この問題は見つかりませんでした</p>
        <p class="mt-2 text-[13px] text-[var(--mb-ink-soft)]">リンクがまちがっているかもしれません</p>
        <NuxtLink to="/manabi" class="mb-btn mt-8 inline-flex items-center">自分で問題をつくる</NuxtLink>
      </div>

      <template v-else>
        <!-- どのテーマの問題か。出題中も結果でも、画面を開いたままいつでも確認できるように常に出す -->
        <p class="mb-theme" :title="set.theme">
          <span class="mb-theme__label">テーマ</span>
          <span class="mb-theme__text">{{ set.theme }}</span>
        </p>

        <!-- はじめる前。共有で開いた人にも、何の問題かがわかるように -->
        <div v-if="phase === 'intro'" class="flex-1 flex flex-col justify-center pb-[8vh] mb-rise">
          <p class="text-center text-[12.5px] text-[var(--mb-ink-faint)]">{{ set.questions.length }}問・選択式</p>
          <h1 class="mt-3 mb-display text-center text-[26px] font-bold leading-snug">{{ set.title }}</h1>
          <p v-if="set.level" class="mt-3 text-center text-[13.5px] text-[var(--mb-ink-soft)]">{{ set.level }}</p>
          <div class="mt-12 flex flex-col items-center gap-3">
            <button class="mb-btn min-w-[220px]" @click="start(allIndexes)">はじめる</button>
            <button v-if="lastResult" class="mb-btn-ghost min-w-[220px]" @click="showLastResult">
              前回の結果を見る（{{ lastResultScore }}%）
            </button>
          </div>
          <p class="mt-8 text-center">
            <NuxtLink :to="`/manabi/print/${id}`" class="mb-link">A4の問題集として印刷・PDFにする（授業用）</NuxtLink>
          </p>
        </div>

        <!-- 出題 -->
        <div v-else-if="phase === 'quiz' && current" :key="`${runId}-${pos}`" class="pt-4 mb-rise">
          <p class="text-[17px] sm:text-[18px] leading-[1.75] font-medium whitespace-pre-wrap">{{ current.q }}</p>

          <div class="mt-6 flex flex-col gap-2.5">
            <button
              v-for="(c, i) in current.choices"
              :key="i"
              class="mb-choice"
              :class="choiceClass(i)"
              :disabled="picked !== null"
              @click="pick(i)"
            >
              <span class="mb-choice__mark">{{ choiceMark(i) }}</span>
              <span class="flex-1">{{ c }}</span>
            </button>
          </div>

          <div v-if="picked !== null" class="mt-5 mb-rise">
            <div class="mb-card px-4 py-4">
              <p class="flex items-center gap-2 text-[15px] font-bold" :class="isCorrect ? 'text-[var(--mb-good)]' : 'text-[var(--mb-bad)]'">
                <span class="mb-pop inline-block">{{ isCorrect ? '◯' : '✕' }}</span>
                {{ isCorrect ? '正解' : `正解は ${LABELS[current.answer]}` }}
              </p>
              <p v-if="current.explanation" class="mt-2 text-[14px] leading-[1.85] text-[var(--mb-ink-soft)]">
                {{ current.explanation }}
              </p>
            </div>
            <div class="mt-5 flex justify-center">
              <button ref="nextEl" class="mb-btn min-w-[220px]" @click="next">
                {{ pos + 1 < order.length ? '次へ' : '結果を見る' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 結果 -->
        <div v-else-if="phase === 'result'" class="pt-4 mb-rise">
          <div class="text-center">
            <p class="text-[13px] text-[var(--mb-ink-soft)]">{{ set.title }}{{ reviewOnly ? '（間違えた問題）' : '' }}</p>
            <p class="mt-3 mb-display font-bold leading-none text-[var(--mb-accent-deep)]">
              <span class="text-[64px] tabular-nums">{{ score }}</span><span class="text-[24px] ml-1">%</span>
            </p>
            <p class="mt-3 text-[14px] text-[var(--mb-ink-soft)]">{{ order.length }}問中 {{ correctCount }}問 正解</p>
          </div>

          <div class="mt-8 flex flex-col sm:flex-row gap-2.5 justify-center">
            <button v-if="wrongIndexes.length" class="mb-btn" @click="start(wrongIndexes, true)">
              間違えた{{ wrongIndexes.length }}問を解き直す
            </button>
            <button class="mb-btn-ghost" @click="start(allIndexes)">最初からもう一度</button>
          </div>

          <div class="mt-5 flex gap-2 justify-center">
            <a :href="lineUrl" target="_blank" rel="noopener" class="mb-chip inline-flex items-center">LINEで送る</a>
            <button class="mb-chip" @click="copyLink">{{ copied ? 'コピーしました' : 'リンクをコピー' }}</button>
          </div>

          <!-- 解いた内容の見返し。自分の答え・正解・解説を1問ずつ -->
          <section class="mt-10">
            <div class="flex items-center justify-between mb-3 px-1">
              <h2 class="text-[13px] font-bold text-[var(--mb-ink-soft)]">自分の解答を見返す</h2>
              <div v-if="wrongIndexes.length" class="flex gap-1.5" role="tablist" aria-label="表示する問題">
                <button
                  class="mb-chip mb-chip--sm"
                  :class="{ 'mb-chip--on': reviewFilter === 'wrong' }"
                  role="tab"
                  :aria-selected="reviewFilter === 'wrong'"
                  @click="reviewFilter = 'wrong'"
                >
                  間違い {{ wrongIndexes.length }}
                </button>
                <button
                  class="mb-chip mb-chip--sm"
                  :class="{ 'mb-chip--on': reviewFilter === 'all' }"
                  role="tab"
                  :aria-selected="reviewFilter === 'all'"
                  @click="reviewFilter = 'all'"
                >
                  すべて {{ order.length }}
                </button>
              </div>
            </div>
            <p v-if="!shownReview.length" class="text-center text-[14px] text-[var(--mb-ink-soft)] py-4">全問正解です</p>
            <ol class="flex flex-col gap-2.5">
              <li v-for="r in shownReview" :key="r.qi" class="mb-card overflow-hidden">
                <details :open="!r.right && reviewFilter === 'wrong'">
                  <summary class="mb-review-summary">
                    <span class="mb-review-mark" :class="r.right ? 'mb-review-mark--good' : 'mb-review-mark--bad'">{{ r.right ? '◯' : '✕' }}</span>
                    <span class="flex-1 min-w-0 text-[14px] leading-[1.7]"><span class="text-[var(--mb-ink-faint)] tabular-nums">{{ r.qi + 1 }}.</span> {{ r.q }}</span>
                  </summary>
                  <div class="px-4 pb-4 pt-1">
                    <ul class="flex flex-col gap-1.5">
                      <li
                        v-for="(c, ci) in r.choices"
                        :key="ci"
                        class="mb-review-choice"
                        :class="{
                          'mb-review-choice--good': ci === r.answer,
                          'mb-review-choice--bad': ci === r.mine && ci !== r.answer,
                        }"
                      >
                        <span class="mb-review-choice__label">{{ LABELS[ci] }}</span>
                        <span class="flex-1">{{ c }}</span>
                        <span v-if="ci === r.answer" class="shrink-0 text-[12px] font-bold">正解</span>
                        <span v-else-if="ci === r.mine" class="shrink-0 text-[12px] font-bold">あなたの答え</span>
                      </li>
                    </ul>
                    <p v-if="r.explanation" class="mt-3 text-[13.5px] leading-[1.85] text-[var(--mb-ink-soft)]">
                      {{ r.explanation }}
                    </p>
                  </div>
                </details>
              </li>
            </ol>
          </section>

          <!-- さらに掘り下げるなら。押すと、そのテーマを入力欄に入れた状態でトップへ -->
          <section v-if="deepenLoading || deepenThemes.length" class="mt-10">
            <h2 class="text-[13px] font-bold text-[var(--mb-ink-soft)] mb-3 px-1">もっと深く学ぶなら</h2>
            <div v-if="deepenLoading" class="mb-card px-4 py-5 flex items-center gap-3 text-[13.5px] text-[var(--mb-ink-soft)]">
              <span class="mb-dots" aria-hidden="true"><span /><span /><span /></span>
              次のテーマを考えています
            </div>
            <ul v-else class="flex flex-col gap-2.5">
              <li v-for="t in deepenThemes" :key="t">
                <NuxtLink :to="{ path: '/manabi', query: { theme: t } }" class="mb-card mb-deepen">
                  <span class="flex-1 min-w-0 text-[14.5px] font-medium">{{ t }}</span>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-[var(--mb-accent)]">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </NuxtLink>
              </li>
            </ul>
          </section>

          <p class="mt-10 text-center">
            <NuxtLink :to="`/manabi/print/${id}`" class="mb-link">A4の問題集として印刷・PDFにする（授業用）</NuxtLink>
          </p>

          <div class="mt-6 flex justify-center">
            <NuxtLink to="/manabi" class="text-[13.5px] text-[var(--mb-accent-deep)] underline underline-offset-4">
              別のテーマで問題をつくる
            </NuxtLink>
          </div>
        </div>
      </template>
    </main>

    <div
      v-if="toast"
      class="fixed left-1/2 bottom-8 -translate-x-1/2 z-10 px-4 py-2 rounded-full text-[13px] text-white bg-[rgba(30,34,31,0.88)] mb-rise"
      role="status"
    >
      {{ toast }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ManabiSet } from '~/types/manabi'
import { useManabiRecent } from '~/composables/manabi/useManabiRecent'
import { readRun, writeRun, type ManabiPhase, type ManabiRun } from '~/composables/manabi/useManabiRun'

definePageMeta({ layout: 'manabi' })

const LABELS = ['A', 'B', 'C', 'D']

const route = useRoute()
const id = String(route.params.id || '')
const { data: set, pending } = await useFetch<ManabiSet>(`/api/manabi/sets/${id}`, { key: `manabi-set-${id}` })

// LINE などに貼ったときのプレビューに題が出るように、サーバー側で描画する時点で入れておく
useHead(() => ({
  title: set.value ? `${set.value.title}｜まなび` : 'まなび',
  meta: [
    { property: 'og:title', content: set.value ? `${set.value.title}（${set.value.questions.length}問）` : 'まなび' },
    { property: 'og:description', content: '選択式の問題で学ぶ。タップしてすぐ解けます。' },
    { name: 'theme-color', content: '#f7f6f1', media: '(prefers-color-scheme: light)' },
    { name: 'theme-color', content: '#141715', media: '(prefers-color-scheme: dark)' },
  ],
}))

const { touch, recordScore } = useManabiRecent()

const phase = ref<ManabiPhase>('intro')
/** 今回解く問題（set.questions の添字）。やり直しでは間違えた問題だけになる */
const order = ref<number[]>([])
const pos = ref(0)
/** 今回の回答。問題の添字 → 選んだ選択肢 */
const picks = ref<Record<number, number>>({})
const reviewOnly = ref(false)
const runId = ref(0)
const nextEl = ref<HTMLButtonElement | null>(null)
/** 端末に残っていた控えを読み終えたか。読む前に「はじめる」を見せると、途中の人に一瞬だけ最初の画面が出てしまう */
const ready = ref(false)
/** 前回解き終えたときの結果（イントロから見返せる） */
const lastResult = ref<ManabiRun | null>(null)
const reviewFilter = ref<'wrong' | 'all'>('wrong')

const allIndexes = computed(() => (set.value ? set.value.questions.map((_, i) => i) : []))
const currentIndex = computed(() => order.value[pos.value])
const current = computed(() => (set.value && currentIndex.value !== undefined ? set.value.questions[currentIndex.value] ?? null : null))
const picked = computed<number | null>(() => (currentIndex.value !== undefined ? picks.value[currentIndex.value] ?? null : null))
const isCorrect = computed(() => current.value !== null && picked.value === current.value.answer)
const progressPct = computed(() => (order.value.length ? ((pos.value + (picked.value !== null ? 1 : 0)) / order.value.length) * 100 : 0))

const correctCount = computed(() => order.value.filter((qi) => picks.value[qi] === set.value?.questions[qi]?.answer).length)
const wrongIndexes = computed(() => order.value.filter((qi) => picks.value[qi] !== set.value?.questions[qi]?.answer))
const score = computed(() => (order.value.length ? Math.round((correctCount.value / order.value.length) * 100) : 0))

const review = computed(() =>
  order.value.flatMap((qi) => {
    const q = set.value?.questions[qi]
    if (!q) return []
    const mine = picks.value[qi]
    return [{ qi, q: q.q, choices: q.choices, answer: q.answer, mine: mine ?? -1, right: mine === q.answer, explanation: q.explanation }]
  })
)
const shownReview = computed(() => (reviewFilter.value === 'wrong' && wrongIndexes.value.length ? review.value.filter((r) => !r.right) : review.value))

const lastResultScore = computed(() => {
  const r = lastResult.value
  if (!r || !set.value) return 0
  const right = r.order.filter((qi) => r.picks[qi] === set.value!.questions[qi]?.answer).length
  return Math.round((right / r.order.length) * 100)
})

// ── 途中経過の保存 ──────────────────────────────
// 選ぶたび・次へ進むたびに端末へ書く。戻る・閉じる・開き直しのどれでも続きから始められる。

const persist = () => {
  if (!set.value || phase.value === 'intro' || !order.value.length) return
  writeRun(id, {
    phase: phase.value,
    order: order.value,
    pos: pos.value,
    picks: picks.value,
    reviewOnly: reviewOnly.value,
    savedAt: Date.now(),
  })
}

onMounted(() => {
  if (set.value) {
    touch({ id: set.value.id, title: set.value.title, count: set.value.questions.length })
    const run = readRun(id, set.value.questions.length)
    if (run?.phase === 'quiz') {
      // 解いている途中だったら、イントロを挟まずそのまま続きへ
      order.value = run.order
      picks.value = run.picks
      pos.value = run.pos
      reviewOnly.value = run.reviewOnly
      phase.value = 'quiz'
      showToast(`${run.pos + 1}問目から再開しました`)
    } else if (run?.phase === 'result') {
      lastResult.value = run
    }
  }
  ready.value = true
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
  persist()
  window.scrollTo({ top: 0 })
}

const showLastResult = () => {
  const r = lastResult.value
  if (!r) return
  order.value = r.order
  picks.value = r.picks
  pos.value = r.pos
  reviewOnly.value = r.reviewOnly
  reviewFilter.value = 'wrong'
  phase.value = 'result'
  window.scrollTo({ top: 0 })
}

const pick = (i: number) => {
  if (picked.value !== null || currentIndex.value === undefined) return
  picks.value = { ...picks.value, [currentIndex.value]: i }
  persist()
  // 解説を読んだら親指の位置のまま「次へ」を押せるように、ボタンまで寄せる
  nextTick(() => nextEl.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
}

const next = () => {
  if (picked.value === null) return
  if (pos.value + 1 < order.value.length) {
    pos.value++
    persist()
    window.scrollTo({ top: 0 })
    return
  }
  reviewFilter.value = 'wrong'
  phase.value = 'result'
  persist()
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
  if (i === current.value.answer) return 'mb-choice--good'
  if (i === picked.value) return 'mb-choice--bad'
  return 'mb-choice--dim'
}

// ── 深掘りの提案 ──────────────────────────────
// 結果画面を開いたときに1度だけ取りに行く。サーバーが問題セットごとに保存しているので、2回目以降は速い。
// 取れなくても学びは終わっているので、黙って出さないだけにする。

const deepenThemes = ref<string[]>([])
const deepenLoading = ref(false)
let deepenFetched = false

watch(phase, async (p) => {
  if (p !== 'result' || deepenFetched) return
  deepenFetched = true
  deepenLoading.value = true
  try {
    const res = await $fetch<{ themes: string[] }>(`/api/manabi/sets/${id}/deepen`, { method: 'POST', timeout: 60_000 })
    deepenThemes.value = res.themes
  } catch {
    deepenThemes.value = []
    deepenFetched = false
  } finally {
    deepenLoading.value = false
  }
})

// ── 共有 ──────────────────────────────

// origin はブラウザでしか分からないので、描画後に入れる（SSRとの食い違いを出さない）
const origin = ref('')
onMounted(() => (origin.value = location.origin))
const shareUrl = () => `${origin.value}/manabi/${id}`
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
