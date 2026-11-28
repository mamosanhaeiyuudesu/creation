<template>
  <Teleport to="body">
    <!-- 日の画面（z-150）の上に重ねる。外側を押しても閉じない（録音を取りこぼさないため） -->
    <div class="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[3px]" role="dialog" aria-modal="true">
      <div class="nk-sheet w-full max-w-[340px] rounded-2xl px-5 py-7 flex flex-col items-center gap-6 shadow-[0_24px_70px_rgba(34,37,44,0.45)]">
        <!-- 文字起こし中 -->
        <template v-if="processing">
          <div class="relative w-[132px] h-[132px] flex items-center justify-center" aria-hidden="true">
            <span class="absolute inset-[18px] rounded-full border-4 border-[var(--nk-line)] border-t-[var(--nk-indigo)] animate-spin" />
            <span class="text-[36px] leading-none">✍️</span>
          </div>
          <p class="m-0 text-[15px] font-bold" role="status">文字起こし中…</p>
        </template>

        <!-- 録音中・一時停止中 -->
        <template v-else>
          <!-- 音が大きいほど、まわりの輪とバーが大きくなる -->
          <div class="flex flex-col items-center gap-3" role="img" :aria-label="paused ? '一時停止中' : '録音中の音の大きさ'">
            <div class="relative w-[132px] h-[132px] flex items-center justify-center">
              <span
                class="absolute inset-0 rounded-full bg-[var(--nk-indigo-soft)] transition-transform duration-100"
                :style="{ transform: `scale(${0.6 + loudness * 0.4})` }"
              />
              <span
                class="relative w-[76px] h-[76px] rounded-full flex items-center justify-center text-[34px] leading-none text-white"
                :class="paused ? 'bg-[var(--nk-ink-soft)]' : 'bg-[var(--nk-indigo)]'"
              >{{ paused ? '⏸' : '🎤' }}</span>
            </div>
            <span class="flex items-center gap-[5px] h-[34px]">
              <span
                v-for="i in 9"
                :key="i"
                class="w-[5px] rounded-full transition-[height,background-color] duration-100"
                :class="loudness > 0.1 ? 'bg-[var(--nk-indigo)]' : 'bg-[var(--nk-line)]'"
                :style="{ height: `${barHeight(i)}px` }"
              />
            </span>
          </div>

          <p v-if="micDead" class="m-0 text-[12px] leading-relaxed text-[var(--nk-today)]">
            マイクが音を拾えていないようです。入力デバイスやブラウザのマイク許可を確認してください。
          </p>

          <div class="w-full flex flex-col gap-2.5">
            <button class="nk-btn w-full !h-12 !text-[15px] justify-center" @click="emit('transcribe')">文字起こし</button>
            <div class="flex gap-2.5">
              <button class="nk-btn-ghost flex-1 !h-12 !text-[14px] justify-center" @click="paused ? emit('resume') : emit('pause')">
                {{ paused ? '再開' : '一時停止' }}
              </button>
              <button class="nk-btn-ghost flex-1 !h-12 !text-[14px] justify-center" @click="emit('cancel')">止める</button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  paused: boolean
  processing: boolean
  /** 入力レベル（0〜1） */
  level: number
  /** 録っているのに音がまったく入っていない */
  micDead: boolean
}>()

const emit = defineEmits<{ pause: []; resume: []; transcribe: []; cancel: [] }>()

// ふつうの話し声はレベルが小さめなので、平方根で持ち上げて動きを見えやすくする。一時停止中は動かさない
const loudness = computed(() => (props.paused ? 0 : Math.min(1, Math.sqrt(props.level) * 1.3)))

// 中央ほど高いバー
const barHeight = (i: number) => 6 + loudness.value * (28 - Math.abs(i - 5) * 4)
</script>
