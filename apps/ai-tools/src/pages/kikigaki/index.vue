<template>
  <div class="max-w-[860px] mx-auto px-4 sm:px-6 pt-8 pb-24">
    <header class="flex items-start justify-between gap-3 mb-6">
      <div>
        <h1 class="kk-display text-[26px] leading-none">キキガキ</h1>
        <p class="text-[12.5px] text-[var(--kk-ink-soft)] mt-2 leading-relaxed">
          会議の録音から議事録をつくり、確認してからGoogleへ送ります。
        </p>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <button v-if="isLoggedIn" class="kk-btn-ghost" @click="showPasswordModal = true">パスワード変更</button>
        <button v-if="isLoggedIn" class="kk-btn-ghost" @click="doLogout">ログアウト</button>
      </div>
    </header>

    <p v-if="errorMessage" class="kk-card px-4 py-3 mb-5 text-[13px]" style="border-color: #f0c2c2; background: #fdf1f1; color: var(--kk-danger)">
      {{ errorMessage }}
    </p>

    <!-- Google連携（廃止。PDFダウンロードに置き換えたためコメントアウト）
    <section class="kk-card px-5 py-4 mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div class="flex-1 min-w-[200px]">
        <p class="text-[13.5px] font-bold">Googleとの連携</p>
        <p class="text-[11.5px] text-[var(--kk-ink-faint)] mt-1 leading-relaxed">
          <template v-if="googleConnected">
            連携済みです。承認した議事録だけが、あなたのドキュメント・スプレッドシート・ToDo・カレンダーに書き込まれます。
          </template>
          <template v-else>
            連携すると、議事録一覧のスプレッドシートがあなたのドライブに作られます。書き込みは承認したときだけ行われます。
          </template>
        </p>
      </div>
      <a v-if="googleConnected && spreadsheetUrl" :href="spreadsheetUrl" target="_blank" rel="noopener" class="kk-btn-ghost whitespace-nowrap">議事録一覧を開く</a>
      <a v-if="!googleConnected" href="/api/kikigaki/google/connect" class="kk-btn whitespace-nowrap">連携する</a>
      <button v-else class="kk-btn-ghost whitespace-nowrap" @click="disconnectGoogle">解除</button>
      <p class="basis-full m-0 text-[11px] text-[var(--kk-ink-faint)]">
        <NuxtLink to="/privacy" class="underline underline-offset-2 hover:text-[var(--kk-ink-soft)]">プライバシーポリシー</NuxtLink>
      </p>
    </section>
    -->

    <!-- アップロード -->
    <section class="kk-card px-5 py-5 mb-8">
      <div class="flex items-center gap-1.5 mb-3">
        <button
          type="button"
          class="kk-btn-ghost"
          :class="{ 'kk-mode-active': uploadMode === 'audio' }"
          @click="setUploadMode('audio')"
        >
          録音ファイル
        </button>
        <button
          type="button"
          class="kk-btn-ghost"
          :class="{ 'kk-mode-active': uploadMode === 'transcript' }"
          @click="setUploadMode('transcript')"
        >
          文字起こしテキスト
        </button>
      </div>

      <template v-if="stage === 'idle'">
        <template v-if="uploadMode === 'audio'">
          <input
            ref="fileInput"
            type="file"
            accept="audio/*,.mp3,.wav,.m4a"
            class="block w-full text-[13px] text-[var(--kk-ink-soft)] file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[12.5px] file:font-bold file:bg-[var(--kk-accent-soft)] file:text-[var(--kk-accent)] file:cursor-pointer"
            @change="onPick"
          >
          <p class="text-[11.5px] text-[var(--kk-ink-faint)] mt-2">
            mp3 / wav / m4a に対応。長い会議は自動で20分ごとに分割して処理します。
          </p>
        </template>

        <template v-else>
          <div class="flex items-center gap-1.5 mb-2.5">
            <button
              type="button"
              class="kk-btn-ghost !h-7 !px-2.5 !text-[11.5px]"
              :class="{ 'kk-mode-active': transcriptInput === 'file' }"
              @click="setTranscriptInput('file')"
            >
              ファイルをアップロード
            </button>
            <button
              type="button"
              class="kk-btn-ghost !h-7 !px-2.5 !text-[11.5px]"
              :class="{ 'kk-mode-active': transcriptInput === 'paste' }"
              @click="setTranscriptInput('paste')"
            >
              テキストを貼り付け
            </button>
          </div>

          <input
            v-if="transcriptInput === 'file'"
            ref="fileInput"
            type="file"
            accept=".txt,text/plain"
            class="block w-full text-[13px] text-[var(--kk-ink-soft)] file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[12.5px] file:font-bold file:bg-[var(--kk-accent-soft)] file:text-[var(--kk-accent)] file:cursor-pointer"
            @change="onPick"
          >
          <textarea
            v-else
            v-model="pastedTranscript"
            rows="10"
            placeholder="文字起こし済みのテキストをここに貼り付けてください"
            class="kk-input resize-y"
          />

          <p class="text-[11.5px] text-[var(--kk-ink-faint)] mt-2">
            文字起こし済みのテキスト（.txt ファイル、または貼り付け）から議事録を作成します。文字起こしをスキップします。
          </p>
        </template>

        <button class="kk-btn mt-4" :disabled="!canRun" @click="run">{{ uploadMode === 'audio' ? '文字起こしをはじめる' : '議事録を作成する' }}</button>
      </template>

      <template v-else>
        <div class="flex items-center gap-3 py-2">
          <span class="inline-block w-4 h-4 rounded-full border-2 border-[var(--kk-accent)] border-t-transparent animate-spin" />
          <div>
            <p class="text-[13.5px] font-bold">{{ stageLabel }}</p>
            <p v-if="sourceLabel" class="text-[11.5px] text-[var(--kk-ink-faint)] mt-0.5">{{ sourceLabel }}</p>
          </div>
        </div>
        <p class="text-[11.5px] text-[var(--kk-ink-faint)] mt-2 leading-relaxed">
          長い録音だと数分かかります（1時間の会議で3分割ほど）。このページを閉じずにお待ちください。
        </p>
      </template>
    </section>

    <!-- 記録一覧（全員で共有） -->
    <section>
      <div class="flex items-baseline gap-2 mb-2">
        <p class="kk-label">みんなの記録</p>
        <p class="text-[11px] text-[var(--kk-ink-faint)]">誰がアップロードしたものも、全員で見て直せます</p>
      </div>

      <div v-if="loadingList" class="space-y-2">
        <div v-for="i in 3" :key="i" class="h-16 rounded-[14px] bg-white/70 animate-pulse" />
      </div>

      <p v-else-if="!records.length" class="kk-card px-5 py-8 text-center text-[13px] text-[var(--kk-ink-faint)]">
        まだ記録がありません。録音ファイルをアップロードしてください。
      </p>

      <ul v-else class="space-y-2">
        <!--
          削除ボタンはリンクの中に入れない（button を a で包むのは不正なHTMLで、
          クリックの取り合いにもなる）。カード全体を li の枠にして、リンクとボタンを横に並べる。
        -->
        <li
          v-for="r in records"
          :key="r.id"
          class="kk-card flex items-center pr-1.5 hover:border-[var(--kk-line-strong)] transition-colors"
        >
          <NuxtLink :to="`/kikigaki/${r.id}`" class="flex-1 min-w-0 flex items-center gap-3 px-4 py-3">
            <div class="flex-1 min-w-0">
              <p class="text-[13.5px] font-bold truncate">{{ r.title || '（タイトル未設定）' }}</p>
              <p class="text-[11.5px] text-[var(--kk-ink-faint)] mt-0.5 truncate">
                {{ r.date || '日付未設定' }}
                <span v-if="r.owner"> ・ {{ r.owner }}<span v-if="r.isOwner">（自分）</span></span>
                <span v-if="r.audioName"> ・ {{ r.audioName }}</span>
              </p>
            </div>
          </NuxtLink>
          <!-- 記録は全員で共有するが、消せるのはアップロードした本人だけ -->
          <button
            v-if="r.isOwner"
            class="shrink-0 w-8 h-8 rounded-full text-[13px] text-[var(--kk-ink-faint)] hover:text-[var(--kk-danger)] hover:bg-black/[0.04] transition-colors disabled:opacity-40"
            :disabled="deletingId === r.id"
            :title="`「${r.title || '（タイトル未設定）'}」を削除`"
            @click="removeRecord(r)"
          >
            ✕
          </button>
        </li>
      </ul>
    </section>

    <AuthModal v-if="showAuthModal" accent="orange" />
    <PasswordModal v-model:show="showPasswordModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import PasswordModal from '~/components/PasswordModal.vue'
import { splitAndTranscribeBlob } from '~/composables/useAudioRecorder'
import type { KikigakiRecordSummary } from '~/types/kikigaki'

definePageMeta({ layout: 'kikigaki' })
useHead({ title: 'キキガキ — 会議の録音から議事録を' })

const route = useRoute()
const router = useRouter()
const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)
const showPasswordModal = ref(false)

// Google連携（廃止。PDFダウンロードに置き換えたためコメントアウト）
// const googleConnected = ref(false)
// const spreadsheetUrl = ref('')
const errorMessage = ref('')

const records = ref<KikigakiRecordSummary[]>([])
const loadingList = ref(true)
const deletingId = ref('')

type UploadMode = 'audio' | 'transcript'
const uploadMode = ref<UploadMode>('audio')
/** 文字起こしモードのときだけ使う。ファイルで渡すか、直接貼り付けるか */
type TranscriptInput = 'file' | 'paste'
const transcriptInput = ref<TranscriptInput>('file')
const pastedTranscript = ref('')
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
type Stage = 'idle' | 'transcribing' | 'structuring'
const stage = ref<Stage>('idle')

function setUploadMode(mode: UploadMode) {
  uploadMode.value = mode
  transcriptInput.value = 'file'
  file.value = null
  pastedTranscript.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

function setTranscriptInput(mode: TranscriptInput) {
  transcriptInput.value = mode
  if (mode === 'paste') {
    file.value = null
    if (fileInput.value) fileInput.value.value = ''
  } else {
    pastedTranscript.value = ''
  }
}

/** 実行ボタンを押せる状態か（モード・入力方法ごとに必要なものが揃っているか） */
const canRun = computed(() => {
  if (uploadMode.value === 'transcript' && transcriptInput.value === 'paste') {
    return pastedTranscript.value.trim().length > 0
  }
  return !!file.value
})

/** 処理中に出す「何を処理しているか」のラベル。貼り付けはファイル名が無いので専用の文言にする */
const sourceLabel = computed(() => {
  if (file.value) return `${file.value.name} ・ ${(file.value.size / 1024 / 1024).toFixed(1)}MB`
  if (uploadMode.value === 'transcript' && transcriptInput.value === 'paste') return '貼り付けたテキスト'
  return ''
})

/** 分割したときの進み具合。長い会議は数分かかるので、止まっていないことが分かるように出す */
const chunkProgress = ref<{ done: number; total: number } | null>(null)
const stageLabel = computed(() => {
  if (stage.value === 'structuring') return 'AIが議事録にまとめています…'
  const p = chunkProgress.value
  if (p && p.total > 1) return `文字起こししています… (${p.done}/${p.total})`
  return '文字起こししています…'
})

function onPick(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null
  errorMessage.value = ''
}

function apiMessage(e: any, fallback: string): string {
  return e?.data?.message || e?.data?.statusMessage || e?.message || fallback
}

// async function loadGoogleStatus() {
//   try {
//     const status = await $fetch<{ connected: boolean; spreadsheetUrl?: string }>('/api/kikigaki/google/status')
//     googleConnected.value = status.connected
//     spreadsheetUrl.value = status.spreadsheetUrl ?? ''
//   } catch {
//     /* 未ログイン時は未連携のまま */
//   }
// }

async function loadRecords() {
  loadingList.value = true
  try {
    const res = await $fetch<{ records: KikigakiRecordSummary[] }>('/api/kikigaki/records')
    records.value = res.records
  } catch {
    records.value = []
  }
  loadingList.value = false
}

async function removeRecord(r: KikigakiRecordSummary) {
  const name = r.title || '（タイトル未設定）'
  if (!confirm(`「${name}」を削除しますか？（元に戻せません）`)) return

  deletingId.value = r.id
  errorMessage.value = ''
  try {
    await $fetch(`/api/kikigaki/records/${r.id}`, { method: 'DELETE' })
    records.value = records.value.filter((x) => x.id !== r.id)
  } catch (e: any) {
    errorMessage.value = apiMessage(e, '削除に失敗しました')
  }
  deletingId.value = ''
}

// async function disconnectGoogle() {
//   if (!confirm('Google連携を解除しますか？（作成済みのドキュメントやシートは削除されません）')) return
//   await $fetch('/api/kikigaki/google/disconnect', { method: 'POST' })
//   googleConnected.value = false
//   spreadsheetUrl.value = ''
// }

// 音声は 文字起こし → 構造化 の2段階、テキスト（ファイル/貼り付け）は構造化のみ。ここでは下書きを作るだけ。
async function run() {
  if (!canRun.value) return
  errorMessage.value = ''

  try {
    let text: string
    let audioName = ''
    if (uploadMode.value === 'transcript') {
      stage.value = 'structuring'
      if (transcriptInput.value === 'paste') {
        text = pastedTranscript.value.trim()
      } else {
        if (!file.value) return
        text = await file.value.text()
        audioName = file.value.name
      }
    } else {
      if (!file.value) return
      stage.value = 'transcribing'
      // 長い会議は20分ごとに分割して8kHzモノラルへ落としてから並列に投げる（whisper/hagemashi と共通）。
      // 用語辞書は /api/kikigaki/transcribe がチャンクごとに付けるので、ここから prompt は渡さない。
      text = await splitAndTranscribeBlob(file.value, file.value.name, {
        endpoint: '/api/kikigaki/transcribe',
        onProgress: (done, total) => {
          chunkProgress.value = { done, total }
        },
      })
      chunkProgress.value = null
      stage.value = 'structuring'
      audioName = file.value.name
    }

    const { id } = await $fetch<{ id: string }>('/api/kikigaki/structure', {
      method: 'POST',
      body: { transcript: text, audioName },
    })

    await router.push(`/kikigaki/${id}`)
  } catch (e: any) {
    errorMessage.value = apiMessage(e, '処理に失敗しました。時間をおいてもう一度お試しください。')
    stage.value = 'idle'
    chunkProgress.value = null
    file.value = null
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function doLogout() {
  await logout()
  records.value = []
}

// ログイン直後に読み込み直す（別端末で見えない＝ローカル保存、と誤解させないため）
watch(isLoggedIn, async (v) => {
  if (v) await loadRecords()
})

onMounted(async () => {
  if (route.query.kikigaki_error) errorMessage.value = String(route.query.kikigaki_error)
  await checkAuth()
  if (isLoggedIn.value) await loadRecords()
  else loadingList.value = false
})
</script>
