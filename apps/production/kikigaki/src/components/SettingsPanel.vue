<template>
  <!-- 設定は開くボタンを持たず、左メニュー（スマホではページの下）に常に出しておく。
       使用量・支払い・ドライブ・ログイン中の人は、いちいち開かなくても目に入るほうが迷わないため -->
  <div class="kk-set">
    <p v-if="errorMessage" class="kk-notice kk-notice--error kk-msg">
      <span>{{ errorMessage }}</span>
      <button type="button" class="kk-msg-close" aria-label="閉じる" @click="errorMessage = ''">✕</button>
    </p>
    <p v-if="savedMessage" class="kk-notice kk-notice--info kk-msg">
      <span>{{ savedMessage }}</span>
      <button type="button" class="kk-msg-close" aria-label="閉じる" @click="savedMessage = ''">✕</button>
    </p>

    <!-- 今月の使用ぶん -->
    <section class="kk-set-sec">
      <h2 class="kk-set-title">今月つかった分</h2>
      <p v-if="!usage" class="kk-set-text">読み込んでいます…</p>
      <template v-else>
        <div class="flex items-baseline justify-between">
          <span class="kk-set-text">つかった分</span>
          <span class="kk-set-num">{{ usage.usedPercent }}%</span>
        </div>
        <div class="kk-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="usage.usedPercent">
          <div class="kk-meter-fill" :class="{ 'kk-meter-fill--warn': usage.usedPercent >= 80 }" :style="{ width: usage.usedPercent + '%' }" />
        </div>
        <p v-if="usage.exhausted" class="kk-notice kk-notice--warn mt-2">
          今月のぶんを使い切りました。来月1日から、またお使いいただけます。
        </p>
        <p v-else-if="usage.usedPercent >= 80" class="kk-set-note">もうすぐ今月のぶんを使い切ります。</p>
        <p class="kk-set-note">議事録づくりと「AIに直してもらう」の合計。毎月1日にリセットされます。</p>
      </template>
    </section>

    <!-- PDFの文字数（アカウント全体。すべての議事録のPDFに効く） -->
    <section class="kk-set-sec">
      <h2 class="kk-set-title">PDFの文字数</h2>
      <p class="kk-set-text">A4横1枚の左右2列。目安を超えた列だけ、PDFをつくるときにAIが要約し直します。</p>
      <div class="kk-set-pdf">
        <label v-for="side in pdfSides" :key="side.key" class="kk-set-pdf-row">
          <span class="kk-set-pdf-label">{{ side.label }}<span class="kk-set-pdf-sub">{{ side.sub }}</span></span>
          <input
            v-model="pdfDraft[side.key]"
            type="number"
            inputmode="numeric"
            :min="PRINT_MAX_CHARS_MIN"
            :max="PRINT_MAX_CHARS_MAX"
            step="100"
            class="kk-input kk-set-pdf-input"
          >
          <span class="kk-set-pdf-unit">字</span>
        </label>
      </div>
      <p class="kk-set-note">合計 {{ pdfTotal.toLocaleString() }}字（1列 {{ PRINT_MAX_CHARS_MIN }}〜{{ PRINT_MAX_CHARS_MAX.toLocaleString() }}字）</p>
      <div class="flex gap-1.5">
        <button class="kk-set-btn kk-set-btn--accent" :disabled="pdfBusy || !pdfDirty" @click="savePdf">
          {{ pdfBusy ? '保存中…' : '保存' }}
        </button>
        <button class="kk-set-btn" :disabled="pdfBusy || pdfIsDefault" @click="resetPdf">元に戻す</button>
      </div>
    </section>

    <!-- お支払い -->
    <section class="kk-set-sec">
      <h2 class="kk-set-title">お支払い</h2>

      <template v-if="monitorMode">
        <p class="kk-set-text">モニター期間中のため、いまはお支払いの手続きは必要ありません。</p>
      </template>

      <template v-else-if="billing">
        <p class="kk-set-text">
          <template v-if="billing.active">
            ご利用中です（{{ priceLabel }}）。
            <template v-if="billing.currentPeriodEnd">次回のお支払いは {{ billing.currentPeriodEnd }} です。</template>
          </template>
          <template v-else>
            お支払いの手続きがまだです。手続きをすると、すべての機能が使えます（{{ priceLabel }}）。
          </template>
        </p>
        <p v-if="billing.active && billing.cancelAtPeriodEnd" class="kk-notice kk-notice--warn mt-2">
          解約の手続きがされています。{{ billing.currentPeriodEnd || '期間の終わり' }}までお使いいただけます。
        </p>

        <button v-if="!billing.active" class="kk-set-btn kk-set-btn--cta" :disabled="billingBusy" @click="startCheckout">
          {{ billingBusy ? '画面をひらいています…' : 'お支払いの手続きをする' }}
        </button>
        <button v-else class="kk-set-btn" :disabled="billingBusy" @click="openPortal">
          {{ billingBusy ? '画面をひらいています…' : 'お支払い方法の変更・解約' }}
        </button>
        <p class="kk-set-note">お支払いの画面は Stripe（決済の会社）のページがひらきます。</p>
      </template>

      <p v-else class="kk-set-text">読み込んでいます…</p>
    </section>

    <!-- Googleドライブ -->
    <section class="kk-set-sec">
      <h2 class="kk-set-title">
        <span class="inline-flex items-center gap-1.5"><GoogleDriveIcon class="w-[14px] h-[14px]" />Googleドライブ</span>
        <span class="kk-set-state" :class="{ 'is-on': driveConnected }">{{ driveConnected ? 'つながっています' : '未接続' }}</span>
      </h2>
      <template v-if="driveConnected">
        <p class="kk-set-text">PDFはドライブの「キキガキ議事録」フォルダにも保存されます。</p>
        <button class="kk-set-btn" :disabled="driveBusy" @click="disconnectDrive">つなぐのをやめる</button>
      </template>
      <template v-else>
        <p class="kk-set-text">つなぐと、PDFが自動でドライブの「キキガキ議事録」フォルダに保存されます。</p>
        <button class="kk-set-btn kk-set-btn--accent" :disabled="driveBusy" @click="connectDrive">
          {{ driveBusy ? '画面をひらいています…' : 'Googleドライブとつなぐ' }}
        </button>
      </template>
      <p class="kk-set-note">ドライブのほかのファイルは見えません。キキガキが作ったファイルだけを扱います。</p>
    </section>

    <!-- アカウント -->
    <section class="kk-set-sec">
      <h2 class="kk-set-title">ログインしている人</h2>
      <p class="kk-set-text kk-set-email" :title="user?.email || ''">{{ user?.email || '（メールアドレスなし）' }}</p>
      <button class="kk-set-btn" @click="doLogout">ログアウトする</button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { SERVICE } from '~/config/service'
import { apiMessage } from '~/utils/apiMessage'
import { parseMonitorMode } from '~/utils/entitlement'
import type { BillingStatus } from '~/types/billing'
import { PRINT_MAX_CHARS_MAX, PRINT_MAX_CHARS_MIN } from '~/types/settings'
import { defaultUserSettings, normalizeUserSettings } from '~/utils/userSettings'

const router = useRouter()
const route = useRoute()
const { user, isLoggedIn, authedFetch, logout } = useAuth()
const { connected: driveConnected, refresh: refreshDrive, connect, disconnect } = useDrive()
const driveBusy = ref(false)
const paidFlag = useState<boolean>('kk-settings-paid', () => false)

const config = useRuntimeConfig().public
const monitorMode = computed(() => parseMonitorMode(config.monitorMode))
const priceLabel = SERVICE.priceLabel

const errorMessage = ref('')
const savedMessage = ref('')
const usage = ref<{ usedPercent: number; exhausted: boolean } | null>(null)
const billing = ref<BillingStatus | null>(null)
const billingBusy = ref(false)

// ── PDFの文字数 ──
const { settings: userSettings, load: loadUserSettings, save: saveUserSettings } = useUserSettings()
type PdfKey = 'pdfLeftMaxChars' | 'pdfRightMaxChars'
const pdfSides: { key: PdfKey; label: string; sub: string }[] = [
  { key: 'pdfLeftMaxChars', label: '左', sub: 'まとめ・話し合ったこと' },
  { key: 'pdfRightMaxChars', label: '右', sub: '決まったこと・予定・やること' },
]
/** 入力中の値。保存を押すまでは userSettings に反映しない（数字欄は打ちかけで '' や小さい数になるため） */
const pdfDraft = reactive<Record<PdfKey, number | string>>({ ...defaultUserSettings() })
const pdfBusy = ref(false)
const pdfTotal = computed(() => (Number(pdfDraft.pdfLeftMaxChars) || 0) + (Number(pdfDraft.pdfRightMaxChars) || 0))
const pdfDirty = computed(() =>
  pdfSides.some((s) => Number(pdfDraft[s.key]) !== userSettings.value[s.key] || pdfDraft[s.key] === '')
)
const pdfIsDefault = computed(() => {
  const d = defaultUserSettings()
  return pdfSides.every((s) => Number(pdfDraft[s.key]) === d[s.key])
})

function syncPdfDraft() {
  pdfDraft.pdfLeftMaxChars = userSettings.value.pdfLeftMaxChars
  pdfDraft.pdfRightMaxChars = userSettings.value.pdfRightMaxChars
}

async function savePdf() {
  errorMessage.value = ''
  savedMessage.value = ''
  pdfBusy.value = true
  try {
    await saveUserSettings(normalizeUserSettings({ ...pdfDraft }))
    syncPdfDraft()
    savedMessage.value = 'PDFの文字数を保存しました。次につくるPDFから使われます。'
  } catch (e) {
    errorMessage.value = apiMessage(e, 'PDFの文字数を保存できませんでした。もう一度お試しください。')
  }
  pdfBusy.value = false
}

async function resetPdf() {
  Object.assign(pdfDraft, defaultUserSettings())
  await savePdf()
}

async function load() {
  try {
    await loadUserSettings()
    syncPdfDraft()
  } catch (e) {
    errorMessage.value = apiMessage(e, '設定を読み込めませんでした。画面を開き直してみてください。')
  }
  try {
    const me = await authedFetch<{ usage: typeof usage.value }>('/api/me')
    usage.value = me.usage
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
  await logout()
  await router.push('/')
}

async function refreshAll() {
  if (!isLoggedIn.value) return
  errorMessage.value = ''
  refreshDrive()
  // Stripe の支払い画面から戻ってきたとき（/settings?paid=1 → トップ）。契約状態は webhook が
  // 届いてから反映されるので、まだ切り替わっていないことがある旨も添える
  if (paidFlag.value) {
    savedMessage.value = 'お支払いの手続きが終わりました。反映に少し時間がかかることがあります。'
    paidFlag.value = false
  }
  await load()
}

// 常に出ている欄なので、ログインしたときと画面を移ったときに読み直す
// （議事録をつくると使用量が変わるため。開きっぱなしで古い数字が残らないように）
watch(isLoggedIn, refreshAll, { immediate: true })
watch(() => route.path, refreshAll)
</script>

<style scoped>
.kk-set {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.kk-set-sec {
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--kk-line);
  border-radius: 10px;
  background: var(--kk-panel);
}
.kk-set-title {
  margin: 0 0 0.3rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  font-size: 12.5px;
  font-weight: 700;
  line-height: 1.4;
}
.kk-set-state {
  font-size: 10.5px;
  font-weight: 700;
  padding: 0 0.4rem;
  border-radius: 999px;
  color: var(--kk-warn);
  background: var(--kk-warn-soft);
}
.kk-set-state.is-on {
  color: var(--kk-accent-strong);
  background: var(--kk-accent-soft);
}
.kk-set-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--kk-ink-soft);
}
.kk-set-email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kk-set-num {
  font-size: 15px;
  font-weight: 700;
  color: var(--kk-accent-strong);
}
.kk-set-note {
  margin: 0.3rem 0 0;
  font-size: 11px;
  line-height: 1.55;
  color: var(--kk-ink-faint);
}
.kk-set-pdf {
  margin-top: 0.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.kk-set-pdf-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.kk-set-pdf-label {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
}
.kk-set-pdf-sub {
  display: block;
  font-size: 10.5px;
  font-weight: 400;
  color: var(--kk-ink-faint);
}
.kk-set-pdf-input {
  width: 5.2rem;
  padding: 0.2rem 0.4rem;
  text-align: right;
}
.kk-set-pdf-unit {
  font-size: 11.5px;
  color: var(--kk-ink-soft);
}
.kk-set-btn {
  margin-top: 0.45rem;
  width: 100%;
  height: 30px;
  padding: 0 0.6rem;
  border: 1px solid var(--kk-line-strong);
  border-radius: 999px;
  background: #fff;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  color: var(--kk-ink);
  cursor: pointer;
}
.kk-set-btn:hover:not(:disabled) { border-color: var(--kk-accent); background: var(--kk-accent-soft); color: var(--kk-accent-strong); }
.kk-set-btn:disabled { opacity: 0.45; cursor: default; }
.kk-set-btn--accent { border-color: var(--kk-accent); background: var(--kk-accent); color: #fff; }
.kk-set-btn--accent:hover:not(:disabled) { background: var(--kk-accent-strong); color: #fff; }
.kk-set-btn--cta { border-color: var(--kk-cta); background: var(--kk-cta); color: #fff; }
.kk-set-btn--cta:hover:not(:disabled) { border-color: var(--kk-cta-strong); background: var(--kk-cta-strong); color: #fff; }
.kk-msg { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; margin: 0; font-size: 12px; }
.kk-msg-close { flex-shrink: 0; border: 0; background: transparent; color: inherit; font-size: 13px; line-height: 1; cursor: pointer; padding: 0.1rem 0.2rem; }
.kk-meter { margin-top: 0.2rem; height: 6px; border-radius: 999px; background: var(--kk-accent-soft); overflow: hidden; }
.kk-meter-fill { height: 100%; border-radius: 999px; background: var(--kk-accent); }
.kk-meter-fill--warn { background: var(--kk-cta); }
</style>
