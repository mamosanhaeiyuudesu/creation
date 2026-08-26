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

    <!-- Google連携 -->
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
    </section>

    <!-- アップロード -->
    <section class="kk-card px-5 py-5 mb-8">
      <p class="kk-label mb-2">録音ファイル</p>

      <template v-if="stage === 'idle'">
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
        <button class="kk-btn mt-4" :disabled="!file" @click="run">文字起こしをはじめる</button>
      </template>

      <template v-else>
        <div class="flex items-center gap-3 py-2">
          <span class="inline-block w-4 h-4 rounded-full border-2 border-[var(--kk-accent)] border-t-transparent animate-spin" />
          <div>
            <p class="text-[13.5px] font-bold">{{ stageLabel }}</p>
            <p class="text-[11.5px] text-[var(--kk-ink-faint)] mt-0.5">
              {{ file?.name }}<span v-if="file"> ・ {{ (file.size / 1024 / 1024).toFixed(1) }}MB</span>
            </p>
          </div>
        </div>
        <p class="text-[11.5px] text-[var(--kk-ink-faint)] mt-2 leading-relaxed">
          長い録音だと数分かかります（1時間の会議で3分割ほど）。このページを閉じずにお待ちください。
        </p>
      </template>
    </section>

    <!-- 記録一覧 -->
    <section>
      <p class="kk-label mb-2">これまでの記録</p>

      <div v-if="loadingList" class="space-y-2">
        <div v-for="i in 3" :key="i" class="h-16 rounded-[14px] bg-white/70 animate-pulse" />
      </div>

      <p v-else-if="!records.length" class="kk-card px-5 py-8 text-center text-[13px] text-[var(--kk-ink-faint)]">
        まだ記録がありません。録音ファイルをアップロードしてください。
      </p>

      <ul v-else class="space-y-2">
        <li v-for="r in records" :key="r.id">
          <NuxtLink :to="`/kikigaki/${r.id}`" class="kk-card px-4 py-3 flex items-center gap-3 hover:border-[var(--kk-line-strong)] transition-colors">
            <div class="flex-1 min-w-0">
              <p class="text-[13.5px] font-bold truncate">{{ r.title || '（タイトル未設定）' }}</p>
              <p class="text-[11.5px] text-[var(--kk-ink-faint)] mt-0.5 truncate">
                {{ r.date || '日付未設定' }}<span v-if="r.audioName"> ・ {{ r.audioName }}</span>
              </p>
            </div>
            <span class="kk-tag shrink-0" :class="r.status === 'approved' ? 'kk-tag--approved' : 'kk-tag--draft'">
              {{ r.status === 'approved' ? '送信済み' : '確認待ち' }}
            </span>
          </NuxtLink>
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

const googleConnected = ref(false)
const spreadsheetUrl = ref('')
const errorMessage = ref('')

const records = ref<KikigakiRecordSummary[]>([])
const loadingList = ref(true)

const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
type Stage = 'idle' | 'transcribing' | 'structuring'
const stage = ref<Stage>('idle')
const stageLabel = computed(() =>
  stage.value === 'transcribing' ? '文字起こししています…' : 'AIが議事録にまとめています…'
)

function onPick(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null
  errorMessage.value = ''
}

function apiMessage(e: any, fallback: string): string {
  return e?.data?.message || e?.data?.statusMessage || e?.message || fallback
}

async function loadGoogleStatus() {
  try {
    const status = await $fetch<{ connected: boolean; spreadsheetUrl?: string }>('/api/kikigaki/google/status')
    googleConnected.value = status.connected
    spreadsheetUrl.value = status.spreadsheetUrl ?? ''
  } catch {
    /* 未ログイン時は未連携のまま */
  }
}

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

async function disconnectGoogle() {
  if (!confirm('Google連携を解除しますか？（作成済みのドキュメントやシートは削除されません）')) return
  await $fetch('/api/kikigaki/google/disconnect', { method: 'POST' })
  googleConnected.value = false
  spreadsheetUrl.value = ''
}

// 文字起こし → 構造化 の2段階。ここでは下書きを作るだけで、Googleへは何も送らない。
async function run() {
  if (!file.value) return
  errorMessage.value = ''

  try {
    stage.value = 'transcribing'
    // 長い会議は20分ごとに分割して8kHzモノラルへ落としてから並列に投げる（whisper/hagemashi と共通）。
    // 用語辞書は /api/kikigaki/transcribe がチャンクごとに付けるので、ここから prompt は渡さない。
    const text = await splitAndTranscribeBlob(file.value, file.value.name, {
      endpoint: '/api/kikigaki/transcribe',
    })

    stage.value = 'structuring'
    const { id } = await $fetch<{ id: string }>('/api/kikigaki/structure', {
      method: 'POST',
      body: { transcript: text, audioName: file.value.name },
    })

    await router.push(`/kikigaki/${id}`)
  } catch (e: any) {
    errorMessage.value = apiMessage(e, '処理に失敗しました。時間をおいてもう一度お試しください。')
    stage.value = 'idle'
    file.value = null
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function doLogout() {
  await logout()
  records.value = []
  googleConnected.value = false
}

// ログイン直後に読み込み直す（別端末で見えない＝ローカル保存、と誤解させないため）
watch(isLoggedIn, async (v) => {
  if (v) await Promise.all([loadGoogleStatus(), loadRecords()])
})

onMounted(async () => {
  if (route.query.kikigaki_error) errorMessage.value = String(route.query.kikigaki_error)
  await checkAuth()
  if (isLoggedIn.value) await Promise.all([loadGoogleStatus(), loadRecords()])
  else loadingList.value = false
})
</script>
