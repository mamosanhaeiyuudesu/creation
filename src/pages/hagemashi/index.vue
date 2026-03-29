<template>
  <div class="flex flex-col items-center px-4 pt-4 lg:pt-8 pb-12 min-h-screen">
    <div class="w-full max-w-[600px] bg-white/[0.04] border border-white/[0.08] rounded-2xl p-7 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-[10px] grid gap-4 ml-2.5 max-h-[70dvh] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(249,115,22,0.3)_transparent]">

      <!-- Header -->
      <header class="flex items-start justify-between gap-3">
        <div class="flex-1 text-center pl-10">
          <h1 class="m-0 text-[clamp(24px,4vw,32px)] font-bold bg-gradient-to-br from-orange-500 to-pink-500 bg-clip-text text-transparent">はげまし</h1>
          <p class="mt-2 mb-0 text-slate-400 text-base">話して、励ましてもらおう</p>
        </div>
        <div class="flex-shrink-0 -mt-3.5 -mr-3.5">
          <UserMenu
            v-if="!$dev && user"
            :username="user.username"
            :items="menuItems"
            accentFrom="#f97316"
            accentTo="#ec4899"
          />
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

          <!-- 励ます button -->
          <button
            class="w-20 h-20 rounded-full border-2 border-orange-500/50 bg-orange-500/[0.08] text-slate-50 flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
            :class="history.length > 0 && !isEncouraging ? 'cursor-pointer hover:bg-orange-500/[0.20] hover:border-orange-500/80 hover:scale-105' : ''"
            :disabled="history.length === 0 || isEncouraging"
            @click="openSelectModal"
          >
            <span class="text-2xl leading-none">💪</span>
            <span class="text-[10px] font-medium">励ます</span>
          </button>
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

    <!-- Auth Modal -->
    <AuthModal v-if="!$dev && checked && !isLoggedIn" accent="orange" />

    <!-- Settings Modal（励まし方） -->
    <div v-if="settingsOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="settingsOpen = false">
      <div class="w-full max-w-[480px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <h2 class="m-0 text-lg text-slate-50 font-semibold">励まし方の設定</h2>
          <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="settingsOpen = false">✕</button>
        </div>
        <div class="px-6 py-5 overflow-y-auto flex flex-col gap-3">
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

    <!-- 履歴選択ポップアップ -->
    <div v-if="selectOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="selectOpen = false">
      <div class="w-full max-w-[480px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <h2 class="m-0 text-lg text-slate-50 font-semibold">励ます対象を選択</h2>
          <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="selectOpen = false">✕</button>
        </div>
        <div class="px-4 py-3 overflow-y-auto flex flex-col gap-1 flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(249,115,22,0.3)_transparent]">
          <label
            v-for="item in history"
            :key="item.id"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
            :class="selectedIds.includes(item.id) ? 'bg-orange-500/15' : 'hover:bg-white/[0.05]'"
          >
            <input
              type="checkbox"
              class="w-4 h-4 shrink-0 accent-orange-500 cursor-pointer"
              :checked="selectedIds.includes(item.id)"
              @change="toggleSelect(item.id)"
            />
            <span class="text-xs text-slate-400 whitespace-nowrap">{{ formatSelectDate(item.timestamp) }}</span>
            <span class="text-sm text-slate-200 truncate">{{ item.title || item.text.slice(0, 40) }}</span>
          </label>
        </div>
        <div class="flex items-center justify-between gap-2 px-6 py-4 pb-5 border-t border-white/[0.08]">
          <div class="flex gap-2">
            <button class="px-3 py-1.5 rounded-lg border border-white/15 bg-transparent text-slate-400 text-xs cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="selectedIds = history.map(i => i.id)">全選択</button>
            <button class="px-3 py-1.5 rounded-lg border border-white/15 bg-transparent text-slate-400 text-xs cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="selectedIds = []">全解除</button>
          </div>
          <div class="flex gap-2">
            <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="selectOpen = false">キャンセル</button>
            <button
              class="px-5 py-2 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="selectedIds.length === 0"
              @click="confirmSelect"
            >💪 励ます</button>
          </div>
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
import { useAuth } from '~/composables/useAuth'
import { useAudioRecorder, fetchTitle } from '~/composables/useAudioRecorder'

const $dev = import.meta.dev

const error = ref('')
const settingsOpen = ref(false)
const selectOpen = ref(false)
const selectedIds = ref<string[]>([])
const encourageOpen = ref(false)
const encourageResult = ref('')
const resultCopied = ref(false)
const isEncouraging = ref(false)

const { user, isLoggedIn, checked, checkAuth, logout } = useAuth()

if (!$dev) {
  onMounted(checkAuth)
}

const { history, copiedHistoryId, addHistory, deleteHistory, copyHistory } = useHistory('hagemashi-history', 'hagemashi')

const menuItems = [
  { icon: '💬', label: '励まし方の設定', action: () => { settingsOpen.value = true } },
  { icon: '🚪', label: 'ログアウト', action: logout },
]

// --- 設定 ---
const defaultSettings = {
  encouragePrompt: '話した内容を踏まえて、温かく励ましてください。',
}
const settings = ref<typeof defaultSettings>({ ...defaultSettings })

onMounted(() => {
  const stored = localStorage.getItem('hagemashi-settings')
  if (stored) {
    try { settings.value = { ...defaultSettings, ...JSON.parse(stored) } } catch {}
  }
})

const saveSettings = () => {
  localStorage.setItem('hagemashi-settings', JSON.stringify(settings.value))
  settingsOpen.value = false
}

const parsedResult = computed(() => marked.parse(encourageResult.value || '') as string)

// --- 履歴選択モーダル ---
const openSelectModal = () => {
  selectedIds.value = history.value.length > 0 ? [history.value[0].id] : []
  selectOpen.value = true
}

const toggleSelect = (id: string) => {
  const idx = selectedIds.value.indexOf(id)
  if (idx === -1) selectedIds.value.push(id)
  else selectedIds.value.splice(idx, 1)
}

const confirmSelect = () => {
  selectOpen.value = false
  runEncourage()
}

const formatSelectDate = (iso: string): string => {
  const d = new Date(iso)
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mo}/${day} ${h}:${mi}`
}

// --- 励まし実行 ---
const runEncourage = async () => {
  const texts = history.value
    .filter(item => selectedIds.value.includes(item.id))
    .map(item => item.text)
  if (!texts.length) return
  encourageResult.value = ''
  encourageOpen.value = true
  isEncouraging.value = true
  try {
    const res = await $fetch<{ result: string }>('/api/hagemashi/encourage', {
      method: 'POST',
      body: {
        texts,
        encouragePrompt: settings.value.encouragePrompt,
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
  addHistory(text, title)
}

// --- 録音 ---
const { isRecording, isPaused, isProcessing, duration, formatTime, startRecording, pauseRecording, resumeRecording, transcribeRecording } = useAudioRecorder({
  onTranscribed: handleTranscribed,
  onError: (msg) => { error.value = msg },
})
</script>
