<template>
  <BottomSheet
    :model-value="modelValue"
    title="録音から議事録をつくる"
    :closable="stage === 'idle'"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <p v-if="errorMessage" class="kk-notice kk-notice--error mb-5">{{ errorMessage }}</p>

    <template v-if="stage === 'idle'">
      <p class="kk-lead">
        スマホの「ボイスメモ」などで録った会議の音声をえらんでください。
        長い会議も、こちらで自動的に分けて文字にします。
      </p>

      <label class="kk-field-label mt-5" for="audio-file">会議の録音</label>
      <input
        id="audio-file"
        ref="fileInput"
        type="file"
        accept="audio/*,.mp3,.wav,.m4a"
        class="block w-full text-[17px] file:mr-3 file:py-3 file:px-5 file:rounded-full file:border-0 file:text-[16px] file:font-bold file:bg-[var(--kk-accent-soft)] file:text-[var(--kk-accent-strong)] file:cursor-pointer"
        @change="onPick"
      >
      <p class="kk-note mt-3">mp3・wav・m4a の音声が使えます。</p>

      <button class="kk-btn mt-6" :disabled="!file" @click="run">
        この録音から議事録をつくる
      </button>
    </template>

    <template v-else>
      <div class="py-6 text-center">
        <span class="inline-block w-8 h-8 rounded-full border-[3px] border-[var(--kk-accent)] border-t-transparent animate-spin" />
        <p class="kk-h2 mt-4">{{ stageLabel }}</p>
        <p class="kk-lead mt-3">
          長い会議では数分かかります（1時間の録音で3分ほど）。<br>
          この画面を閉じずにお待ちください。
        </p>
      </div>
    </template>
  </BottomSheet>
</template>

<script setup lang="ts">
import { apiMessage } from '~/utils/apiMessage'

const props = defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [boolean] }>()

const { transcribe } = useTranscribe()
const { createMinutes } = useCreateMinutes()

type Stage = 'idle' | 'transcribing' | 'structuring'
const stage = ref<Stage>('idle')
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const errorMessage = ref('')
const progress = ref<{ done: number; total: number } | null>(null)

const stageLabel = computed(() => {
  if (stage.value === 'structuring') return 'AIが議事録にまとめています…'
  const p = progress.value
  if (p && p.total > 1) return `声を文字にしています…（${p.done}/${p.total}）`
  return '声を文字にしています…'
})

function onPick(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null
  errorMessage.value = ''
}

function reset() {
  stage.value = 'idle'
  errorMessage.value = ''
  progress.value = null
  file.value = null
  if (fileInput.value) fileInput.value.value = ''
}

// 閉じたら次に開いたとき真っ白から始められるようにする
watch(
  () => props.modelValue,
  (open) => {
    if (!open) reset()
  }
)

async function run() {
  if (!file.value) return
  errorMessage.value = ''
  stage.value = 'transcribing'
  try {
    const text = await transcribe(file.value, file.value.name, {
      onProgress: (done, total) => {
        progress.value = { done, total }
      },
    })
    progress.value = null
    stage.value = 'structuring'
    await createMinutes(text, file.value.name)
  } catch (e) {
    errorMessage.value = apiMessage(e)
    stage.value = 'idle'
    progress.value = null
    file.value = null
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>
