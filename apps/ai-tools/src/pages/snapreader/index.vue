<template>
  <div class="flex items-start justify-center px-4 pt-4 lg:pt-8 min-h-full pb-8">
    <div class="w-full max-w-[600px] bg-white/[0.04] border border-white/[0.08] rounded-2xl p-7 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-[10px] grid gap-4">

      <header class="text-center mb-2">
        <h1 class="m-0 text-[clamp(24px,4vw,32px)] font-bold bg-gradient-to-br from-sky-400 to-indigo-500 bg-clip-text text-transparent">SnapReader</h1>
        <p class="mt-2 mb-0 text-slate-400 text-base">画像を解析</p>
      </header>

      <!-- Action buttons -->
      <div class="flex justify-center gap-4">
        <button
          class="w-20 h-20 rounded-full border-2 border-violet-400 bg-violet-400/10 text-slate-50 text-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:bg-violet-400/20 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="loading"
          @click="fileInputTranscript?.click()"
        >
          <span class="block leading-none">{{ loadingMode === 'transcript' ? '⏳' : '📷' }}</span>
          <span class="text-[10px] font-medium">{{ loadingMode === 'transcript' ? '解析中' : '文字起こし' }}</span>
        </button>
        <button
          class="w-20 h-20 rounded-full border-2 border-emerald-400 bg-emerald-400/10 text-slate-50 text-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:bg-emerald-400/20 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="loading"
          @click="triggerSummary"
        >
          <span class="block leading-none">{{ loadingMode === 'summary' ? '⏳' : '📝' }}</span>
          <span class="text-[10px] font-medium">{{ loadingMode === 'summary' ? '処理中' : '要約' }}</span>
        </button>
        <input ref="fileInputTranscript" type="file" accept="image/*" class="hidden" @change="onTranscriptFileChange" />
        <input ref="fileInputSummary" type="file" accept="image/*" class="hidden" @change="onSummaryFileChange" />
      </div>

      <!-- Error -->
      <div v-if="error" class="bg-red-500/[0.08] border border-red-400/40 rounded-xl px-3.5 py-3 text-red-300 text-sm">
        <p class="m-0">{{ error }}</p>
      </div>

      <!-- Summary mode -->
      <template v-if="summary">
        <div class="bg-emerald-400/[0.06] border border-emerald-400/20 rounded-xl p-4">
          <p class="m-0 mb-2 text-[11px] font-semibold text-emerald-400 uppercase tracking-[0.08em]">要約</p>
          <p class="m-0 text-[#e2e8f0] text-sm leading-relaxed whitespace-pre-line">{{ summary }}</p>
        </div>

        <div v-if="chatHistory.length > 0" ref="chatContainer" class="flex flex-col gap-2.5 max-h-[400px] overflow-y-auto pr-1">
          <template v-for="(msg, i) in chatHistory" :key="i">
            <div
              :class="[
                'rounded-xl px-3.5 py-3 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-indigo-500/12 border border-indigo-500/25 text-indigo-200 self-end max-w-[90%]'
                  : 'bg-white/[0.04] border border-white/[0.08] text-[#e2e8f0]'
              ]"
            >
              <p class="m-0 whitespace-pre-line">{{ msg.content }}</p>
            </div>
          </template>
          <div v-if="streamingAnswer" class="rounded-xl px-3.5 py-3 text-sm leading-relaxed bg-white/[0.04] border border-sky-400/30 text-[#e2e8f0]">
            <p class="m-0 whitespace-pre-line">{{ streamingAnswer }}</p>
          </div>
        </div>

        <div v-if="loadingMode === 'questions'" class="text-slate-500 text-[13px] text-center py-1">質問を生成中…</div>

        <div v-if="questions.length > 0 && turnCount < 5 && !loading" class="flex flex-col gap-2">
          <button
            v-for="(q, i) in questions"
            :key="i"
            class="w-full bg-sky-400/[0.07] border border-sky-400/25 rounded-[10px] px-3.5 py-2.5 text-sky-300 text-[13px] text-left cursor-pointer transition-all hover:bg-sky-400/[0.14] hover:border-sky-400/45 hover:text-sky-200 leading-relaxed"
            @click="askQuestion(q)"
          >{{ q }}</button>
        </div>

        <p v-if="turnCount >= 5 && !loading" class="m-0 text-slate-500 text-[13px] text-center">会話の上限（5回）に達しました。</p>
      </template>

      <!-- History mode -->
      <HistoryTable v-if="!summary" :history="history" :copiedId="copiedHistoryId" @copy="copyHistory" @delete="deleteHistory" />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ alias: ['/snapreader', '/snapreader/'] })
import { ref, nextTick } from 'vue'

useHead({
  title: import.meta.dev ? 'SnapReader (dev)' : 'SnapReader',
  link: [{ rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📸</text></svg>` }]
})
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
