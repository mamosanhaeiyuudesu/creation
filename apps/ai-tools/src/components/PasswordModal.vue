<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[300]"
      @click.self="close"
    >
      <div class="w-full max-w-[400px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] flex flex-col">
        <div class="px-6 pt-6 pb-4 text-center">
          <h2 class="m-0 text-xl font-bold text-slate-50">パスワードの変更</h2>
          <p class="mt-1 mb-0 text-sm text-slate-400">{{ user?.username ?? '' }}</p>
        </div>

        <!-- 完了 -->
        <div v-if="doneMsg" class="px-6 pb-6 flex flex-col gap-4">
          <p class="m-0 text-sm text-slate-300 text-center leading-relaxed">
            パスワードを変更しました。<br />
            <span class="text-xs text-slate-500">他の端末のログインは解除されました</span>
          </p>
          <button
            class="w-full py-2.5 rounded-lg border-none text-slate-50 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90"
            :class="buttonClass"
            @click="close"
          >閉じる</button>
        </div>

        <!-- 入力 -->
        <form v-else class="px-6 pb-6 flex flex-col gap-3" @submit.prevent="submit">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-slate-400">現在のパスワード</label>
            <input
              v-model="currentPassword"
              type="password"
              autocomplete="current-password"
              class="bg-white/[0.06] border border-white/[0.15] rounded-lg text-slate-50 text-sm px-3 py-2.5 outline-none focus:border-[var(--accent)] transition-colors font-[inherit] placeholder:text-slate-600"
              :style="accentStyle"
            />
          </div>
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

          <div v-if="errorMsg" class="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-300 text-xs">
            {{ errorMsg }}
          </div>

          <div class="flex gap-2 mt-1">
            <button
              type="button"
              class="flex-1 py-2.5 rounded-lg bg-white/[0.08] border border-white/10 text-slate-400 text-sm cursor-pointer transition-all hover:bg-white/[0.12]"
              @click="close"
            >キャンセル</button>
            <button
              type="submit"
              :disabled="isLoading"
              class="flex-1 py-2.5 rounded-lg border-none text-slate-50 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              :class="buttonClass"
            >
              <span v-if="isLoading" class="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin align-middle mr-1.5" />
              {{ isLoading ? '変更中...' : '変更する' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'

// ログイン中のパスワード変更。ログイン前の変更は AuthModal 側にある（ユーザー名も入力する形）。
const props = defineProps<{
  show: boolean
  accent?: 'orange' | 'sky'
}>()

const emit = defineEmits<{ 'update:show': [value: boolean] }>()

const accent = computed(() => props.accent ?? 'sky')

const accentStyle = computed(() =>
  accent.value === 'sky' ? '--accent: rgb(56 189 248)' : '--accent: rgb(249 115 22)'
)

const buttonClass = computed(() =>
  accent.value === 'sky'
    ? 'bg-gradient-to-br from-sky-400 to-indigo-500'
    : 'bg-gradient-to-br from-orange-500 to-pink-500'
)

const { user, changePassword } = useAuth()

const currentPassword = ref('')
const newPassword = ref('')
const newPasswordConfirm = ref('')
const errorMsg = ref('')
const doneMsg = ref(false)
const isLoading = ref(false)

watch(() => props.show, (v) => {
  if (v) {
    currentPassword.value = ''
    newPassword.value = ''
    newPasswordConfirm.value = ''
    errorMsg.value = ''
    doneMsg.value = false
  }
})

const close = () => emit('update:show', false)

const submit = async () => {
  errorMsg.value = ''
  if (!user.value) {
    errorMsg.value = 'ログインし直してください'
    return
  }
  if (!currentPassword.value || !newPassword.value) {
    errorMsg.value = 'パスワードを入力してください'
    return
  }
  if (newPassword.value !== newPasswordConfirm.value) {
    errorMsg.value = '新しいパスワードが一致しません'
    return
  }

  isLoading.value = true
  try {
    await changePassword(user.value.username, currentPassword.value, newPassword.value)
    doneMsg.value = true
  } catch (err: any) {
    errorMsg.value = err?.data?.message ?? err?.message ?? 'エラーが発生しました'
  } finally {
    isLoading.value = false
  }
}
</script>
