<script setup lang="ts">
import { ref, watch } from 'vue'
import KoubaIcon from '~/components/kouba/KoubaIcon.vue'

// アイコンの作り直しポップオーバー（カテゴリ・タスク共通）。AI への指示を書いて作り直してもらう。
// 指示が空なら名前から別案を描かせる。結果を見ながら何度でも頼めるよう、生成後も閉じずに開いたままにする。
const props = defineProps<{ icon: string; busy: boolean }>()
const emit = defineEmits<{ regenerate: [instruction: string]; close: [] }>()

const instruction = ref('')

// 日本語入力の変換確定Enterでも @keydown.enter は発火するため、確定中は無視する
function onEnter(e: KeyboardEvent) {
  if (e.isComposing || e.keyCode === 229) return
  submit()
}
function submit() {
  if (props.busy) return
  emit('regenerate', instruction.value.trim())
}

// 新しいアイコンが届いたら指示欄を空にする（失敗時は書いた指示を残して再実行できるようにする）
watch(
  () => props.icon,
  () => {
    instruction.value = ''
  }
)
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-start gap-3">
      <div class="w-14 h-14 shrink-0 text-3xl">
        <KoubaIcon :icon="icon" :busy="busy" />
      </div>
      <p class="flex-1 m-0 text-[11px] leading-relaxed text-slate-400">AIが作ったアイコンです。直したいところを伝えると作り直します。</p>
      <button type="button" class="w-6 h-6 shrink-0 rounded text-slate-400 hover:bg-white/10 text-[11px]" title="閉じる" @click="emit('close')">✕</button>
    </div>
    <input
      v-model="instruction"
      type="text"
      maxlength="200"
      placeholder="例: もっとシンプルに／青系で／本の形に"
      class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs outline-none focus:border-sky-400/50"
      @keydown.enter="onEnter"
    />
    <button
      type="button"
      class="h-7 rounded-full bg-sky-500 text-white text-[11px] font-bold hover:bg-sky-400 disabled:opacity-40"
      :disabled="busy"
      @click="submit"
    >{{ busy ? '作成中…' : instruction.trim() ? '指示どおりに作り直す' : 'おまかせで作り直す' }}</button>
  </div>
</template>
