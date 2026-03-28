<template>
  <div class="flex items-start justify-center px-4 pt-4 lg:pt-8 min-h-full pb-8">
    <div class="w-full max-w-[600px] bg-white/[0.04] border border-white/[0.08] rounded-2xl p-7 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-[10px] grid gap-4 ml-2.5">

      <!-- Header -->
      <header class="flex items-start justify-between gap-3">
        <div class="flex-1 text-center pl-10">
          <h1 class="m-0 text-[clamp(24px,4vw,32px)] font-bold bg-gradient-to-br from-sky-400 to-indigo-500 bg-clip-text text-transparent">Whisper</h1>
          <p class="mt-2 mb-0 text-slate-400 text-base">音声を文字に変換</p>
        </div>
        <div class="flex flex-col gap-1.5 flex-shrink-0 pt-1">
          <template v-if="!$dev && user">
            <span class="text-xs text-slate-500 text-right px-1">{{ user.username }}</span>
            <button class="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/15 bg-white/[0.06] text-slate-400 text-xs font-medium cursor-pointer transition-all whitespace-nowrap hover:bg-white/[0.12] hover:text-slate-50" @click="logout">
              <span>🚪</span>
              <span class="hidden lg:inline">ログアウト</span>
            </button>
          </template>
          <button
            class="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/15 bg-white/[0.06] text-slate-300 text-xs font-medium cursor-pointer transition-all whitespace-nowrap hover:bg-white/[0.12] hover:border-white/25 hover:text-slate-50 [&_.label]:inline [&_.label]:lg:inline"
            data-label="設定"
            @click="settingsOpen = true"
          >
            <span>⚙️</span>
            <span class="hidden lg:inline">設定</span>
          </button>
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

      <HistoryTable :history="history" :copiedId="copiedHistoryId" @copy="copyHistory" @delete="deleteHistory" />
    </div>

    <!-- Auth Modal -->
    <AuthModal v-if="!$dev && checked && !isLoggedIn" accent="sky" />

    <!-- Settings Modal -->
    <div v-if="settingsOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="settingsOpen = false">
      <div class="w-full max-w-[480px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <h2 class="m-0 text-lg text-slate-50 font-semibold">設定</h2>
          <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="settingsOpen = false">✕</button>
        </div>
        <div class="px-6 py-5 overflow-y-auto flex flex-col gap-3">
          <div class="text-[13px] font-semibold text-slate-300">辞書（校正）</div>
          <p class="m-0 text-xs text-slate-500">文字起こし後にAIがこの辞書を使って自動校正します。</p>

          <div class="max-h-[240px] overflow-y-auto flex flex-col gap-1.5 mb-2">
            <div v-for="(entry, i) in settings.dictionary" :key="i" class="flex items-center gap-1.5">
              <input v-model="entry.input" class="flex-1 min-w-0 bg-white/[0.05] border border-white/[0.12] rounded-lg text-slate-50 text-sm px-3 py-2 outline-none focus:border-sky-400 transition-colors font-[inherit]" placeholder="入力" />
              <span class="text-slate-500 text-sm flex-shrink-0">→</span>
              <input
                v-model="entry.output"
                class="flex-1 min-w-0 bg-white/[0.05] border border-white/[0.12] rounded-lg text-slate-50 text-sm px-3 py-2 outline-none focus:border-sky-400 transition-colors font-[inherit]"
                placeholder="変換"
                :data-dict-output="i"
                @keydown.enter.prevent="(e: KeyboardEvent) => !e.isComposing && addDictEntryAndFocus(i)"
              />
              <button class="bg-transparent border-none text-slate-500 text-[13px] cursor-pointer p-1 px-1.5 rounded flex-shrink-0 hover:text-red-400 transition-colors" @click="removeDictEntry(i)">✕</button>
            </div>
          </div>

          <button class="self-start bg-transparent border border-dashed border-white/20 rounded-md text-slate-500 text-xs px-3 py-1 cursor-pointer hover:border-white/35 hover:text-slate-400 transition-all" @click="addDictEntry">＋ 追加</button>
        </div>
        <div class="flex justify-end gap-2 px-6 py-4 pb-5 border-t border-white/[0.08]">
          <button class="px-5 py-2 rounded-lg border-none bg-gradient-to-br from-sky-400 to-indigo-500 text-slate-50 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity" @click="saveSettings">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useHistory } from '~/composables/useHistory'
import { useAuth } from '~/composables/useAuth'
import { useAudioRecorder, splitAndTranscribeBlob, fetchTitle, proofreadInBackground, type DictEntry } from '~/composables/useAudioRecorder'

const $dev = import.meta.dev

const error = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const settingsOpen = ref(false)
const isUploading = ref(false)

const { user, isLoggedIn, checked, checkAuth, logout } = useAuth()

if (!$dev) {
  onMounted(checkAuth)
}

const { history, copiedHistoryId, addHistory, updateHistory, deleteHistory, copyHistory } = useHistory('whisper-history', 'whisper')

// --- 設定 ---
const defaultSettings = { dictionary: [] as DictEntry[] }
const settings = ref<typeof defaultSettings>({ dictionary: [] })

onMounted(() => {
  const stored = localStorage.getItem('whisper-settings')
  if (stored) {
    try { settings.value = { dictionary: [], ...JSON.parse(stored) } } catch {}
  }
})

const addDictEntry = () => settings.value.dictionary.push({ input: '', output: '' })
const removeDictEntry = (i: number) => settings.value.dictionary.splice(i, 1)

const addDictEntryAndFocus = (_i: number) => {
  localStorage.setItem('whisper-settings', JSON.stringify(settings.value))
  addDictEntry()
  nextTick(() => {
    const list = document.querySelector<HTMLElement>('.dict-list')
    if (list) list.scrollTop = list.scrollHeight
    const rows = document.querySelectorAll<HTMLElement>('.dict-row')
    const lastRow = rows[rows.length - 1]
    lastRow?.querySelector<HTMLInputElement>('.dict-input')?.focus()
  })
}

const saveSettings = () => {
  localStorage.setItem('whisper-settings', JSON.stringify(settings.value))
  settingsOpen.value = false
}

// --- 文字起こし後処理 ---
const handleTranscribed = async (text: string) => {
  const title = await fetchTitle(text)
  const id = addHistory(text, title)
  proofreadInBackground(id, text, settings.value.dictionary, updateHistory)
}

// --- 録音 ---
const { isRecording, isPaused, isProcessing, duration, formatTime, startRecording, pauseRecording, resumeRecording, transcribeRecording } = useAudioRecorder({
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
