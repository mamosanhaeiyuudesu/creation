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

    <!-- スマホには左メニューの「管理画面」が無いので、管理者にだけここに出す -->
    <NuxtLink v-if="isAdmin" to="/admin" class="kk-set-admin">管理画面をひらく →</NuxtLink>

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

      <!-- 管理者・運営者が支払い不要にした人。契約が残っていれば解約できるようポータルは出す -->
      <template v-else-if="billing?.freeAccess">
        <p class="kk-set-text">運営者の設定により、お支払いなしでお使いいただけます。</p>
        <button v-if="billing.status" class="kk-set-btn" :disabled="billingBusy" @click="openPortal">
          {{ billingBusy ? '画面をひらいています…' : 'お支払い方法の変更・解約' }}
        </button>
      </template>

      <template v-else-if="billing">
        <!-- 引き落としに失敗している。Stripe が請求し直している間は使えるが、カードの更新をお願いする -->
        <p v-if="billing.paymentProblem" class="kk-notice kk-notice--warn">
          お支払いが確認できていません。カードの期限切れなどが考えられます。下のボタンからカードを更新してください。
        </p>
        <p class="kk-set-text" :class="{ 'mt-2': billing.paymentProblem }">
          <template v-if="billing.status === 'trialing'">
            無料期間中です。<template v-if="billing.currentPeriodEnd">{{ billing.currentPeriodEnd }} から{{ priceLabel }}のお支払いが始まります。</template>
          </template>
          <template v-else-if="billing.active">
            ご利用中です（{{ priceLabel }}）。
            <template v-if="billing.currentPeriodEnd && !billing.paymentProblem">次回のお支払いは {{ billing.currentPeriodEnd }} です。</template>
          </template>
          <template v-else-if="billing.trialEligible">
            最初の{{ trialLabel(billing.trialDays) }}は無料です。そのあと{{ priceLabel }}で、毎月自動でお支払いになります。いつでも解約できます。
          </template>
          <template v-else>
            お支払いの手続きがまだです。手続きをすると、すべての機能が使えます（{{ priceLabel }}）。
          </template>
        </p>
        <p v-if="billing.active && billing.cancelAtPeriodEnd" class="kk-notice kk-notice--warn mt-2">
          解約の手続きがされています。{{ billing.currentPeriodEnd || '期間の終わり' }}までお使いいただけます。
        </p>

        <button v-if="!billing.active" class="kk-set-btn kk-set-btn--cta" :disabled="billingBusy" @click="startCheckout">
          {{ billingBusy ? '画面をひらいています…' : billing.trialEligible ? `${trialLabel(billing.trialDays)}無料ではじめる` : 'お支払いの手続きをする' }}
        </button>
        <button
          v-else
          class="kk-set-btn"
          :class="{ 'kk-set-btn--cta': billing.paymentProblem }"
          :disabled="billingBusy"
          @click="openPortal"
        >
          {{ billingBusy ? '画面をひらいています…' : billing.paymentProblem ? 'カードを更新する' : 'お支払い方法の変更・解約' }}
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
      <button type="button" class="kk-set-danger-link" @click="openDelete">アカウントを削除する</button>
    </section>

    <!-- 退会の確認。元に戻せないので、何が消えるかを並べ、確認のチェックを入れないと押せないようにする -->
    <BottomSheet v-model="deleteOpen" title="アカウントを削除しますか？" :closable="!deleting">
      <p class="kk-lead m-0">
        <strong>{{ user?.email }}</strong> のアカウントを削除します。次のものがすべて消え、<strong>元には戻せません</strong>。
      </p>
      <ul class="kk-lead mt-2 mb-0 pl-5 list-disc">
        <li>これまでの議事録と、元の文章（{{ recordCountLabel }}）</li>
        <li>PDFの文字数などの設定</li>
      </ul>
      <p v-if="billing?.status && !['canceled', 'incomplete_expired'].includes(billing.status)" class="kk-notice kk-notice--warn mt-3">
        お支払いの契約は、削除と同時に解約されます。お支払い済みの期間の返金はありません。
      </p>
      <p class="kk-note mt-2 mb-0">
        Googleドライブに保存したPDFや、ダウンロードしたPDFは消えません（ご自身の端末・ドライブにあるため）。
        お支払いの記録は、法令にもとづき決済会社（Stripe）に一定期間残ります。
      </p>
      <label class="kk-set-confirm mt-3">
        <input v-model="deleteAgree" type="checkbox">
        <span>議事録がすべて消え、元に戻せないことを理解しました</span>
      </label>
      <div class="mt-3 flex flex-col gap-2">
        <button class="kk-set-delete-btn" :disabled="!deleteAgree || deleting" @click="doDelete">
          {{ deleting ? '削除しています…' : 'アカウントを削除する' }}
        </button>
        <button class="kk-btn-text" :disabled="deleting" @click="deleteOpen = false">やめる</button>
      </div>
      <p v-if="deleteError" class="kk-notice kk-notice--error mt-3">{{ deleteError }}</p>
    </BottomSheet>
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
const { user, isLoggedIn, authedFetch, logout, deleteAccount } = useAuth()
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
/** 左メニューに「管理画面」を出すか（表示だけ。守りは /api/admin/* の入口で行う） */
const isAdmin = useState<boolean>('kk-is-admin', () => false)

/** 30日 → 「1か月」。それ以外は「◯日間」 */
function trialLabel(days: number): string {
  return days === 30 ? '1か月' : `${days}日間`
}

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
    const me = await authedFetch<{ usage: typeof usage.value; isAdmin: boolean }>('/api/me')
    usage.value = me.usage
    isAdmin.value = !!me.isAdmin
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

// ── 退会 ──
const deleteOpen = ref(false)
const deleteAgree = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const recordCount = ref<number | null>(null)
const recordCountLabel = computed(() => (recordCount.value === null ? '全件' : `${recordCount.value}件`))

async function openDelete() {
  deleteAgree.value = false
  deleteError.value = ''
  deleteOpen.value = true
  // 何件消えるかを見せる（読めなくても削除はできる）
  try {
    recordCount.value = (await authedFetch<{ records: unknown[] }>('/api/records')).records.length
  } catch {
    recordCount.value = null
  }
  // モニター期間中は契約状態を読んでいないので、解約の注意を出すために読む
  if (!billing.value) {
    try {
      billing.value = await authedFetch<BillingStatus>('/api/billing/status')
    } catch {
      // 読めなくても、サーバー側で契約があれば必ず解約してから消す
    }
  }
}

async function doDelete() {
  deleteError.value = ''
  deleting.value = true
  try {
    await deleteAccount()
    // この端末に残っている目印も消す（ドライブの連携・PDFの設定など）
    await disconnect()
    isAdmin.value = false
    deleteOpen.value = false
    await router.push('/')
  } catch (e) {
    deleteError.value = apiMessage(e, '削除できませんでした。少し時間をおいてから、もう一度お試しください。')
  }
  deleting.value = false
}

async function doLogout() {
  isAdmin.value = false
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
.kk-set-admin {
  display: block;
  padding: 0.5rem 0.7rem;
  border: 1px solid #d9cdf3;
  border-radius: 10px;
  background: #f6f2fd;
  color: #5b3fa8;
  font-size: 12.5px;
  font-weight: 700;
  text-decoration: none;
}
/* PCでは左メニューの「管理画面」があるので出さない */
@media (min-width: 1024px) {
  .kk-set-admin {
    display: none;
  }
}
.kk-set-danger-link {
  display: block;
  margin: 0.5rem auto 0;
  border: 0;
  background: transparent;
  font-family: inherit;
  font-size: 11.5px;
  color: var(--kk-ink-faint);
  text-decoration: underline;
  cursor: pointer;
}
.kk-set-danger-link:hover {
  color: var(--kk-danger);
}
.kk-set-confirm {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
}
.kk-set-confirm input {
  margin-top: 0.25rem;
  width: 17px;
  height: 17px;
  accent-color: var(--kk-danger);
}
.kk-set-delete-btn {
  width: 100%;
  min-height: 44px;
  border: 0;
  border-radius: 999px;
  background: var(--kk-danger);
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.kk-set-delete-btn:disabled {
  opacity: 0.4;
  cursor: default;
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
