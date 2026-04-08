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
            @click="onEncourageClick"
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

      <!-- History tabs -->
      <div v-if="history.length > 0 || encourageHistory.length > 0" class="mt-1 min-w-0">
        <div class="flex items-center gap-0 mb-3 border-b border-white/[0.08]">
          <button
            class="px-3 pb-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="activeTab === 'transcription' ? 'border-orange-500 text-slate-50' : 'border-transparent text-slate-400 hover:text-slate-300'"
            @click="activeTab = 'transcription'"
          >文字起こし</button>
          <button
            class="px-3 pb-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="activeTab === 'encourage' ? 'border-orange-500 text-slate-50' : 'border-transparent text-slate-400 hover:text-slate-300'"
            @click="activeTab = 'encourage'"
          >励まし</button>
        </div>
        <HistoryTable
          v-if="activeTab === 'transcription'"
          :history="history"
          :copiedId="copiedHistoryId"
          :hideHeader="true"
          :summarizable="true"
          :summarizingId="summarizingId"
          @copy="copyHistory"
          @delete="deleteHistory"
          @summarize="summarizeHistory"
        />
        <HistoryTable
          v-else
          :history="encourageHistory"
          :copiedId="copiedEncourageId"
          :hideHeader="true"
          :markdown="true"
          @copy="copyEncourageHistory"
          @delete="deleteEncourageHistory"
        />
      </div>
    </div>

    <!-- Auth Modal -->
    <AuthModal v-if="!$dev && checked && !isLoggedIn" accent="orange" />

    <!-- Settings Modal（励まし方プロファイル） -->
    <div v-if="settingsOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="settingsOpen = false">
      <div class="w-full max-w-[520px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <h2 class="m-0 text-lg text-slate-50 font-semibold">励まし方の設定</h2>
          <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="settingsOpen = false">✕</button>
        </div>

        <!-- Profile tabs -->
        <div class="flex items-center gap-0 px-6 pt-4 border-b border-white/[0.08] overflow-x-auto [scrollbar-width:none]">
          <button
            v-for="(p, i) in editingProfiles"
            :key="p.id"
            class="px-3 pb-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap"
            :class="editingTabIdx === i ? 'border-orange-500 text-slate-50' : 'border-transparent text-slate-400 hover:text-slate-300'"
            @click="editingTabIdx = i"
          >{{ p.name || `設定${i + 1}` }}</button>
          <button
            class="pb-3 px-2 -mb-px border-b-2 border-transparent text-slate-500 hover:text-orange-400 transition-colors text-lg leading-none"
            title="設定を追加"
            @click="addEditingProfile"
          >+</button>
        </div>

        <!-- Profile form -->
        <div v-if="editingProfiles[editingTabIdx]" class="px-6 py-5 overflow-y-auto flex flex-col gap-4 flex-1">
          <div class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-slate-400">設定名</label>
            <input
              v-model="editingProfiles[editingTabIdx].name"
              class="bg-white/[0.05] border border-white/[0.12] rounded-lg text-slate-50 text-sm px-3 py-2 outline-none focus:border-orange-500 transition-colors font-[inherit]"
              placeholder="例：優しめ、厳しめ"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-slate-400">励まし方の指示</label>
            <textarea
              v-model="editingProfiles[editingTabIdx].encouragePrompt"
              class="bg-white/[0.05] border border-white/[0.12] rounded-lg text-slate-50 text-sm px-3 py-2 outline-none focus:border-orange-500 transition-colors font-[inherit] resize-y leading-relaxed"
              rows="5"
              placeholder="励まし方の指示を入力..."
            />
          </div>
          <div class="flex justify-start">
            <button
              class="px-4 py-2 rounded-lg border border-red-500/40 bg-transparent text-red-400 text-xs cursor-pointer hover:bg-red-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              :disabled="editingProfiles.length <= 1"
              @click="deleteEditingProfile(editingTabIdx)"
            >この設定を削除</button>
          </div>
        </div>

        <div class="flex justify-end gap-2 px-6 py-4 pb-5 border-t border-white/[0.08]">
          <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="settingsOpen = false">キャンセル</button>
          <button class="px-5 py-2 rounded-lg border-none bg-gradient-to-br from-orange-500 to-pink-500 text-slate-50 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity" @click="saveSettings">保存</button>
        </div>
      </div>
    </div>

    <!-- プロファイル選択ポップアップ（2つ以上の場合） -->
    <div v-if="profileSelectOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="profileSelectOpen = false">
      <div class="w-full max-w-[360px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col">
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <h2 class="m-0 text-base text-slate-50 font-semibold">励まし方を選択</h2>
          <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="profileSelectOpen = false">✕</button>
        </div>
        <div class="px-4 py-3 flex flex-col gap-2">
          <button
            v-for="p in profiles"
            :key="p.id"
            class="flex items-center justify-between px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-left cursor-pointer hover:bg-white/[0.08] hover:border-orange-500/40 transition-all"
            @click="selectProfileAndOpenModal(p)"
          >
            <span class="text-sm text-slate-200 font-medium">{{ p.name }}</span>
          </button>
        </div>
        <div class="px-6 pb-4 pt-1">
          <button class="w-full py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="profileSelectOpen = false">キャンセル</button>
        </div>
      </div>
    </div>

    <!-- 履歴選択ポップアップ -->
    <div v-if="selectOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" @click.self="selectOpen = false">
      <div class="w-full max-w-[480px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 class="m-0 text-lg text-slate-50 font-semibold">励ます対象を選択</h2>
            <p v-if="selectedProfile" class="m-0 mt-0.5 text-xs text-slate-500">{{ selectedProfile.name }}</p>
          </div>
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
        <div class="px-6 pt-3 pb-4 border-t border-white/[0.08] flex flex-col gap-3">
          <!-- 文字数選択 -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500 whitespace-nowrap">文字数</span>
            <div class="flex gap-1.5">
              <button
                v-for="n in [200, 500, 1000]"
                :key="n"
                class="px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer"
                :class="charLimit === n ? 'border-orange-500 bg-orange-500/20 text-orange-300' : 'border-white/15 bg-transparent text-slate-400 hover:border-white/30 hover:text-slate-300'"
                @click="charLimit = n"
              >{{ n }}</button>
            </div>
          </div>
          <!-- アクションボタン -->
          <div class="flex items-center justify-between">
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

interface HagemashiProfile {
  id: string
  name: string
  encouragePrompt: string
}

const LS_PROFILES = 'hagemashi-profiles'
const LS_SETTINGS_LEGACY = 'hagemashi-settings'

const DEFAULT_PROMPT = `あなたは相手のことを深く理解したうえで励ます存在です。以下の観点を踏まえ、的を絞った一言で励ましてください。

- 具体的・事実ベース：話の内容から具体的な事実を拾い、抽象的な激励に終わらせない
- 論理的根拠あり：なぜそれが強みや前進なのか、筋道を立てて示す
- 意外性・新しい切り口：本人がまだ気づいていない視点や解釈を提示する
- 深い文脈理解：その人の状況・背景を理解していることが伝わる言葉を選ぶ
- 量を絞る：あれもこれも言わず、最も刺さる一点に集中する
- 自己一致感：薄々感じていたことを言語化し「そうそう、それだ」と思わせる
- 差分・成長の可視化：以前と比べてどう変わったか、何が積み上がっているかを示す`

const makeDefaultProfile = (): HagemashiProfile => ({
  id: Date.now().toString(),
  name: 'デフォルト',
  encouragePrompt: DEFAULT_PROMPT,
})

const error = ref('')
const summarizingId = ref<string | null>(null)
const settingsOpen = ref(false)
const selectOpen = ref(false)
const selectedIds = ref<string[]>([])
const encourageOpen = ref(false)
const encourageResult = ref('')
const resultCopied = ref(false)
const isEncouraging = ref(false)
const activeTab = ref<'transcription' | 'encourage'>('transcription')
const charLimit = ref(500)
const profileSelectOpen = ref(false)
const selectedProfile = ref<HagemashiProfile | null>(null)

// プロファイル一覧
const profiles = ref<HagemashiProfile[]>([])

// 設定モーダル用の編集コピー
const editingProfiles = ref<HagemashiProfile[]>([])
const editingTabIdx = ref(0)

const { user, isLoggedIn, checked, checkAuth, logout } = useAuth()

if (!$dev) {
  onMounted(checkAuth)
}

const { history, copiedHistoryId, addHistory, updateHistoryNotes, deleteHistory, copyHistory } = useHistory('hagemashi-history', 'hagemashi')
const {
  history: encourageHistory,
  copiedHistoryId: copiedEncourageId,
  addHistory: addEncourageHistory,
  deleteHistory: deleteEncourageHistory,
  copyHistory: copyEncourageHistory,
} = useHistory('hagemashi-encourage-history', 'hagemashi-encourage')

const menuItems = [
  { icon: '💬', label: '励まし方の設定', action: openSettingsModal },
  { icon: '🚪', label: 'ログアウト', action: logout },
]

// --- プロファイル管理 ---
onMounted(() => {
  const stored = localStorage.getItem(LS_PROFILES)
  if (stored) {
    try {
      profiles.value = JSON.parse(stored)
    } catch {}
  }
  if (!profiles.value.length) {
    // レガシー設定から移行
    const legacy = localStorage.getItem(LS_SETTINGS_LEGACY)
    const p = makeDefaultProfile()
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy)
        if (parsed.encouragePrompt) p.encouragePrompt = parsed.encouragePrompt
      } catch {}
    }
    profiles.value = [p]
    localStorage.setItem(LS_PROFILES, JSON.stringify(profiles.value))
  }
  // 最初のプロファイルをデフォルト選択
  selectedProfile.value = profiles.value[0]
})

function saveProfiles() {
  localStorage.setItem(LS_PROFILES, JSON.stringify(profiles.value))
}

function openSettingsModal() {
  editingProfiles.value = profiles.value.map(p => ({ ...p }))
  editingTabIdx.value = 0
  settingsOpen.value = true
}

function addEditingProfile() {
  const p = makeDefaultProfile()
  p.id = Date.now().toString()
  p.name = `設定${editingProfiles.value.length + 1}`
  editingProfiles.value.push(p)
  editingTabIdx.value = editingProfiles.value.length - 1
}

function deleteEditingProfile(idx: number) {
  if (editingProfiles.value.length <= 1) return
  editingProfiles.value.splice(idx, 1)
  editingTabIdx.value = Math.min(editingTabIdx.value, editingProfiles.value.length - 1)
}

const saveSettings = () => {
  profiles.value = editingProfiles.value.map(p => ({ ...p }))
  saveProfiles()
  // 選択中プロファイルが削除されていたらリセット
  if (selectedProfile.value && !profiles.value.find(p => p.id === selectedProfile.value!.id)) {
    selectedProfile.value = profiles.value[0]
  }
  settingsOpen.value = false
}

const parsedResult = computed(() => marked.parse(encourageResult.value || '') as string)

// --- 励ます起点 ---
function onEncourageClick() {
  if (profiles.value.length <= 1) {
    selectedProfile.value = profiles.value[0] ?? null
    openSelectModal()
  } else {
    profileSelectOpen.value = true
  }
}

function selectProfileAndOpenModal(p: HagemashiProfile) {
  selectedProfile.value = p
  profileSelectOpen.value = false
  openSelectModal()
}

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

const fetchEncourageTitle = async (text: string): Promise<string> => {
  try {
    const res = await $fetch<{ title: string }>('/api/hagemashi/title', { method: 'POST', body: { text } })
    return res.title
  } catch {
    return ''
  }
}

// --- 励まし実行 ---
const runEncourage = async () => {
  const texts = history.value
    .filter(item => selectedIds.value.includes(item.id))
    .map(item => item.text)
  if (!texts.length) return
  const profile = selectedProfile.value ?? profiles.value[0]
  encourageResult.value = ''
  encourageOpen.value = true
  isEncouraging.value = true
  try {
    const res = await $fetch<{ result: string }>('/api/hagemashi/encourage', {
      method: 'POST',
      body: {
        texts,
        encouragePrompt: profile.encouragePrompt,
        charLimit: charLimit.value,
      },
    })
    encourageResult.value = res.result
    const title = await fetchEncourageTitle(res.result)
    addEncourageHistory(res.result, title)
    activeTab.value = 'encourage'
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

// --- 箇条書き要約 ---
const fetchBullets = async (text: string): Promise<string> => {
  try {
    const res = await $fetch<{ notes: string }>('/api/hagemashi/bullets', { method: 'POST', body: { text } })
    return res.notes
  } catch {
    return ''
  }
}

const summarizeHistory = async (id: string) => {
  const item = history.value.find(h => h.id === id)
  if (!item) return
  summarizingId.value = id
  const notes = await fetchBullets(item.text)
  if (notes) updateHistoryNotes(id, notes)
  summarizingId.value = null
}

// --- 文字起こし後処理 ---
const handleTranscribed = async (text: string) => {
  const [title, notes] = await Promise.all([fetchTitle(text), fetchBullets(text)])
  const id = addHistory(text, title)
  if (notes) updateHistoryNotes(id, notes)
}

// --- 録音 ---
const { isRecording, isPaused, isProcessing, duration, formatTime, startRecording, pauseRecording, resumeRecording, transcribeRecording } = useAudioRecorder({
  onTranscribed: handleTranscribed,
  onError: (msg) => { error.value = msg },
})
</script>
