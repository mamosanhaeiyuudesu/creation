<template>
  <div class="flex justify-center min-h-screen px-4 pt-4 lg:pt-8 pb-0">
    <div class="w-full max-w-[720px] flex flex-col h-[calc(100dvh-2rem)] lg:h-[calc(100dvh-4rem)] bg-white/[0.04] border border-white/[0.08] rounded-2xl shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-[10px] overflow-hidden">

      <!-- Header -->
      <header class="flex items-center justify-between gap-3 px-5 py-3 border-b border-white/[0.06]">
        <div class="flex items-center gap-2">
          <span class="text-xl">💗</span>
          <div class="leading-tight">
            <h1 class="m-0 text-base font-semibold bg-gradient-to-br from-rose-400 to-indigo-400 bg-clip-text text-transparent">deepheart</h1>
            <p class="m-0 text-[11px] text-slate-500 hidden sm:block">{{ currentApproachLabel }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="flex items-center gap-2 p-1.5 rounded-xl border border-white/[0.12] bg-white/[0.05] hover:bg-white/[0.10] hover:border-white/[0.20] transition-all duration-150 cursor-pointer"
            @click="openSettings"
          >
            <span class="text-xs text-slate-400 pl-1">{{ currentApproachLabel }}</span>
            <span
              v-if="user"
              class="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
              style="background: linear-gradient(135deg, #f43f5e, #6366f1)"
            >{{ user.username.charAt(0).toUpperCase() }}</span>
          </button>
        </div>
      </header>

      <!-- Messages -->
      <div ref="scrollRef" class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 [scrollbar-width:thin] [scrollbar-color:rgba(244,63,94,0.3)_transparent]">
        <div v-if="messages.length === 0 && !loadingHistory" class="flex-1 flex flex-col items-center justify-center text-center gap-2 py-10 text-slate-500">
          <div class="text-4xl">💗</div>
          <p class="m-0 text-sm">話したいことを自由に書いてみてください。</p>
          <p class="m-0 text-xs text-slate-600">ここで話した内容はあなたのアカウントにのみ保存されます。</p>
        </div>
        <MessageBubble
          v-for="m in messages"
          :key="m.id"
          :role="m.role"
          :content="m.content"
        />
        <div v-if="streaming" ref="streamBottomRef" />
      </div>

      <!-- Error -->
      <div v-if="error" class="mx-4 mb-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-300 text-xs flex items-center justify-between gap-2">
        <span>{{ error }}</span>
        <button class="text-red-300 hover:text-red-200 bg-transparent border-none cursor-pointer text-xs" @click="error = ''">閉じる</button>
      </div>

      <!-- Composer -->
      <form class="flex items-end gap-2 p-3 border-t border-white/[0.06]" @submit.prevent="send">
        <textarea
          ref="inputRef"
          v-model="input"
          rows="1"
          placeholder="いまの気持ちを書いてみてください..."
          class="flex-1 resize-none bg-white/[0.05] border border-white/[0.12] rounded-xl text-slate-50 text-sm px-3 py-2.5 outline-none focus:border-rose-400 transition-colors font-[inherit] leading-relaxed max-h-40 placeholder:text-slate-600"
          @keydown="onKeydown"
          @input="autoGrow"
        />
        <button
          type="submit"
          class="shrink-0 h-10 w-10 rounded-full border-none bg-gradient-to-br from-rose-500 to-indigo-500 text-white flex items-center justify-center text-base cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="streaming || !input.trim()"
          title="送信"
        >
          <span v-if="!streaming">➤</span>
          <span v-else class="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        </button>
      </form>
    </div>

    <DeepheartAuthModal v-if="checked && !isLoggedIn" />

    <SettingsModal
      v-if="settingsOpen"
      :tone="personality.tone"
      :systemPrompt="personality.systemPrompt"
      :responseLength="personality.responseLength"
      :saving="savingSettings"
      @close="settingsOpen = false"
      @save="saveSettings"
      @clearHistory="confirmClearHistory"
      @logout="logout"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, computed, watch } from 'vue'
import { useDeepheartAuth } from '~/composables/useDeepheartAuth'
import DeepheartAuthModal from '~/components/deepheart/DeepheartAuthModal.vue'
import MessageBubble from '~/components/deepheart/MessageBubble.vue'
import SettingsModal from '~/components/deepheart/SettingsModal.vue'


definePageMeta({ alias: ['/deepheart', '/deepheart/'] })

useHead({
  title: import.meta.dev ? 'deepheart (dev)' : 'deepheart',
  link: [{ rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💗</text></svg>` }],
})

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface Personality {
  tone: string
  systemPrompt: string
  responseLength: number
}

const APPROACH_LABELS: Record<string, string> = {
  listen:  '受け止める',
  explore: '原因を調査',
  reframe: '見方を変える',
  forward: '前向きになる',
}
const LENGTH_LABELS: Record<number, string> = {
  1: '一言', 2: '短め', 3: '普通', 4: '長め', 5: '詳しく',
}

const { user, isLoggedIn, checked, checkAuth, logout } = useDeepheartAuth()

const dev = import.meta.dev
const LS_MESSAGES_PREFIX = 'dh-messages:'
const LS_PERSONALITY_PREFIX = 'dh-personality:'
const messagesKey = computed(() => (user.value ? `${LS_MESSAGES_PREFIX}${user.value.id}` : ''))
const personalityKey = computed(() => (user.value ? `${LS_PERSONALITY_PREFIX}${user.value.id}` : ''))

const messages = ref<ChatMessage[]>([])
const input = ref('')
const streaming = ref(false)
const error = ref('')
const loadingHistory = ref(false)
const scrollRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)

const settingsOpen = ref(false)
const savingSettings = ref(false)
const personality = ref<Personality>({ tone: 'listen', systemPrompt: '', responseLength: 3 })

const currentApproachLabel = computed(() => APPROACH_LABELS[personality.value.tone] ?? '受け止めてほしい')
const currentLengthLabel = computed(() => LENGTH_LABELS[personality.value.responseLength] ?? '普通')


onMounted(checkAuth)

watch(() => isLoggedIn.value, async (logged) => {
  if (logged) await loadAll()
}, { immediate: true })

async function loadAll() {
  await Promise.all([loadHistory(), loadPersonality()])
}

async function loadHistory() {
  loadingHistory.value = true
  try {
    if (dev) {
      if (!messagesKey.value) return
      const raw = localStorage.getItem(messagesKey.value)
      const rows = raw ? (JSON.parse(raw) as ChatMessage[]) : []
      messages.value = rows
      await scrollToBottom()
      return
    }
    const rows = await $fetch<Array<{ id: string; role: string; content: string; createdAt: string }>>(
      '/api/deepheart/messages',
      { query: { limit: 200 } }
    )
    messages.value = rows
      .filter((r) => r.role === 'user' || r.role === 'assistant')
      .map((r) => ({ id: r.id, role: r.role as 'user' | 'assistant', content: r.content }))
    await scrollToBottom()
  } catch {
    // 未ログイン時など
  } finally {
    loadingHistory.value = false
  }
}

async function loadPersonality() {
  if (dev) {
    if (!personalityKey.value) {
      personality.value = { tone: 'listen', systemPrompt: '', responseLength: 3 }
      return
    }
    try {
      const raw = localStorage.getItem(personalityKey.value)
      personality.value = raw ? { ...{ tone: 'listen', systemPrompt: '', responseLength: 3 }, ...JSON.parse(raw) } : { tone: 'listen', systemPrompt: '', responseLength: 3 }
    } catch {
      personality.value = { tone: 'listen', systemPrompt: '', responseLength: 3 }
    }
    return
  }
  try {
    const p = await $fetch<Personality>('/api/deepheart/personality')
    personality.value = p
  } catch {
    personality.value = { tone: 'listen', systemPrompt: '', responseLength: 3 }
  }
}

function saveMessagesLocal() {
  if (!dev || !messagesKey.value) return
  try {
    localStorage.setItem(messagesKey.value, JSON.stringify(messages.value))
  } catch {}
}

function openSettings() {
  settingsOpen.value = true
}

async function saveSettings(payload: Personality) {
  savingSettings.value = true
  try {
    if (dev) {
      if (personalityKey.value) {
        localStorage.setItem(personalityKey.value, JSON.stringify(payload))
      }
      personality.value = payload
      settingsOpen.value = false
      return
    }
    const res = await $fetch<Personality>('/api/deepheart/personality', {
      method: 'PUT',
      body: payload,
    })
    personality.value = res
    settingsOpen.value = false
  } catch (err: any) {
    error.value = err?.data?.message ?? '設定の保存に失敗しました'
  } finally {
    savingSettings.value = false
  }
}

async function confirmClearHistory() {
  if (!window.confirm('これまでの会話履歴をすべて削除します。よろしいですか？')) return
  try {
    if (dev) {
      if (messagesKey.value) localStorage.removeItem(messagesKey.value)
      messages.value = []
      settingsOpen.value = false
      return
    }
    await $fetch('/api/deepheart/messages', { method: 'DELETE' })
    messages.value = []
    settingsOpen.value = false
  } catch (err: any) {
    error.value = err?.data?.message ?? '削除に失敗しました'
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    send()
  }
}

function autoGrow() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

async function scrollToBottom() {
  await nextTick()
  const el = scrollRef.value
  if (el) el.scrollTop = el.scrollHeight
}

async function send() {
  const text = input.value.trim()
  if (!text || streaming.value) return

  error.value = ''
  const userMsg: ChatMessage = {
    id: `local-${Date.now()}-u`,
    role: 'user',
    content: text,
  }
  const assistantMsg: ChatMessage = {
    id: `local-${Date.now()}-a`,
    role: 'assistant',
    content: '',
  }
  messages.value.push(userMsg, assistantMsg)
  input.value = ''
  autoGrow()
  await scrollToBottom()

  streaming.value = true
  const payloadMessages = messages.value
    .filter((m) => !(m.role === 'assistant' && m.content === ''))
    .map((m) => ({ role: m.role, content: m.content }))

  try {
    const res = await fetch('/api/deepheart/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        messages: payloadMessages,
        tone: personality.value.tone,
        systemPrompt: personality.value.systemPrompt,
        responseLength: personality.value.responseLength,
      }),
    })

    if (!res.ok) {
      if (res.status === 401) {
        await logout()
        throw new Error('ログインが必要です')
      }
      const msg = await res.text().catch(() => '')
      throw new Error(msg || '返信の取得に失敗しました')
    }

    const reader = res.body?.getReader()
    if (!reader) throw new Error('ストリームが取得できませんでした')
    const decoder = new TextDecoder()

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      assistantMsg.content += chunk
      await scrollToBottom()
    }

    if (dev) {
      saveMessagesLocal()
    } else {
      await loadHistory()
    }
  } catch (err: any) {
    error.value = err?.message ?? '返信の取得に失敗しました'
    if (!assistantMsg.content) {
      messages.value = messages.value.filter((m) => m.id !== assistantMsg.id)
    }
  } finally {
    streaming.value = false
  }
}
</script>
