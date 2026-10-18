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
        <p class="kk-set-note">議事録づくりと「まとめ直す」の合計。毎月1日にリセットされます。</p>
      </template>
    </section>

    <!-- タグの管理。名前の変更（既にあるタグにすると1つにまとまる）と削除（全部の議事録から外す） -->
    <section class="kk-set-sec">
      <h2 class="kk-set-title">タグ<span v-if="allTags.length" class="kk-set-tag-total">{{ allTags.length }}</span></h2>
      <p v-if="!allTags.length" class="kk-set-text">まだタグはありません。議事録の確認画面で付けられます。</p>
      <ul v-else class="kk-set-tags">
        <li v-for="t in allTags" :key="t.tag" class="kk-set-tag">
          <template v-if="editingTag === t.tag">
            <input
              ref="tagEditInput"
              v-model="tagDraft"
              class="kk-input kk-set-tag-input"
              :maxlength="MAX_TAG_LENGTH"
              aria-label="新しいタグの名前"
              @keydown.enter="onTagEditEnter"
              @keydown.esc="editingTag = ''"
            >
            <button type="button" class="kk-set-tag-ok" :disabled="tagBusy" @click="saveTagRename">保存</button>
            <button type="button" class="kk-set-tag-icon" :disabled="tagBusy" aria-label="やめる" @click="editingTag = ''">✕</button>
          </template>
          <template v-else>
            <!-- 名前と件数を押すと、そのタグで絞り込んだ一覧を開く（もう一度押すと「すべて」に戻る）。
                 押せる範囲は名前と件数だけにして、右の変更・削除のアイコンとは間をあける -->
            <NuxtLink
              :to="tagLink(t.tag)"
              class="kk-set-tag-link"
              :class="{ 'is-on': isActiveTag(t.tag) }"
              :aria-current="isActiveTag(t.tag) ? 'true' : undefined"
              :title="isActiveTag(t.tag) ? '絞り込みを外す' : `「${t.tag}」で絞り込む`"
              @click="scrollToTop"
            >
              <span class="kk-set-tag-name">#{{ t.tag }}</span>
              <span class="kk-set-tag-count">{{ t.count }}</span>
            </NuxtLink>
            <button type="button" class="kk-set-tag-icon" :aria-label="`タグ「${t.tag}」の名前を変える`" title="名前を変える" @click="startTagEdit(t.tag)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16zM13 7l4 4" /></svg>
            </button>
            <button type="button" class="kk-set-tag-icon is-danger" :aria-label="`タグ「${t.tag}」を消す`" title="消す" @click="deletingTag = t.tag">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
            </button>
          </template>
        </li>
      </ul>
      <p v-if="editingTag && tagMergeTarget" class="kk-set-note">「{{ tagMergeTarget }}」は既にあるので、1つのタグにまとまります。</p>
    </section>

    <!-- タグの削除の確認 -->
    <BottomSheet :model-value="!!deletingTag" title="タグを消しますか？" :closable="!tagBusy" @update:model-value="deletingTag = ''">
      <p class="kk-lead m-0">
        <strong>#{{ deletingTag }}</strong> を、付いている議事録（{{ allTags.find((t) => t.tag === deletingTag)?.count ?? 0 }}件）から外します。議事録そのものは消えません。
      </p>
      <div class="mt-4 flex flex-col gap-2">
        <button class="kk-btn-sub" :disabled="tagBusy" @click="confirmTagDelete">{{ tagBusy ? '消しています…' : 'はい、消します' }}</button>
        <button class="kk-btn-text" :disabled="tagBusy" @click="deletingTag = ''">やめる</button>
      </div>
    </BottomSheet>

    <!-- PDFの文字数（アカウント全体。すべての議事録のPDFに効く）。
         選んだらすぐ保存し、次にPDFをつくるときから使われる（PDFは保存しておらず毎回つくるので、作り直しは要らない） -->
    <section class="kk-set-sec">
      <div class="kk-set-pdf-row">
        <label class="kk-set-title m-0" for="pdf-max-chars">PDFの文字数</label>
        <span v-if="pdfSaved" class="kk-set-pdf-saved" role="status">✓ 保存しました</span>
        <select
          id="pdf-max-chars"
          :value="userSettings.pdfMaxChars"
          class="kk-input kk-set-pdf-select"
          :disabled="pdfBusy"
          @change="onPdfChange"
        >
          <option v-for="n in pdfOptions" :key="n" :value="n">{{ n.toLocaleString() }}字</option>
        </select>
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
import { PDF_MAX_CHARS_MAX, PDF_MAX_CHARS_MIN } from '~/types/settings'
import { normalizeUserSettings } from '~/utils/userSettings'
import { MAX_TAG_LENGTH, normalizeTag } from '~/utils/tags'

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
/** 左メニュー（スマホは上の帯）に「管理画面」を出すか（表示だけ。守りは /api/admin/* の入口で行う） */
const isAdmin = useState<boolean>('kk-is-admin', () => false)
/** 承認待ちか（トップに「準備中」の案内を出すため。止めるのはサーバー側） */
const pendingApproval = useState<boolean>('kk-pending-approval', () => false)

/** 30日 → 「1か月」。それ以外は「◯日間」 */
function trialLabel(days: number): string {
  return days === 30 ? '1か月' : `${days}日間`
}

// ── PDFの文字数 ──
const { settings: userSettings, load: loadUserSettings, save: saveUserSettings } = useUserSettings()
const pdfBusy = ref(false)
/** 選んだ直後だけ「✓ 保存しました」を出す（何も出ないと、変わったのか分からないため） */
const pdfSaved = ref(false)
let pdfSavedTimer: ReturnType<typeof setTimeout> | undefined

/** 選べる文字数（500字刻み）。左右別々に設定していたころの半端な値（合計1700字など）は、それも選択肢に残す */
const pdfOptions = computed(() => {
  const list: number[] = []
  for (let n = PDF_MAX_CHARS_MIN; n <= PDF_MAX_CHARS_MAX; n += 500) list.push(n)
  const current = userSettings.value.pdfMaxChars
  if (!list.includes(current)) list.push(current)
  return list.sort((a, b) => a - b)
})

async function onPdfChange(e: Event) {
  const select = e.target as HTMLSelectElement
  errorMessage.value = ''
  pdfBusy.value = true
  try {
    await saveUserSettings(normalizeUserSettings({ pdfMaxChars: select.value }))
    pdfSaved.value = true
    clearTimeout(pdfSavedTimer)
    pdfSavedTimer = setTimeout(() => (pdfSaved.value = false), 2000)
  } catch (e) {
    // 保存できなければ、選択を保存済みの値に戻す
    select.value = String(userSettings.value.pdfMaxChars)
    errorMessage.value = apiMessage(e, 'PDFの文字数を保存できませんでした。もう一度お試しください。')
  }
  pdfBusy.value = false
}

async function load() {
  loadTags().catch(() => {})
  try {
    await loadUserSettings()
  } catch (e) {
    errorMessage.value = apiMessage(e, '設定を読み込めませんでした。画面を開き直してみてください。')
  }
  try {
    const me = await authedFetch<{ usage: typeof usage.value; isAdmin: boolean; pendingApproval: boolean }>('/api/me')
    usage.value = me.usage
    isAdmin.value = !!me.isAdmin
    pendingApproval.value = !!me.pendingApproval
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

// ── タグの管理 ──
const { tags: allTags, load: loadTags, rename: renameTag, remove: removeTag } = useTags()
const editingTag = ref('')
const tagDraft = ref('')
const deletingTag = ref('')
const tagBusy = ref(false)
const tagEditInput = ref<HTMLInputElement[] | HTMLInputElement | null>(null)
/** 変えた先が既にあるタグなら、その名前（まとまることを知らせる） */
const tagMergeTarget = computed(() => {
  const to = normalizeTag(tagDraft.value)
  return to && to !== editingTag.value && allTags.value.some((t) => t.tag === to) ? to : ''
})

/** いま一覧をこのタグで絞り込んでいるか */
function isActiveTag(tag: string): boolean {
  return route.path === '/' && route.query.tag === tag
}

/** 一覧をそのタグで絞り込むリンク。絞り込み中なら外す。並び順（?sort=）は引き継ぐ */
function tagLink(tag: string) {
  const sort = route.path === '/' ? route.query.sort : undefined
  return { path: '/', query: { ...(sort ? { sort } : {}), ...(isActiveTag(tag) ? {} : { tag }) } }
}

/** スマホでは左メニューがページの下にあるので、押したら一覧の先頭へ戻す */
function scrollToTop() {
  window.scrollTo({ top: 0 })
}

function startTagEdit(tag: string) {
  editingTag.value = tag
  tagDraft.value = tag
  nextTick(() => {
    const el = Array.isArray(tagEditInput.value) ? tagEditInput.value[0] : tagEditInput.value
    el?.focus()
    el?.select()
  })
}

function onTagEditEnter(e: KeyboardEvent) {
  if (e.isComposing || e.keyCode === 229) return
  e.preventDefault()
  saveTagRename()
}

async function saveTagRename() {
  const from = editingTag.value
  const to = normalizeTag(tagDraft.value)
  if (!to || to === from) {
    editingTag.value = ''
    return
  }
  errorMessage.value = ''
  savedMessage.value = ''
  tagBusy.value = true
  try {
    const n = await renameTag(from, to)
    savedMessage.value = `タグ「${from}」を「${to}」に変えました（${n}件）。`
    editingTag.value = ''
  } catch (e) {
    errorMessage.value = apiMessage(e, 'タグの名前を変えられませんでした。もう一度お試しください。')
  }
  tagBusy.value = false
}

async function confirmTagDelete() {
  const tag = deletingTag.value
  errorMessage.value = ''
  savedMessage.value = ''
  tagBusy.value = true
  try {
    const n = await removeTag(tag)
    savedMessage.value = `タグ「${tag}」を消しました（${n}件の議事録から外しました）。`
  } catch (e) {
    errorMessage.value = apiMessage(e, 'タグを消せませんでした。もう一度お試しください。')
  }
  deletingTag.value = ''
  tagBusy.value = false
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
  pendingApproval.value = false
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
.kk-set-tag-total {
  margin-right: auto;
  margin-left: 0.3rem;
  font-size: 10.5px;
  color: var(--kk-accent-strong);
  background: var(--kk-accent-soft);
  border-radius: 999px;
  padding: 0 0.4rem;
}
.kk-set-tags {
  list-style: none;
  margin: 0.2rem 0 0;
  padding: 0;
  max-height: 14rem;
  overflow-y: auto;
}
.kk-set-tag {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  min-height: 30px;
  border-top: 1px dashed var(--kk-line);
}
.kk-set-tag:first-child {
  border-top: 0;
}
.kk-set-tag-link {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-right: 0.35rem;
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  text-decoration: none;
}
.kk-set-tag-link:hover {
  background: var(--kk-accent-soft);
}
.kk-set-tag-link.is-on {
  background: var(--kk-accent);
}
.kk-set-tag-link.is-on .kk-set-tag-name,
.kk-set-tag-link.is-on .kk-set-tag-count {
  color: #fff;
}
.kk-set-tag-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--kk-accent-strong);
}
.kk-set-tag-count {
  font-size: 11px;
  color: var(--kk-ink-faint);
  margin-right: 0.15rem;
}
.kk-set-tag-icon {
  flex: none;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--kk-ink-faint);
  font-size: 11px;
  cursor: pointer;
}
.kk-set-tag-icon svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.kk-set-tag-icon:hover {
  background: var(--kk-accent-soft);
  color: var(--kk-accent-strong);
}
.kk-set-tag-icon.is-danger:hover {
  background: var(--kk-danger-soft);
  color: var(--kk-danger);
}
.kk-set-tag-input {
  flex: 1;
  min-width: 0;
  padding: 0.15rem 0.4rem;
}
.kk-set-tag-ok {
  flex: none;
  height: 26px;
  padding: 0 0.55rem;
  border: 0;
  border-radius: 999px;
  background: var(--kk-accent);
  color: #fff;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
}
.kk-set-tag-ok:disabled {
  opacity: 0.5;
}
.kk-set-pdf-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.kk-set-pdf-saved {
  margin-left: auto;
  font-size: 11px;
  color: var(--kk-accent-strong);
  white-space: nowrap;
}
.kk-set-pdf-select {
  width: auto;
  margin-left: auto;
  padding: 0.2rem 0.4rem;
}
.kk-set-pdf-saved + .kk-set-pdf-select {
  margin-left: 0;
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
