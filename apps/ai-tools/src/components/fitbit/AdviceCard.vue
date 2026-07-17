<template>
  <!-- 生成失敗時（loading=false かつ data=null）はカードごと非表示にする（非本質的な付加情報のため） -->
  <div
    v-if="loading || data"
    class="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 flex flex-col gap-2 h-full text-left w-full transition-colors"
    :class="data && 'cursor-pointer hover:bg-white/[0.06]'"
    @click="data && (chatOpen = true)"
  >
    <div class="flex items-center justify-between gap-2">
      <div class="text-xs font-semibold text-slate-400">🤖 今日のアドバイス</div>
      <!-- 更新（今のデータで作り直す） -->
      <button
        v-if="data"
        type="button"
        :disabled="refreshing"
        title="アドバイスを更新"
        class="w-6 h-6 -m-1 rounded-lg flex items-center justify-center text-slate-500 text-sm hover:bg-white/10 hover:text-slate-200 disabled:opacity-50 transition-colors"
        @click.stop="refresh"
      ><span :class="refreshing && 'inline-block animate-spin'" aria-hidden>⟳</span></button>
    </div>

    <div v-if="loading" class="flex flex-col gap-2.5 animate-pulse">
      <div class="h-5 bg-white/10 rounded w-4/5" />
      <div class="h-4 bg-white/[0.06] rounded w-full" />
    </div>

    <template v-else-if="data">
      <div class="flex flex-col gap-2" :class="refreshing && 'opacity-40 transition-opacity'">
        <div class="text-base font-bold text-slate-100 leading-snug">{{ data.headline }}</div>
        <p class="text-sm text-slate-400 leading-relaxed">
          <template v-for="(seg, i) in bodySegments" :key="i">
            <strong v-if="seg.bold" class="text-slate-200 font-semibold">{{ seg.text }}</strong>
            <template v-else>{{ seg.text }}</template>
          </template>
        </p>
      </div>

      <!-- カード下部（mt-auto で常に最下段）-->
      <button
        type="button"
        class="mt-auto pt-2 self-end text-[10px] text-emerald-400/80 flex items-center gap-1 hover:text-emerald-300 transition-colors"
        @click.stop="chatOpen = true"
      >続けて質問 <span aria-hidden>›</span></button>
    </template>
  </div>

  <!-- スレッドを開くと現在スロットのアドバイスが新たに投稿されることがあるので、閉じたら取り直す -->
  <AdviceChatModal v-if="chatOpen" :date="date" @close="chatOpen = false; load(true)" />
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { AdviceData } from '~/types/fitbit'
import AdviceChatModal from '~/components/fitbit/AdviceChatModal.vue'
import { splitBold } from '~/utils/text'

const props = defineProps<{ date: string }>()

const data = ref<AdviceData | null>(null)
const loading = ref(true)
const refreshing = ref(false)
const chatOpen = ref(false)

const bodySegments = computed(() => splitBold(data.value?.body ?? ''))

/** silent=true ではスケルトンを出さず、失敗しても表示中のアドバイスを消さない（定期ポーリング用） */
async function load(silent = false) {
  if (!silent) loading.value = true
  try {
    data.value = await $fetch<AdviceData>('/api/fitbit/advice', { params: { date: props.date } })
  } catch {
    if (!silent) data.value = null
  } finally {
    if (!silent) loading.value = false
  }
}

/** 更新ボタン: 今のデータでアドバイスを作り直す（失敗しても表示中のアドバイスは残す） */
async function refresh() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    data.value = await $fetch<AdviceData>('/api/fitbit/advice', { params: { date: props.date, refresh: 1 } })
  } catch {
    // 表示中の内容を保つ
  } finally {
    refreshing.value = false
  }
}

// 6時間スロットが変わると新しいアドバイスがスレッドへ増えるが、生成契機はこのAPIを叩いた時だけ。
// 開きっぱなしのタブでも追従できるよう1時間ごとに取り直す（同一スロットならAIは呼ばれずDBの既存が返る）。
const POLL_MS = 60 * 60 * 1000
let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  load()
  timer = setInterval(() => load(true), POLL_MS)
})
onUnmounted(() => clearInterval(timer))
watch(() => props.date, () => load())
</script>
