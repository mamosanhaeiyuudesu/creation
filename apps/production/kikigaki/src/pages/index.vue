<template>
  <div>
    <!-- ログインしているか分かるまでは何も出さない（一瞬ログイン画面が見えるのを防ぐ） -->
    <p v-if="!checked" class="kk-lead py-10 text-center">読み込んでいます…</p>

    <!-- ── ログインしていないとき ───────────────────────────── -->
    <template v-else-if="!isLoggedIn">
      <h1 class="kk-h1 mt-6">会議の文章から<br>議事録をつくります</h1>
      <p class="kk-lead mt-2">
        会議の内容を書いた文章をえらぶか貼り付けるだけ。AIが話し合いの内容を1枚にまとめます。
        できた議事録はその場で直せて、PDFにして配れます。
      </p>

      <p v-if="errorMessage" class="kk-notice kk-notice--error mt-4">{{ errorMessage }}</p>

      <div class="mt-5">
        <button class="kk-btn" :disabled="busy" @click="loginWithGoogle">
          Googleではじめる
        </button>

        <!-- メールのリンクでログイン。押すまでは入力欄を出さない（画面の要素を減らす） -->
        <div class="mt-2">
          <button v-if="!showEmailForm" class="kk-btn-sub" :disabled="busy" @click="showEmailForm = true">
            メールアドレスではじめる
          </button>

          <div v-else class="kk-card px-4 py-4">
            <template v-if="!linkSentTo">
              <label class="kk-field-label" for="login-email">メールアドレス</label>
              <input
                id="login-email"
                v-model="email"
                type="email"
                inputmode="email"
                autocomplete="email"
                placeholder="れい: tanaka@example.com"
                class="kk-input"
                @keyup.enter="sendLink"
              >
              <p class="kk-note mt-2">
                パスワードはありません。入力したアドレスにログイン用のリンクを送ります。
              </p>
              <button class="kk-btn mt-4" :disabled="busy || !email.trim()" @click="sendLink">
                ログイン用のリンクを送る
              </button>
              <button class="kk-btn-text mt-2 mx-auto block" :disabled="busy" @click="showEmailForm = false">
                やめる
              </button>
            </template>

            <template v-else>
              <p class="kk-h2">メールを送りました</p>
              <p class="kk-lead mt-3">
                <strong>{{ linkSentTo }}</strong> にログイン用のリンクを送りました。
                メールを開いて、中のボタン（リンク）を押してください。
              </p>
              <p class="kk-note mt-3">
                数分たっても届かないときは、迷惑メールのフォルダをご確認ください。
                それでも無いときは、アドレスを打ち直してもう一度お試しください。
              </p>
              <button class="kk-btn-sub mt-4" @click="resetEmailForm">別のアドレスで送り直す</button>
            </template>
          </div>
        </div>
      </div>

      <p class="kk-note mt-5">
        はじめる前に<NuxtLink to="/terms" class="underline">利用規約</NuxtLink>と<NuxtLink to="/privacy" class="underline">プライバシーポリシー</NuxtLink>をご確認ください。
      </p>
    </template>

    <!-- ── ログインしているとき ─────────────────────────────── -->
    <template v-else>
      <p v-if="errorMessage" class="kk-notice kk-notice--error mb-3">{{ errorMessage }}</p>
      <p v-if="savedMessage" class="kk-notice kk-notice--info kk-msg mb-3">
        <span>{{ savedMessage }}</span>
        <button type="button" class="kk-msg-close" aria-label="閉じる" @click="savedMessage = ''">✕</button>
      </p>

      <!-- ドライブにつながっていないと、PDFをドライブに残せない。気づかれないと困るので帯で目立たせる -->
      <section v-if="!driveConnected" class="kk-drive-banner mb-3" role="alert">
        <span class="kk-drive-banner-dot" aria-hidden="true">!</span>
        <p class="flex-1 min-w-0 m-0">
          <strong>Googleドライブとつながっていません。</strong>
          つなぐと、つくったPDFが自動でドライブの「キキガキ議事録」フォルダに保存されます。
        </p>
        <button class="kk-drive-banner-btn" :disabled="driveBusy" @click="connectDrive">
          {{ driveBusy ? '画面をひらいています…' : 'ドライブとつなぐ' }}
        </button>
      </section>

      <h1 class="kk-h1 m-0">議事録</h1>
      <p class="kk-note m-0">会議の文章をえらぶか貼り付けると、AIが1枚の議事録にまとめます。</p>

      <!-- はじめる操作。押しても画面は変わらず、下のシートで入力する -->
      <div class="kk-actions mt-3">
        <button type="button" class="kk-action kk-action--main" @click="showTextSheet = true">
          <span class="kk-action-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </span>
          <span class="min-w-0">
            <span class="kk-action-title">文章から議事録をつくる</span>
            <span class="kk-action-desc">.txt をえらぶか、文章を貼り付け</span>
          </span>
        </button>
      </div>

      <MinutesTextSheet v-model="showTextSheet" />
      <MinutesPdfMaker ref="pdfMaker" />

      <!-- 削除の確認（確認画面と同じ文言）。消している間は閉じられないようにする -->
      <BottomSheet
        :model-value="!!pendingDelete"
        title="この議事録を消しますか？"
        :closable="!deleting"
        @update:model-value="pendingDelete = null"
      >
        <p class="kk-lead m-0"><strong>{{ pendingDelete?.title || '（名前のない議事録）' }}</strong></p>
        <p class="kk-lead mt-1">一度消すと元には戻せません。</p>
        <div class="mt-4 flex flex-col gap-2">
          <button class="kk-btn-sub" :disabled="deleting" @click="removeRow">
            {{ deleting ? '消しています…' : 'はい、消します' }}
          </button>
          <button class="kk-btn-text" :disabled="deleting" @click="pendingDelete = null">やめる</button>
        </div>
      </BottomSheet>

      <section class="kk-card kk-list mt-4">
        <div class="kk-list-head">
          <h2 class="kk-h2 m-0">これまでの議事録</h2>
          <span v-if="records.length" class="kk-note">{{ records.length }}件</span>
        </div>

        <p v-if="loadingRecords" class="kk-lead px-4 py-6 m-0">読み込んでいます…</p>

        <p v-else-if="!records.length" class="kk-lead px-4 py-8 m-0 text-center">
          まだ議事録はありません。<br>
          上の「文章から議事録をつくる」から、会議の文章をえらんでください。
        </p>

        <table v-else class="kk-table">
          <thead>
            <tr>
              <th>会議の名前</th>
              <th class="kk-col-date">会議の日</th>
              <th class="kk-col-created">つくった日</th>
              <th class="kk-col-actions"><span class="sr-only">操作</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in records" :key="r.id" @click="router.push(`/records/${r.id}`)">
              <td>
                <NuxtLink :to="`/records/${r.id}`" class="kk-row-title" @click.stop>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h9l3 3v13H6z" /><path d="M9 11h6M9 15h6" /></svg>
                  <span class="truncate">{{ r.title || '（名前のない議事録）' }}</span>
                </NuxtLink>
                <span class="kk-row-sub">{{ r.dateLabel }}</span>
              </td>
              <td class="kk-col-date">{{ r.date ? formatDateLabel(r.date) : '—' }}</td>
              <td class="kk-col-created">{{ r.createdLabel }}</td>
              <!-- 開かずにPDF・ドライブ保存。行を押すと開くので、ここだけ伝わらないよう止める -->
              <td class="kk-col-actions" @click.stop>
                <div class="kk-row-actions">
                  <button
                    v-if="driveConnected"
                    type="button"
                    class="kk-row-icon"
                    :disabled="!!rowBusy"
                    :aria-label="`${r.title || '議事録'}をGoogleドライブに保存`"
                    title="Googleドライブに保存"
                    @click="driveRow(r)"
                  >
                    <span v-if="rowBusy?.id === r.id && rowBusy.kind === 'drive'" class="kk-row-spin" />
                    <GoogleDriveIcon v-else />
                  </button>
                  <button
                    type="button"
                    class="kk-row-icon"
                    :disabled="!!rowBusy"
                    :aria-label="`${r.title || '議事録'}のPDFをダウンロード`"
                    title="PDFのダウンロード"
                    @click="downloadRow(r)"
                  >
                    <span v-if="rowBusy?.id === r.id && rowBusy.kind === 'pdf'" class="kk-row-spin" />
                    <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></svg>
                  </button>
                  <button
                    type="button"
                    class="kk-row-icon kk-row-icon--danger"
                    :disabled="!!rowBusy"
                    :aria-label="`${r.title || '議事録'}を削除`"
                    title="削除"
                    @click="pendingDelete = r"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { SERVICE } from '~/config/service'
import { apiMessage } from '~/utils/apiMessage'
import { formatDateLabel, formatMeetingDate } from '~/utils/formatDate'
import type { MinutesRecord, RecordSummary } from '~/types/minutes'
import type MinutesPdfMakerType from '~/components/MinutesPdfMaker.vue'

useHead({ title: `${SERVICE.name} — 会議の文章から議事録を` })

const router = useRouter()
const { isLoggedIn, checked, signInWithGoogle, sendLoginLink, catchRedirectError, authedFetch } = useAuth()

const errorMessage = ref('')
const busy = ref(false)
const showEmailForm = ref(false)
const email = ref('')
const linkSentTo = ref('')

const { connected: driveConnected, refresh: refreshDrive, connect: connectDriveNow, ensureToken, uploadPdf } = useDrive()
const driveBusy = ref(false)

async function connectDrive() {
  errorMessage.value = ''
  driveBusy.value = true
  try {
    await connectDriveNow()
  } catch (e) {
    errorMessage.value = apiMessage(e)
  }
  driveBusy.value = false
}

const records = ref<(RecordSummary & { dateLabel: string; createdLabel: string })[]>([])
const loadingRecords = ref(false)

const showTextSheet = ref(false)

// ── 一覧から開かずにPDF・ドライブ保存 ──
const savedMessage = ref('')
const pdfMaker = ref<InstanceType<typeof MinutesPdfMakerType> | null>(null)
/** いま作っている行。PDFづくりは画面外の1枚の版を使い回すので、同時には1件だけにする */
const rowBusy = ref<{ id: string; kind: 'pdf' | 'drive' } | null>(null)

/** 保存されている内容でPDFをつくる（確認画面で保存していない直しは入らない） */
async function makeRowPdf(id: string) {
  const res = await authedFetch<{ record: MinutesRecord }>(`/api/records/${id}`)
  if (!pdfMaker.value) throw new Error('PDFの中身を用意できませんでした。画面を開き直してお試しください。')
  return await pdfMaker.value.make(res.record.minutes)
}

// ── 一覧から削除 ──
const pendingDelete = ref<RecordSummary | null>(null)
const deleting = ref(false)

async function removeRow() {
  const r = pendingDelete.value
  if (!r) return
  errorMessage.value = ''
  savedMessage.value = ''
  deleting.value = true
  try {
    await authedFetch(`/api/records/${r.id}`, { method: 'DELETE' })
    records.value = records.value.filter((x) => x.id !== r.id)
    savedMessage.value = `「${r.title || '議事録'}」を消しました。`
    pendingDelete.value = null
  } catch (e) {
    errorMessage.value = apiMessage(e, '消せませんでした。もう一度お試しください。')
    pendingDelete.value = null
  }
  deleting.value = false
}

async function downloadRow(r: RecordSummary) {
  errorMessage.value = ''
  savedMessage.value = ''
  rowBusy.value = { id: r.id, kind: 'pdf' }
  try {
    const { pdf, fileName } = await makeRowPdf(r.id)
    pdf.save(fileName)
    savedMessage.value = `「${r.title || '議事録'}」のPDFを保存しました。`
  } catch (e) {
    errorMessage.value = apiMessage(e, 'PDFをつくれませんでした。もう一度お試しください。')
  }
  rowBusy.value = null
}

async function driveRow(r: RecordSummary) {
  errorMessage.value = ''
  savedMessage.value = ''
  rowBusy.value = { id: r.id, kind: 'drive' }
  try {
    // 許可の画面はボタンを押した直後でないとブラウザに止められるので、PDF作りより先に権限を取る
    await ensureToken()
  } catch (e) {
    errorMessage.value = apiMessage(e, 'Googleドライブとつなげませんでした。もう一度お試しください。')
    rowBusy.value = null
    return
  }
  try {
    const { pdf, fileName } = await makeRowPdf(r.id)
    await uploadPdf(pdf.output('blob'), fileName)
    savedMessage.value = `「${r.title || '議事録'}」をGoogleドライブの「キキガキ議事録」フォルダに保存しました（同じ名前のPDFは上書きしました）。`
  } catch (e) {
    errorMessage.value = apiMessage(e, 'ドライブに保存できませんでした。もう一度お試しください。')
  }
  rowBusy.value = null
}

async function loginWithGoogle() {
  errorMessage.value = ''
  busy.value = true
  try {
    await signInWithGoogle()
  } catch (e) {
    errorMessage.value = apiMessage(e)
  }
  busy.value = false
}

async function sendLink() {
  errorMessage.value = ''
  busy.value = true
  try {
    const address = email.value.trim()
    await sendLoginLink(address)
    linkSentTo.value = address
  } catch (e) {
    errorMessage.value = apiMessage(e)
  }
  busy.value = false
}

function resetEmailForm() {
  linkSentTo.value = ''
  email.value = ''
  errorMessage.value = ''
}

async function loadRecords() {
  loadingRecords.value = true
  try {
    const res = await authedFetch<{ records: RecordSummary[] }>('/api/records')
    records.value = res.records.map((r) => ({
      ...r,
      dateLabel: formatMeetingDate(r.date, r.createdAt),
      createdLabel: formatDateLabel((r.createdAt ?? '').slice(0, 10)) || '—',
    }))
  } catch (e) {
    errorMessage.value = apiMessage(e, '議事録の一覧を読み込めませんでした。画面を開き直してみてください。')
    records.value = []
  }
  loadingRecords.value = false
}

// ログインが済んだ時点で読み込む（この watch が無いと、ログイン直後に一覧が空のまま見える）
watch(isLoggedIn, async (v) => {
  if (v) await loadRecords()
  else records.value = []
})

onMounted(async () => {
  refreshDrive()
  const redirectError = await catchRedirectError()
  if (redirectError) errorMessage.value = redirectError
  if (isLoggedIn.value) await loadRecords()
})
</script>

<style scoped>
.kk-drive-banner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  padding: 0.55rem 0.8rem;
  border-radius: 8px;
  border: 1px solid #f5c58c;
  background: var(--kk-cta-soft);
  color: #6b3f06;
  font-size: 13px;
  line-height: 1.6;
}
.kk-drive-banner-dot {
  width: 20px;
  height: 20px;
  flex: none;
  border-radius: 999px;
  background: var(--kk-cta);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.kk-drive-banner-btn {
  flex: none;
  padding: 0.35rem 0.9rem;
  border: 0;
  border-radius: 999px;
  background: var(--kk-cta);
  color: #fff;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}
.kk-drive-banner-btn:hover:not(:disabled) { background: var(--kk-cta-strong); }
.kk-drive-banner-btn:disabled { opacity: 0.5; cursor: default; }

/* はじめる操作のカード（Notta の「録音開始」「アップロード」の並びにならう） */
.kk-actions {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.6rem;
}
.kk-action {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--kk-line);
  border-radius: 10px;
  background: var(--kk-panel);
  box-shadow: var(--kk-shadow);
  font-family: inherit;
  text-align: left;
  color: var(--kk-ink);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.kk-action:hover {
  border-color: var(--kk-accent);
  box-shadow: 0 4px 16px rgba(29, 111, 214, 0.14);
}
.kk-action-icon {
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 9px;
  background: var(--kk-cta);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.kk-action-icon svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: #fff;
  stroke-width: 2.4;
  stroke-linecap: round;
}
.kk-action-title {
  display: block;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
}
.kk-action-desc {
  display: block;
  font-size: 11.5px;
  color: var(--kk-ink-faint);
  line-height: 1.5;
}

/* 一覧（表形式。1行を低くして一度にたくさん見えるようにする） */
.kk-list {
  overflow: hidden;
}
.kk-list-head {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--kk-line);
}
.kk-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.kk-table th {
  padding: 0.4rem 1rem;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--kk-ink-faint);
  text-align: left;
  background: #f8fafd;
  border-bottom: 1px solid var(--kk-line);
}
.kk-table td {
  padding: 0.5rem 1rem;
  font-size: 13px;
  color: var(--kk-ink-soft);
  border-bottom: 1px solid var(--kk-line);
  vertical-align: middle;
}
.kk-table tbody tr {
  cursor: pointer;
  transition: background-color 0.1s;
}
.kk-table tbody tr:hover {
  background: var(--kk-accent-soft);
}
.kk-table tbody tr:last-child td {
  border-bottom: 0;
}
.kk-row-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--kk-ink);
  text-decoration: none;
}
.kk-row-title svg {
  width: 16px;
  height: 16px;
  flex: none;
  fill: none;
  stroke: var(--kk-accent);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
/* 行の右端の操作（アイコンのみ） */
.kk-col-actions {
  width: 116px;
  padding-left: 0.25rem !important;
  padding-right: 0.6rem !important;
}
.kk-row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.15rem;
}
.kk-row-icon {
  width: 32px;
  height: 32px;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--kk-ink-soft);
  cursor: pointer;
}
.kk-row-icon:hover:not(:disabled) {
  border-color: var(--kk-line);
  background: #fff;
  color: var(--kk-accent-strong);
}
.kk-row-icon--danger:hover:not(:disabled) {
  color: var(--kk-danger);
  background: var(--kk-danger-soft);
  border-color: #f0c2c2;
}
.kk-row-icon:disabled {
  opacity: 0.4;
  cursor: default;
}
.kk-row-icon svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.kk-row-spin {
  width: 15px;
  height: 15px;
  border-radius: 999px;
  border: 2px solid var(--kk-accent);
  border-top-color: transparent;
  animation: kk-spin 0.8s linear infinite;
}
@keyframes kk-spin {
  to { transform: rotate(360deg); }
}
.kk-msg {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}
.kk-msg-close {
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0.1rem 0.3rem;
}

/* スマホでは列を畳み、日付は名前の下に出す */
.kk-row-sub {
  display: block;
  padding-left: 1.5rem;
  font-size: 11.5px;
  color: var(--kk-ink-faint);
}
.kk-col-date,
.kk-col-created {
  display: none;
}
@media (min-width: 640px) {
  .kk-row-sub {
    display: none;
  }
  .kk-col-date {
    display: table-cell;
    width: 190px;
  }
}
@media (min-width: 900px) {
  .kk-col-created {
    display: table-cell;
    width: 190px;
  }
}
</style>
