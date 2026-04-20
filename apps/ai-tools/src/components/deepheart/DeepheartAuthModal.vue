<template>
  <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
    <div class="w-full max-w-[400px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] flex flex-col">
      <div class="px-6 pt-6 pb-4 text-center">
        <h2 class="m-0 text-xl font-bold text-slate-50">{{ isRegister ? '新規登録' : 'ログイン' }}</h2>
        <p class="mt-1 mb-0 text-sm text-slate-400">
          {{ isRegister ? '新しく作成してください' : 'ログインしてください' }}
        </p>
      </div>

      <form class="px-6 pb-2 flex flex-col gap-3" @submit.prevent="submit">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-slate-400">ユーザー名</label>
          <input
            v-model="username"
            type="text"
            autocomplete="username"
            placeholder="半角英数字・アンダースコア（3〜30文字）"
            class="bg-white/[0.06] border border-white/[0.15] rounded-lg text-slate-50 text-sm px-3 py-2.5 outline-none focus:border-rose-400 transition-colors font-[inherit] placeholder:text-slate-600"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-slate-400">パスワード</label>
          <input
            v-model="password"
            type="password"
            :autocomplete="isRegister ? 'new-password' : 'current-password'"
            placeholder="6文字以上"
            class="bg-white/[0.06] border border-white/[0.15] rounded-lg text-slate-50 text-sm px-3 py-2.5 outline-none focus:border-rose-400 transition-colors font-[inherit] placeholder:text-slate-600"
          />
        </div>
        <div v-if="isRegister" class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-slate-400">パスワード（確認）</label>
          <input
            v-model="passwordConfirm"
            type="password"
            autocomplete="new-password"
            placeholder="パスワードをもう一度入力"
            class="bg-white/[0.06] border border-white/[0.15] rounded-lg text-slate-50 text-sm px-3 py-2.5 outline-none focus:border-rose-400 transition-colors font-[inherit] placeholder:text-slate-600"
          />
        </div>

        <div v-if="errorMsg" class="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-300 text-xs">
          {{ errorMsg }}
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="mt-1 w-full py-2.5 rounded-lg border-none text-slate-50 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-rose-500 to-indigo-500"
        >
          <span v-if="isLoading" class="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin align-middle mr-1.5" />
          {{ isLoading ? '処理中...' : (isRegister ? '登録' : 'ログイン') }}
        </button>
      </form>

      <div class="px-6 py-5 text-center border-t border-white/[0.06] mt-2">
        <span class="text-sm text-slate-500">
          {{ isRegister ? 'すでにアカウントをお持ちですか？' : 'アカウントをお持ちでないですか？' }}
        </span>
        <button
          class="ml-1.5 text-sm font-medium bg-transparent border-none cursor-pointer text-rose-400 hover:text-rose-300 transition-colors p-0"
          @click="toggleMode"
        >
          {{ isRegister ? 'ログイン' : '新規登録' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDeepheartAuth } from '~/composables/useDeepheartAuth'

const { login, register } = useDeepheartAuth()

const isRegister = ref(false)
const username = ref('')
const password = ref('')
const passwordConfirm = ref('')
const errorMsg = ref('')
const isLoading = ref(false)

const toggleMode = () => {
  isRegister.value = !isRegister.value
  errorMsg.value = ''
  password.value = ''
  passwordConfirm.value = ''
}

const submit = async () => {
  errorMsg.value = ''
  if (!username.value || !password.value) {
    errorMsg.value = 'ユーザー名とパスワードを入力してください'
    return
  }
  if (isRegister.value && password.value !== passwordConfirm.value) {
    errorMsg.value = 'パスワードが一致しません'
    return
  }

  isLoading.value = true
  try {
    if (isRegister.value) {
      await register(username.value, password.value)
    } else {
      await login(username.value, password.value)
    }
  } catch (err: any) {
    errorMsg.value = err?.data?.message ?? err?.message ?? 'エラーが発生しました'
  } finally {
    isLoading.value = false
  }
}
</script>
