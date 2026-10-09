<template>
  <BottomSheet
    :model-value="modelValue"
    title="テキストから議事録をつくる"
    :closable="stage === 'idle'"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <p v-if="errorMessage" class="kk-notice kk-notice--error mb-5">{{ errorMessage }}</p>

    <template v-if="stage === 'idle'">
      <p class="kk-lead">
        文字にした会議の文章から議事録をつくります。
        文章のファイルをえらぶか、文章を貼り付けてください。
      </p>

      <label class="kk-field-label mt-5" for="transcript-file">文章のファイルをえらぶ</label>
      <input
        id="transcript-file"
        ref="textFileInput"
        type="file"
        accept=".txt,text/plain"
        class="block w-full text-[17px] file:mr-3 file:py-3 file:px-5 file:rounded-full file:border-0 file:text-[16px] file:font-bold file:bg-[var(--kk-accent-soft)] file:text-[var(--kk-accent-strong)] file:cursor-pointer"
        @change="onPickText"
      >
      <p class="kk-note mt-2">文字だけのファイル（.txt）が使えます。</p>

      <p class="kk-field-label mt-6">または、文章を貼り付ける</p>
      <textarea
        id="transcript-text"
        v-model="pastedText"
        rows="10"
        placeholder="会議の内容を書き写した文章を、ここに貼り付けてください"
        class="kk-input resize-y"
        @input="clearTextFile"
      />

      <button class="kk-btn mt-4" :disabled="!canRunText" @click="runFromText">
        この文章から議事録をつくる
      </button>
    </template>

    <template v-else>
      <div class="py-6 text-center">
        <span class="inline-block w-8 h-8 rounded-full border-[3px] border-[var(--kk-accent)] border-t-transparent animate-spin" />
        <p class="kk-h2 mt-4">AIが議事録にまとめています…</p>
        <p class="kk-lead mt-3">この画面を閉じずにお待ちください。</p>
      </div>
    </template>
  </BottomSheet>
</template>

<script setup lang="ts">
import { apiMessage } from '~/utils/apiMessage'

const props = defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [boolean] }>()

const { createMinutes } = useCreateMinutes()

type Stage = 'idle' | 'structuring'
const stage = ref<Stage>('idle')
const errorMessage = ref('')
const pastedText = ref('')
const textFile = ref<File | null>(null)
const textFileInput = ref<HTMLInputElement | null>(null)

/** ファイルを選んでいるか、文章を貼り付けているかのどちらかが埋まっていれば進める */
const canRunText = computed(() => !!textFile.value || pastedText.value.trim().length > 0)

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

/**
 * テキストファイルを読む。
 * **文字コードの取り違えに備える**＝ Windows のメモ帳で保存した古いファイルは Shift_JIS のことがあり、
 * UTF-8 として読むと全部文字化けする（利用者からは「変な記号だらけの議事録ができた」に見える）。
 * まず UTF-8 として厳密に読み、壊れていたら Shift_JIS として読み直す。
 */
async function readTextFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    try {
      return new TextDecoder('shift_jis').decode(buffer)
    } catch {
      throw new Error('この文章ファイルは読み込めませんでした。文字だけのファイル（.txt）をお試しください。')
    }
  }
}

async function runFromText() {
  if (!canRunText.value) return
  errorMessage.value = ''
  try {
    const file = textFile.value
    // 読み込みの待ち時間が出るので、音声と同じ「まとめています」の画面に切り替えてから読む
    stage.value = 'structuring'
    const text = file ? (await readTextFile(file)).trim() : pastedText.value.trim()
    if (!text) {
      throw new Error('文章が空でした。中身のあるファイルか、貼り付けた文章でお試しください。')
    }
    await createMinutes(text, file?.name ?? '')
  } catch (e) {
    errorMessage.value = apiMessage(e)
    stage.value = 'idle'
  }
}
</script>
