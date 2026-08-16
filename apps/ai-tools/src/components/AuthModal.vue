<template>
  <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
    <div class="w-full max-w-[400px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] flex flex-col">
      <!-- Header -->
      <div class="px-6 pt-6 pb-4 text-center">
        <h2 class="m-0 text-xl font-bold text-slate-50">{{ isPasswordMode ? 'パスワードの変更' : 'ログイン' }}</h2>
        <p class="mt-1 mb-0 text-sm text-slate-400">
          {{ isPasswordMode ? '現在のパスワードを入力してください' : 'アカウントにログインしてください' }}
        </p>
      </div>

      <!-- Form -->
      <form class="px-6 pb-2 flex flex-col gap-3" @submit.prevent="submit">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-slate-400">ユーザー名</label>
          <input
            v-model="username"
            type="text"
            autocomplete="username"
            class="bg-white/[0.06] border border-white/[0.15] rounded-lg text-slate-50 text-sm px-3 py-2.5 outline-none focus:border-[var(--accent)] transition-colors font-[inherit] placeholder:text-slate-600"
            :style="accentStyle"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-slate-400">{{ isPasswordMode ? '現在のパスワード' : 'パスワード' }}</label>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="bg-white/[0.06] border border-white/[0.15] rounded-lg text-slate-50 text-sm px-3 py-2.5 outline-none focus:border-[var(--accent)] transition-colors font-[inherit] placeholder:text-slate-600"
            :style="accentStyle"
          />
        </div>
        <template v-if="isPasswordMode">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-slate-400">新しいパスワード</label>
            <input
              v-model="newPassword"
              type="password"
              autocomplete="new-password"
              placeholder="6文字以上"
              class="bg-white/[0.06] border border-white/[0.15] rounded-lg text-slate-50 text-sm px-3 py-2.5 outline-none focus:border-[var(--accent)] transition-colors font-[inherit] placeholder:text-slate-600"
              :style="accentStyle"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-slate-400">新しいパスワード（確認）</label>
            <input
              v-model="newPasswordConfirm"
              type="password"
              autocomplete="new-password"
              placeholder="もう一度入力"
              class="bg-white/[0.06] border border-white/[0.15] rounded-lg text-slate-50 text-sm px-3 py-2.5 outline-none focus:border-[var(--accent)] transition-colors font-[inherit] placeholder:text-slate-600"
              :style="accentStyle"
            />
          </div>
        </template>

        <div v-if="errorMsg" class="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-300 text-xs">
          {{ errorMsg }}
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="mt-1 w-full py-2.5 rounded-lg border-none text-slate-50 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          :class="buttonClass"
        >
          <span v-if="isLoading" class="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin align-middle mr-1.5" />
          {{ isLoading ? '処理中...' : (isPasswordMode ? '変更する' : 'ログイン') }}
        </button>
      </form>

      <!-- Footer -->
      <div class="px-6 py-5 text-center border-t border-white/[0.06] mt-2">
        <button
          class="text-sm font-medium bg-transparent border-none cursor-pointer transition-colors p-0"
          :class="toggleClass"
          @click="toggleMode"
        >
          {{ isPasswordMode ? 'ログインに戻る' : 'パスワードを変更する' }}
        </button>
        <p v-if="!isPasswordMode" class="mt-3 mb-0 text-xs text-slate-500">
          アカウントの発行は管理者が行います
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '~/composables/useAuth'

const props = defineProps<{
  accent?: 'orange' | 'sky'
}>()

const accent = computed(() => props.accent ?? 'orange')

const accentStyle = computed(() =>
  accent.value === 'sky'
    ? '--accent: rgb(56 189 248)'
    : '--accent: rgb(249 115 22)'
)

const buttonClass = computed(() =>
  accent.value === 'sky'
    ? 'bg-gradient-to-br from-sky-400 to-indigo-500'
    : 'bg-gradient-to-br from-orange-500 to-pink-500'
)

const toggleClass = computed(() =>
  accent.value === 'sky' ? 'text-sky-400 hover:text-sky-300' : 'text-orange-400 hover:text-orange-300'
)

const { login, changePassword } = useAuth()

const isPasswordMode = ref(false)
const username = ref('')
const password = ref('')
const newPassword = ref('')
const newPasswordConfirm = ref('')
const errorMsg = ref('')
const isLoading = ref(false)

const toggleMode = () => {
  isPasswordMode.value = !isPasswordMode.value
  errorMsg.value = ''
  password.value = ''
  newPassword.value = ''
  newPasswordConfirm.value = ''
}

const submit = async () => {
  errorMsg.value = ''
  if (!username.value || !password.value) {
    errorMsg.value = 'ユーザー名とパスワードを入力してください'
    return
  }
  if (isPasswordMode.value) {
    if (!newPassword.value) {
      errorMsg.value = '新しいパスワードを入力してください'
      return
    }
    if (newPassword.value !== newPasswordConfirm.value) {
      errorMsg.value = '新しいパスワードが一致しません'
      return
    }
  }

  isLoading.value = true
  try {
    if (isPasswordMode.value) {
      await changePassword(username.value, password.value, newPassword.value)
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
