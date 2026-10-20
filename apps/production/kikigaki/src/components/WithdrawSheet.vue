<template>
  <!-- 退会の確認。「お休み」（データを残す）と「すべて消す」の2択。お休みが既定（戻れるほうを先に置く） -->
  <BottomSheet :model-value="modelValue" :title="title" :closable="!busy" @update:model-value="emit('update:modelValue', $event)">
    <template v-if="!eraseOnly">
      <p class="kk-lead m-0">どちらにしますか？</p>

      <div class="kk-wd-choices mt-3" role="radiogroup" aria-label="退会のしかた">
        <label class="kk-wd-choice" :class="{ 'is-on': choice === 'rest' }">
          <input v-model="choice" type="radio" value="rest" :disabled="busy">
          <span>
            <strong>しばらくお休みする</strong>
            <span class="kk-note block">
              議事録はそのまま{{ RETENTION_YEARS }}年間お預かりします。あとでログインして「再開」すれば、続きから使えます。
            </span>
          </span>
        </label>
        <label class="kk-wd-choice" :class="{ 'is-on': choice === 'erase' }">
          <input v-model="choice" type="radio" value="erase" :disabled="busy">
          <span>
            <strong>すべて消してやめる</strong>
            <span class="kk-note block">議事録も設定もその場ですべて消えます。元には戻せません。</span>
          </span>
        </label>
      </div>
    </template>

    <!-- お休み -->
    <template v-if="choice === 'rest'">
      <ul class="kk-lead mt-3 mb-0 pl-5 list-disc">
        <li>議事録・設定は消さずに、{{ RETENTION_YEARS }}年間お預かりします（退会の日から数えます）。</li>
        <li>お休み中は、議事録を見ることも作ることもできません。</li>
        <li>期間のうちに同じ方法でログインして「再開」すれば、そのまま使えます。期間が過ぎると、お預かりしたものは消えます。</li>
      </ul>
      <p v-if="hasLiveContract" class="kk-notice kk-notice--warn mt-3">
        お支払いの契約は、お休みに入ると同時に解約されます。お支払い済みの期間の返金はありません。再開したあとに、あらためてお申し込みください。
      </p>
      <p class="kk-note mt-2 mb-0">
        ダウンロードしたPDFや、Googleドライブに保存したPDFはそのまま残ります。
        期間が過ぎる前のお知らせメールはお送りできないため、続けて使う予定があるときは、早めにログインしてください。
      </p>
      <div class="mt-3 flex flex-col gap-2">
        <button class="kk-btn" :disabled="busy" @click="doRest">
          {{ busy ? 'お休みに入っています…' : 'お休みに入る' }}
        </button>
        <button class="kk-btn-text" :disabled="busy" @click="close">やめる</button>
      </div>
    </template>

    <!-- すべて消す。元に戻せないので、何が消えるかを並べ、メールアドレスを打たないと押せないようにする -->
    <template v-else>
      <p class="kk-lead m-0" :class="{ 'mt-3': !eraseOnly }">
        <strong>{{ user?.email }}</strong> のデータをすべて消します。次のものが消え、<strong>元には戻せません</strong>。
      </p>
      <ul class="kk-lead mt-2 mb-0 pl-5 list-disc">
        <li v-if="!eraseOnly">これまでの議事録と、元の文章（{{ recordCountLabel }}）</li>
        <li v-else>預かっている議事録と、元の文章</li>
        <li>PDFの文字数などの設定</li>
      </ul>
      <p v-if="hasLiveContract" class="kk-notice kk-notice--warn mt-3">
        お支払いの契約は、削除と同時に解約されます。お支払い済みの期間の返金はありません。
      </p>
      <p class="kk-note mt-2 mb-0">
        Googleドライブに保存したPDFや、ダウンロードしたPDFは消えません（ご自身の端末・ドライブにあるため）。
        お支払いの記録は、法令にもとづき決済会社（Stripe）に一定期間残ります。
      </p>
      <label v-if="user?.email" class="mt-3 block">
        <span class="kk-note">確認のため、アカウントのメールアドレス（<strong>{{ user.email }}</strong>）を入力してください</span>
        <input
          v-model="eraseEmail"
          type="email"
          class="kk-input mt-1 w-full"
          autocomplete="off"
          :placeholder="user.email"
          :disabled="busy"
        >
      </label>
      <div class="mt-3 flex flex-col gap-2">
        <button class="kk-wd-erase-btn" :disabled="!eraseConfirmed || busy" @click="doErase">
          {{ busy ? '削除しています…' : 'すべて消してやめる' }}
        </button>
        <button class="kk-btn-text" :disabled="busy" @click="close">やめる</button>
      </div>
    </template>

    <p v-if="errorText" class="kk-notice kk-notice--error mt-3">{{ errorText }}</p>
  </BottomSheet>
</template>

<script setup lang="ts">
import { apiMessage } from '~/utils/apiMessage'
import { RETENTION_YEARS } from '~/utils/withdrawal'
import type { BillingStatus } from '~/types/billing'

const props = defineProps<{
  modelValue: boolean
  /** true なら「すべて消す」だけを出す（お休み中の人。もうお休みに入っているので） */
  eraseOnly?: boolean
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** 終わったあと。呼び出し側がトップへ戻すなど後始末をする */
  done: [kind: 'rest' | 'erase']
}>()

const { user, authedFetch, deleteAccount, withdrawAccount } = useAuth()

const choice = ref<'rest' | 'erase'>('rest')
const eraseEmail = ref('')
const busy = ref(false)
const errorText = ref('')
const recordCount = ref<number | null>(null)
const billing = ref<BillingStatus | null>(null)

const title = computed(() => (props.eraseOnly ? 'すべて消してやめますか？' : '退会しますか？'))
const recordCountLabel = computed(() => (recordCount.value === null ? '全件' : `${recordCount.value}件`))
const hasLiveContract = computed(
  () => !!billing.value?.status && !['canceled', 'incomplete_expired'].includes(billing.value.status)
)
// メールアドレスが入力と一致して初めて消せる（大文字小文字・前後の空白は無視）。メールが無いアカウントは確認なし
const eraseConfirmed = computed(() => {
  const email = (user.value?.email ?? '').trim().toLowerCase()
  return !email || eraseEmail.value.trim().toLowerCase() === email
})

function close() {
  emit('update:modelValue', false)
}

// 開くたびに初期状態へ戻す（前回の入力やエラーを残さない）。お休み中の人は「消す」しか無い
watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    choice.value = props.eraseOnly ? 'erase' : 'rest'
    eraseEmail.value = ''
    errorText.value = ''
    // 何件消えるか／契約があるかを見せる（読めなくても退会はできる。契約はサーバー側でも必ず止める）
    if (!props.eraseOnly) {
      try {
        recordCount.value = (await authedFetch<{ records: unknown[] }>('/api/records')).records.length
      } catch {
        recordCount.value = null
      }
    }
    if (!billing.value) {
      try {
        billing.value = await authedFetch<BillingStatus>('/api/billing/status')
      } catch {
        billing.value = null
      }
    }
  }
)

async function doRest() {
  errorText.value = ''
  busy.value = true
  try {
    await withdrawAccount()
    emit('update:modelValue', false)
    emit('done', 'rest')
  } catch (e) {
    errorText.value = apiMessage(e, 'お休みに入れませんでした。少し時間をおいてから、もう一度お試しください。')
  }
  busy.value = false
}

async function doErase() {
  errorText.value = ''
  busy.value = true
  try {
    await deleteAccount(eraseEmail.value)
    emit('update:modelValue', false)
    emit('done', 'erase')
  } catch (e) {
    errorText.value = apiMessage(e, '削除できませんでした。少し時間をおいてから、もう一度お試しください。')
  }
  busy.value = false
}
</script>

<style scoped>
.kk-wd-choices {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.kk-wd-choice {
  display: flex;
  gap: 0.7rem;
  align-items: flex-start;
  padding: 0.8rem 0.9rem;
  border: 1.5px solid var(--kk-line, #d8d4cb);
  border-radius: 12px;
  cursor: pointer;
  min-height: 56px;
}
.kk-wd-choice.is-on {
  border-color: var(--kk-accent-strong);
  background: var(--kk-accent-soft);
}
.kk-wd-choice input {
  margin-top: 0.35rem;
  width: 18px;
  height: 18px;
  flex: none;
}
.kk-wd-erase-btn {
  width: 100%;
  min-height: 56px;
  border: 0;
  border-radius: 999px;
  background: var(--kk-danger);
  color: #fff;
  font-family: inherit;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
}
.kk-wd-erase-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
