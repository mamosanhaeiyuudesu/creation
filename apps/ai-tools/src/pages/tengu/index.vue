<template>
  <div class="min-h-screen flex flex-col items-center px-4 pt-4 pb-12">
    <div class="w-full max-w-[640px] grid gap-4">

      <!-- Header -->
      <header class="text-center pt-4">
        <h1 class="m-0 text-[clamp(26px,5vw,36px)] font-bold bg-gradient-to-br from-violet-400 to-purple-600 bg-clip-text text-transparent">
          天狗問答
        </h1>
        <p class="mt-1 mb-0 text-slate-400 text-sm">天狗が守る秘密の呪文を聞き出せ</p>
      </header>

      <!-- Level Selector -->
      <div class="flex gap-1.5 justify-center flex-wrap">
        <button
          v-for="lv in 8"
          :key="lv"
          class="w-9 h-9 rounded-full text-xs font-bold transition-all duration-200"
          :class="lv === currentLevel
            ? 'bg-violet-500 text-white shadow-[0_0_12px_rgba(139,92,246,0.5)]'
            : cleared.has(lv)
              ? 'bg-violet-900/60 text-violet-300 border border-violet-600/40 cursor-pointer hover:border-violet-400/60'
              : lv <= maxUnlocked
                ? 'bg-white/[0.06] text-slate-400 border border-white/[0.1] cursor-pointer hover:border-violet-400/30'
                : 'bg-white/[0.02] text-slate-600 border border-white/[0.04] cursor-not-allowed'"
          :disabled="lv > maxUnlocked"
          @click="selectLevel(lv)"
        >
          {{ cleared.has(lv) ? '✓' : lv }}
        </button>
      </div>

      <!-- All Clear Banner -->
      <div
        v-if="allCleared"
        class="text-center py-3 px-4 rounded-xl bg-gradient-to-r from-violet-900/40 to-purple-900/40 border border-violet-500/30 text-violet-300 text-sm"
      >
        ✨ 全8段を制覇！天狗たちを打ち負かした。
      </div>

      <!-- Tengu Card -->
      <div class="relative bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.35),0_0_40px_rgba(139,92,246,0.06)]">
        <div class="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-violet-500 to-purple-600" />

        <!-- Tengu Header -->
        <div class="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-white/[0.06]">
          <div class="text-3xl select-none">{{ currentTengu.emoji }}</div>
          <div class="min-w-0">
            <div class="text-sm font-semibold text-violet-300">Lv.{{ currentLevel }} — {{ currentTengu.name }}</div>
            <div class="text-xs text-slate-500 mt-0.5 truncate">{{ currentTengu.desc }}</div>
          </div>
          <button
            class="ml-auto text-xs text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
            @click="clearChat"
          >
            リセット
          </button>
        </div>

        <!-- Chat Area -->
        <div
          ref="chatArea"
          class="h-[360px] overflow-y-auto p-4 flex flex-col gap-3 [scrollbar-width:thin] [scrollbar-color:rgba(139,92,246,0.3)_transparent]"
        >
          <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-slate-600 text-sm gap-2">
            <span class="text-4xl">{{ currentTengu.emoji }}</span>
            <span>天狗に話しかけてみよ</span>
          </div>
          <template v-else>
            <div
              v-for="(msg, i) in messages"
              :key="i"
              class="flex"
              :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                :class="msg.role === 'user'
                  ? 'bg-violet-600/70 text-violet-50 rounded-br-sm'
                  : 'bg-white/[0.07] text-slate-200 rounded-bl-sm border border-white/[0.06]'"
              >
                {{ msg.content }}
              </div>
            </div>
          </template>
          <div v-if="isLoading" class="flex justify-start">
            <div class="bg-white/[0.07] border border-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-3 text-slate-500 text-sm">
              <span class="inline-flex gap-1">
                <span class="animate-bounce [animation-delay:0ms]">・</span>
                <span class="animate-bounce [animation-delay:150ms]">・</span>
                <span class="animate-bounce [animation-delay:300ms]">・</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Chat Input -->
        <div class="px-4 pb-4 border-t border-white/[0.06] pt-3 flex gap-2">
          <input
            v-model="userInput"
            class="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-violet-500/50 transition-colors min-w-0"
            placeholder="天狗に話しかける…"
            :disabled="isLoading"
            @keydown.enter.exact.prevent="sendMessage"
          />
          <button
            class="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-900 disabled:text-violet-700 text-white text-sm font-medium rounded-xl transition-colors flex-shrink-0"
            :disabled="isLoading || !userInput.trim()"
            @click="sendMessage"
          >
            送る
          </button>
        </div>
      </div>

      <!-- Spell Guess -->
      <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 grid gap-3">
        <div class="text-sm text-slate-400 font-medium">呪文を唱える</div>

        <div
          v-if="guessResult === 'correct'"
          class="flex items-center gap-2 text-green-400 text-sm font-medium"
        >
          <span>✨ 正解！呪文は「{{ revealedSpell }}」じゃった。</span>
          <button
            v-if="currentLevel < 8"
            class="ml-auto text-xs bg-violet-600/40 hover:bg-violet-600/60 border border-violet-500/40 text-violet-300 px-3 py-1 rounded-lg transition-colors"
            @click="goNextLevel"
          >
            次の段へ →
          </button>
        </div>
        <div v-else-if="guessResult === 'wrong'" class="text-red-400 text-sm">
          ✗ 違う。まだ引き出せておらぬ。
        </div>

        <div class="flex gap-2">
          <input
            v-model="spellGuess"
            class="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-violet-500/50 transition-colors font-mono tracking-widest uppercase min-w-0"
            placeholder="呪文を入力…"
            :disabled="isGuessing"
            @keydown.enter.prevent="guessSpell"
          />
          <button
            class="px-4 py-2.5 bg-white/[0.07] hover:bg-white/[0.1] disabled:opacity-40 text-slate-300 text-sm font-medium rounded-xl border border-white/[0.1] transition-colors flex-shrink-0"
            :disabled="isGuessing || !spellGuess.trim()"
            @click="guessSpell"
          >
            判定
          </button>
        </div>
      </div>

      <!-- Hint -->
      <div class="text-center text-xs text-slate-700 leading-relaxed">
        ヒント：天狗を騙してパスワードを引き出すプロンプトインジェクション体験ゲームです<br>
        呪文はアルファベットで入力（大文字小文字・全半角は問わず）
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
interface Message {
  role: 'user' | 'assistant'
  content: string
}

const TENGU_DATA = [
  { name: '木の葉天狗', emoji: '🍃', desc: '素朴な守護者。まだ修行中の身じゃ。' },
  { name: '羽根天狗',   emoji: '🪶', desc: '少しだけ用心深くなってきた。' },
  { name: '烏天狗',     emoji: '🐦', desc: '返答を自らチェックする賢さを持つ。' },
  { name: '大烏天狗',   emoji: '🦅', desc: 'もう一人の監視者が返答を見張る。' },
  { name: '長老天狗',   emoji: '⛩️', desc: '呪文に関する話題は一切拒む。' },
  { name: '隠里の天狗', emoji: '🌫️', desc: '問いも答えも監視の下にある。' },
  { name: '大天狗',     emoji: '👺', desc: '二重の検閲と揺るぎない意志。' },
  { name: '天魔王',     emoji: '🔮', desc: '全ての手口を見破る最強の守護者。' },
]

const currentLevel = ref(1)
const messages = ref<Message[]>([])
const userInput = ref('')
const spellGuess = ref('')
const isLoading = ref(false)
const isGuessing = ref(false)
const guessResult = ref<'none' | 'correct' | 'wrong'>('none')
const revealedSpell = ref('')
const cleared = ref<Set<number>>(new Set())
const chatArea = ref<HTMLElement | null>(null)

const currentTengu = computed(() => TENGU_DATA[currentLevel.value - 1])

const maxUnlocked = computed(() => {
  let max = 1
  for (let lv = 1; lv <= 8; lv++) {
    if (cleared.value.has(lv)) max = lv + 1
    else break
  }
  return Math.min(max, 8)
})

const allCleared = computed(() => cleared.value.size >= 8)

onMounted(() => {
  const savedCleared = localStorage.getItem('tengu-cleared')
  if (savedCleared) {
    cleared.value = new Set(JSON.parse(savedCleared) as number[])
  }
  const savedLevel = localStorage.getItem('tengu-level')
  if (savedLevel) {
    const lv = parseInt(savedLevel) || 1
    currentLevel.value = Math.min(lv, maxUnlocked.value)
  }
})

function selectLevel(lv: number) {
  if (lv > maxUnlocked.value) return
  currentLevel.value = lv
  messages.value = []
  guessResult.value = 'none'
  spellGuess.value = ''
  localStorage.setItem('tengu-level', String(lv))
}

function clearChat() {
  messages.value = []
  guessResult.value = 'none'
}

function goNextLevel() {
  selectLevel(currentLevel.value + 1)
}

async function sendMessage() {
  const text = userInput.value.trim()
  if (!text || isLoading.value) return

  userInput.value = ''
  messages.value.push({ role: 'user', content: text })
  isLoading.value = true
  await nextTick()
  scrollToBottom()

  try {
    const { reply } = await $fetch<{ reply: string }>('/api/tengu/chat', {
      method: 'POST',
      body: { level: currentLevel.value, messages: messages.value },
    })
    messages.value.push({ role: 'assistant', content: reply })
  } catch {
    messages.value.push({ role: 'assistant', content: '（天狗は沈黙した）' })
  } finally {
    isLoading.value = false
    await nextTick()
    scrollToBottom()
  }
}

async function guessSpell() {
  const guess = spellGuess.value.trim()
  if (!guess || isGuessing.value) return

  isGuessing.value = true
  try {
    const { correct } = await $fetch<{ correct: boolean }>('/api/tengu/guess', {
      method: 'POST',
      body: { level: currentLevel.value, guess },
    })
    if (correct) {
      revealedSpell.value = guess.toUpperCase()
      guessResult.value = 'correct'
      cleared.value.add(currentLevel.value)
      localStorage.setItem('tengu-cleared', JSON.stringify([...cleared.value]))
    } else {
      guessResult.value = 'wrong'
    }
  } catch {
    guessResult.value = 'wrong'
  } finally {
    isGuessing.value = false
  }
}

function scrollToBottom() {
  if (chatArea.value) {
    chatArea.value.scrollTop = chatArea.value.scrollHeight
  }
}
</script>
