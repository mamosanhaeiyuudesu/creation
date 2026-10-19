<template>
  <div class="min-h-[100dvh] flex flex-col">
    <ManabiHeader>
      <span class="flex-1 min-w-0 truncate mb-display text-[14px] font-bold text-[var(--mb-accent-deep)]">他の端末とつなぐ</span>
    </ManabiHeader>

    <main class="flex-1 w-full max-w-[600px] mx-auto px-4 sm:px-6 pb-10">
      <p class="text-[13px] leading-relaxed text-[var(--mb-ink-soft)] px-1">
        コードでつなぐと、名前・正解数・回答した問題が端末のあいだで揃います。
        一度つなげば、あとは自動で同期されます（毎回の操作は要りません）。
      </p>

      <!-- QR・リンクから来たとき -->
      <div v-if="linking" class="mt-24 grid place-items-center text-center">
        <div class="mb-dots mb-5" aria-hidden="true"><span /><span /><span /></div>
        <p class="text-[14px] text-[var(--mb-ink-soft)]">つないでいます</p>
      </div>

      <!-- つないでいる -->
      <section v-else-if="code" class="mt-6 mb-card p-5 text-center">
        <p class="text-[12px] text-[var(--mb-ink-faint)]">つないでいます</p>
        <p class="mt-2 mb-display text-[26px] tracking-[0.08em] tabular-nums break-all">{{ formatSyncCode(code) }}</p>
        <p class="mt-3 text-[12.5px] leading-relaxed text-[var(--mb-ink-soft)]">
          もう1台の端末で「他の端末とつなぐ」を開き、このコードを入れてください。<br />
          このコードを知っている人は誰でも、あなたの正解数と問題の一覧を見られます。人に見せないでください。
        </p>

        <!-- もう1台のカメラで読むと、このコードが入力済みの画面が開く -->
        <div v-if="qrSvg" class="mt-5 grid place-items-center">
          <div class="w-44 h-44 p-2 rounded-2xl bg-white border border-[var(--mb-line)] [&>svg]:w-full [&>svg]:h-full" role="img" aria-label="つなぐためのQRコード" v-html="qrSvg" />
          <p class="mt-2 text-[12px] text-[var(--mb-ink-faint)]">もう1台のカメラで読み取ってください</p>
        </div>

        <div class="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button class="mb-btn-ghost" @click="copy(formatSyncCode(code), 'コードをコピーしました')">コードをコピー</button>
          <button class="mb-btn-ghost" @click="copy(linkUrl, 'つなぐリンクをコピーしました')">リンクをコピー</button>
        </div>
        <p v-if="copied" class="mt-3 text-[12.5px] text-[var(--mb-accent-deep)]">{{ copied }}</p>

        <p v-if="status === 'error'" class="mt-5 text-[12.5px] text-[var(--mb-bad)]">{{ message }}</p>
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

      <!-- つなぎの解除・端末のデータの削除（どちらも確認してから） -->
      <div v-if="!linking" class="mt-8 text-center">
        <section v-if="panel === 'leave'" class="mb-card p-5 text-left">
          <p class="text-[14px] font-bold">つなぎを解除します</p>
          <p class="mt-1.5 text-[12.5px] leading-relaxed text-[var(--mb-ink-soft)]">
            この端末のデータも消しますか？ 消さない場合、名前・正解数・問題の一覧はこの端末に残ります。
            どちらでも、預けたデータは残るので、同じコードでまたつなげます。
          </p>
          <div class="mt-4 flex flex-col gap-2">
            <button class="mb-btn-ghost" @click="doLeave(false)">データは残して解除</button>
            <button class="mb-btn-ghost !text-[var(--mb-bad)]" @click="doLeave(true)">データも消して解除</button>
            <button class="text-[12.5px] text-[var(--mb-ink-faint)] py-2" @click="panel = ''">やめる</button>
          </div>
        </section>

        <section v-else-if="panel === 'erase'" class="mb-card p-5 text-left">
          <p class="text-[14px] font-bold">この端末のデータを削除します</p>
          <p class="mt-1.5 text-[12.5px] leading-relaxed text-[var(--mb-ink-soft)]">
            名前・正解数・回答した問題・解答の控えが消え、元に戻せません。
            <template v-if="code">つなぎも解除されます。</template>
            預けたデータは消えないので、同じコードでつなぎ直せば戻ります。
          </p>
          <div class="mt-4 flex flex-col gap-2">
            <button class="mb-btn-ghost !text-[var(--mb-bad)]" @click="doErase">削除する</button>
            <button class="text-[12.5px] text-[var(--mb-ink-faint)] py-2" @click="panel = ''">やめる</button>
          </div>
        </section>

        <p v-else-if="done" class="text-[12.5px] text-[var(--mb-ink-soft)]">{{ done }}</p>

        <div v-else class="flex items-center justify-center gap-5 text-[12.5px] text-[var(--mb-ink-faint)]">
          <button v-if="code" class="underline underline-offset-4" @click="panel = 'leave'">この端末のつなぎを解除する</button>
          <button class="underline underline-offset-4" @click="panel = 'erase'">この端末のデータを削除する</button>
        </div>
      </div>
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
const router = useRouter()
// リンクから来て、つないでいる最中（この間は操作画面を出さない）
const linking = ref(false)
const { code, status, message, load, create, join, leave, eraseLocal } = useManabiSync()
const { load: loadTotal } = useManabiTotalCorrect()

const input = ref('')
const copied = ref('')
const linkUrl = computed(() => (import.meta.client ? `${location.origin}/sync?code=${code.value}` : ''))
const canJoin = computed(() => normalizeSyncCode(input.value).length === SYNC_CODE_LENGTH && status.value !== 'syncing')

// QRはブラウザ側で作る（コードを外に送らない）。つながった／コードが変わったときに作り直す
const qrSvg = ref('')
watch(
  [code, linkUrl],
  async ([c, url]) => {
    if (!c || !url) {
      qrSvg.value = ''
      return
    }
    try {
      const QRCode = (await import('qrcode')).default
      qrSvg.value = await QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#1b1b1b', light: '#ffffff' } })
    } catch {
      qrSvg.value = ''
    }
  },
  { immediate: true }
)

onMounted(async () => {
  load()
  // QR・共有リンクから来たときは、その場でつないでトップへ移る。失敗したら入力済みにして、ここに残る
  const linked = typeof route.query.code === 'string' ? normalizeSyncCode(route.query.code) : ''
  if (!linked || linked === code.value) {
    if (linked) await router.replace('/')
    return
  }
  linking.value = true
  if (await join(linked)) {
    await router.replace('/')
    return
  }
  linking.value = false
  input.value = formatSyncCode(linked)
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
// 日本語入力の変換確定の Enter で送信しない
const onEnter = (e: KeyboardEvent) => {
  if (e.isComposing || e.keyCode === 229) return
  e.preventDefault()
  connect()
}
const panel = ref<'' | 'leave' | 'erase'>('')
const done = ref('')
const finish = (text: string) => {
  panel.value = ''
  done.value = text
  loadTotal()
  setTimeout(() => (done.value = ''), 3000)
}
const doLeave = (erase: boolean) => {
  if (erase) eraseLocal()
  else leave()
  finish(erase ? 'つなぎを解除し、この端末のデータを消しました' : 'つなぎを解除しました')
}
const doErase = () => {
  eraseLocal()
  finish('この端末のデータを消しました')
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
