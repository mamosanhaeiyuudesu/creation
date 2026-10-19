<template>
  <div class="min-h-[100dvh] flex flex-col">
    <ManabiHeader>
      <span class="flex-1 min-w-0 truncate mb-display text-[14px] font-bold text-[var(--mb-accent-deep)]">他の端末とつなぐ</span>
    </ManabiHeader>

    <main class="flex-1 w-full max-w-[600px] mx-auto px-4 sm:px-6 pb-10">
      <p class="text-[13px] leading-relaxed text-[var(--mb-ink-soft)] px-1">
        コードでつなぐと、名前・正解数・これまでの問題が端末のあいだで揃います。
        一度つなげば、あとは自動で同期されます（毎回の操作は要りません）。
      </p>

      <!-- つないでいる -->
      <section v-if="code" class="mt-6 mb-card p-5 text-center">
        <p class="text-[12px] text-[var(--mb-ink-faint)]">つないでいます</p>
        <p class="mt-2 mb-display text-[26px] tracking-[0.08em] tabular-nums break-all">{{ formatSyncCode(code) }}</p>
        <p class="mt-3 text-[12.5px] leading-relaxed text-[var(--mb-ink-soft)]">
          もう1台の端末で「他の端末とつなぐ」を開き、このコードを入れてください。<br />
          このコードを知っている人は誰でも、あなたの正解数と問題の一覧を見られます。人に見せないでください。
        </p>

        <div class="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button class="mb-btn-ghost" @click="copy(formatSyncCode(code), 'コードをコピーしました')">コードをコピー</button>
          <button class="mb-btn-ghost" @click="copy(linkUrl, 'つなぐリンクをコピーしました')">リンクをコピー</button>
        </div>
        <p v-if="copied" class="mt-3 text-[12.5px] text-[var(--mb-accent-deep)]">{{ copied }}</p>

        <div class="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button class="mb-btn" :disabled="status === 'syncing'" @click="syncNow">
            {{ status === 'syncing' ? '同期しています' : 'いま同期する' }}
          </button>
        </div>
        <p v-if="status === 'ok'" class="mt-3 text-[12.5px] text-[var(--mb-ink-soft)]">同期しました</p>
        <p v-else-if="status === 'error'" class="mt-3 text-[12.5px] text-[var(--mb-bad)]">{{ message }}</p>

        <button class="mt-6 text-[12.5px] text-[var(--mb-ink-faint)] underline underline-offset-4" @click="leaveConfirm">
          この端末のつなぎを解除する
        </button>
      </section>

      <!-- まだつないでいない -->
      <template v-else>
        <section class="mt-6 mb-card p-5">
          <h2 class="text-[15px] font-bold">① この端末のデータを他の端末で使う</h2>
          <p class="mt-1.5 text-[12.5px] leading-relaxed text-[var(--mb-ink-soft)]">
            コードを発行します。もう1台の端末で、そのコードを入れてください。
          </p>
          <button class="mb-btn mt-4 w-full" :disabled="status === 'syncing'" @click="issue">コードを発行する</button>
        </section>

        <section class="mt-4 mb-card p-5">
          <h2 class="text-[15px] font-bold">② 発行済みのコードを入れる</h2>
          <div class="mt-3 mb-bar">
            <input
              v-model="input"
              type="text"
              inputmode="text"
              autocapitalize="none"
              autocomplete="off"
              spellcheck="false"
              placeholder="xxxx-xxxx-xxxx"
              aria-label="同期コード"
              @keydown.enter="onEnter"
            />
            <button class="mb-send" :disabled="!canJoin" aria-label="つなぐ" @click="connect">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          <p class="mt-2 text-[11.5px] text-[var(--mb-ink-faint)]">この端末の正解数や問題は消えず、コードの側のデータと合わさります。</p>
        </section>

        <p v-if="status === 'error'" class="mt-4 text-center text-[13.5px] text-[var(--mb-bad)]">{{ message }}</p>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useManabiSync } from '~/composables/useManabiSync'
import { useManabiTotalCorrect } from '~/composables/useManabiMe'
import { SYNC_CODE_LENGTH, formatSyncCode, normalizeSyncCode } from '~/utils/manabi-sync'

definePageMeta({ layout: 'manabi' })
useHead({
  title: '他の端末とつなぐ',
  meta: [
    { name: 'robots', content: 'noindex' },
    { name: 'theme-color', content: '#f7f5ef' },
  ],
})

const route = useRoute()
const { code, status, message, load, create, join, sync, leave } = useManabiSync()
const { load: loadTotal } = useManabiTotalCorrect()

const input = ref('')
const copied = ref('')
const linkUrl = computed(() => (import.meta.client ? `${location.origin}/sync?code=${code.value}` : ''))
const canJoin = computed(() => normalizeSyncCode(input.value).length === SYNC_CODE_LENGTH && status.value !== 'syncing')

onMounted(() => {
  load()
  // 共有されたリンクから来たときは入力済みにする（つなぐのは本人が押してから）
  if (!code.value && typeof route.query.code === 'string') input.value = formatSyncCode(normalizeSyncCode(route.query.code))
})

const issue = async () => {
  if (await create()) loadTotal()
}
const connect = async () => {
  if (!canJoin.value) return
  if (await join(input.value)) {
    input.value = ''
    loadTotal()
  }
}
const syncNow = async () => {
  if (await sync()) loadTotal()
}
// 日本語入力の変換確定の Enter で送信しない
const onEnter = (e: KeyboardEvent) => {
  if (e.isComposing || e.keyCode === 229) return
  e.preventDefault()
  connect()
}
const leaveConfirm = () => {
  if (window.confirm('この端末のつなぎを解除します。データは端末に残ります。よろしいですか？')) leave()
}

const copy = async (text: string, done: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = done
  } catch {
    copied.value = 'コピーできませんでした。手で選んでコピーしてください'
  }
  setTimeout(() => (copied.value = ''), 2500)
}
</script>
