<template>
  <BottomSheet :model-value="modelValue" title="設定" @update:model-value="emit('update:modelValue', $event)">
    <p v-if="errorMessage" class="kk-notice kk-notice--error kk-msg">
      <span>{{ errorMessage }}</span>
      <button type="button" class="kk-msg-close" aria-label="閉じる" @click="errorMessage = ''">✕</button>
    </p>
    <p v-if="savedMessage" class="kk-notice kk-notice--info kk-msg mt-3">
      <span>{{ savedMessage }}</span>
      <button type="button" class="kk-msg-close" aria-label="閉じる" @click="savedMessage = ''">✕</button>
    </p>

    <!-- よく出る名前（用語辞書） -->
    <section class="kk-card px-5 py-5 mt-4">
      <h2 class="kk-h2">よく出る名前</h2>
      <p class="kk-note mt-1">
        会議によく出てくる人の名前や地名を、1行に1つずつ書いてください。
        書いておくと、聞き取りの文字が正しくなります。
      </p>
      <textarea
        v-model="glossaryBody"
        rows="8"
        placeholder="阪中さん&#10;葛城町&#10;青年部"
        class="kk-input mt-3 resize-y"
      />
      <p class="kk-note mt-2">{{ glossaryBody.split('\n').filter((l) => l.trim()).length }} 件（{{ maxTerms }}件まで）</p>
      <button class="kk-btn-sub mt-4" :disabled="savingGlossary" @click="saveGlossary">
        {{ savingGlossary ? '保存しています…' : '保存する' }}
      </button>
    </section>

    <!-- 今月の使用ぶん -->
    <section class="kk-card px-5 py-5 mt-5">
      <h2 class="kk-h2">今月つかった分</h2>
      <p v-if="!usage" class="kk-lead mt-2">読み込んでいます…</p>
      <template v-else>
        <p class="kk-lead mt-2">
          録音: {{ Math.ceil(usage.seconds / 60) }}分 / {{ usage.limitMinutes }}分<br>
          議事録: {{ usage.records }}件 / {{ usage.limitRecords }}件
        </p>
        <p class="kk-note mt-2">毎月1日にリセットされます。</p>
      </template>
    </section>

    <!-- お支払い -->
    <section class="kk-card px-5 py-5 mt-5">
      <h2 class="kk-h2">お支払い</h2>

      <template v-if="monitorMode">
        <p class="kk-lead mt-2">{{ monitorText }}</p>
        <p class="kk-note mt-2">いまはお支払いの手続きは必要ありません。</p>
      </template>

      <template v-else-if="billing">
        <p class="kk-lead mt-2">
          <template v-if="billing.active">
            ご利用中です（{{ priceLabel }}）。
            <template v-if="billing.currentPeriodEnd">次回のお支払いは {{ billing.currentPeriodEnd }} です。</template>
          </template>
          <template v-else>
            いまはお支払いの手続きがされていません。手続きをすると、すべての機能が使えます（{{ priceLabel }}）。
          </template>
        </p>
        <p v-if="billing.active && billing.cancelAtPeriodEnd" class="kk-notice kk-notice--warn mt-3">
          解約の手続きがされています。{{ billing.currentPeriodEnd || '期間の終わり' }}までお使いいただけます。
        </p>

        <button v-if="!billing.active" class="kk-btn mt-4" :disabled="billingBusy" @click="startCheckout">
          {{ billingBusy ? '画面をひらいています…' : 'お支払いの手続きをする' }}
        </button>
        <button v-else class="kk-btn-sub mt-4" :disabled="billingBusy" @click="openPortal">
          {{ billingBusy ? '画面をひらいています…' : 'お支払い方法の変更・解約' }}
        </button>
        <p class="kk-note mt-2">お支払いの画面は Stripe（決済の会社）のページがひらきます。</p>
      </template>

      <p v-else class="kk-lead mt-2">読み込んでいます…</p>
    </section>

    <!-- Googleドライブ -->
    <section class="kk-card px-5 py-5 mt-5">
      <h2 class="kk-h2">Googleドライブ</h2>
      <template v-if="driveConnected">
        <p class="kk-lead mt-2">つながっています。PDFをつくると、ドライブの「キキガキ議事録」フォルダにも保存されます。</p>
        <button class="kk-btn-sub mt-4" :disabled="driveBusy" @click="disconnectDrive">つなぐのをやめる</button>
      </template>
      <template v-else>
        <p class="kk-lead mt-2">つなぐと、つくったPDFが自動でドライブの「キキガキ議事録」フォルダに保存されます。</p>
        <button class="kk-btn mt-4" :disabled="driveBusy" @click="connectDrive">
          {{ driveBusy ? '画面をひらいています…' : 'Googleドライブとつなぐ' }}
        </button>
      </template>
      <p class="kk-note mt-2">ドライブのほかのファイルは見えません。キキガキが作ったファイルだけを扱います。</p>
    </section>

    <!-- アカウント -->
    <section class="kk-card px-5 py-5 mt-5">
      <h2 class="kk-h2">ログインしている人</h2>
      <p class="kk-lead mt-2">{{ user?.email || '（メールアドレスなし）' }}</p>
      <button class="kk-btn-sub mt-4" @click="doLogout">ログアウトする</button>
    </section>

  </BottomSheet>
</template>

<script setup lang="ts">
import { SERVICE, monitorNotice } from '~/config/service'
import { apiMessage } from '~/utils/apiMessage'
import { GLOSSARY_MAX_TERMS } from '~/utils/glossary'
import { parseMonitorMode } from '~/utils/entitlement'
import type { BillingStatus } from '~/types/billing'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const router = useRouter()
const { user, isLoggedIn, authedFetch, logout } = useAuth()
const { connected: driveConnected, refresh: refreshDrive, connect, disconnect } = useDrive()
const driveBusy = ref(false)
const paidFlag = useState<boolean>('kk-settings-paid', () => false)

const config = useRuntimeConfig().public
const monitorMode = computed(() => parseMonitorMode(config.monitorMode))
const monitorText = monitorNotice()
const priceLabel = SERVICE.priceLabel
const maxTerms = GLOSSARY_MAX_TERMS

const errorMessage = ref('')
const savedMessage = ref('')
const glossaryBody = ref('')
const savingGlossary = ref(false)
const usage = ref<{ seconds: number; records: number; limitMinutes: number; limitRecords: number } | null>(null)
const billing = ref<BillingStatus | null>(null)
const billingBusy = ref(false)

async function load() {
  try {
    const [me, glossary] = await Promise.all([
      authedFetch<{ usage: typeof usage.value }>('/api/me'),
      authedFetch<{ body: string }>('/api/glossary'),
    ])
    usage.value = me.usage
    glossaryBody.value = glossary.body
  } catch (e) {
    errorMessage.value = apiMessage(e, '設定を読み込めませんでした。画面を開き直してみてください。')
  }

  // 契約状態はモニター期間中は使わないので、そのときは呼ばない
  if (monitorMode.value) return
  try {
    billing.value = await authedFetch<BillingStatus>('/api/billing/status')
  } catch (e) {
    errorMessage.value = apiMessage(e, 'お支払いの状態を読み込めませんでした。少し時間をおいてお試しください。')
  }
}

async function saveGlossary() {
  errorMessage.value = ''
  savedMessage.value = ''
  savingGlossary.value = true
  try {
    const res = await authedFetch<{ body: string }>('/api/glossary', {
      method: 'PUT',
      body: { body: glossaryBody.value },
    })
    // 保存の時点で整えた結果を入力欄へ戻す（捨てられた行が残ると、効いていると誤解させる）
    glossaryBody.value = res.body
    savedMessage.value = '保存しました。次に議事録をつくるときから使われます。'
  } catch (e) {
    errorMessage.value = apiMessage(e, '保存できませんでした。もう一度お試しください。')
  }
  savingGlossary.value = false
}

/** Stripe の支払い画面へ送る（自前で決済画面は作らない） */
async function startCheckout() {
  errorMessage.value = ''
  billingBusy.value = true
  try {
    const res = await authedFetch<{ url: string }>('/api/billing/checkout', { method: 'POST' })
    window.location.href = res.url
  } catch (e) {
    errorMessage.value = apiMessage(e, 'お支払いの画面をひらけませんでした。少し時間をおいてお試しください。')
    billingBusy.value = false
  }
}

/** 解約・支払い方法の変更は Stripe のポータルに任せる */
async function openPortal() {
  errorMessage.value = ''
  billingBusy.value = true
  try {
    const res = await authedFetch<{ url: string }>('/api/billing/portal', { method: 'POST' })
    window.location.href = res.url
  } catch (e) {
    errorMessage.value = apiMessage(e, '手続きの画面をひらけませんでした。少し時間をおいてお試しください。')
    billingBusy.value = false
  }
}

async function connectDrive() {
  errorMessage.value = ''
  driveBusy.value = true
  try {
    await connect()
    savedMessage.value = 'Googleドライブとつながりました。'
  } catch (e) {
    errorMessage.value = apiMessage(e)
  }
  driveBusy.value = false
}

async function disconnectDrive() {
  driveBusy.value = true
  await disconnect()
  driveBusy.value = false
}

async function doLogout() {
  emit('update:modelValue', false)
  await logout()
  await router.push('/')
}

// 開くたびに読み直す（使用量や契約状態は変わるので）
watch(
  () => props.modelValue,
  async (open) => {
    if (!open || !isLoggedIn.value) return
    errorMessage.value = ''
    savedMessage.value = ''
    refreshDrive()
    // Stripe の支払い画面から戻ってきたとき。契約状態は webhook が届いてから反映されるので、
    // まだ切り替わっていないことがある旨も添える
    if (paidFlag.value) {
      savedMessage.value = 'お支払いの手続きが終わりました。反映に少し時間がかかることがあります。'
      paidFlag.value = false
    }
    await load()
  },
  { immediate: true }
)
</script>

<style scoped>
.kk-msg { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; }
.kk-msg-close { flex-shrink: 0; border: 0; background: transparent; color: inherit; font-size: 18px; line-height: 1; cursor: pointer; padding: 0.1rem 0.3rem; }
</style>
