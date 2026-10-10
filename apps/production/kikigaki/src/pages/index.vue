<template>
  <div>
    <!-- ログインしているか分かるまでは何も出さない（一瞬ログイン画面が見えるのを防ぐ） -->
    <p v-if="!checked" class="kk-lead py-10 text-center">読み込んでいます…</p>

    <!-- ── ログインしていないとき ───────────────────────────── -->
    <template v-else-if="!isLoggedIn">
      <h1 class="kk-h1 mt-2">会議の録音から<br>議事録をつくります</h1>
      <p class="kk-lead mt-4">
        スマホで録った音声をえらぶだけ。AIが文字にして、話し合いの内容を1枚にまとめます。
        できた議事録はその場で直せて、PDFにして配れます。
      </p>

      <p v-if="errorMessage" class="kk-notice kk-notice--error mt-6">{{ errorMessage }}</p>

      <div class="mt-8">
        <button class="kk-btn" :disabled="busy" @click="loginWithGoogle">
          Googleではじめる
        </button>

        <!-- メールのリンクでログイン。押すまでは入力欄を出さない（画面の要素を減らす） -->
        <div class="mt-4">
          <button v-if="!showEmailForm" class="kk-btn-sub" :disabled="busy" @click="showEmailForm = true">
            メールアドレスではじめる
          </button>

          <div v-else class="kk-card px-5 py-5">
            <template v-if="!linkSentTo">
              <label class="kk-field-label" for="login-email">メールアドレス</label>
              <input
                id="login-email"
                v-model="email"
                type="email"
                inputmode="email"
                autocomplete="email"
                placeholder="れい: tanaka@example.com"
                class="kk-input"
                @keyup.enter="sendLink"
              >
              <p class="kk-note mt-2">
                パスワードはありません。入力したアドレスにログイン用のリンクを送ります。
              </p>
              <button class="kk-btn mt-4" :disabled="busy || !email.trim()" @click="sendLink">
                ログイン用のリンクを送る
              </button>
              <button class="kk-btn-text mt-2 mx-auto block" :disabled="busy" @click="showEmailForm = false">
                やめる
              </button>
            </template>

            <template v-else>
              <p class="kk-h2">メールを送りました</p>
              <p class="kk-lead mt-3">
                <strong>{{ linkSentTo }}</strong> にログイン用のリンクを送りました。
                メールを開いて、中のボタン（リンク）を押してください。
              </p>
              <p class="kk-note mt-3">
                数分たっても届かないときは、迷惑メールのフォルダをご確認ください。
                それでも無いときは、アドレスを打ち直してもう一度お試しください。
              </p>
              <button class="kk-btn-sub mt-4" @click="resetEmailForm">別のアドレスで送り直す</button>
            </template>
          </div>
        </div>
      </div>

      <p class="kk-note mt-8">
        はじめる前に<NuxtLink to="/terms" class="underline">利用規約</NuxtLink>と<NuxtLink to="/privacy" class="underline">プライバシーポリシー</NuxtLink>をご確認ください。
      </p>
    </template>

    <!-- ── ログインしているとき ─────────────────────────────── -->
    <template v-else>
      <p v-if="errorMessage" class="kk-notice kk-notice--error mb-5">{{ errorMessage }}</p>

      <!-- ドライブにつながっていないと、PDFをドライブに残せない。気づかれないと困るので目立たせる -->
      <section v-if="!driveConnected" class="kk-drive-banner mb-5" role="alert">
        <p class="kk-drive-banner-title">Googleドライブとつながっていません</p>
        <p class="mt-1">つなぐと、つくったPDFが自動でドライブの「キキガキ議事録」フォルダに保存されます。</p>
        <button class="kk-btn mt-3" :disabled="driveBusy" @click="connectDrive">
          {{ driveBusy ? '画面をひらいています…' : 'Googleドライブとつなぐ' }}
        </button>
      </section>

      <!--
        どちらも同じくらい使われる想定の入口なので、音声/テキストで優劣を付けず同じ大きさで並べる
        （このアプリの「1画面の主役は色で1つだけ」という原則は、この2つを対等な入口として見せる
        意図でここだけ例外にしている）。押しても画面は変わらず、下のシートで入力する。
      -->
      <div class="grid grid-cols-2 gap-3 mt-2">
        <button class="kk-btn kk-btn--pair" @click="showRecordSheet = true">音声から作る</button>
        <button class="kk-btn kk-btn--pair" @click="showTextSheet = true">文章から作る</button>
      </div>

      <MinutesRecordSheet v-model="showRecordSheet" />
      <MinutesTextSheet v-model="showTextSheet" />

      <h2 class="kk-h2 mt-10">これまでの議事録</h2>

      <p v-if="loadingRecords" class="kk-lead mt-4">読み込んでいます…</p>

      <p v-else-if="!records.length" class="kk-card px-5 py-8 mt-4 kk-lead text-center">
        まだ議事録はありません。<br>
        上のボタンから、録音した音声か文章をえらんでください。
      </p>

      <ul v-else class="list-none p-0 mt-4 flex flex-col gap-3">
        <li v-for="r in records" :key="r.id" class="kk-card">
          <NuxtLink
            :to="`/records/${r.id}`"
            class="flex items-center gap-3 px-5 py-4 no-underline text-[var(--kk-ink)]"
          >
            <span class="flex-1 min-w-0">
              <span class="block font-bold truncate">{{ r.title || '（名前のない議事録）' }}</span>
              <span class="block kk-note">{{ r.dateLabel }}</span>
            </span>
            <span aria-hidden="true" class="text-[var(--kk-ink-faint)]">›</span>
          </NuxtLink>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import { SERVICE } from '~/config/service'
import { apiMessage } from '~/utils/apiMessage'
import { formatMeetingDate } from '~/utils/formatDate'
import type { RecordSummary } from '~/types/minutes'

useHead({ title: `${SERVICE.name} — 会議の録音から議事録を` })

const { isLoggedIn, checked, signInWithGoogle, sendLoginLink, catchRedirectError, authedFetch } = useAuth()

const errorMessage = ref('')
const busy = ref(false)
const showEmailForm = ref(false)
const email = ref('')
const linkSentTo = ref('')

const { connected: driveConnected, refresh: refreshDrive, connect: connectDriveNow } = useDrive()
const driveBusy = ref(false)

async function connectDrive() {
  errorMessage.value = ''
  driveBusy.value = true
  try {
    await connectDriveNow()
  } catch (e) {
    errorMessage.value = apiMessage(e)
  }
  driveBusy.value = false
}

const records = ref<(RecordSummary & { dateLabel: string })[]>([])
const loadingRecords = ref(false)

const showRecordSheet = ref(false)
const showTextSheet = ref(false)

async function loginWithGoogle() {
  errorMessage.value = ''
  busy.value = true
  try {
    await signInWithGoogle()
  } catch (e) {
    errorMessage.value = apiMessage(e)
  }
  busy.value = false
}

async function sendLink() {
  errorMessage.value = ''
  busy.value = true
  try {
    const address = email.value.trim()
    await sendLoginLink(address)
    linkSentTo.value = address
  } catch (e) {
    errorMessage.value = apiMessage(e)
  }
  busy.value = false
}

function resetEmailForm() {
  linkSentTo.value = ''
  email.value = ''
  errorMessage.value = ''
}

async function loadRecords() {
  loadingRecords.value = true
  try {
    const res = await authedFetch<{ records: RecordSummary[] }>('/api/records')
    records.value = res.records.map((r) => ({ ...r, dateLabel: formatMeetingDate(r.date, r.createdAt) }))
  } catch (e) {
    errorMessage.value = apiMessage(e, '議事録の一覧を読み込めませんでした。画面を開き直してみてください。')
    records.value = []
  }
  loadingRecords.value = false
}

// ログインが済んだ時点で読み込む（この watch が無いと、ログイン直後に一覧が空のまま見える）
watch(isLoggedIn, async (v) => {
  if (v) await loadRecords()
  else records.value = []
})

onMounted(async () => {
  refreshDrive()
  const redirectError = await catchRedirectError()
  if (redirectError) errorMessage.value = redirectError
  if (isLoggedIn.value) await loadRecords()
})
</script>

<style scoped>
.kk-drive-banner {
  padding: 1rem 1.1rem;
  border-radius: 14px;
  border: 2px solid #d9822b;
  background: #fff4e5;
  color: #5c3a0c;
  font-size: 16px;
  line-height: 1.7;
}
.kk-drive-banner-title {
  font-size: 18px;
  font-weight: 700;
}
</style>
