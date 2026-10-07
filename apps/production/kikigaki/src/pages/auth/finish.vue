<template>
  <div>
    <h1 class="kk-h1 mt-2">ログインしています</h1>

    <p v-if="status === 'working'" class="kk-lead mt-5">少しお待ちください…</p>

    <template v-else-if="status === 'need-email'">
      <p class="kk-lead mt-5">
        確認のため、メールを受け取ったアドレスを入力してください。
        （リンクを送った端末と、いま開いている端末が違うときに必要です）
      </p>
      <p v-if="errorMessage" class="kk-notice kk-notice--error mt-4">{{ errorMessage }}</p>
      <div class="kk-card px-5 py-5 mt-5">
        <label class="kk-field-label" for="finish-email">メールアドレス</label>
        <input
          id="finish-email"
          v-model="email"
          type="email"
          inputmode="email"
          autocomplete="email"
          class="kk-input"
          @keyup.enter="finish(email)"
        >
        <button class="kk-btn mt-4" :disabled="busy || !email.trim()" @click="finish(email)">ログインする</button>
      </div>
    </template>

    <template v-else-if="status === 'error'">
      <p class="kk-notice kk-notice--error mt-5">{{ errorMessage }}</p>
      <NuxtLink to="/" class="kk-btn mt-6">最初の画面にもどる</NuxtLink>
    </template>
  </div>
</template>

<script setup lang="ts">
import { SERVICE } from '~/config/service'
import { apiMessage } from '~/utils/apiMessage'
import { EMAIL_LINK_STORAGE_KEY } from '~/types/auth'

// メールのリンクから戻ってくる場所。ここでログインを完了させてから元の画面へ送る。
useHead({ title: `ログイン — ${SERVICE.name}` })

const router = useRouter()
const { isLoginLink, completeEmailLink, waitReady, isLoggedIn } = useAuth()

type Status = 'working' | 'need-email' | 'error'
const status = ref<Status>('working')
const email = ref('')
const busy = ref(false)
const errorMessage = ref('')

/** リンクを送ったときに覚えたアドレス。別の端末で開いたときは空になる */
function storedEmail(): string {
  try {
    return window.localStorage.getItem(EMAIL_LINK_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

async function finish(address: string) {
  busy.value = true
  errorMessage.value = ''
  try {
    await completeEmailLink(window.location.href, address)
    await router.replace('/')
  } catch (e) {
    status.value = 'error'
    errorMessage.value = apiMessage(e)
  }
  busy.value = false
}

onMounted(async () => {
  await waitReady()

  // すでにログイン済みでこのURLを開いた場合は、何もせず最初の画面へ戻す
  if (isLoggedIn.value) {
    await router.replace('/')
    return
  }

  if (!(await isLoginLink(window.location.href))) {
    status.value = 'error'
    errorMessage.value = 'このリンクからはログインできません。最初の画面から、もう一度メールを送ってください。'
    return
  }

  const remembered = storedEmail()
  if (!remembered) {
    // 別の端末でリンクを開いた場合。アドレスの入力を求める（なりすまし防止のための確認）
    status.value = 'need-email'
    return
  }
  await finish(remembered)
})
</script>
