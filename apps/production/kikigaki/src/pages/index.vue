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

      <!-- 承認制で、まだ承認されていない人。押しても AI を呼ばないよう、はじめる操作を止める -->
      <p v-if="pendingApproval" class="kk-notice kk-notice--info mt-3 mb-0">
        <strong>ただいま利用の準備中です。</strong>
        準備ができしだい、議事録をつくれるようになります。しばらくお待ちください。
      </p>

      <!-- はじめる操作。押しても画面は変わらず、下のシートで入力する -->
      <div class="kk-actions mt-3">
        <button type="button" class="kk-action kk-action--main" :disabled="pendingApproval" @click="showTextSheet = true">
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
          <span v-if="records.length" class="kk-note">
            {{ activeTag ? `${filteredRecords.length} / ${records.length}件` : `${records.length}件` }}
          </span>
          <!-- 並び順（新しい順）。選んだものは URL（?sort=）に残す。列の見出しを押しても切り替わる -->
          <div v-if="records.length" class="kk-sort" role="group" aria-label="並び順">
            <span class="kk-sort-label">並び</span>
            <button type="button" class="kk-sort-btn" :class="{ 'is-on': sortKey === 'date' }" @click="setSort('date')">会議の日</button>
            <button type="button" class="kk-sort-btn" :class="{ 'is-on': sortKey === 'created' }" @click="setSort('created')">つくった日</button>
          </div>
        </div>

        <!-- タグで絞り込む（1つだけ選ぶ。既定は「すべて」）。多い順に並べ、入りきらなければ横にスクロール。
             選んだタグは URL（?tag=）に残す＝議事録を開いて戻っても絞り込んだまま -->
        <div v-if="tagCounts.length" class="kk-tagbar" role="group" aria-label="タグで絞り込む">
          <button type="button" class="kk-tagbar-chip" :class="{ 'is-on': !activeTag }" @click="setTag('')">
            すべて<span class="kk-tagbar-count">{{ records.length }}</span>
          </button>
          <button
            v-for="t in tagCounts"
            :key="t.tag"
            type="button"
            class="kk-tagbar-chip"
            :class="{ 'is-on': activeTag === t.tag }"
            @click="setTag(t.tag)"
          >
            #{{ t.tag }}<span class="kk-tagbar-count">{{ t.count }}</span>
          </button>
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
              <th class="kk-col-date">
                <button type="button" class="kk-th-sort" :class="{ 'is-on': sortKey === 'date' }" @click="setSort('date')">
                  会議の日<span v-if="sortKey === 'date'" aria-hidden="true"> ↓</span>
                </button>
              </th>
              <th class="kk-col-created">
                <button type="button" class="kk-th-sort" :class="{ 'is-on': sortKey === 'created' }" @click="setSort('created')">
                  つくった日<span v-if="sortKey === 'created'" aria-hidden="true"> ↓</span>
                </button>
              </th>
              <th class="kk-col-actions"><span class="sr-only">操作</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in sortedRecords" :key="r.id" @click="openRow(r.id)">
              <td>
                <!-- 名前を変えている行は入力欄にする（Enter・欄を離れると保存、Esc でやめる） -->
                <div v-if="editingId === r.id" class="kk-row-edit" @click.stop>
                  <input
                    ref="titleInput"
                    v-model="titleDraft"
                    class="kk-input kk-row-edit-input"
                    :maxlength="MAX_TITLE_LENGTH"
                    aria-label="会議の名前"
                    :disabled="titleSaving"
                    @keydown.enter="onTitleEnter"
                    @keydown.esc="cancelTitle"
                    @blur="saveTitle"
                  >
                </div>
                <div v-else class="kk-row-head">
                  <!-- 名前と「名前を変える」は離さない（名前が長くても、ボタンだけ次の行に落ちないように） -->
                  <span class="kk-row-name">
                    <NuxtLink :to="`/records/${r.id}`" class="kk-row-title" @click.stop>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h9l3 3v13H6z" /><path d="M9 11h6M9 15h6" /></svg>
                      <span class="truncate">{{ r.title || '（名前のない議事録）' }}</span>
                    </NuxtLink>
                    <button
                      type="button"
                      class="kk-row-icon kk-row-rename"
                      :disabled="!!rowBusy"
                      :aria-label="`${r.title || '議事録'}の名前を変える`"
                      title="名前を変える"
                      @click.stop="startTitle(r)"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16zM13 7l4 4" /></svg>
                    </button>
                  </span>
                  <!-- 行のタグを押しても、そのタグで絞り込める -->
                  <button
                    v-for="t in r.tags"
                    :key="t"
                    type="button"
                    class="kk-row-tag"
                    :class="{ 'is-on': activeTag === t }"
                    :title="`「${t}」で絞り込む`"
                    @click.stop="setTag(t)"
                  >
                    #{{ t }}
                  </button>
                </div>
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
import { countTags } from '~/utils/tags'
import { parseSortKey, sortRecords, type RecordSortKey } from '~/utils/sortRecords'

/** 会議の名前の上限（サーバーの MAX_TITLE_LENGTH と同じ） */
const MAX_TITLE_LENGTH = 100
import type { MinutesRecord, RecordSummary } from '~/types/minutes'
import type MinutesPdfMakerType from '~/components/MinutesPdfMaker.vue'

useHead({ title: `${SERVICE.name} — 会議の文章から議事録を` })

const router = useRouter()
const route = useRoute()
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

// ── タグで絞り込む ──
const { version: tagsVersion, load: loadTags } = useTags()
const tagCounts = computed(() => countTags(records.value))
/** 選んでいるタグ（URL の ?tag=）。いまの一覧に無いタグ（消した・名前を変えた）なら「すべて」扱い */
const activeTag = computed(() => {
  const t = String(route.query.tag ?? '')
  return tagCounts.value.some((c) => c.tag === t) ? t : ''
})
const filteredRecords = computed(() =>
  activeTag.value ? records.value.filter((r) => r.tags.includes(activeTag.value)) : records.value
)

// ── 並び順（既定は会議の日の新しい順） ──
const sortKey = computed<RecordSortKey>(() => parseSortKey(route.query.sort))
const sortedRecords = computed(() => sortRecords(filteredRecords.value, sortKey.value))

function setSort(key: RecordSortKey) {
  router.replace({ query: { ...route.query, sort: key === 'date' ? undefined : key } })
}

// ── 一覧から会議の名前を変える ──
const editingId = ref('')
const titleDraft = ref('')
const titleSaving = ref(false)
const titleInput = ref<HTMLInputElement[] | HTMLInputElement | null>(null)

function openRow(id: string) {
  // 名前を変えている最中は、行を押しても開かない
  if (editingId.value) return
  router.push(`/records/${id}`)
}

function startTitle(r: RecordSummary) {
  editingId.value = r.id
  titleDraft.value = r.title
  nextTick(() => {
    const el = Array.isArray(titleInput.value) ? titleInput.value[0] : titleInput.value
    el?.focus()
    el?.select()
  })
}

function cancelTitle() {
  editingId.value = ''
}

/** Enter で保存（IMEの変換確定のEnterでは保存しない） */
function onTitleEnter(e: KeyboardEvent) {
  if (e.isComposing || e.keyCode === 229) return
  e.preventDefault()
  saveTitle()
}

async function saveTitle() {
  const id = editingId.value
  if (!id || titleSaving.value) return
  const row = records.value.find((r) => r.id === id)
  const next = titleDraft.value.replace(/\s+/g, ' ').trim()
  // 変わっていなければ閉じるだけ
  if (!row || next === row.title) {
    editingId.value = ''
    return
  }
  errorMessage.value = ''
  titleSaving.value = true
  try {
    const res = await authedFetch<{ title: string }>(`/api/records/${id}/title`, { method: 'PATCH', body: { title: next } })
    row.title = res.title
    editingId.value = ''
  } catch (e) {
    errorMessage.value = apiMessage(e, '会議の名前を変えられませんでした。もう一度お試しください。')
  }
  titleSaving.value = false
}

function setTag(tag: string) {
  // 履歴を増やさない（戻るボタンで絞り込みを1つずつ遡らないように）
  router.replace({ query: tag ? { ...route.query, tag } : { ...route.query, tag: undefined } })
}

// 左メニューでタグの名前を変えた・消したら読み直す
watch(tagsVersion, () => {
  if (isLoggedIn.value) loadRecords()
})
const pendingApproval = useState<boolean>('kk-pending-approval', () => false)

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
    // 左メニューのタグの件数を合わせる
    loadTags().catch(() => {})
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
.kk-action:disabled {
  opacity: 0.5;
  cursor: default;
  box-shadow: none;
}
.kk-action:hover:not(:disabled) {
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
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--kk-line);
}
/* タグの絞り込み */
.kk-tagbar {
  display: flex;
  gap: 0.35rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--kk-line);
  overflow-x: auto;
  scrollbar-width: thin;
}
.kk-tagbar-chip {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  height: 28px;
  padding: 0 0.7rem;
  border: 1px solid var(--kk-line);
  border-radius: 999px;
  background: #fff;
  font-family: inherit;
  font-size: 12.5px;
  color: var(--kk-ink-soft);
  white-space: nowrap;
  cursor: pointer;
}
.kk-tagbar-chip:hover {
  border-color: var(--kk-accent);
}
.kk-tagbar-chip.is-on {
  border-color: var(--kk-accent);
  background: var(--kk-accent);
  color: #fff;
  font-weight: 700;
}
.kk-tagbar-count {
  font-size: 11px;
  opacity: 0.7;
}

/* 並び順の切り替え */
.kk-sort {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}
.kk-sort-label {
  font-size: 11.5px;
  color: var(--kk-ink-faint);
  margin-right: 0.15rem;
}
.kk-sort-btn {
  height: 26px;
  padding: 0 0.6rem;
  border: 1px solid var(--kk-line);
  border-radius: 999px;
  background: #fff;
  font-family: inherit;
  font-size: 12px;
  color: var(--kk-ink-soft);
  cursor: pointer;
}
.kk-sort-btn.is-on {
  border-color: var(--kk-accent);
  background: var(--kk-accent-soft);
  color: var(--kk-accent-strong);
  font-weight: 700;
}
.kk-th-sort {
  border: 0;
  padding: 0;
  background: transparent;
  font: inherit;
  color: inherit;
  cursor: pointer;
}
.kk-th-sort:hover,
.kk-th-sort.is-on {
  color: var(--kk-accent-strong);
}
.kk-th-sort.is-on {
  font-weight: 700;
}

/* 一覧で名前を変えるときの入力欄 */
.kk-row-edit-input {
  width: 100%;
  padding: 0.25rem 0.5rem;
  font-weight: 700;
}

/* 行の中のタグ（会議の名前の横） */
.kk-row-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem 0.4rem;
  min-width: 0;
}
.kk-row-name {
  display: inline-flex;
  align-items: center;
  gap: 0.1rem;
  min-width: 0;
  max-width: 100%;
}
.kk-row-name .kk-row-title {
  min-width: 0;
}
/* 名前の右の「名前を変える」。右端の操作より一回り小さくして、名前の邪魔をしない */
.kk-row-icon.kk-row-rename {
  width: 26px;
  height: 26px;
}
.kk-row-icon.kk-row-rename svg {
  width: 14px;
  height: 14px;
}
.kk-row-tag {
  flex: none;
  height: 20px;
  padding: 0 0.45rem;
  border: 0;
  border-radius: 999px;
  background: var(--kk-accent-soft);
  color: var(--kk-accent-strong);
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.kk-row-tag:hover,
.kk-row-tag.is-on {
  background: var(--kk-accent);
  color: #fff;
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
  width: 120px;
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
