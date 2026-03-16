<template>
  <div class="page">
    <div class="container">
      <header class="header">
        <h1>SnapReader</h1>
        <p class="subtitle">画像を解析</p>
      </header>

      <div class="uploader">
        <div class="buttons-row">
          <button class="record-button camera-button" @click="fileInputTranscript?.click()" :disabled="loading">
            <span class="button-icon">{{ loadingMode === 'transcript' ? '⏳' : '📷' }}</span>
            <span class="button-text">{{ loadingMode === 'transcript' ? '解析中' : '文字起こし' }}</span>
          </button>
          <button class="record-button summary-button" @click="triggerSummary" :disabled="loading">
            <span class="button-icon">{{ loadingMode === 'summary' ? '⏳' : '📝' }}</span>
            <span class="button-text">{{ loadingMode === 'summary' ? '処理中' : '要約' }}</span>
          </button>
          <input ref="fileInputTranscript" type="file" accept="image/*" class="file-input-hidden" @change="onTranscriptFileChange" />
          <input ref="fileInputSummary" type="file" accept="image/*" class="file-input-hidden" @change="onSummaryFileChange" />
        </div>
      </div>

      <div v-if="error" class="status status--error">
        <p>{{ error }}</p>
      </div>

      <!-- 要約モード -->
      <template v-if="summary">
        <div class="summary-box">
          <p class="label">要約</p>
          <p class="summary-text">{{ summary }}</p>
        </div>

        <div v-if="chatHistory.length > 0" ref="chatContainer" class="chat-history">
          <template v-for="(msg, i) in chatHistory" :key="i">
            <div :class="['chat-message', msg.role]">
              <p>{{ msg.content }}</p>
            </div>
          </template>
          <div v-if="streamingAnswer" class="chat-message assistant streaming">
            <p>{{ streamingAnswer }}</p>
          </div>
        </div>

        <div v-if="loadingMode === 'questions'" class="loading-questions">
          <span>質問を生成中…</span>
        </div>

        <div v-if="questions.length > 0 && turnCount < 5 && !loading" class="questions">
          <button v-for="(q, i) in questions" :key="i" class="question-button" @click="askQuestion(q)">
            {{ q }}
          </button>
        </div>

        <p v-if="turnCount >= 5 && !loading" class="turn-limit">会話の上限（5回）に達しました。</p>
      </template>

      <!-- 文字起こしモード: 履歴表示 -->
      <HistoryTable v-if="!summary" :history="history" :copiedId="copiedHistoryId" @copy="copyHistory" @delete="deleteHistory" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useHistory } from '~/composables/useHistory'

type LoadingMode = '' | 'transcript' | 'summary' | 'chat' | 'questions'

const fileInputTranscript = ref<HTMLInputElement | null>(null)
const fileInputSummary = ref<HTMLInputElement | null>(null)
const chatContainer = ref<HTMLElement | null>(null)
const loading = ref(false)
const loadingMode = ref<LoadingMode>('')
const error = ref('')

const { history, copiedHistoryId, addHistory, deleteHistory, copyHistory } = useHistory('snapreader-history')

const imageBase64 = ref('')
const transcript = ref('')
const summary = ref('')
const questions = ref<string[]>([])
const chatHistory = ref<{ role: 'user' | 'assistant'; content: string }[]>([])
const streamingAnswer = ref('')
const turnCount = ref(0)

const getFile = (event: Event): File | null => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0] ?? null
  if (file && !file.type.startsWith('image/')) {
    error.value = '画像ファイルを選択してください。'
    return null
  }
  return file
}

const toDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
    reader.readAsDataURL(file)
  })

const formatText = (text: string) => {
  const withoutBlocks = text.replace(/```[\s\S]*?```/g, (block) =>
    block.replace(/```/g, '')
  )
  const withoutMarkdown = withoutBlocks
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
    .replace(/^\s*#+\s+/gm, '')
    .replace(/^\s*>\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/[`*_~]/g, '')
  return withoutMarkdown.replace(/。/g, '。\n').trim()
}

const scrollToBottom = async () => {
  await nextTick()
  chatContainer.value?.scrollTo({ top: chatContainer.value.scrollHeight, behavior: 'smooth' })
}

// 文字起こしボタン
const onTranscriptFileChange = async (event: Event) => {
  const file = getFile(event)
  if (!file) return
  error.value = ''
  loading.value = true
  loadingMode.value = 'transcript'
  try {
    const b64 = await toDataUrl(file)
    const transcriptRes = await $fetch<{ transcript: string }>('/api/snapreader/transcript', {
      method: 'POST',
      body: { imageBase64: b64 },
    })
    const text = formatText(transcriptRes.transcript)
    const titleRes = await $fetch<{ title: string }>('/api/snapreader/title', {
      method: 'POST',
      body: { transcript: text },
    })
    addHistory(text, titleRes.title)
  } catch (err: any) {
    error.value = err?.data?.message || err?.statusMessage || err?.message || '解析に失敗しました。'
  } finally {
    loading.value = false
    loadingMode.value = ''
    if (fileInputTranscript.value) fileInputTranscript.value.value = ''
  }
}

// 要約ボタン
const triggerSummary = () => {
  summary.value = ''
  questions.value = []
  chatHistory.value = []
  streamingAnswer.value = ''
  turnCount.value = 0
  error.value = ''
  fileInputSummary.value?.click()
}

const onSummaryFileChange = async (event: Event) => {
  const file = getFile(event)
  if (!file) return
  error.value = ''
  loading.value = true
  loadingMode.value = 'summary'
  try {
    imageBase64.value = await toDataUrl(file)

    const transcriptRes = await $fetch<{ transcript: string }>('/api/snapreader/transcript', {
      method: 'POST',
      body: { imageBase64: imageBase64.value },
    })
    transcript.value = formatText(transcriptRes.transcript)

    const summaryRes = await $fetch<{ summary: string }>('/api/snapreader/summary', {
      method: 'POST',
      body: { transcript: transcript.value },
    })
    summary.value = summaryRes.summary

    const questionsRes = await $fetch<{ questions: string[] }>('/api/snapreader/questions', {
      method: 'POST',
      body: { transcript: summary.value },
    })
    questions.value = questionsRes.questions
  } catch (err: any) {
    error.value = err?.data?.message || err?.statusMessage || err?.message || '要約に失敗しました。'
  } finally {
    loading.value = false
    loadingMode.value = ''
    if (fileInputSummary.value) fileInputSummary.value.value = ''
  }
}

// 質問選択 → チャット
const askQuestion = async (question: string) => {
  if (turnCount.value >= 5 || loading.value) return
  questions.value = []
  chatHistory.value.push({ role: 'user', content: question })
  streamingAnswer.value = ''
  loading.value = true
  loadingMode.value = 'chat'
  await scrollToBottom()

  let answer = ''
  try {
    const response = await fetch('/api/snapreader/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: imageBase64.value,
        summary: summary.value,
        transcript: transcript.value,
        messages: chatHistory.value,
      }),
    })

    if (!response.ok || !response.body) {
      throw new Error('チャットに失敗しました。')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      answer += decoder.decode(value, { stream: true })
      streamingAnswer.value = answer
      await scrollToBottom()
    }

    chatHistory.value.push({ role: 'assistant', content: answer })
    streamingAnswer.value = ''
    turnCount.value++

    if (turnCount.value < 5) {
      loadingMode.value = 'questions'
      const questionsRes = await $fetch<{ questions: string[] }>('/api/snapreader/questions', {
        method: 'POST',
        body: { transcript: answer },
      })
      questions.value = questionsRes.questions
    }
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || 'チャットに失敗しました。'
    chatHistory.value.pop()
    streamingAnswer.value = ''
  } finally {
    loading.value = false
    loadingMode.value = ''
    await scrollToBottom()
  }
}
</script>

<style scoped>
.page {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  min-height: 100vh;
}

@media (max-width: 1023px) {
  .page {
    padding: 12px 16px;
    align-items: flex-start;
    padding-top: 16px;
  }
}

.container {
  width: 100%;
  max-width: 600px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 20px 80px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(10px);
  display: grid;
  gap: 16px;
}

@media (max-width: 1023px) {
  .container {
    padding: 20px;
    gap: 12px;
  }
}

.header {
  text-align: center;
  margin-bottom: 8px;
}

.header h1 {
  margin: 0;
  font-size: clamp(24px, 4vw, 32px);
  color: #f8fafc;
  background: linear-gradient(135deg, #38bdf8, #6366f1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  margin: 8px 0 0;
  color: #94a3b8;
  font-size: 16px;
}

.uploader {
  display: grid;
  gap: 12px;
}

.buttons-row {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.file-input-hidden {
  display: none;
}

.record-button {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 2px solid #38bdf8;
  background: rgba(56, 189, 248, 0.1);
  color: #f8fafc;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s ease;
}

@media (max-width: 1023px) {
  .record-button {
    width: 70px;
    height: 70px;
    font-size: 20px;
  }
}

.record-button:hover:not(:disabled) {
  background: rgba(56, 189, 248, 0.2);
  border-color: #0ea5e9;
  transform: scale(1.05);
}

.record-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.camera-button {
  border-color: #a78bfa;
  background: rgba(167, 139, 250, 0.1);
}

.camera-button:hover:not(:disabled) {
  background: rgba(167, 139, 250, 0.2);
  border-color: #8b5cf6;
  transform: scale(1.05);
}

.summary-button {
  border-color: #34d399;
  background: rgba(52, 211, 153, 0.1);
}

.summary-button:hover:not(:disabled) {
  background: rgba(52, 211, 153, 0.2);
  border-color: #10b981;
  transform: scale(1.05);
}

.button-icon {
  display: block;
  line-height: 1;
}

.button-text {
  font-size: 10px;
  font-weight: 500;
}

.status {
  border-radius: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.status p {
  margin: 0;
}

.status--error {
  background: rgba(248, 113, 113, 0.08);
  border-color: rgba(248, 113, 113, 0.4);
  color: #fca5a5;
  font-size: 14px;
}

/* 要約エリア */
.summary-box {
  background: rgba(52, 211, 153, 0.06);
  border: 1px solid rgba(52, 211, 153, 0.2);
  border-radius: 12px;
  padding: 16px;
}

.label {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 600;
  color: #34d399;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.summary-text {
  margin: 0;
  color: #e2e8f0;
  font-size: 14px;
  line-height: 1.75;
  white-space: pre-line;
}

/* チャット履歴 */
.chat-history {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 4px;
}

.chat-message {
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.7;
}

.chat-message p {
  margin: 0;
  white-space: pre-line;
}

.chat-message.user {
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.25);
  color: #c7d2fe;
  align-self: flex-end;
  max-width: 90%;
}

.chat-message.assistant {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
}

.chat-message.streaming {
  border-color: rgba(56, 189, 248, 0.3);
}

/* 質問ボタン */
.questions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.question-button {
  width: 100%;
  background: rgba(56, 189, 248, 0.07);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 10px;
  padding: 10px 14px;
  color: #7dd3fc;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1.5;
}

.question-button:hover {
  background: rgba(56, 189, 248, 0.14);
  border-color: rgba(56, 189, 248, 0.45);
  color: #bae6fd;
}

.loading-questions {
  color: #64748b;
  font-size: 13px;
  text-align: center;
  padding: 4px 0;
}

.turn-limit {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  text-align: center;
}
</style>
