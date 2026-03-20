<template>
  <div class="flex flex-col items-center px-4 pt-4 lg:pt-8 pb-12 min-h-screen">
    <div class="w-full max-w-[600px] bg-white/[0.04] border border-white/[0.08] rounded-2xl p-7 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-[10px] grid gap-4 ml-2.5 max-h-[70dvh] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(249,115,22,0.3)_transparent]">

      <!-- Header -->
      <header class="flex items-start justify-between gap-3">
        <div class="flex-1 text-center pl-10">
          <h1 class="m-0 text-[clamp(24px,4vw,32px)] font-bold bg-gradient-to-br from-orange-500 to-pink-500 bg-clip-text text-transparent">はげまし</h1>
          <p class="mt-2 mb-0 text-slate-400 text-base">話して、励ましてもらおう</p>
        </div>
        <div class="flex flex-col gap-1.5 flex-shrink-0 pt-1">
          <button class="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/15 bg-white/[0.06] text-slate-300 text-xs font-medium cursor-pointer transition-all whitespace-nowrap hover:bg-white/[0.12] hover:border-white/25 hover:text-slate-50" data-label="設定" @click="settingsOpen = true">
            <span>⚙️</span>
            <span class="hidden lg:inline">設定</span>
          </button>
          <button
            class="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-orange-500/40 bg-orange-500/[0.08] text-orange-200 text-xs font-medium cursor-pointer transition-all whitespace-nowrap hover:bg-orange-500/[0.18] hover:border-orange-500/70 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            data-label="励ます"
            :disabled="filteredTexts.length === 0 || isEncouraging"
            @click="runEncourage"
          >
            <span>💪</span>
            <span class="hidden lg:inline">励ます</span>
          </button>
        </div>
      </header>

      <!-- Recorder -->
      <div class="flex flex-col items-center gap-3">
        <div class="flex gap-4 items-center">
          <template v-if="isRecording">
            <button class="w-20 h-20 rounded-full border-2 border-red-500 bg-red-500/10 text-slate-50 text-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:bg-red-500/20" @click="pauseRecording">
              <span class="block leading-none">⏸️</span>
              <span class="text-[10px] font-medium">一時停止</span>
            </button>
          </template>
          <template v-else-if="isPaused">
            <div class="flex rounded-full overflow-hidden border-2 border-orange-500 h-20">
              <button class="flex flex-col items-center justify-center gap-1 w-20 bg-orange-500/10 border-none text-slate-50 cursor-pointer transition-colors hover:bg-orange-500/25 p-0" @click="resumeRecording">
                <span class="text-xl leading-none">▶</span>
                <span class="text-[10px] font-medium">再開</span>
              </button>
              <div class="w-px bg-orange-500/40 self-stretch" />
              <button class="flex flex-col items-center justify-center gap-1 w-20 bg-green-400/10 border-none text-slate-50 cursor-pointer transition-colors hover:bg-green-400/25 p-0" @click="transcribeRecording">
                <span class="text-xl leading-none">✍️</span>
                <span class="text-[10px] font-medium">文字起こし</span>
              </button>
            </div>
          </template>
          <template v-else-if="isProcessing">
            <button class="w-20 h-20 rounded-full border-2 border-orange-500 bg-orange-500/10 text-slate-50 text-2xl flex flex-col items-center justify-center gap-1 opacity-60 cursor-not-allowed" disabled>
              <span class="block leading-none">⏳</span>
              <span class="text-[10px] font-medium">解析中</span>
            </button>
          </template>
          <template v-else>
            <button class="w-20 h-20 rounded-full border-2 border-orange-500 bg-orange-500/10 text-slate-50 text-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:bg-orange-500/20 hover:scale-105" @click="startRecording">
              <span class="block leading-none">🎙️</span>
              <span class="text-[10px] font-medium">録音</span>
            </button>
          </template>
        </div>
        <div v-if="isRecording || duration > 0" class="text-xl text-red-500 font-mono font-semibold">
          {{ formatTime(duration) }}
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
        <p class="m-0 mb-3 text-red-300 text-sm">{{ error }}</p>
        <button class="w-full py-3 px-6 border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 rounded-lg text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity" @click="error = ''">閉じる</button>
      </div>

      <HistoryTable :history="history" :copiedId="copiedHistoryId" @copy="copyHistory" @delete="deleteHistory" />
    </div>

    <!-- Word cloud -->
    <div v-if="themes.length" class="w-full max-w-[640px] h-[100px] lg:h-[180px] flex flex-wrap items-center justify-center gap-y-2.5 gap-x-[22px] px-3 pt-8 pb-2 overflow-hidden" aria-hidden="true">
      <span
        v-for="(theme, i) in themes"
        :key="i"
        class="font-bold tracking-[0.04em] cursor-default select-none inline-block transition-[opacity,transform] duration-[250ms] opacity-0 [animation:cloud-in_0.7s_ease_forwards] hover:opacity-100 hover:brightness-[1.3] hover:scale-110"
        :style="wordStyle(i)"
      >{{ theme }}</span>
    </div>

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
          <div v-for="(entry, i) in settings.dictionary" :key="i" class="flex items-center gap-1.5">
            <input v-model="entry.input" class="flex-1 min-w-0 bg-white/[0.05] border border-white/[0.12] rounded-lg text-slate-50 text-sm px-3 py-2 outline-none focus:border-orange-500 transition-colors font-[inherit]" placeholder="入力" />
            <span class="text-slate-500 text-sm flex-shrink-0">→</span>
            <input v-model="entry.output" class="flex-1 min-w-0 bg-white/[0.05] border border-white/[0.12] rounded-lg text-slate-50 text-sm px-3 py-2 outline-none focus:border-orange-500 transition-colors font-[inherit]" placeholder="変換" />
            <button class="bg-transparent border-none text-slate-500 text-[13px] cursor-pointer p-1 px-1.5 rounded flex-shrink-0 hover:text-red-400 transition-colors" @click="removeDictEntry(i)">✕</button>
          </div>
          <button class="self-start bg-transparent border border-dashed border-white/20 rounded-md text-slate-500 text-xs px-3 py-1 cursor-pointer hover:border-white/35 hover:text-slate-400 transition-all" @click="addDictEntry">＋ 追加</button>

          <hr class="border-none border-t border-white/[0.08] my-1" />

          <div class="text-[13px] font-semibold text-slate-300">励まし方</div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-slate-400">ベース知識（Vector Store ID）</label>
            <input v-model="settings.vectorStoreId" class="bg-white/[0.05] border border-white/[0.12] rounded-lg text-slate-50 text-sm px-3 py-2 outline-none focus:border-orange-500 transition-colors font-[inherit]" placeholder="vs_xxxxxxxxxxxx（省略可）" />
            <p class="m-0 text-xs text-slate-500">OpenAIのVector Store IDを指定すると、励ますときにその知識を参照します。</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-slate-400">対象期間</label>
            <select v-model="settings.period" class="bg-white/[0.05] border border-white/[0.12] rounded-lg text-slate-50 text-sm px-3 py-2 outline-none focus:border-orange-500 transition-colors font-[inherit] [&>option]:bg-[#1e293b]">
              <option value="all">すべて</option>
              <option value="today">今日</option>
              <option value="week">過去7日</option>
              <option value="month">過去30日</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-slate-400">励まし方の指示</label>
            <textarea v-model="settings.encouragePrompt" class="bg-white/[0.05] border border-white/[0.12] rounded-lg text-slate-50 text-sm px-3 py-2 outline-none focus:border-orange-500 transition-colors font-[inherit] resize-y leading-relaxed" rows="4" placeholder="話した内容を踏まえて、温かく励ましてください。" />
          </div>
        </div>
        <div class="flex justify-end gap-2 px-6 py-4 pb-5 border-t border-white/[0.08]">
          <button class="px-5 py-2 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity" @click="saveSettings">保存</button>
        </div>
      </div>
    </div>

    <!-- Encourage result modal -->
    <div v-if="encourageOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="encourageOpen = false">
      <div class="w-full max-w-[600px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <h2 class="m-0 text-lg text-slate-50 font-semibold">💪 励まし</h2>
          <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="encourageOpen = false">✕</button>
        </div>
        <div class="px-6 py-5 overflow-y-auto flex flex-col gap-3 flex-1">
          <div v-if="isEncouraging" class="flex items-center justify-center gap-2.5 py-8 text-slate-400 text-sm">
            <span class="w-5 h-5 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin block" />
            励ましを考えています...
          </div>
          <div v-else class="text-[#e2e8f0] text-sm leading-relaxed [&_h1]:text-slate-50 [&_h2]:text-slate-50 [&_h3]:text-slate-50 [&_h2]:text-[15px] [&_h2]:my-4 [&_p]:m-0 [&_p]:mb-2.5 [&_ul]:m-0 [&_ul]:mb-2.5 [&_ul]:pl-5 [&_li]:mb-1 [&_strong]:text-slate-50 [&_strong]:font-semibold [&_hr]:border-none [&_hr]:border-t [&_hr]:border-white/[0.08] [&_hr]:my-3" v-html="parsedResult" />
        </div>
        <div class="flex justify-end gap-2 px-6 py-4 pb-5 border-t border-white/[0.08]">
          <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="copyResult">{{ resultCopied ? 'コピーしました' : 'コピー' }}</button>
          <button class="px-5 py-2 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity" @click="encourageOpen = false">閉じる</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { marked } from 'marked'
import { useHistory } from '~/composables/useHistory'
import { useAudioRecorder, fetchTitle, proofreadInBackground, type DictEntry } from '~/composables/useAudioRecorder'

const error = ref('')
const settingsOpen = ref(false)
const encourageOpen = ref(false)
const encourageResult = ref('')
const resultCopied = ref(false)
const isEncouraging = ref(false)

const { history, copiedHistoryId, addHistory, updateHistory, deleteHistory, copyHistory } = useHistory('hagemashi-history')

// --- テーマ ワードクラウド ---
const themes = ref<string[]>([])

const WORD_STYLES = [
  { size: 24, rotate: -4, color: '#f97316' },
  { size: 15, rotate:  5, color: '#ec4899' },
  { size: 28, rotate: -7, color: '#fb923c' },
  { size: 18, rotate:  3, color: '#f472b6' },
  { size: 13, rotate: -2, color: '#f97316' },
  { size: 21, rotate:  6, color: '#ec4899' },
  { size: 17, rotate: -5, color: '#fb923c' },
  { size: 26, rotate:  4, color: '#f472b6' },
]

const wordStyle = (i: number) => {
  const s = WORD_STYLES[i % WORD_STYLES.length]
  return {
    fontSize: `${s.size}px`,
    color: s.color,
    transform: `rotate(${s.rotate}deg)`,
    animationDelay: `${i * 0.12}s`,
  }
}

const generateThemes = async () => {
  const texts = history.value.slice(0, 10).map(h => h.text)
  if (texts.length < 2) return
  try {
    const res = await $fetch<{ themes: string[] }>('/api/hagemashi/themes', {
      method: 'POST',
      body: { texts },
    })
    themes.value = res.themes ?? []
  } catch {
    // テーマ生成失敗は無視
  }
}

// --- 設定 ---
const defaultSettings = {
  period: 'all',
  encouragePrompt: '話した内容を踏まえて、温かく励ましてください。',
  dictionary: [] as DictEntry[],
  vectorStoreId: '',
}
const settings = ref<typeof defaultSettings>({ ...defaultSettings, dictionary: [] })

onMounted(() => {
  const stored = localStorage.getItem('hagemashi-settings')
  if (stored) {
    try { settings.value = { ...defaultSettings, dictionary: [], ...JSON.parse(stored) } } catch {}
  }
  generateThemes()
})

const addDictEntry = () => settings.value.dictionary.push({ input: '', output: '' })
const removeDictEntry = (i: number) => settings.value.dictionary.splice(i, 1)

const saveSettings = () => {
  localStorage.setItem('hagemashi-settings', JSON.stringify(settings.value))
  settingsOpen.value = false
}

// --- 励まし対象テキスト ---
const filteredTexts = computed(() => {
  const now = new Date()
  return history.value
    .filter((item) => {
      if (settings.value.period === 'all') return true
      const d = new Date(item.timestamp)
      if (settings.value.period === 'today') return d.toDateString() === now.toDateString()
      if (settings.value.period === 'week') return now.getTime() - d.getTime() <= 7 * 24 * 60 * 60 * 1000
      if (settings.value.period === 'month') return now.getTime() - d.getTime() <= 30 * 24 * 60 * 60 * 1000
      return true
    })
    .map((item) => item.text)
})

const parsedResult = computed(() => marked.parse(encourageResult.value || '') as string)

const runEncourage = async () => {
  if (!filteredTexts.value.length) return
  encourageResult.value = ''
  encourageOpen.value = true
  isEncouraging.value = true
  try {
    const res = await $fetch<{ result: string }>('/api/hagemashi/encourage', {
      method: 'POST',
      body: {
        texts: filteredTexts.value,
        encouragePrompt: settings.value.encouragePrompt,
        vectorStoreId: settings.value.vectorStoreId || undefined,
      },
    })
    encourageResult.value = res.result
  } catch (err) {
    encourageResult.value = err instanceof Error ? err.message : '励ましの生成に失敗しました'
  } finally {
    isEncouraging.value = false
  }
}

const copyResult = async () => {
  await navigator.clipboard.writeText(encourageResult.value)
  resultCopied.value = true
  setTimeout(() => { resultCopied.value = false }, 2000)
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
</script>

<style>
@keyframes cloud-in {
  from { opacity: 0; transform: translateY(8px) scale(0.88); }
  to { opacity: 0.65; transform: translateY(0) scale(1); }
}
</style>
