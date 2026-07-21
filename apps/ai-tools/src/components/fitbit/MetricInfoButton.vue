<template>
  <!-- 指標の説明。ポップアップ右上の「？」からぶら下げる -->
  <div v-if="info" ref="root" class="relative" @click.stop>
    <button
      ref="btn"
      class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-white/10 transition-colors"
      :class="{ 'bg-white/10 text-slate-200': open }"
      title="この指標について"
      @click="toggle"
    >？</button>

    <!-- モーダルのヘッダーに backdrop-blur があると fixed の基準がそこになるため、body へ Teleport して画面基準で置く -->
    <Teleport to="body">
    <div
      v-if="open"
      ref="popup"
      class="fixed overflow-y-auto bg-[#1e293b] border border-white/10 rounded-xl shadow-xl z-[200] p-4 flex flex-col gap-1.5 text-left [scrollbar-width:thin]"
      :style="popupStyle"
      @click.stop
    >
      <div class="text-[17px] font-bold text-slate-100">{{ info.title }}</div>
      <p class="text-[14px] leading-relaxed text-slate-300">{{ info.meaning }}</p>

      <template v-if="info.parts || info.how">
        <div class="text-[13px] font-semibold text-slate-500 mt-1.5">算出方法</div>
        <p v-if="info.how" class="text-[14px] leading-relaxed text-slate-400">{{ info.how }}</p>
        <ul v-if="info.parts" class="flex flex-col gap-0.5">
          <li v-for="p in info.parts" :key="p.label" class="text-[14px] leading-relaxed text-slate-400">
            <span class="font-semibold text-slate-200 tabular-nums">{{ p.label }}（{{ p.max }}点）</span>：{{ p.how }}
          </li>
        </ul>
      </template>

      <template v-if="info.ranges">
        <div class="text-[13px] font-semibold text-slate-500 mt-1.5">目安</div>
        <div class="flex flex-col gap-1">
          <div
            v-for="r in info.ranges"
            :key="r.label"
            class="flex items-center gap-2 px-2 py-1 rounded-md border text-[13px] leading-tight"
            :class="TONE_CLASS[r.tone]"
          >
            <span class="tabular-nums font-semibold shrink-0">{{ r.range }}</span>
            <span class="text-slate-400">{{ r.label }}</span>
          </div>
        </div>
      </template>

      <p v-for="(n, i) in notes" :key="i" class="text-[13px] leading-relaxed text-slate-500 mt-1.5">{{ n }}</p>

      <p v-if="isScore" class="text-[13px] leading-relaxed text-slate-600 border-t border-white/[0.06] mt-2 pt-2">
        このスコアはFitbit公式APIでは提供されないため、取得できる指標から本家の考え方に沿って独自に近似算出した値です。本家の数値とは一致しません。
      </p>
    </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { METRIC_INFO, type InfoTone } from '~/utils/metricInfo'

const props = defineProps<{ metric: string }>()

const open = ref(false)
const root = ref<HTMLElement>()
const btn = ref<HTMLElement>()
const popup = ref<HTMLElement>()

const MAX_W = 360
const MARGIN = 8
const popupStyle = ref<Record<string, string>>({})

/**
 * ボタン右端に右揃えで置く。ただし画面幅が足りず左にはみ出すとき（スマホ）は画面中央に寄せる。
 * 幅も画面幅に収まるよう決めるので、狭い端末でも左右が切れない。
 */
function place() {
  const r = btn.value?.getBoundingClientRect()
  if (!r) return
  const vw = window.innerWidth
  const w = Math.min(MAX_W, vw - MARGIN * 2)
  const wantLeft = r.right - w
  const left = wantLeft < MARGIN ? (vw - w) / 2 : Math.min(wantLeft, vw - w - MARGIN)
  const top = r.bottom + 6
  popupStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    width: `${w}px`,
    maxHeight: `${Math.max(160, window.innerHeight - top - MARGIN)}px`,
  }
}

function toggle() {
  if (!open.value) place()
  open.value = !open.value
}

// モーダル内の別の場所をクリックしたら閉じる（@click.stop でモーダル自体は閉じないため自前で処理）
// ポップアップは body へ Teleport しているので root だけでなく popup も除外対象にする
function onDocClick(e: MouseEvent) {
  const t = e.target as Node
  if (!root.value?.contains(t) && !popup.value?.contains(t)) open.value = false
}
// モーダルのスクロールや画面回転で位置がずれるため追従（scroll は capture で内側のスクロールも拾う）
function bind(on: boolean) {
  if (on) {
    document.addEventListener('click', onDocClick)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
  } else {
    document.removeEventListener('click', onDocClick)
    window.removeEventListener('resize', place)
    window.removeEventListener('scroll', place, true)
  }
}
watch(open, v => bind(v))
onBeforeUnmount(() => bind(false))
const info = computed(() => METRIC_INFO[props.metric])
const isScore = computed(() => props.metric === 'energyScore' || props.metric === 'sleepScore')
const notes = computed(() => {
  const n = info.value?.note
  return n ? (Array.isArray(n) ? n : [n]) : []
})

const TONE_CLASS: Record<InfoTone, string> = {
  good: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  mid: 'border-slate-400/25 bg-white/[0.06] text-slate-300',
  low: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
}
</script>
