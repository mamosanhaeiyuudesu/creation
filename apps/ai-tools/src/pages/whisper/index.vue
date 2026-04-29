<template>
  <div class="flex items-start justify-center px-4 pt-4 lg:pt-8 min-h-full pb-8">
    <div class="w-full max-w-[600px] bg-white/[0.04] border border-white/[0.08] rounded-2xl p-7 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-[10px] grid gap-4 ml-2.5">

      <!-- Header -->
      <header class="flex items-start justify-between gap-3">
        <div class="flex-1 text-center pl-10">
          <h1 class="m-0 text-[clamp(24px,4vw,32px)] font-bold bg-gradient-to-br from-sky-400 to-indigo-500 bg-clip-text text-transparent">Whisper</h1>
          <p class="mt-2 mb-0 text-slate-400 text-base">音声を文字に変換</p>
        </div>
        <div class="flex-shrink-0 -mt-3.5 -mr-3.5">
          <UserMenu
            v-if="!$dev && user"
            :username="user.username"
            :items="menuItems"
            accentFrom="#38bdf8"
            accentTo="#6366f1"
          />
        </div>
      </header>

      <!-- Recorder -->
      <div class="flex flex-col items-center gap-3">
        <div class="flex gap-4 items-center">
          <!-- Recording state -->
          <template v-if="isRecording">
            <button
              class="w-20 h-20 lg:w-20 lg:h-20 rounded-full border-2 border-red-500 bg-red-500/10 text-slate-50 text-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:bg-red-500/20 active:scale-95"
              @click="pauseRecording"
            >
              <span class="block leading-none">⏸️</span>
              <span class="text-[10px] font-medium">一時停止</span>
            </button>
          </template>

          <!-- Paused state -->
          <template v-else-if="isPaused">
            <div class="flex rounded-full overflow-hidden border-2 border-sky-400 h-20">
              <button
                class="flex flex-col items-center justify-center gap-1 w-20 bg-sky-400/10 border-none text-slate-50 cursor-pointer transition-colors hover:bg-sky-400/25 p-0"
                @click="resumeRecording"
              >
                <span class="text-xl leading-none">▶</span>
                <span class="text-[10px] font-medium">再開</span>
              </button>
              <div class="w-px bg-sky-400/40 self-stretch" />
              <button
                class="flex flex-col items-center justify-center gap-1 w-20 bg-red-500/10 border-none text-slate-50 cursor-pointer transition-colors hover:bg-red-500/25 p-0"
                @click="cancelRecording"
              >
                <span class="text-xl leading-none">✕</span>
                <span class="text-[10px] font-medium">中止</span>
              </button>
              <div class="w-px bg-sky-400/40 self-stretch" />
              <button
                class="flex flex-col items-center justify-center gap-1 w-20 bg-green-400/10 border-none text-slate-50 cursor-pointer transition-colors hover:bg-green-400/25 p-0"
                @click="transcribeRecording"
              >
                <span class="text-xl leading-none">✍️</span>
                <span class="text-[10px] font-medium">文字起こし</span>
              </button>
            </div>
          </template>

          <!-- Processing state -->
          <template v-else-if="isProcessing || isUploading">
            <button class="w-20 h-20 rounded-full border-2 border-sky-400 bg-sky-400/10 text-slate-50 text-2xl flex flex-col items-center justify-center gap-1 opacity-60 cursor-not-allowed" disabled>
              <span class="block leading-none">⏳</span>
              <span class="text-[10px] font-medium">解析中</span>
            </button>
          </template>

          <!-- Idle state -->
          <template v-else>
            <button
              class="w-20 h-20 rounded-full border-2 border-sky-400 bg-sky-400/10 text-slate-50 text-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:bg-sky-400/20 hover:scale-105"
              @click="startRecording"
            >
              <span class="block leading-none">🎙️</span>
              <span class="text-[10px] font-medium">録音</span>
            </button>
            <button
              class="w-20 h-20 rounded-full border-2 border-violet-400 bg-violet-400/10 text-slate-50 text-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:bg-violet-400/20 hover:scale-105"
              @click="triggerUpload"
            >
              <span class="block leading-none">📂</span>
              <span class="text-[10px] font-medium">音声ファイル</span>
            </button>
          </template>

          <input ref="fileInput" type="file" accept="audio/*,video/*" class="hidden" @change="onFileSelected" />
        </div>

        <div v-if="isRecording || duration > 0" class="text-xl text-red-500 font-mono font-semibold">
          {{ formatTime(duration) }}
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
        <p class="m-0 mb-3 text-red-300 text-sm">{{ error }}</p>
        <button
          class="w-full py-3 px-6 border-none bg-gradient-to-br from-sky-400 to-indigo-500 text-slate-50 rounded-lg text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity"
          @click="error = ''"
        >閉じる</button>
      </div>

      <HistoryTable :history="history" :copiedId="copiedHistoryId" @copy="copyHistory" @delete="deleteHistory" @updateTitle="updateHistoryTitle" />
    </div>

    <!-- Auth Modal -->
    <AuthModal v-if="!$dev && checked && !isLoggedIn" accent="sky" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ alias: ['/whisper', '/whisper/'] })
import { ref, onMounted } from 'vue'

useHead({
  title: import.meta.dev ? 'Whisper (dev)' : 'Whisper',
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎙️</text></svg>` },
    { rel: 'manifest', href: '/manifest-whisper.json' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon-whisper.png' },
  ],
  meta: [
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-title', content: 'Whisper' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'theme-color', content: '#8b5cf6' },
  ],
})
import { useHistory } from '~/composables/useHistory'
import { useAuth } from '~/composables/useAuth'
import { useAudioRecorder, splitAndTranscribeBlob, fetchTitle } from '~/composables/useAudioRecorder'

const $dev = import.meta.dev

const error = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)

const { user, isLoggedIn, checked, checkAuth, logout } = useAuth()

if (!$dev) {
  onMounted(checkAuth)
}

const { history, copiedHistoryId, addHistory, deleteHistory, copyHistory, updateHistoryTitle } = useHistory('whisper-history', 'whisper')

const menuItems = [
  { icon: '🚪', label: 'ログアウト', action: logout },
]

// --- 文字起こし後処理 ---
const handleTranscribed = async (text: string) => {
  const title = await fetchTitle(text)
  addHistory(text, title)
}

// --- 録音 ---
const { isRecording, isPaused, isProcessing, duration, formatTime, startRecording, pauseRecording, resumeRecording, transcribeRecording, cancelRecording } = useAudioRecorder({
  onTranscribed: handleTranscribed,
  onError: (msg) => { error.value = msg },
})

// --- ファイルアップロード ---
const triggerUpload = () => { fileInput.value?.click() }

const onFileSelected = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  ;(event.target as HTMLInputElement).value = ''

  isUploading.value = true
  try {
    const text = await splitAndTranscribeBlob(file, file.name)
    await handleTranscribed(text)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '予期しないエラーが発生しました'
  } finally {
    isUploading.value = false
  }
}
</script>
