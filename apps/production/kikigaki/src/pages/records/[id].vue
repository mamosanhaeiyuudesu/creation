<template>
  <div class="kk-review">
    <p v-if="loading" class="kk-lead py-10 text-center">読み込んでいます…</p>

    <template v-else-if="record">
      <!-- 見出しと状況。PDFのように左右に並べて、スクロールせず全体が見えるようにする -->
      <div class="kk-review-head">
        <div class="min-w-0">
          <h1 class="kk-h1 mt-0">内容をたしかめる</h1>
          <p class="kk-note mt-1">AIがまとめた内容です。ちがうところは直して、できたら「PDFにする」を押してください。</p>
        </div>
        <div class="kk-head-actions">
          <NuxtLink to="/" class="kk-icon-btn" title="一覧へ">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            一覧へ
          </NuxtLink>
          <button type="button" class="kk-icon-btn kk-icon-btn--danger" title="削除する" @click="confirmingDelete = true">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
            削除する
          </button>
          <button type="button" class="kk-icon-btn" :disabled="saving || generatingPdf" title="保存" @click="save">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6" /></svg>
            {{ saving ? '保存中…' : '保存' }}
          </button>
          <button type="button" class="kk-icon-btn kk-icon-btn--primary" :disabled="generatingPdf || saving" title="PDFのダウンロード" @click="downloadPdf">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></svg>
            {{ generatingPdf ? 'PDF作成中…' : 'PDFのダウンロード' }}
          </button>
        </div>
      </div>

      <div v-if="minutes.unclearPoints.length" class="mt-2">
        <button type="button" class="kk-unclear-btn" @click="showUnclear = true">
          AIが聞き取れなかったところ（{{ minutes.unclearPoints.length }}件）
        </button>
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
              <label class="kk-field-label" for="minutes-title">会議の名前</label>
              <input id="minutes-title" v-model="minutes.title" class="kk-input" placeholder="れい: 青年部の定例会">

              <label class="kk-field-label mt-3" for="minutes-date">会議をした日</label>
              <input id="minutes-date" v-model="minutes.date" type="date" class="kk-input">
            </section>

            <section class="kk-card kk-review-card">
              <h2 class="kk-h2">会議のまとめ</h2>
              <AutoTextarea v-model="minutes.summary" placeholder="会議の流れのまとめ" class="mt-2" />
            </section>
          </template>

          <!-- 決まったこと・話し合ったこと（同じ形なので部品で回す。左＝話し合い、右＝決定） -->
          <section v-for="group in pointGroups.filter((g) => g.col === col)" :key="group.key" class="kk-card kk-review-card">
            <h2 class="kk-h2">{{ group.label }}</h2>
            <p class="kk-note mt-1">{{ group.hint }}</p>

            <p v-if="!group.items.length" class="kk-lead mt-2">見つかりませんでした。</p>
            <ul v-else class="list-none p-0 mt-2 flex flex-col gap-3">
              <li v-for="(item, i) in group.items" :key="i">
                <div class="flex items-start gap-2">
                  <span class="kk-num">{{ i + 1 }}</span>
                  <AutoTextarea v-model="item.content" :placeholder="group.placeholder" class="flex-1 font-bold" />
                </div>
                <div class="kk-sub">
                  <span class="kk-sub-label">補足</span>
                  <AutoTextarea v-model="item.note" placeholder="なくても構いません" class="flex-1" />
                </div>
                <button class="kk-btn-text" @click="group.items.splice(i, 1)"><svg class="kk-mini-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>削除する</button>
              </li>
            </ul>

            <button class="kk-btn-sub mt-3" @click="group.items.push({ content: '', note: '' })"><svg class="kk-mini-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>追加する</button>
          </section>

          <!-- 右だけ: つぎの予定・やること -->
          <template v-if="col === 'right'">
            <section class="kk-card kk-review-card">
              <h2 class="kk-h2">つぎの予定</h2>
              <p class="kk-note mt-1">次に集まる日や行事です。</p>

              <p v-if="!minutes.eventCandidates.length" class="kk-lead mt-2">見つかりませんでした。</p>
              <ul v-else class="list-none p-0 mt-2 flex flex-col gap-4">
                <li v-for="(ev, i) in minutes.eventCandidates" :key="i">
                  <div class="flex items-start gap-2">
                    <span class="kk-num">{{ i + 1 }}</span>
                    <AutoTextarea v-model="ev.title" placeholder="予定の名前" class="flex-1 font-bold" />
                  </div>
                  <div class="mt-2 pl-8 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label class="kk-field-label">日にちと時間</label>
                      <input v-model="ev.start" type="datetime-local" class="kk-input">
                      <p v-if="ev.datetime" class="kk-note mt-1">会議では「{{ ev.datetime }}」と話していました。</p>
                    </div>
                    <div>
                      <label class="kk-field-label">場所</label>
                      <input v-model="ev.location" class="kk-input" placeholder="れい: 公民館">
                    </div>
                  </div>
                  <button class="kk-btn-text mt-1" @click="minutes.eventCandidates.splice(i, 1)"><svg class="kk-mini-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>削除する</button>
                </li>
              </ul>

              <button class="kk-btn-sub mt-3" @click="addEvent"><svg class="kk-mini-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>追加する</button>
            </section>

            <section class="kk-card kk-review-card">
              <h2 class="kk-h2">やること</h2>
              <p class="kk-note mt-1">だれが何をするか。期限が決まっていれば入れてください。</p>

              <p v-if="!minutes.taskCandidates.length" class="kk-lead mt-2">見つかりませんでした。</p>
              <ul v-else class="list-none p-0 mt-2 flex flex-col gap-4">
                <li v-for="(task, i) in minutes.taskCandidates" :key="i">
                  <div class="flex items-start gap-2">
                    <span class="kk-num">{{ i + 1 }}</span>
                    <AutoTextarea v-model="task.task" placeholder="やること" class="flex-1 font-bold" />
                  </div>
                  <div class="mt-2 pl-8 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label class="kk-field-label">だれが</label>
                      <input v-model="task.assignee" class="kk-input" placeholder="れい: 田中さん">
                    </div>
                    <div>
                      <label class="kk-field-label">いつまでに</label>
                      <input v-model="task.dueDate" type="date" class="kk-input">
                      <p v-if="task.due" class="kk-note mt-1">会議では「{{ task.due }}」と話していました。</p>
                    </div>
                  </div>
                  <button class="kk-btn-text mt-1" @click="minutes.taskCandidates.splice(i, 1)"><svg class="kk-mini-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>削除する</button>
                </li>
              </ul>

              <button class="kk-btn-sub mt-3" @click="addTask"><svg class="kk-mini-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>追加する</button>
            </section>
          </template>
        </div>
      </div>

      <!-- 下の操作バー: AIに直してもらう・PDF・保存・削除 -->
      <div class="kk-review-bar">
        <div class="kk-review-revise">
          <input
            v-model="reviseInstruction"
            class="kk-input"
            placeholder="AIに直してほしいこと（れい: 阪中さんを坂中さんに直して）"
            aria-label="AIに直してほしいこと"
            @keyup.enter="runRevise"
          >
          <button class="kk-btn-sub kk-bar-btn" :disabled="revising || !reviseInstruction.trim()" @click="runRevise">
            {{ revising ? 'AIが直しています…' : 'AIに直してもらう' }}
          </button>
        </div>
      </div>

      <!-- 削除の確認。外をクリックすれば閉じる -->
      <BottomSheet v-model="confirmingDelete" title="この議事録を消しますか？" :closable="!deleting">
        <p class="kk-lead">いちど消すと元には戻せません。</p>
        <div class="mt-4 flex flex-col gap-2">
          <button class="kk-btn-sub" :disabled="deleting" @click="remove">はい、消します</button>
          <button class="kk-btn-text" :disabled="deleting" @click="confirmingDelete = false">やめる</button>
        </div>
      </BottomSheet>

      <!-- AIが聞き取れなかったところ。長いのでボタンから開いて読む -->
      <BottomSheet v-model="showUnclear" title="AIが聞き取れなかったところ">
        <ul class="mt-1 pl-5 flex flex-col gap-2">
          <li v-for="(p, i) in minutes.unclearPoints" :key="i">{{ p }}</li>
        </ul>
        <p class="kk-note mt-4">このあたりは、ご自分の記憶とあわせて確かめてください。</p>
        <button class="kk-btn-sub mt-4" @click="showUnclear = false">閉じる</button>
      </BottomSheet>
    </template>

    <!-- PDF専用のレイアウト。画面には出さず、html2canvas で撮ってPDFにする -->
    <div v-if="record" ref="printRoot" class="kk-print" aria-hidden="true">
      <div class="kk-print-page">
        <div class="kk-print-col">
          <div class="kk-print-header">
            <span class="kk-print-date">{{ printDateLabel }}</span>
            <span>〈{{ minutes.title || '（名前のない議事録）' }}〉</span>
          </div>

          <!-- 概要＝もとのまとめと「話し合ったこと」を1つの欄にしたもの。文字数内ならそのまま両方出し、
               超えていたらAIがひとつながりの文章に要約し直した printSummaryMain だけを出す
               （そのときは printDiscussionLines が空になり、小見出しごと消える）。 -->
          <div class="kk-print-section">
            <p class="kk-print-heading">概要</p>
            <p class="kk-print-body">{{ printSummaryMain || '（記載なし）' }}</p>
            <template v-if="printDiscussionLines.length">
              <p class="kk-print-subheading">話し合ったこと</p>
              <ul class="kk-print-list">
                <li v-for="(d, i) in printDiscussionLines" :key="i">
                  {{ i + 1 }}. {{ d.main }}
                  <span v-if="d.note" class="kk-print-item-note">{{ d.note }}</span>
                </li>
              </ul>
            </template>
          </div>
        </div>

        <div class="kk-print-col kk-print-col--right">
          <div class="kk-print-section">
            <p class="kk-print-heading">決まったこと</p>
            <p v-if="!printDecisionLines.length" class="kk-print-empty">（なし）</p>
            <ul v-else class="kk-print-list">
              <li v-for="(d, i) in printDecisionLines" :key="i">
                {{ i + 1 }}. {{ d.main }}
                <span v-if="d.note" class="kk-print-item-note">{{ d.note }}</span>
              </li>
            </ul>
          </div>

          <div class="kk-print-section">
            <p class="kk-print-heading">つぎの予定</p>
            <p v-if="!printEventLines.length" class="kk-print-empty">（なし）</p>
            <ul v-else class="kk-print-list">
              <li v-for="(ev, i) in printEventLines" :key="i">
                {{ i + 1 }}. {{ ev.main }}
                <span v-if="ev.note" class="kk-print-item-note">{{ ev.note }}</span>
              </li>
            </ul>
          </div>

          <div class="kk-print-section">
            <p class="kk-print-heading">やること</p>
            <p v-if="!printTaskLines.length" class="kk-print-empty">（なし）</p>
            <ul v-else class="kk-print-list">
              <li v-for="(t, i) in printTaskLines" :key="i">
                {{ i + 1 }}. {{ t.main }}
                <span v-if="t.note" class="kk-print-item-note">{{ t.note }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SERVICE } from '~/config/service'
import { apiMessage } from '~/utils/apiMessage'
import { formatDateLabel } from '~/utils/formatDate'
import { emptyMinutes } from '~/types/minutes'
import type { EventItem, Minutes, MinutesRecord } from '~/types/minutes'

useHead({ title: `内容をたしかめる — ${SERVICE.name}` })
// PDFのように左右に並べるので、レイアウト側で横幅を広げ画面の高さに収める
definePageMeta({ wide: true })

const route = useRoute()
const router = useRouter()
const { isLoggedIn, authedFetch, waitReady } = useAuth()

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
const printRoot = ref<HTMLElement | null>(null)
const showUnclear = ref(false)

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
  minutes.summary = src.summary
  minutes.decisions = src.decisions.map((d) => ({ ...d }))
  minutes.discussions = src.discussions.map((d) => ({ ...d }))
  minutes.taskCandidates = src.taskCandidates.map((t) => ({ ...t }))
  minutes.eventCandidates = src.eventCandidates.map((e) => ({ ...e }))
  minutes.unclearPoints = [...src.unclearPoints]
  minutes.printSettings = { ...src.printSettings }
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
// html2canvas / jspdf はこの画面でしか使わないので、ボタンを押したときだけ読み込む。

const printDateLabel = computed(() => formatDateLabel(minutes.date) || '日付が入っていません')

function printEventWhen(ev: EventItem): string {
  if (ev.start) {
    const fmt = (v: string) => v.replace('T', ' ')
    return ev.end ? `${fmt(ev.start)} 〜 ${fmt(ev.end)}` : fmt(ev.start)
  }
  return ev.datetime || '日時未定'
}

interface PrintLine {
  main: string
  note?: string
}

const printSummaryMain = ref('')
const printDiscussionLines = ref<PrintLine[]>([])
const printDecisionLines = ref<PrintLine[]>([])
const printEventLines = ref<PrintLine[]>([])
const printTaskLines = ref<PrintLine[]>([])

function lineLength(l: PrintLine): number {
  return l.main.length + (l.note?.length ?? 0)
}

/**
 * PDFに載せる内容を組み立てる。
 * 目安文字数（printSettings）に収まっていればAIを呼ばずそのまま出し、
 * 超えたときだけ要約させる。要約に失敗しても元の内容のままPDF化は続ける
 * （画像をページ内に収まるよう縮小して配置するので、必ず1ページには収まる）。
 */
async function buildPrintContent() {
  // 左側＝まとめ＋話し合ったこと
  const discussionLines: PrintLine[] = minutes.discussions.map((d) => ({ main: d.content, note: d.note }))
  const leftChars = minutes.summary.length + discussionLines.reduce((sum, l) => sum + lineLength(l), 0)
  const summaryMax = minutes.printSettings.summaryMaxChars

  if (leftChars <= summaryMax) {
    printSummaryMain.value = minutes.summary
    printDiscussionLines.value = discussionLines
  } else {
    try {
      const res = await authedFetch<{ text: string }>('/api/minutes/condense', {
        method: 'POST',
        body: {
          target: 'left',
          summary: minutes.summary,
          discussions: toRaw(minutes).discussions,
          maxChars: summaryMax,
        },
      })
      printSummaryMain.value = res.text
      printDiscussionLines.value = []
    } catch {
      printSummaryMain.value = minutes.summary
      printDiscussionLines.value = discussionLines
    }
  }

  // 右側＝決まったこと・つぎの予定・やること（この順で出す）
  const decisionLines: PrintLine[] = minutes.decisions.map((d) => ({ main: d.content, note: d.note }))
  const eventLines: PrintLine[] = minutes.eventCandidates.map((ev) => ({
    main: ev.title || '（無題）',
    note: ev.location ? `${printEventWhen(ev)} ・ ${ev.location}` : printEventWhen(ev),
  }))
  const taskLines: PrintLine[] = minutes.taskCandidates.map((t) => ({
    main: t.task,
    note: `担当: ${t.assignee || '未定'}${t.dueDate || t.due ? ` ・ 期限 ${t.dueDate || t.due}` : ''}`,
  }))
  const rightChars = [...decisionLines, ...eventLines, ...taskLines].reduce((sum, l) => sum + lineLength(l), 0)
  const rightMax = minutes.printSettings.rightMaxChars

  if (rightChars <= rightMax) {
    printDecisionLines.value = decisionLines
    printEventLines.value = eventLines
    printTaskLines.value = taskLines
  } else {
    try {
      const res = await authedFetch<{ decisions: string[]; events: string[]; tasks: string[] }>(
        '/api/minutes/condense',
        {
          method: 'POST',
          body: { target: 'right', decisions: decisionLines, events: eventLines, tasks: taskLines, maxChars: rightMax },
        }
      )
      printDecisionLines.value = res.decisions.map((main) => ({ main }))
      printEventLines.value = res.events.map((main) => ({ main }))
      printTaskLines.value = res.tasks.map((main) => ({ main }))
    } catch {
      printDecisionLines.value = decisionLines
      printEventLines.value = eventLines
      printTaskLines.value = taskLines
    }
  }
}

async function downloadPdf() {
  errorMessage.value = ''
  savedMessage.value = ''
  generatingPdf.value = true
  try {
    // 先に保存する（保存し忘れた直しがPDFに出ないように）
    await saveMinutes()
    await buildPrintContent()
    await nextTick()

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
    const el = printRoot.value
    if (!el) throw new Error('PDFの中身を用意できませんでした。画面を開き直してお試しください。')

    // 画像にしてから貼るのは、日本語フォントをPDFへ埋め込む手間を避けるため。
    // A4横1ページに、縦横比を保ったまま収まるよう縮小して配置する。
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' })
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageW = 297
    const pageH = 210
    let w = pageW
    let h = (canvas.height / canvas.width) * pageW
    let x = 0
    let y = (pageH - h) / 2
    if (h > pageH) {
      h = pageH
      w = (canvas.width / canvas.height) * pageH
      x = (pageW - w) / 2
      y = 0
    }
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, w, h)

    const safeTitle = (minutes.title || '議事録').replace(/[\\/:*?"<>|]/g, '_')
    pdf.save(minutes.date ? `${safeTitle}_${minutes.date}.pdf` : `${safeTitle}.pdf`)
    savedMessage.value = 'PDFを保存しました。スマホの「ファイル」や「ダウンロード」から開けます。'
  } catch (e) {
    errorMessage.value = apiMessage(e, 'PDFをつくれませんでした。もう一度お試しください。')
  }
  generatingPdf.value = false
}

watch(isLoggedIn, async (v) => {
  if (v) await load()
})

onMounted(async () => {
  await waitReady()
  if (!isLoggedIn.value) {
    await router.replace('/')
    return
  }
  await load()
})
</script>

<style scoped>
/* 項目（主）と補足（従）の段差をつけるための見た目。
   同じ大きさの入力欄が並ぶと、どれが本文でどれが補足なのか読み取れないため。 */
.kk-num {
  flex-shrink: 0;
  width: 1.9rem;
  height: 1.9rem;
  margin-top: 0.5rem;
  border-radius: 999px;
  background: var(--kk-accent-soft);
  color: var(--kk-accent-strong);
  font-size: 14px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 補足は本文の下に字下げし、左の縦線で「本文にぶら下がるもの」だと分かるようにする */
.kk-sub {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin: 0.5rem 0 0 2.4rem;
  padding-left: 0.7rem;
  border-left: 2px solid var(--kk-line);
}

.kk-sub-label {
  flex-shrink: 0;
  margin-top: 0.75rem;
  font-size: 13px;
  font-weight: 700;
  color: var(--kk-ink-faint);
}

/* ── PDF専用テンプレート ──
   画面外（left: -99999px）に実寸のA4横サイズで置いておき、html2canvas で撮影してPDFへ埋め込む。
   display:none にすると撮影できないため、位置をずらすだけにしている。 */
.kk-print {
  position: fixed;
  top: 0;
  left: -99999px;
  z-index: -1;
  pointer-events: none;
}

.kk-print-page {
  width: 297mm;
  min-height: 210mm;
  box-sizing: border-box;
  padding: 12mm 14mm;
  background: #ffffff;
  color: #23272f;
  font-family: 'Zen Kaku Gothic New', 'Hiragino Sans', system-ui, sans-serif;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.kk-print-col {
  padding-right: 8mm;
}

.kk-print-col--right {
  padding-left: 8mm;
  border-left: 1px solid #23272f;
}

.kk-print-header {
  font-size: 15px;
  font-weight: 700;
  padding-bottom: 6px;
  margin-bottom: 10px;
  border-bottom: 1.5px solid #23272f;
  letter-spacing: 0.02em;
}
.kk-print-date {
  margin-right: 10px;
}

.kk-print-section {
  margin-bottom: 12px;
}
.kk-print-section:last-child {
  margin-bottom: 0;
}

.kk-print-heading {
  font-size: 12.5px;
  font-weight: 700;
  margin: 0 0 6px;
  padding-bottom: 3px;
  border-bottom: 1px solid #23272f;
}

.kk-print-body {
  font-size: 11.5px;
  line-height: 1.8;
  white-space: pre-wrap;
  margin: 0;
}

/* 概要欄の中に「話し合ったこと」を同居させるための小見出し。kk-print-heading より控えめにして
   「概要のなかの一部」に見えるようにする */
.kk-print-subheading {
  font-size: 11px;
  font-weight: 700;
  color: #5b6472;
  margin: 10px 0 4px;
}

.kk-print-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.kk-print-list li {
  font-size: 11.5px;
  line-height: 1.7;
  margin-bottom: 6px;
  padding-left: 1.1em;
  text-indent: -1.1em;
}

.kk-print-item-note {
  display: block;
  padding-left: 1.1em;
  font-size: 10px;
  color: #5b6472;
  text-indent: 0;
}

.kk-print-empty {
  font-size: 11px;
  color: #9aa1ab;
  margin: 0;
}

/* ── 確認画面: PDFと同じく左右2列。広い画面では高さを画面に収め、列の中だけ動かす ── */
.kk-review-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem 1rem;
}
.kk-unclear-btn {
  flex-shrink: 0;
  padding: 0.55rem 0.9rem;
  border-radius: 10px;
  border: 1.5px solid var(--kk-accent);
  background: var(--kk-accent-soft);
  color: var(--kk-accent-strong);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}
.kk-review-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-top: 0.75rem;
}
.kk-review-col {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
}
.kk-review-card {
  padding: 0.9rem 1rem;
}
.kk-review-bar {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--kk-line);
}
.kk-review-revise {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.kk-review-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.75rem;
}
.kk-bar-btn {
  width: auto;
  padding-left: 1.1rem;
  padding-right: 1.1rem;
  white-space: nowrap;
}
.kk-review-actions .kk-bar-btn:first-of-type {
  margin-left: auto;
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

.kk-head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-left: auto;
}
.kk-icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.8rem;
  border-radius: 10px;
  border: 1.5px solid var(--kk-line);
  background: #fff;
  color: var(--kk-ink);
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  white-space: nowrap;
}
.kk-icon-btn svg {
  width: 1.15rem;
  height: 1.15rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.kk-icon-btn:hover:not(:disabled) { border-color: var(--kk-accent); background: var(--kk-accent-soft); }
.kk-icon-btn:disabled { opacity: 0.45; cursor: default; }
.kk-icon-btn--danger { color: #b3261e; }
.kk-icon-btn--primary { background: var(--kk-accent); border-color: var(--kk-accent); color: #fff; }
.kk-icon-btn--primary:hover:not(:disabled) { background: var(--kk-accent-strong); }
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
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 0.1rem 0.3rem;
}
.kk-mini-icon {
  width: 1em;
  height: 1em;
  margin-right: 0.3em;
  vertical-align: -0.12em;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
