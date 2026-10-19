<template>
  <BottomSheet
    :model-value="modelValue"
    title="テキストから議事録を作る"
    :closable="stage === 'idle'"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <p v-if="errorMessage" class="kk-notice kk-notice--error mb-5">{{ errorMessage }}</p>

    <template v-if="stage === 'idle'">
      <p class="kk-lead">
        文字にした会議や話の文章から議事録を作ります。
        文章のファイルをアップロードするか、文章を貼り付けてください。
      </p>

      <label class="kk-field-label mt-3" for="transcript-file">文章のファイルを選ぶ</label>
      <input
        id="transcript-file"
        ref="textFileInput"
        type="file"
        :accept="DOCUMENT_ACCEPT"
        class="block w-full text-[14px] file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[13px] file:font-bold file:bg-[var(--kk-accent-soft)] file:text-[var(--kk-accent-strong)] file:cursor-pointer"
        @change="onPickText"
      >
      <p class="kk-note mt-2">テキスト・Word（.docx）・Markdown（.md）・字幕（.srt）などが使えます。PDFは未対応です。</p>

      <p class="kk-field-label mt-4">または、文章を貼り付ける</p>
      <textarea
        id="transcript-text"
        v-model="pastedText"
        rows="8"
        placeholder="会議の内容を書き写した文章を、ここに貼り付けてください"
        class="kk-input resize-y"
        @input="clearTextFile"
      />
      <!-- 上限を貼る前から見せておき、超えたら何文字オーバーかを出す（送ってから断られないように） -->
      <p
        v-if="pastedLength > 0"
        class="kk-note mt-1 text-right"
        :class="{ 'kk-count--over': pastedOver > 0 }"
        aria-live="polite"
      >
        {{ fmt(pastedLength) }} / {{ fmt(MAX_TRANSCRIPT_CHARS) }}文字
        <template v-if="pastedOver > 0">（{{ fmt(pastedOver) }}文字オーバー。前半・後半に分けてください）</template>
      </p>
      <p v-else class="kk-note mt-1">{{ fmt(MAX_TRANSCRIPT_CHARS) }}文字まで（約2時間分の会話）</p>

      <!-- まとめ方。会議なら決まったこと・やることを、1人の話ならその人が伝えたかったことを中心にまとめる -->
      <p class="kk-field-label mt-4">どんな記録ですか？</p>
      <div class="kk-mode-choice" role="radiogroup" aria-label="どんな記録か">
        <button
          v-for="m in MINUTES_MODES"
          :key="m.value"
          type="button"
          role="radio"
          class="kk-mode-opt"
          :class="{ 'is-on': mode === m.value }"
          :aria-checked="mode === m.value"
          @click="mode = m.value"
        >
          <span class="kk-mode-opt-label">{{ m.label }}</span>
          <span class="kk-mode-opt-desc">{{ m.desc }}</span>
        </button>
      </div>

      <button class="kk-btn mt-4" :disabled="!canRunText" @click="runFromText">
        この文章から議事録を作る
      </button>
    </template>

    <template v-else>
      <div class="py-6 text-center">
        <span class="inline-block w-8 h-8 rounded-full border-[3px] border-[var(--kk-accent)] border-t-transparent animate-spin" />
        <p class="kk-h2 mt-4">AIが{{ mode === 'talk' ? '話の記録' : '議事録' }}にまとめています…</p>
        <p class="kk-lead mt-3">この画面を閉じずにお待ちください。</p>
      </div>
    </template>
  </BottomSheet>
</template>

<script setup lang="ts">
import { apiMessage } from '~/utils/apiMessage'
import { DOCUMENT_ACCEPT, readDocumentText } from '~/utils/readDocumentText'
import { MAX_TRANSCRIPT_CHARS, MINUTES_MODES, countTranscriptChars, transcriptOverMessage, type MinutesMode } from '~/types/minutes'

const props = defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [boolean] }>()

const { createMinutes } = useCreateMinutes()

type Stage = 'idle' | 'structuring'
const stage = ref<Stage>('idle')
const errorMessage = ref('')
const pastedText = ref('')
/** まとめ方。閉じても覚えておく（続けて同じ種類の記録を作ることが多いので） */
const mode = ref<MinutesMode>('meeting')
const textFile = ref<File | null>(null)
const textFileInput = ref<HTMLInputElement | null>(null)

/** サーバーの判定と同じ数え方（空白・改行は数えない） */
const pastedLength = computed(() => countTranscriptChars(pastedText.value))
const pastedOver = computed(() => Math.max(0, pastedLength.value - MAX_TRANSCRIPT_CHARS))
const fmt = (n: number) => n.toLocaleString('ja-JP')

/** ファイルを選んでいるか、上限内の文章を貼り付けているかのどちらかなら進める */
const canRunText = computed(
  () => !!textFile.value || (pastedLength.value > 0 && pastedOver.value === 0)
)

function onPickText(e: Event) {
  textFile.value = (e.target as HTMLInputElement).files?.[0] ?? null
  // ファイルと貼り付けの両方が埋まっていると、どちらが使われるか分からなくなるので片方に寄せる
  if (textFile.value) pastedText.value = ''
  errorMessage.value = ''
}

function clearTextFile() {
  if (!textFile.value) return
  textFile.value = null
  if (textFileInput.value) textFileInput.value.value = ''
}

function reset() {
  stage.value = 'idle'
  errorMessage.value = ''
  pastedText.value = ''
  clearTextFile()
}

// 閉じたら次に開いたとき真っ白から始められるようにする
watch(
  () => props.modelValue,
  (open) => {
    if (!open) reset()
  }
)

async function runFromText() {
  if (!canRunText.value) return
  errorMessage.value = ''
  try {
    const file = textFile.value
    // 読み込みの待ち時間が出るので、先に「まとめています」の画面に切り替えてから読む
    stage.value = 'structuring'
    const text = file ? (await readDocumentText(file)).trim() : pastedText.value.trim()
    if (!text) {
      throw new Error('文章が空でした。中身のあるファイルか、貼り付けた文章でお試しください。')
    }
    // ファイルは読むまで長さが分からないので、ここで先に断る（AIに送る前に数字つきで伝える）
    const over = transcriptOverMessage(countTranscriptChars(text))
    if (over) throw new Error(over)
    await createMinutes(text, file?.name ?? '', mode.value)
  } catch (e) {
    errorMessage.value = apiMessage(e)
    stage.value = 'idle'
  }
}
</script>

<style scoped>
.kk-count--over {
  color: var(--kk-danger);
  font-weight: 700;
}
</style>
