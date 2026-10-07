<template>
  <div>
    <h1 class="kk-h1 mt-2">録音から議事録をつくる</h1>

    <p v-if="errorMessage" class="kk-notice kk-notice--error mt-5">{{ errorMessage }}</p>

    <!-- ① 音声をえらぶ ───────────────────────────────── -->
    <template v-if="stage === 'idle'">
      <p class="kk-lead mt-4">
        スマホの「ボイスメモ」などで録った会議の音声をえらんでください。
        長い会議も、こちらで自動的に分けて文字にします。
      </p>

      <div class="kk-card px-5 py-6 mt-6">
        <label class="kk-field-label" for="audio-file">会議の録音</label>
        <input
          id="audio-file"
          ref="fileInput"
          type="file"
          accept="audio/*,.mp3,.wav,.m4a"
          class="block w-full text-[17px] file:mr-3 file:py-3 file:px-5 file:rounded-full file:border-0 file:text-[16px] file:font-bold file:bg-[var(--kk-accent-soft)] file:text-[var(--kk-accent-strong)] file:cursor-pointer"
          @change="onPick"
        >
        <p class="kk-note mt-3">mp3・wav・m4a の音声が使えます。</p>

        <button class="kk-btn mt-6" :disabled="!file" @click="run">
          この録音から議事録をつくる
        </button>
      </div>

      <!-- 文字起こし済みの文章から作る道。使う人は少ないので、押すまで入力欄を出さない -->
      <div class="mt-8">
        <button v-if="!showTextForm" class="kk-btn-text" @click="showTextForm = true">
          文字にした文章から作ることもできます
        </button>

        <div v-else class="kk-card px-5 py-5">
          <label class="kk-field-label" for="transcript-text">会議の内容を書いた文章</label>
          <textarea
            id="transcript-text"
            v-model="pastedText"
            rows="10"
            placeholder="会議の内容を書き写した文章を、ここに貼り付けてください"
            class="kk-input resize-y"
          />
          <button class="kk-btn mt-4" :disabled="!pastedText.trim()" @click="runFromText">
            この文章から議事録をつくる
          </button>
          <button class="kk-btn-text mt-2 mx-auto block" @click="showTextForm = false">やめる</button>
        </div>
      </div>

      <NuxtLink to="/" class="kk-btn-text mt-8 mx-auto block w-fit">もどる</NuxtLink>
    </template>

    <!-- ② まとめている ─────────────────────────────── -->
    <template v-else>
      <div class="kk-card px-5 py-8 mt-6 text-center">
        <span class="inline-block w-8 h-8 rounded-full border-[3px] border-[var(--kk-accent)] border-t-transparent animate-spin" />
        <p class="kk-h2 mt-4">{{ stageLabel }}</p>
        <p class="kk-lead mt-3">
          長い会議では数分かかります（1時間の録音で3分ほど）。<br>
          この画面を閉じずにお待ちください。
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { SERVICE } from '~/config/service'
import { apiMessage } from '~/utils/apiMessage'

useHead({ title: `議事録をつくる — ${SERVICE.name}` })

const router = useRouter()
const { isLoggedIn, checked, authedFetch, waitReady } = useAuth()
const { transcribe } = useTranscribe()

type Stage = 'idle' | 'transcribing' | 'structuring'
const stage = ref<Stage>('idle')
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const errorMessage = ref('')
const showTextForm = ref(false)
const pastedText = ref('')
const progress = ref<{ done: number; total: number } | null>(null)

const stageLabel = computed(() => {
  if (stage.value === 'structuring') return 'AIが議事録にまとめています…'
  const p = progress.value
  if (p && p.total > 1) return `声を文字にしています…（${p.done}/${p.total}）`
  return '声を文字にしています…'
})

function onPick(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null
  errorMessage.value = ''
}

/** 文字起こし → 議事録 の共通の後半。できたら確認画面へ進む */
async function createMinutes(transcript: string, audioName: string) {
  stage.value = 'structuring'
  const { id } = await authedFetch<{ id: string }>('/api/minutes', {
    method: 'POST',
    body: { transcript, audioName },
  })
  await router.push(`/records/${id}`)
}

function failed(e: unknown) {
  errorMessage.value = apiMessage(e)
  stage.value = 'idle'
  progress.value = null
  file.value = null
  if (fileInput.value) fileInput.value.value = ''
}

async function run() {
  if (!file.value) return
  errorMessage.value = ''
  stage.value = 'transcribing'
  try {
    const text = await transcribe(file.value, file.value.name, {
      onProgress: (done, total) => {
        progress.value = { done, total }
      },
    })
    progress.value = null
    await createMinutes(text, file.value.name)
  } catch (e) {
    failed(e)
  }
}

async function runFromText() {
  const text = pastedText.value.trim()
  if (!text) return
  errorMessage.value = ''
  try {
    await createMinutes(text, '')
  } catch (e) {
    failed(e)
  }
}

onMounted(async () => {
  await waitReady()
  // ログインしていない人がURLを直接開いたときは、最初の画面へ戻す
  if (checked.value && !isLoggedIn.value) await router.replace('/')
})
</script>
