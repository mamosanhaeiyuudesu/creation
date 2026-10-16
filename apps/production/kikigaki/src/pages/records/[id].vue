<template>
  <div class="kk-review">
    <p v-if="loading" class="kk-lead py-10 text-center">読み込んでいます…</p>

    <template v-else-if="record">
      <!-- 見出しと操作を1行に。PDFのように左右に並べて、スクロールせず全体が見えるようにする -->
      <div class="kk-review-head">
        <div class="kk-review-title">
          <NuxtLink to="/" class="kk-back" title="一覧へ" aria-label="一覧へ">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </NuxtLink>
          <div class="min-w-0">
            <h1 class="kk-review-h1">内容をたしかめる</h1>
            <p class="kk-note m-0 truncate">AIがまとめた内容です。ちがうところは直して、できたら「PDFのダウンロード」を押してください。</p>
          </div>
        </div>

        <div ref="toolsRoot" class="kk-head-actions">
          <!-- 聞き取れなかったところ・AIに直してもらう は普段は小さく畳み、押したときだけ下に開く -->
          <div v-if="minutes.unclearPoints.length" class="kk-pop-wrap">
            <button
              type="button"
              class="kk-icon-btn kk-icon-btn--warn"
              :class="{ 'is-open': openPop === 'unclear' }"
              :aria-expanded="openPop === 'unclear'"
              @click="togglePop('unclear')"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></svg>
              聞き取れなかった所
              <span class="kk-badge">{{ minutes.unclearPoints.length }}</span>
            </button>
            <div v-if="openPop === 'unclear'" class="kk-pop" role="dialog" aria-label="AIが聞き取れなかったところ">
              <p class="kk-pop-title">AIが聞き取れなかったところ</p>
              <ul class="kk-pop-list">
                <li v-for="(p, i) in minutes.unclearPoints" :key="i">{{ p }}</li>
              </ul>
              <p class="kk-note mt-2 mb-0">このあたりは、ご自分の記憶とあわせて確かめてください。</p>
            </div>
          </div>

          <div class="kk-pop-wrap">
            <button
              type="button"
              class="kk-icon-btn kk-icon-btn--ai"
              :class="{ 'is-open': openPop === 'revise' }"
              :aria-expanded="openPop === 'revise'"
              :disabled="revising"
              @click="togglePop('revise')"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" /></svg>
              {{ revising ? 'AIが直しています…' : 'AIに直してもらう' }}
            </button>
            <div v-if="openPop === 'revise'" class="kk-pop kk-pop--wide" role="dialog" aria-label="AIに直してもらう">
              <p class="kk-pop-title">AIに直してほしいこと</p>
              <textarea
                ref="reviseInput"
                v-model="reviseInstruction"
                rows="3"
                class="kk-input resize-none"
                placeholder="れい: 阪中さんを坂中さんに直して"
                aria-label="AIに直してほしいこと"
                @keydown.enter.exact="onReviseEnter"
              />
              <div class="flex items-center justify-between gap-2 mt-2">
                <span class="kk-note">Shift+Enter で改行</span>
                <button type="button" class="kk-pop-run" :disabled="revising || !reviseInstruction.trim()" @click="runRevise">
                  {{ revising ? '直しています…' : '直してもらう' }}
                </button>
              </div>
            </div>
          </div>

          <span class="kk-head-sep" aria-hidden="true" />

          <button type="button" class="kk-icon-btn kk-icon-btn--danger" title="削除" @click="confirmingDelete = true">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
            削除
          </button>
          <!-- 保存・ドライブ・PDF。PCでは見出しの右に並べ、スマホでは画面の下に固定する（ai-tools 版と同じ置き方。
               長い議事録を下まで読んでも、上に戻らずに押せるように） -->
          <div class="kk-save-bar">
          <button type="button" class="kk-icon-btn" :disabled="saving || generatingPdf" title="保存" @click="save">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6" /></svg>
            {{ saving ? '保存中…' : '保存' }}
          </button>
          <button
            v-if="driveConnected"
            type="button"
            class="kk-icon-btn"
            :disabled="generatingPdf || saving || driveSaving"
            title="Googleドライブに保存"
            @click="saveToDrive"
          >
            <GoogleDriveIcon />
            <template v-if="driveSaving">保存中…</template>
            <template v-else><span class="kk-lbl-long">ドライブに保存</span><span class="kk-lbl-short">ドライブ</span></template>
          </button>
          <button type="button" class="kk-icon-btn kk-icon-btn--primary" :disabled="generatingPdf || saving || driveSaving" title="PDFのダウンロード" @click="downloadPdf">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></svg>
            <template v-if="generatingPdf">PDF作成中…</template>
            <template v-else><span class="kk-lbl-long">PDFのダウンロード</span><span class="kk-lbl-short">PDF</span></template>
          </button>
          </div>
        </div>
      </div>

      <p v-if="errorMessage" class="kk-notice kk-notice--error kk-msg mt-2">
        <span>{{ errorMessage }}</span>
        <button type="button" class="kk-msg-close" aria-label="閉じる" @click="errorMessage = ''">✕</button>
      </p>
      <p v-if="savedMessage" class="kk-notice kk-notice--info kk-msg mt-2">
        <span>{{ savedMessage }}</span>
        <button type="button" class="kk-msg-close" aria-label="閉じる" @click="savedMessage = ''">✕</button>
      </p>

      <div class="kk-review-grid">
        <div v-for="col in ['left', 'right']" :key="col" class="kk-review-col">
          <!-- 左だけ: 会議の名前・日・まとめ -->
          <template v-if="col === 'left'">
            <section class="kk-card kk-review-card">
              <div class="kk-meta-row">
                <div class="flex-1 min-w-0">
                  <label class="kk-field-label" for="minutes-title">会議の名前</label>
                  <input id="minutes-title" v-model="minutes.title" class="kk-input" placeholder="れい: 青年部の定例会">
                </div>
                <div class="kk-meta-date">
                  <label class="kk-field-label" for="minutes-date">会議をした日</label>
                  <input id="minutes-date" v-model="minutes.date" type="date" class="kk-input">
                </div>
              </div>
              <!-- 参加者は1人1欄。末尾の空欄に入れて Enter（または欄を離れる）と確定し、次の空欄が出る -->
              <p class="kk-field-label mt-2">会議の参加者<span class="kk-sec-count ml-1">{{ minutes.participants.length }}</span></p>
              <ul class="kk-people">
                <li v-for="(_, i) in minutes.participants" :key="i" class="kk-person">
                  <input
                    v-model="minutes.participants[i]"
                    class="kk-input kk-person-input"
                    :aria-label="`参加者${i + 1}`"
                    @keydown.enter="onPersonEnter"
                  >
                  <button type="button" class="kk-person-del" :aria-label="`${minutes.participants[i] || '参加者'}を外す`" @click="minutes.participants.splice(i, 1)">✕</button>
                </li>
                <li class="kk-person">
                  <input
                    ref="newPersonInput"
                    v-model="newPerson"
                    class="kk-input kk-person-input kk-person-input--new"
                    :placeholder="minutes.participants.length ? '＋ 次の人' : 'れい: 田中さん'"
                    aria-label="参加者を追加"
                    @keydown.enter="onNewPersonEnter"
                    @blur="commitNewPerson"
                  >
                </li>
              </ul>
            </section>

            <section class="kk-card kk-review-card">
              <div class="kk-sec-head">
                <h2 class="kk-sec-title">会議のまとめ</h2>
              </div>
              <AutoTextarea v-model="minutes.summary" placeholder="会議の流れのまとめ" />
            </section>
          </template>

          <!-- 決まったこと・話し合ったこと（同じ形なので部品で回す。左＝話し合い、右＝決定） -->
          <section v-for="group in pointGroups.filter((g) => g.col === col)" :key="group.key" class="kk-card kk-review-card">
            <div class="kk-sec-head">
              <h2 class="kk-sec-title">{{ group.label }}<span class="kk-sec-count">{{ group.items.length }}</span></h2>
              <span class="kk-sec-hint">{{ group.hint }}</span>
              <button type="button" class="kk-add" @click="group.items.push({ content: '', note: '' })"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>追加</button>
            </div>

            <p v-if="!group.items.length" class="kk-empty">見つかりませんでした。</p>
            <ul v-else class="kk-items">
              <li v-for="(item, i) in group.items" :key="i" class="kk-item">
                <div class="kk-item-main">
                  <span class="kk-num">{{ i + 1 }}</span>
                  <AutoTextarea v-model="item.content" :placeholder="group.placeholder" class="flex-1 font-bold" />
                  <button type="button" class="kk-row-del" aria-label="この行を削除" title="削除" @click="askRemoveRow(group.items, i)">✕</button>
                </div>
                <div class="kk-sub">
                  <span class="kk-sub-label">補足</span>
                  <AutoTextarea v-model="item.note" placeholder="なくても構いません" class="flex-1" />
                </div>
              </li>
            </ul>
          </section>

          <!-- 右だけ: つぎの予定・やること -->
          <template v-if="col === 'right'">
            <section class="kk-card kk-review-card">
              <div class="kk-sec-head">
                <h2 class="kk-sec-title">つぎの予定<span class="kk-sec-count">{{ minutes.eventCandidates.length }}</span></h2>
                <span class="kk-sec-hint">次に集まる日や行事です。</span>
                <button type="button" class="kk-add" @click="addEvent"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>追加</button>
              </div>

              <p v-if="!minutes.eventCandidates.length" class="kk-empty">見つかりませんでした。</p>
              <ul v-else class="kk-items">
                <li v-for="(ev, i) in minutes.eventCandidates" :key="i" class="kk-item">
                  <div class="kk-item-main">
                    <span class="kk-num">{{ i + 1 }}</span>
                    <AutoTextarea v-model="ev.title" placeholder="予定の名前" class="flex-1 font-bold" />
                    <button type="button" class="kk-row-del" aria-label="この行を削除" title="削除" @click="askRemoveRow(minutes.eventCandidates, i)">✕</button>
                  </div>
                  <div class="kk-fields">
                    <div>
                      <label class="kk-field-label">日にちと時間</label>
                      <input v-model="ev.start" type="datetime-local" class="kk-input">
                      <p v-if="ev.datetime" class="kk-note m-0">会議では「{{ ev.datetime }}」と話していました。</p>
                    </div>
                    <div>
                      <label class="kk-field-label">場所</label>
                      <input v-model="ev.location" class="kk-input" placeholder="れい: 公民館">
                    </div>
                  </div>
                </li>
              </ul>
            </section>

            <section class="kk-card kk-review-card">
              <div class="kk-sec-head">
                <h2 class="kk-sec-title">やること<span class="kk-sec-count">{{ minutes.taskCandidates.length }}</span></h2>
                <span class="kk-sec-hint">だれが何をするか。期限が決まっていれば入れてください。</span>
                <button type="button" class="kk-add" @click="addTask"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>追加</button>
              </div>

              <p v-if="!minutes.taskCandidates.length" class="kk-empty">見つかりませんでした。</p>
              <ul v-else class="kk-items">
                <li v-for="(task, i) in minutes.taskCandidates" :key="i" class="kk-item">
                  <div class="kk-item-main">
                    <span class="kk-num">{{ i + 1 }}</span>
                    <AutoTextarea v-model="task.task" placeholder="やること" class="flex-1 font-bold" />
                    <button type="button" class="kk-row-del" aria-label="この行を削除" title="削除" @click="askRemoveRow(minutes.taskCandidates, i)">✕</button>
                  </div>
                  <div class="kk-fields">
                    <div>
                      <label class="kk-field-label">だれが</label>
                      <input v-model="task.assignee" class="kk-input" placeholder="れい: 田中さん">
                    </div>
                    <div>
                      <label class="kk-field-label">いつまでに</label>
                      <input v-model="task.dueDate" type="date" class="kk-input">
                      <p v-if="task.due" class="kk-note m-0">会議では「{{ task.due }}」と話していました。</p>
                    </div>
                  </div>
                </li>
              </ul>
            </section>
          </template>
        </div>
      </div>

      <!-- 行を消す前の確認 -->
      <BottomSheet :model-value="!!pendingRow" title="この行を削除しますか？" @update:model-value="pendingRow = null">
        <p class="kk-lead">一度消すと元には戻せません。</p>
        <div class="mt-4 flex flex-col gap-2">
          <button class="kk-btn-sub" @click="confirmRemoveRow">はい、削除します</button>
          <button class="kk-btn-text" @click="pendingRow = null">やめる</button>
        </div>
      </BottomSheet>

      <!-- 削除の確認。外をクリックすれば閉じる -->
      <BottomSheet v-model="confirmingDelete" title="この議事録を消しますか？" :closable="!deleting">
        <p class="kk-lead">一度消すと元には戻せません。</p>
        <div class="mt-4 flex flex-col gap-2">
          <button class="kk-btn-sub" :disabled="deleting" @click="remove">はい、消します</button>
          <button class="kk-btn-text" :disabled="deleting" @click="confirmingDelete = false">やめる</button>
        </div>
      </BottomSheet>

    </template>

    <!-- PDFは部品で作る（一覧画面と共通） -->
    <MinutesPdfMaker ref="pdfMaker" />
  </div>
</template>

<script setup lang="ts">
import { SERVICE } from '~/config/service'
import { apiMessage } from '~/utils/apiMessage'
import { emptyMinutes } from '~/types/minutes'
import type { Minutes, MinutesRecord } from '~/types/minutes'
import type MinutesPdfMakerType from '~/components/MinutesPdfMaker.vue'

useHead({ title: `内容をたしかめる — ${SERVICE.name}` })
// PDFのように左右に並べるので、レイアウト側で横幅を広げ画面の高さに収める
definePageMeta({ wide: true })

const route = useRoute()
const router = useRouter()
const { isLoggedIn, authedFetch, waitReady } = useAuth()
const { connected: driveConnected, refresh: refreshDrive, uploadPdf, ensureToken } = useDrive()
const driveSaving = ref(false)

const id = computed(() => String(route.params.id ?? ''))
const record = ref<MinutesRecord | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const savedMessage = ref('')
const saving = ref(false)
const generatingPdf = ref(false)
const revising = ref(false)
const reviseInstruction = ref('')
const confirmingDelete = ref(false)
const deleting = ref(false)
/** ツールバーから開く小さな窓（聞き取れなかった所／AIに直してもらう）。同時に開くのは1つだけ */
const openPop = ref<'unclear' | 'revise' | null>(null)
const toolsRoot = ref<HTMLElement | null>(null)
const reviseInput = ref<HTMLTextAreaElement | null>(null)

function togglePop(name: 'unclear' | 'revise') {
  openPop.value = openPop.value === name ? null : name
  if (openPop.value === 'revise') nextTick(() => reviseInput.value?.focus())
}

// 窓の外を押したら閉じる
function onDocPointerDown(e: PointerEvent) {
  if (!openPop.value) return
  if (toolsRoot.value && !toolsRoot.value.contains(e.target as Node)) openPop.value = null
}

function onDocKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') openPop.value = null
}

/** Enter で送る。IMEの変換確定のEnterでは送らない（日本語入力で二重に走るのを防ぐ） */
function onReviseEnter(e: KeyboardEvent) {
  if (e.isComposing || e.keyCode === 229) return
  e.preventDefault()
  runRevise()
}
/** 消す確認待ちの行。はいで splice する */
const pendingRow = ref<{ list: unknown[]; index: number } | null>(null)

function askRemoveRow(list: unknown[], index: number) {
  pendingRow.value = { list, index }
}

function confirmRemoveRow() {
  const p = pendingRow.value
  if (p) p.list.splice(p.index, 1)
  pendingRow.value = null
}

/** 画面で編集している議事録。保存・PDFともこれをもとに行う */
const minutes = reactive<Minutes>(emptyMinutes())

/** 「決まったこと」「話し合ったこと」は同じ形なので、まとめて描く */
const pointGroups = computed(() => [
  {
    key: 'decisions',
    col: 'right',
    label: 'この会で決まったこと',
    hint: 'はっきり決まったことだけが入ります。',
    placeholder: '決まったこと',
    items: minutes.decisions,
  },
  {
    key: 'discussions',
    col: 'left',
    label: '話し合ったこと',
    hint: 'まだ決まっていない話です。',
    placeholder: '話し合ったこと',
    items: minutes.discussions,
  },
])

function applyMinutes(src: Minutes) {
  minutes.title = src.title
  minutes.date = src.date
  minutes.participants = [...src.participants]
  minutes.summary = src.summary
  minutes.decisions = src.decisions.map((d) => ({ ...d }))
  minutes.discussions = src.discussions.map((d) => ({ ...d }))
  minutes.taskCandidates = src.taskCandidates.map((t) => ({ ...t }))
  minutes.eventCandidates = src.eventCandidates.map((e) => ({ ...e }))
  minutes.unclearPoints = [...src.unclearPoints]
}

// ── 参加者 ──
const newPerson = ref('')
const newPersonInput = ref<HTMLInputElement | null>(null)

/** 末尾の空欄に入れた名前を1人分として確定する */
function commitNewPerson() {
  const name = newPerson.value.trim()
  if (!name) return
  minutes.participants.push(name)
  newPerson.value = ''
}

/** Enter で確定し、そのまま次の人を打てるよう空欄にとどまる。IMEの変換確定のEnterでは確定しない */
function onNewPersonEnter(e: KeyboardEvent) {
  if (e.isComposing || e.keyCode === 229) return
  e.preventDefault()
  commitNewPerson()
  nextTick(() => newPersonInput.value?.focus())
}

/** 入力済みの欄で Enter を押したら、末尾の空欄へ移る */
function onPersonEnter(e: KeyboardEvent) {
  if (e.isComposing || e.keyCode === 229) return
  e.preventDefault()
  newPersonInput.value?.focus()
}


function addTask() {
  minutes.taskCandidates.push({ assignee: '', task: '', due: '', dueDate: '' })
}

function addEvent() {
  minutes.eventCandidates.push({ datetime: '', title: '', location: '', start: '', end: '' })
}

async function load() {
  loading.value = true
  try {
    const res = await authedFetch<{ record: MinutesRecord }>(`/api/records/${id.value}`)
    record.value = res.record
    applyMinutes(res.record.minutes)
  } catch (e) {
    errorMessage.value = apiMessage(e, 'この議事録を開けませんでした。一覧からもう一度お試しください。')
    record.value = null
  }
  loading.value = false
}

/** 保存。PDF化の前にも呼ぶ（保存し忘れた直しがPDFに出ないように） */
async function saveMinutes(): Promise<void> {
  // 末尾の空欄に打ちかけの名前があれば、それも参加者として保存する
  commitNewPerson()
  const res = await authedFetch<{ minutes: Minutes }>(`/api/records/${id.value}`, {
    method: 'PATCH',
    body: { minutes: toRaw(minutes) },
  })
  // サーバーが正規化した結果（日付の形など）を画面へ返す
  applyMinutes(res.minutes)
}

async function save() {
  errorMessage.value = ''
  savedMessage.value = ''
  saving.value = true
  try {
    await saveMinutes()
    savedMessage.value = '保存しました。'
  } catch (e) {
    errorMessage.value = apiMessage(e, '保存できませんでした。もう一度お試しください。')
  }
  saving.value = false
}

async function runRevise() {
  const instruction = reviseInstruction.value.trim()
  if (!instruction) return
  errorMessage.value = ''
  savedMessage.value = ''
  revising.value = true
  try {
    const res = await authedFetch<{ minutes: Minutes }>('/api/minutes/revise', {
      method: 'POST',
      body: { id: id.value, minutes: toRaw(minutes), instruction },
    })
    applyMinutes(res.minutes)
    reviseInstruction.value = ''
    openPop.value = null
    savedMessage.value = 'AIが直しました。内容を見て、よければ保存してください。'
  } catch (e) {
    errorMessage.value = apiMessage(e, 'AIが直せませんでした。もう一度お試しください。')
  }
  revising.value = false
}

async function remove() {
  deleting.value = true
  errorMessage.value = ''
  try {
    await authedFetch(`/api/records/${id.value}`, { method: 'DELETE' })
    await router.push('/')
  } catch (e) {
    errorMessage.value = apiMessage(e, '消せませんでした。もう一度お試しください。')
    deleting.value = false
  }
}

// ── PDF ────────────────────────────────────────────────
// 作り方（印刷用の見た目・文字数を超えたときの要約・画像化）は MinutesPdfMaker にまとめてある。

const pdfMaker = ref<InstanceType<typeof MinutesPdfMakerType> | null>(null)

/** 議事録からPDFを組み立てる（ダウンロードとドライブ保存で共通） */
async function createPdf() {
  // 先に保存する（保存し忘れた直しがPDFに出ないように）
  await saveMinutes()
  if (!pdfMaker.value) throw new Error('PDFの中身を用意できませんでした。画面を開き直してお試しください。')
  return await pdfMaker.value.make(toRaw(minutes))
}

async function downloadPdf() {
  errorMessage.value = ''
  savedMessage.value = ''
  generatingPdf.value = true
  try {
    const { pdf, fileName } = await createPdf()
    pdf.save(fileName)
    savedMessage.value = 'PDFを保存しました。スマホの「ファイル」や「ダウンロード」から開けます。'
  } catch (e) {
    errorMessage.value = apiMessage(e, 'PDFをつくれませんでした。もう一度お試しください。')
  }
  generatingPdf.value = false
}

/** PDFをGoogleドライブの「キキガキ議事録」フォルダへ保存する（ダウンロードはしない） */
async function saveToDrive() {
  errorMessage.value = ''
  savedMessage.value = ''
  driveSaving.value = true
  try {
    // 許可の画面はボタンを押した直後でないとブラウザに止められるので、PDF作りより先に権限を取る
    await ensureToken()
  } catch (e) {
    errorMessage.value = apiMessage(e, 'Googleドライブとつなげませんでした。もう一度お試しください。')
    driveSaving.value = false
    return
  }
  try {
    const { pdf, fileName } = await createPdf()
    await uploadPdf(pdf.output('blob'), fileName)
    savedMessage.value = 'Googleドライブの「キキガキ議事録」フォルダに保存しました（同じ名前のPDFは上書きしました）。'
  } catch (e) {
    errorMessage.value = apiMessage(e, 'ドライブに保存できませんでした。もう一度お試しください。')
  }
  driveSaving.value = false
}

watch(isLoggedIn, async (v) => {
  if (v) await load()
})

onMounted(async () => {
  document.addEventListener('pointerdown', onDocPointerDown)
  document.addEventListener('keydown', onDocKeydown)
  refreshDrive()
  await waitReady()
  if (!isLoggedIn.value) {
    await router.replace('/')
    return
  }
  await load()
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocPointerDown)
  document.removeEventListener('keydown', onDocKeydown)
})
</script>

<style scoped>
/* 項目（主）と補足（従）の段差をつけるための見た目。
   同じ大きさの入力欄が並ぶと、どれが本文でどれが補足なのか読み取れないため。 */
.kk-num {
  flex-shrink: 0;
  width: 1.35rem;
  height: 1.35rem;
  margin-top: 0.35rem;
  border-radius: 999px;
  background: var(--kk-accent-soft);
  color: var(--kk-accent-strong);
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 補足は本文の下に字下げし、左の縦線で「本文にぶら下がるもの」だと分かるようにする */
.kk-sub {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  margin: 0.25rem 1.9rem 0 1.75rem;
  padding-left: 0.5rem;
  border-left: 2px solid var(--kk-line);
}

.kk-sub-label {
  flex-shrink: 0;
  margin-top: 0.45rem;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--kk-ink-faint);
}

/* ── 確認画面: PDFと同じく左右2列。広い画面では高さを画面に収め、列の中だけ動かす ── */
.kk-review-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
}
.kk-review-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  flex: 1 1 260px;
}
.kk-review-h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.4;
}
.kk-back {
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--kk-ink-soft);
}
.kk-back:hover { background: var(--kk-accent-soft); color: var(--kk-accent-strong); }
.kk-back svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.kk-head-actions {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-left: auto;
}
.kk-head-sep {
  width: 1px;
  height: 20px;
  background: var(--kk-line);
  margin: 0 0.15rem;
}
.kk-icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  height: 32px;
  padding: 0 0.65rem;
  border-radius: 8px;
  border: 1px solid var(--kk-line);
  background: #fff;
  color: var(--kk-ink);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  white-space: nowrap;
}
.kk-icon-btn svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.kk-icon-btn:hover:not(:disabled) { border-color: var(--kk-accent); background: var(--kk-accent-soft); }
.kk-icon-btn:disabled { opacity: 0.45; cursor: default; }
.kk-icon-btn--danger { color: var(--kk-danger); }
.kk-icon-btn--primary { background: var(--kk-cta); border-color: var(--kk-cta); color: #fff; }
.kk-icon-btn--primary:hover:not(:disabled) { background: var(--kk-cta-strong); border-color: var(--kk-cta-strong); }
.kk-icon-btn--warn { color: var(--kk-warn); border-color: #f5d6ad; background: var(--kk-warn-soft); }
.kk-icon-btn--warn:hover:not(:disabled),
.kk-icon-btn--warn.is-open { border-color: var(--kk-cta); background: #ffe9cc; }
.kk-icon-btn--ai { color: var(--kk-accent-strong); border-color: #c5dbf5; background: var(--kk-accent-soft); }
.kk-icon-btn--ai.is-open { border-color: var(--kk-accent); }
.kk-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--kk-cta);
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
}

/* ツールバーから下に開く小さな窓 */
.kk-pop-wrap {
  position: relative;
}
.kk-pop {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 60;
  width: 340px;
  max-width: calc(100vw - 24px);
  max-height: 60vh;
  overflow-y: auto;
  padding: 0.7rem 0.85rem;
  background: var(--kk-panel);
  border: 1px solid var(--kk-line);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(20, 60, 120, 0.18);
}
.kk-pop--wide {
  width: 400px;
}
.kk-save-bar {
  display: contents;
}
.kk-lbl-short {
  display: none;
}
/* スマホ・タブレット（1列表示）では、保存・ドライブ・PDFを画面の下に固定する */
@media (max-width: 1023px) {
  .kk-review {
    padding-bottom: calc(64px + env(safe-area-inset-bottom));
  }
  .kk-save-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
    display: flex;
    gap: 0.4rem;
    padding: 0.5rem 0.75rem calc(0.5rem + env(safe-area-inset-bottom));
    background: rgba(255, 255, 255, 0.96);
    border-top: 1px solid var(--kk-line);
    box-shadow: 0 -4px 16px rgba(20, 60, 120, 0.08);
    backdrop-filter: blur(6px);
  }
  .kk-save-bar .kk-icon-btn {
    flex: 1 1 0;
    min-width: 0;
    height: 44px;
    justify-content: center;
    padding: 0 0.4rem;
    font-size: 12.5px;
  }
  .kk-save-bar .kk-icon-btn--primary {
    flex-grow: 1.4;
  }
  .kk-save-bar .kk-lbl-long {
    display: none;
  }
  .kk-save-bar .kk-lbl-short {
    display: inline;
  }
  .kk-save-bar .kk-icon-btn svg {
    width: 17px;
    height: 17px;
  }
}

/* スマホではボタンが折り返して途中に来るので、ボタン1つに合わせず、ボタン列の幅いっぱいに出す
   （右端合わせのままだと画面の左にはみ出す） */
@media (max-width: 640px) {
  .kk-head-actions {
    width: 100%;
  }
  .kk-pop-wrap {
    position: static;
  }
  .kk-pop,
  .kk-pop--wide {
    left: 0;
    right: 0;
    width: auto;
    max-width: none;
  }
}
.kk-pop-title {
  margin: 0 0 0.4rem;
  font-size: 13px;
  font-weight: 700;
}
.kk-pop-list {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 13px;
  line-height: 1.7;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.kk-pop-run {
  height: 32px;
  padding: 0 1rem;
  border: 0;
  border-radius: 999px;
  background: var(--kk-accent);
  color: #fff;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}
.kk-pop-run:hover:not(:disabled) { background: var(--kk-accent-strong); }
.kk-pop-run:disabled { opacity: 0.45; cursor: default; }

.kk-review-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.6rem;
  margin-top: 0.6rem;
}
.kk-review-col {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-height: 0;
}
.kk-review-card {
  padding: 0.6rem 0.8rem 0.7rem;
}

/* 会議の名前と日は1行に並べる */
.kk-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.kk-meta-date {
  flex: 0 0 170px;
}

/* 参加者: 名前ごとの小さな欄を横に並べ、入りきらなければ折り返す */
.kk-people {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.kk-person {
  position: relative;
  width: 9.5rem;
}
.kk-person-input {
  padding-right: 1.6rem;
}
.kk-person-input--new {
  padding-right: 0.6rem;
  border-style: dashed;
  background: #fafcff;
}
.kk-person-del {
  position: absolute;
  top: 50%;
  right: 0.25rem;
  transform: translateY(-50%);
  width: 1.25rem;
  height: 1.25rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--kk-ink-faint);
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
}
.kk-person-del:hover { background: var(--kk-danger-soft); color: var(--kk-danger); }

/* 各欄の見出し行: 見出し・件数・説明・追加ボタンを1行に収める */
.kk-sec-head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.15rem 0.5rem;
  margin-bottom: 0.35rem;
}
.kk-sec-title {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 13.5px;
  font-weight: 700;
  padding-left: 0.5rem;
  border-left: 3px solid var(--kk-accent);
  line-height: 1.3;
}
.kk-sec-count {
  font-size: 11px;
  font-weight: 700;
  color: var(--kk-accent-strong);
  background: var(--kk-accent-soft);
  border-radius: 999px;
  padding: 0 0.4rem;
}
.kk-sec-hint {
  flex: 1;
  min-width: 0;
  font-size: 11.5px;
  color: var(--kk-ink-faint);
}
.kk-add {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  height: 26px;
  padding: 0 0.55rem;
  border: 1px solid var(--kk-line);
  border-radius: 999px;
  background: #fff;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  color: var(--kk-accent);
  cursor: pointer;
}
.kk-add:hover { border-color: var(--kk-accent); background: var(--kk-accent-soft); }
.kk-add svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.6;
  stroke-linecap: round;
}
.kk-empty {
  margin: 0;
  font-size: 12.5px;
  color: var(--kk-ink-faint);
}

.kk-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.kk-item {
  padding: 0.4rem 0;
  border-top: 1px dashed var(--kk-line);
}
.kk-item:first-child {
  border-top: 0;
  padding-top: 0;
}
.kk-item-main {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
}
.kk-fields {
  margin: 0.3rem 1.9rem 0 1.75rem;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.35rem 0.5rem;
}
@media (min-width: 640px) {
  .kk-fields {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 1024px) {
  .kk-review {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .kk-review-grid {
    flex: 1;
    min-height: 0;
    grid-template-columns: 1fr 1fr;
  }
  .kk-review-col {
    overflow-y: auto;
    padding-right: 0.25rem;
  }
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
.kk-row-del {
  flex: none;
  width: 1.5rem;
  height: 1.5rem;
  margin-top: 0.3rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--kk-ink-faint);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}
.kk-row-del:hover { background: var(--kk-danger-soft); color: var(--kk-danger); }
</style>
