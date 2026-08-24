<template>
  <div>
    <!-- 位置の帯：左が旅のはじめ、右が旅のおわり。お客様ごとに点を置く -->
    <div v-if="placed.length" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] px-5 sm:px-7 py-4">
      <div class="relative" :style="{ height: trackHeight + 'px' }">
        <div class="absolute left-0 right-0 top-[5px] h-[2px] rounded-full bg-[var(--gh-paper-2)]" />
        <template v-for="d in placed" :key="d.key">
          <span
            v-if="d.row > 0"
            class="absolute w-px bg-[var(--gh-line)]"
            :style="{ left: d.left, top: '6px', height: d.row * ROW_H - 1 + 'px' }"
          />
          <button
            type="button"
            class="absolute w-[11px] h-[11px] rounded-full bg-[var(--gh-forest)] cursor-pointer"
            :style="{ left: d.left, top: d.row * ROW_H + 'px', marginLeft: '-5.5px' }"
            :title="d.title"
            @click="selected = d.profile"
          />
          <button
            type="button"
            class="absolute text-[10.5px] text-[var(--gh-ink-soft)] whitespace-nowrap hover:underline underline-offset-2"
            :style="{ left: d.left, top: d.row * ROW_H + 14 + 'px', transform: d.labelShift }"
            :title="d.title"
            @click="selected = d.profile"
          >{{ d.label }}</button>
        </template>
      </div>
      <div class="flex justify-between text-[11px] text-[var(--gh-ink-faint)] mt-1">
        <span>旅のはじめ</span><span>中ほど</span><span>旅のおわり</span>
      </div>
    </div>

    <p v-else class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] text-center text-[var(--gh-ink-soft)] py-8 text-[13px]">
      経由地の順番が読み取れた日記がまだありません。<br />
      日記の旅程に「東京 → 高山 → 宿 → 高野山」のように<b>通った順</b>が書かれていると読み取れます。
    </p>

    <!-- ゲストをクリックすると、泊まった宿・国籍・経路だけをポップアップで見せる -->
    <div
      v-if="selected"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 z-[200]"
      @click.self="selected = null"
    >
      <div class="w-full max-w-[480px] max-h-[88vh] overflow-y-auto bg-[var(--gh-card)] rounded-2xl p-5 gh-rise">
        <div class="flex items-center justify-between mb-3">
          <h2 class="gh-display font-bold text-[16px]">{{ selected.guestName || '名前未設定のお客様' }}</h2>
          <button class="text-[var(--gh-ink-soft)] hover:text-[var(--gh-ink)] text-[22px] leading-none px-1" aria-label="閉じる" @click="selected = null">×</button>
        </div>

        <div class="flex items-center gap-2 flex-wrap mb-3">
          <span class="gh-chip !py-0.5 !px-2 !text-[11px]">{{ selected.houseName }}</span>
          <span v-if="selected.originCountry" class="text-[11.5px] text-[var(--gh-ink-soft)]">{{ selected.originCountry }}</span>
        </div>

        <!-- 経路：関空 → 和歌山 → 宿 → 奈良 のひと続き。太字がこの宿での滞在。 -->
        <p v-if="selectedChain.length > 1" class="text-[13px] leading-relaxed flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <template v-for="(stop, i) in selectedChain" :key="i">
            <span v-if="i" class="text-[var(--gh-ink-faint)]">→</span>
            <span :class="stop.self ? 'font-bold text-[var(--gh-ink)]' : 'text-[var(--gh-ink-soft)]'">{{ stop.label }}</span>
          </template>
        </p>
        <p v-else class="text-[12.5px] text-[var(--gh-ink-faint)]">経路は日記から読み取れていません。</p>

        <NuxtLink
          :to="`/guesthouse/session/${selected.sessionId}`"
          class="gh-btn-ghost !h-9 mt-4 w-full text-[12.5px] flex items-center justify-center"
        >
          会話・日記を見る
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { routeChain, routePositionLabel, routeRatio } from '~/utils/guesthouse-route'
import type { GuestProfile } from '~/types/guesthouse'

const props = defineProps<{ profiles: GuestProfile[] }>()

/** 点が重なって読めなくなる距離（帯の幅に対する割合）。これより近い点は次の段へ落とす。 */
const MIN_GAP = 0.16
/** 段の高さ（点＋名前ラベル1行分）。 */
const ROW_H = 32

const selected = ref<GuestProfile | null>(null)
const selectedChain = computed(() => (selected.value ? routeChain(selected.value) : []))

interface Dot {
  key: string
  label: string
  title: string
  left: string
  labelShift: string
  row: number
  profile: GuestProfile
}

/** 位置が読み取れたお客様を、左（旅のはじめ）から順に段へ振り分ける。 */
const placed = computed<Dot[]>(() => {
  const rows: number[] = [] // 段ごとの「最後に置いた点の位置」
  const dots: Dot[] = []

  const sorted = props.profiles
    .map((p) => ({ p, ratio: routeRatio(p.routeIndex, p.route.length) }))
    .filter((x): x is { p: GuestProfile; ratio: number } => x.ratio !== null)
    .sort((a, b) => a.ratio - b.ratio)

  for (const { p, ratio } of sorted) {
    let row = rows.findIndex((last) => ratio - last >= MIN_GAP)
    if (row === -1) {
      rows.push(ratio)
      row = rows.length - 1
    } else {
      rows[row] = ratio
    }
    dots.push({
      key: p.sessionId,
      label: p.guestName || '名前未設定',
      title: `${p.guestName || '名前未設定'}：${routePositionLabel(p.routeIndex, p.route.length)}`,
      left: ratio * 100 + '%',
      // 端の点はラベルが枠から出るので、中央寄せをやめて内側へ寄せる。
      labelShift: ratio < 0.12 ? 'translateX(-4px)' : ratio > 0.88 ? 'translateX(calc(-100% + 4px))' : 'translateX(-50%)',
      row,
      profile: p,
    })
  }
  return dots
})

const trackHeight = computed(() => (placed.value.length ? (Math.max(...placed.value.map((d) => d.row)) + 1) * ROW_H : ROW_H))
</script>
