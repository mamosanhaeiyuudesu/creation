<template>
  <section class="nk-card px-4 py-3">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="nk-serif m-0 text-[14px] leading-none">AI振り返りのプロンプト</h2>
        <p class="mt-1 mb-0 text-[11px] text-[var(--nk-ink-soft)] leading-relaxed">
          「AI」ボタンの振り返りに使う指示文です。見る観点や書き方を自由に直せます（出力の形式は自動で付きます）。
        </p>
      </div>
      <button class="nk-btn-ghost !h-8 !px-3 !text-[12px] shrink-0" @click="emit('close')">閉じる</button>
    </div>

    <p v-if="loading" class="mt-3 mb-0 text-[12px] text-[var(--nk-ink-soft)]">読み込み中…</p>
    <template v-else>
      <textarea v-model="text" class="nk-input mt-3 !text-[13px] !h-[320px] leading-relaxed" :maxlength="max" />
      <p v-if="error" class="mt-1.5 mb-0 text-[12px] text-[var(--nk-today)]">{{ error }}</p>
      <div class="mt-2.5 flex items-center gap-2">
        <button class="nk-btn !h-8 !px-3 !text-[12px]" :disabled="saving || !text.trim()" @click="emit('save', text)">
          {{ saving ? '保存中…' : '保存する' }}
        </button>
        <button class="nk-btn-ghost !h-8 !px-3 !text-[12px]" :disabled="saving" @click="text = defaultPrompt">既定に戻す</button>
        <span class="ml-auto text-[11px] text-[var(--nk-ink-soft)]">{{ text.length }}/{{ max }}</span>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  prompt: string
  defaultPrompt: string
  max: number
  loading: boolean
  saving: boolean
  error: string
}>()

const emit = defineEmits<{ save: [prompt: string]; close: [] }>()

const text = ref(props.prompt)
// 読み込み完了・保存完了でサーバー側の値が変わったら入力欄に反映する
watch(() => props.prompt, (v) => { text.value = v })
</script>
