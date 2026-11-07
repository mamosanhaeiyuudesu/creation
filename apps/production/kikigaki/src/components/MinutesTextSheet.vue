<template>
  <BottomSheet
    :model-value="modelValue"
    title="テキストから議事録を作る"
    :closable="stage !== 'sending'"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <p v-if="errorMessage" class="kk-notice kk-notice--error mb-5">{{ errorMessage }}</p>

    <template v-if="stage === 'idle'">
      <p class="kk-lead">
        文字にした会議や話から議事録を作ります。
        テキストのファイルをアップロードするか、テキストを貼り付けてください。
      </p>

      <label class="kk-field-label mt-3" for="transcript-file">ファイルを選ぶ</label>
      <input
        id="transcript-file"
        ref="textFileInput"
        type="file"
        :accept="DOCUMENT_ACCEPT"
        class="block w-full text-[14px] file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[13px] file:font-bold file:bg-[var(--kk-accent-soft)] file:text-[var(--kk-accent-strong)] file:cursor-pointer"
        @change="onPickText"
      >
      <p class="kk-note mt-2">テキスト・Word（.docx）・PDF・Markdown（.md）・字幕（.srt）などが使えます。スキャンや写真から作ったPDFは読めません。</p>

      <p class="kk-field-label mt-4">または、テキストを貼り付ける</p>
      <textarea
        id="transcript-text"
        v-model="pastedText"
        rows="8"
        placeholder="会議の内容を書き写したテキストを、ここに貼り付けてください"
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
        <div v-for="m in MINUTES_MODES" :key="m.value" class="kk-mode-cell">
          <button
            type="button"
            role="radio"
            class="kk-mode-opt"
            :class="{ 'is-on': mode === m.value, 'has-check': m.value === 'meeting' }"
            :aria-checked="mode === m.value"
            @click="mode = m.value"
          >
            <span class="kk-mode-opt-label">{{ m.label }}</span>
            <span class="kk-mode-opt-desc">{{ m.desc }}</span>
          </button>
          <!-- 話し合いのボタンの右がわ。入れておくとA4横1枚に収め、外すと聞き取りと同じように詳しく書いて2枚目・3枚目へ続ける
               （チェックの印はボタンの中に入れられないので、重ねて置いている） -->
          <label
            v-if="m.value === 'meeting'"
            class="kk-onepage"
            title="外すと、話し合ったことを詳しく書いて2枚目・3枚目へ続けます（決まったこと・やることは1枚目の左半分）"
          >
            <input v-model="onePage" type="checkbox" @click="mode = 'meeting'">
            <span>A4 1枚</span>
          </label>
        </div>
      </div>
      <p v-if="mode === 'meeting'" class="kk-note mt-1">
        {{ onePage ? '会議の内容をA4横1枚にまとめます。' : '話し合ったことを詳しく書き、2枚目・3枚目へ続けます（決まったこと・やることは1枚目の左半分）。' }}
      </p>

      <button class="kk-btn mt-4" :disabled="!canRunText" @click="runFromText">
        <!-- 選んだ種類で、できあがるものの名前を変える（聞き取りは「聞き取り記録」） -->
        このテキストから{{ recordName(mode) }}を作る
      </button>
    </template>

    <template v-else>
      <div class="py-6 text-center">
        <span class="inline-block w-8 h-8 rounded-full border-[3px] border-[var(--kk-accent)] border-t-transparent animate-spin" />
        <p class="kk-h2 mt-4">{{ recordName(mode) }}を作成中です…</p>
        <!-- 作る処理はサーバーの裏で続くので、閉じても・ブラウザを閉じても・別のアプリに移ってもよい -->
        <p v-if="stage === 'sending'" class="kk-lead mt-3">送っています。少しお待ちください。</p>
        <p v-else class="kk-lead mt-3">
          この画面を閉じても、作成は続きます。<br>できあがったら自動で開きます。
        </p>
      </div>
    </template>
  </BottomSheet>
</template>

<script setup lang="ts">
import { recordName } from '~/config/minutesLabels'
import { apiMessage } from '~/utils/apiMessage'
import { DOCUMENT_ACCEPT, readDocumentText } from '~/utils/readDocumentText'
import { MAX_TRANSCRIPT_CHARS, MINUTES_MODES, countTranscriptChars, transcriptOverMessage, type MinutesMode } from '~/types/minutes'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const { start: startJob, watching, jobs, dismiss } = useMinuteJobs()
const { prefill } = useTextSheet()

/** sending＝ファイルを読んで送っているところ（まだ閉じられない）、waiting＝サーバーの裏で作っている */
type Stage = 'idle' | 'sending' | 'waiting'
const stage = ref<Stage>('idle')
const errorMessage = ref('')
const pastedText = ref('')
/** まとめ方。開くたびに左の「話し合い」から始める（どこから開いても同じ見た目にする） */
const mode = ref<MinutesMode>('meeting')
/** 話し合いをA4の1枚にまとめるか。開くたびに入れた状態から始める */
const onePage = ref(true)
const textFile = ref<File | null>(null)
const textFileInput = ref<HTMLInputElement | null>(null)

/** サーバーの判定と同じ数え方（空白・改行は数えない） */
const pastedLength = computed(() => countTranscriptChars(pastedText.value))
const pastedOver = computed(() => Math.max(0, pastedLength.value - MAX_TRANSCRIPT_CHARS))
const fmt = (n: number) => n.toLocaleString('ja-JP')

/** ファイルを選んでいるか、上限内のテキストを貼り付けているかのどちらかなら進める */
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
  // 閉じても仕事は裏で続く。できたら useMinuteJobs が開き、作成中は一覧の上に出る
  watching.value = ''
  stage.value = 'idle'
  errorMessage.value = ''
  pastedText.value = ''
  mode.value = 'meeting'
  onePage.value = true
  prefill.value = null
  clearTextFile()
}

// 開くときは入れておく中身があれば入れ、閉じたら次に開いたとき真っ白から始められるようにする
watch(
  () => props.modelValue,
  (open) => {
    if (!open) reset()
    else if (prefill.value) pastedText.value = prefill.value.text
  }
)

async function runFromText() {
  if (!canRunText.value) return
  errorMessage.value = ''
  try {
    const file = textFile.value
    // 読み込みの待ち時間が出るので、先に「まとめています」の画面に切り替えてから読む
    stage.value = 'sending'
    const text = file ? (await readDocumentText(file)).trim() : pastedText.value.trim()
    if (!text) {
      throw new Error('テキストが空でした。中身のあるファイルか、貼り付けたテキストでお試しください。')
    }
    // ファイルは読むまで長さが分からないので、ここで先に断る（AIに送る前に数字つきで伝える）
    const over = transcriptOverMessage(countTranscriptChars(text))
    if (over) throw new Error(over)
    // 元の議事録から作るときは、手で直した日付とタグを引き継ぐ（ファイルに差し替えたら引き継がない）
    const carry = !file && prefill.value ? { date: prefill.value.date, tags: prefill.value.tags } : undefined
    // できたら useMinuteJobs がこの画面を閉じて、できた議事録を開く
    watching.value = await startJob({ transcript: text, audioName: file?.name ?? '', mode: mode.value, onePage: onePage.value, ...carry })
    stage.value = 'waiting'
  } catch (e) {
    errorMessage.value = apiMessage(e)
    stage.value = 'idle'
  }
}

// 待っている仕事が失敗したら、入れた文章はそのままで理由を出す（もう一度押せる）
watch(jobs, (list) => {
  const j = watching.value ? list.find((x) => x.id === watching.value) : undefined
  if (j?.status !== 'failed') return
  errorMessage.value = j.error || '議事録を作れませんでした。少し時間をおいて、もう一度お試しください。'
  stage.value = 'idle'
  watching.value = ''
  dismiss(j.id)
})
</script>

<style scoped>
.kk-mode-cell {
  position: relative;
  display: flex;
}
.kk-mode-cell .kk-mode-opt {
  flex: 1;
}
/* 右がわにチェックの欄を置くので、文字がかぶらないよう右を空ける */
.kk-mode-opt.has-check {
  padding-right: 4.6rem;
}
.kk-onepage {
  position: absolute;
  top: 0.5rem;
  right: 0.55rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 12px;
  font-weight: 700;
  color: var(--kk-ink);
  cursor: pointer;
}
.kk-onepage input {
  width: 1rem;
  height: 1rem;
  margin: 0;
  accent-color: var(--kk-accent);
}
.kk-count--over {
  color: var(--kk-danger);
  font-weight: 700;
}
</style>
