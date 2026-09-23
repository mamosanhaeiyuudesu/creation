<template>
  <section>
    <header class="flex items-end justify-between gap-3 mb-2">
      <div>
        <h2 class="nk-serif text-[17px] leading-none">これまでの日々</h2>
        <p class="mt-1.5 mb-0 text-[11.5px] text-[var(--nk-ink-soft)]">
          右がいちばん新しい日。左へスクロールすると過去にさかのぼれます。
        </p>
      </div>
      <button v-if="ordered.length" class="nk-btn-ghost !h-8 !text-[12px] shrink-0" @click="scrollToRight(true)">
        今日へ
      </button>
    </header>

    <div v-if="!ordered.length" class="nk-card px-5 py-8 text-center text-[13px] text-[var(--nk-ink-soft)]">
      {{ loading ? '読み込み中…' : 'まだ記録がありません。カレンダーの日付を選んで、話すか書くかしてみてください。' }}
    </div>

    <!-- 横並びのタイムライン。DOM順は古い→新しい（左→右）で、初期表示は右端（最新）に寄せる -->
    <div v-else ref="scrollEl" class="nk-scroll-x pb-2 -mx-1 px-1" @scroll.passive="onScroll">
      <div class="flex items-stretch gap-2 min-w-max">
        <!-- 左端＝過去側の追い読みの目印 -->
        <div v-if="hasMore" class="flex items-center justify-center w-[92px] shrink-0 text-[11px] text-[var(--nk-ink-soft)]">
          {{ loading ? '読み込み中…' : 'もっと過去へ' }}
        </div>

        <article
          v-for="day in ordered"
          :key="day.date"
          class="w-[196px] shrink-0 nk-card px-3 py-3 flex flex-col gap-2 transition-colors"
          :class="day.date === today ? 'border-[var(--nk-today)]' : ''"
        >
          <button class="text-left" @click="emit('select', day.date)">
            <span class="nk-serif block text-[15px] leading-none" :class="day.date === today ? 'text-[var(--nk-today)]' : ''">
              {{ formatShortDate(day.date) }}
              <span class="text-[11px] font-normal text-[var(--nk-ink-soft)]">({{ weekdayJa(day.date) }})</span>
            </span>
            <span class="block mt-1 text-[10px] text-[var(--nk-ink-soft)]">
              {{ day.date === today ? '今日' : yearLabel(day.date) }}
            </span>
          </button>

          <p v-if="!day.topics.length" class="m-0 text-[11.5px] text-[var(--nk-ink-soft)] leading-relaxed">
            インパクトのある出来事は拾えませんでした
          </p>

          <ul v-else class="m-0 p-0 list-none flex flex-col gap-1.5">
            <li
              v-for="topic in visibleTopics(day)"
              :key="topic.id"
              class="rounded-lg border border-[var(--nk-line)] px-2 py-1.5"
            >
              <span class="flex items-start gap-1.5">
                <span
                  class="mt-[1px] shrink-0 rounded px-1 text-[9.5px] font-bold leading-[15px]"
                  :class="`nk-impact-${Math.min(5, Math.max(3, topic.impact))}`"
                  :title="`インパクト ${topic.impact}`"
                >{{ topic.impact }}</span>
                <span class="text-[12px] font-bold leading-snug">{{ topic.headline }}</span>
              </span>
              <span v-if="topic.detail" class="block mt-1 text-[11px] leading-snug text-[var(--nk-ink-soft)]">
                {{ topic.detail }}
              </span>
            </li>
          </ul>

          <!-- 5つを超えた分はエクスパンドで見せる（要件: 最大5つ＋残りは展開） -->
          <button
            v-if="day.topics.length > NIKKI_TIMELINE_VISIBLE"
            class="self-start text-[11px] font-bold text-[var(--nk-indigo)] underline underline-offset-2"
            @click="toggle(day.date)"
          >
            {{ expanded.has(day.date) ? '閉じる' : `他${day.topics.length - NIKKI_TIMELINE_VISIBLE}件を見る` }}
          </button>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { formatShortDate } from '~/utils/nikki-calendar'
import { weekdayJa } from '~/utils/jst'
import { NIKKI_TIMELINE_VISIBLE } from '~/types/nikki'
import type { NikkiDay } from '~/types/nikki'

const props = defineProps<{
  /** 新しい順（サーバーの返り順）。表示は反転して左が過去になる */
  days: NikkiDay[]
  hasMore: boolean
  loading: boolean
  today: string
  /**
   * 過去を追い読みする。読み込んだ日数を返してもらう
   * （読み込み後もいま見ている日が動かないようにスクロール位置を補正するため、返り値が必要）。
   */
  onLoadOlder: () => Promise<number>
}>()

const emit = defineEmits<{ select: [date: string] }>()

const scrollEl = ref<HTMLElement | null>(null)
const expanded = ref<Set<string>>(new Set())

const ordered = computed(() => [...props.days].reverse())

const visibleTopics = (day: NikkiDay) =>
  expanded.value.has(day.date) ? day.topics : day.topics.slice(0, NIKKI_TIMELINE_VISIBLE)

const toggle = (date: string) => {
  const next = new Set(expanded.value)
  if (next.has(date)) next.delete(date)
  else next.add(date)
  expanded.value = next
}

/** 同じ年なら省く（毎カラムに年が並ぶと読みにくい） */
const yearLabel = (date: string) => {
  const year = date.slice(0, 4)
  return year === props.today.slice(0, 4) ? '' : `${year}年`
}

const scrollToRight = (smooth = false) => {
  const el = scrollEl.value
  if (!el) return
  el.scrollTo({ left: el.scrollWidth, behavior: smooth ? 'smooth' : 'auto' })
}

// 左端に近づいたら過去を継ぎ足す。継ぎ足すと DOM が左へ伸びる＝見ている位置がずれるので、
// 増えた幅だけ scrollLeft を足して「いま見ている日」を画面に留める。
let loadingOlder = false
const onScroll = async () => {
  const el = scrollEl.value
  if (!el || loadingOlder || !props.hasMore || props.loading) return
  if (el.scrollLeft > 120) return

  loadingOlder = true
  const prevWidth = el.scrollWidth
  const prevLeft = el.scrollLeft
  const added = await props.onLoadOlder()
  if (added > 0) {
    await nextTick()
    el.scrollLeft = prevLeft + (el.scrollWidth - prevWidth)
  }
  loadingOlder = false
}

// 最初に描けたときだけ右端（最新）へ寄せる。以降の追い読みでは動かさない。
// スマホはタブ切り替えで非表示(display:none)になっており、その間は scrollWidth が
// 信用できないので、実際に表示されて幅が取れるまで初期化を保留する
// （親がタブ切り替え時に ensureInitialScroll() を呼び直す）。
let initialized = false
const ensureInitialScroll = async () => {
  if (initialized || !props.days.length) return
  const el = scrollEl.value
  if (!el || el.clientWidth === 0) return
  initialized = true
  await nextTick()
  scrollToRight()
}
watch(() => props.days.length, ensureInitialScroll, { immediate: true })

defineExpose({ ensureInitialScroll })
</script>
