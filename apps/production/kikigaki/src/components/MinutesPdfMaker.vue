<template>
  <!-- PDF専用のレイアウト。画面には出さず、html2canvas で撮ってPDFにする。
       確認画面と一覧画面の両方から使う（一覧からは開かずにPDF・ドライブ保存ができる）。 -->
  <div ref="printRoot" class="kk-print" aria-hidden="true">
    <div class="kk-print-page">
      <div class="kk-print-col">
        <div class="kk-print-header">
          <span class="kk-print-date">{{ printDateLabel }}</span>
          <span>〈{{ doc.title || '（名前のない議事録）' }}〉</span>
          <span v-if="printParticipants" class="kk-print-participants">{{ talk ? '話し手' : '参加者' }}: {{ printParticipants }}</span>
        </div>
  
        <!-- 概要＝もとのまとめと「話し合ったこと」（1人の話では「話の内容」）を1つの欄にしたもの。文字数内ならそのまま両方出し、
             超えていたらAIがひとつながりの文章に要約し直した printSummaryMain だけを出す
             （そのときは printDiscussionLines が空になり、小見出しごと消える）。
             古い会議（layout 1）では、ここに並ぶのは「決まっていないこと」だけ。 -->
        <div class="kk-print-section">
          <p class="kk-print-heading">概要</p>
          <p class="kk-print-body">{{ printSummaryMain || '（記載なし）' }}</p>
          <template v-if="printDiscussionLines.length">
            <p class="kk-print-subheading">{{ talk ? '話の内容' : '話し合ったこと' }}</p>
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
        <!-- 右側。会議＝決まったこと・決まっていないこと・やること、1人の話＝伝えたかったことだけ。
             古い会議（layout 1）は 決まったこと・つぎの予定・やること（次の予定は新しい会議では概要の末尾に書く） -->
        <div class="kk-print-section">
          <p class="kk-print-heading">{{ talk ? '伝えたかったこと' : '決まったこと' }}</p>
          <p v-if="!printDecisionLines.length" class="kk-print-empty">（なし）</p>
          <ul v-else class="kk-print-list">
            <li v-for="(d, i) in printDecisionLines" :key="i">
              {{ i + 1 }}. {{ d.main }}
              <span v-if="d.note" class="kk-print-item-note">{{ d.note }}</span>
            </li>
          </ul>
        </div>

        <div v-if="newMeeting" class="kk-print-section">
          <p class="kk-print-heading">決まっていないこと</p>
          <p v-if="!printUndecidedLines.length" class="kk-print-empty">（なし）</p>
          <ul v-else class="kk-print-list">
            <li v-for="(d, i) in printUndecidedLines" :key="i">
              {{ i + 1 }}. {{ d.main }}
              <span v-if="d.note" class="kk-print-item-note">{{ d.note }}</span>
            </li>
          </ul>
        </div>

        <div v-if="legacyMeeting" class="kk-print-section">
          <p class="kk-print-heading">つぎの予定</p>
          <p v-if="!printEventLines.length" class="kk-print-empty">（なし）</p>
          <ul v-else class="kk-print-list">
            <li v-for="(ev, i) in printEventLines" :key="i">
              {{ i + 1 }}. {{ ev.main }}
              <span v-if="ev.note" class="kk-print-item-note">{{ ev.note }}</span>
            </li>
          </ul>
        </div>

        <div v-if="!talk" class="kk-print-section">
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
</template>

<script setup lang="ts">
import { formatDateLabel } from '~/utils/formatDate'
import { splitPrintBudget } from '~/utils/printBudget'
import { emptyMinutes, isLegacyMeeting } from '~/types/minutes'
import type { EventItem, Minutes } from '~/types/minutes'

const { authedFetch } = useAuth()
const { settings: userSettings, load: loadUserSettings } = useUserSettings()

/** 今PDFにしている議事録 */
const doc = ref<Minutes>(emptyMinutes())
const printRoot = ref<HTMLElement | null>(null)

/** 主に1人が話した記録か（見出しと載せる項目が変わる） */
const talk = computed(() => doc.value.mode === 'talk')
/** 新しい並べ方の会議（左＝話し合ったこと全体、右＝決まったこと・決まっていないこと・やること） */
const newMeeting = computed(() => doc.value.mode === 'meeting' && doc.value.layout === 2)
/** 古い並べ方の会議（左＝決まっていないこと、右＝決まったこと・つぎの予定・やること） */
const legacyMeeting = computed(() => isLegacyMeeting(doc.value))

const printParticipants = computed(() => doc.value.participants.map((p) => p.trim()).filter(Boolean).join('、'))

const printDateLabel = computed(() => formatDateLabel(doc.value.date) || '日付が入っていません')

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
const printUndecidedLines = ref<PrintLine[]>([])
const printEventLines = ref<PrintLine[]>([])
const printTaskLines = ref<PrintLine[]>([])

function lineLength(l: PrintLine): number {
  return l.main.length + (l.note?.length ?? 0)
}

/** PDFの左右に載せる元の行と、その文字数 */
function buildPrintSource() {
  // 左側＝まとめ＋話し合ったこと（1人の話では まとめ＋話の内容）。
  // 古い会議では、ここに「決まっていないこと」（discussions）が「話し合ったこと」の名前で並ぶ
  const leftPoints = talk.value || newMeeting.value ? doc.value.topics : doc.value.discussions
  const discussionLines: PrintLine[] = leftPoints.map((d) => ({ main: d.content, note: d.note }))
  const leftChars = doc.value.summary.length + discussionLines.reduce((sum, l) => sum + lineLength(l), 0)
  // 右側＝決まったこと・決まっていないこと・やること（この順で出す）。古い会議は 決まったこと・つぎの予定・やること。
  // 1人の話では伝えたかったことだけ（やることは空のまま。1人の話では拾っていない）
  const rightPoints = talk.value ? doc.value.keyMessages : doc.value.decisions
  const decisionLines: PrintLine[] = rightPoints.map((d) => ({ main: d.content, note: d.note }))
  const undecidedLines: PrintLine[] = (newMeeting.value ? doc.value.discussions : []).map((d) => ({
    main: d.content,
    note: d.note,
  }))
  const eventLines: PrintLine[] = (legacyMeeting.value ? doc.value.eventCandidates : []).map((ev) => ({
    main: ev.title || '（無題）',
    note: ev.location ? `${printEventWhen(ev)} ・ ${ev.location}` : printEventWhen(ev),
  }))
  const taskLines: PrintLine[] = (talk.value ? [] : doc.value.taskCandidates).map((t) => ({
    main: t.task,
    note: `担当: ${t.assignee || '未定'}${t.dueDate || t.due ? ` ・ 期限 ${t.dueDate || t.due}` : ''}`,
  }))
  const rightChars = [...decisionLines, ...undecidedLines, ...eventLines, ...taskLines].reduce(
    (sum, l) => sum + lineLength(l),
    0
  )
  return { discussionLines, leftChars, decisionLines, undecidedLines, eventLines, taskLines, rightChars }
}

/**
 * PDFに載せる内容を組み立てる。
 * 目安文字数（左メニューで設定するアカウント全体の値）に収まっていればAIを呼ばずそのまま出し、
 * 超えたときだけ要約させる。要約に失敗しても元の内容のままPDF化は続ける
 * （画像をページ内に収まるよう縮小して配置するので、必ず1ページには収まる）。
 */
async function buildPrintContent() {
  const { discussionLines, leftChars, decisionLines, undecidedLines, eventLines, taskLines, rightChars } = buildPrintSource()
  // 別のタブで設定を変えたときも最新の値で作るよう、PDFを作るたびに読み直す
  // （読めなければ手元の値で続ける。PDFが作れなくなるほどのことではない）
  const settings = await loadUserSettings().catch(() => userSettings.value)
  // 全体の目安文字数を左右に振り分ける（片方が短ければ、余りをもう片方に回す）
  const budget = splitPrintBudget(leftChars, rightChars, settings.pdfMaxChars)
  const summaryMax = budget.left

  if (leftChars <= summaryMax) {
    printSummaryMain.value = doc.value.summary
    printDiscussionLines.value = discussionLines
  } else {
    try {
      const res = await authedFetch<{ text: string }>('/api/minutes/condense', {
        method: 'POST',
        body: {
          target: 'left',
          mode: doc.value.mode,
          layout: doc.value.layout,
          summary: doc.value.summary,
          points: discussionLines.map((l) => ({ content: l.main, note: l.note ?? '' })),
          maxChars: summaryMax,
        },
      })
      printSummaryMain.value = res.text
      printDiscussionLines.value = []
    } catch {
      printSummaryMain.value = doc.value.summary
      printDiscussionLines.value = discussionLines
    }
  }

  const rightMax = budget.right

  if (rightChars <= rightMax) {
    printDecisionLines.value = decisionLines
    printUndecidedLines.value = undecidedLines
    printEventLines.value = eventLines
    printTaskLines.value = taskLines
  } else {
    try {
      const res = await authedFetch<{ decisions: string[]; undecided: string[]; events: string[]; tasks: string[] }>(
        '/api/minutes/condense',
        {
          method: 'POST',
          body: {
            target: 'right',
            mode: doc.value.mode,
            layout: doc.value.layout,
            decisions: decisionLines,
            undecided: undecidedLines,
            events: eventLines,
            tasks: taskLines,
            maxChars: rightMax,
          },
        }
      )
      printDecisionLines.value = res.decisions.map((main) => ({ main }))
      printUndecidedLines.value = res.undecided.map((main) => ({ main }))
      printEventLines.value = res.events.map((main) => ({ main }))
      printTaskLines.value = res.tasks.map((main) => ({ main }))
    } catch {
      printDecisionLines.value = decisionLines
      printUndecidedLines.value = undecidedLines
      printEventLines.value = eventLines
      printTaskLines.value = taskLines
    }
  }
}

/**
 * 議事録からPDFを組み立てる。呼び出し側は保存済みの内容（確認画面なら保存した直後のもの）を渡すこと。
 * html2canvas / jspdf は重いので、ここで初めて読み込む。
 */
async function make(src: Minutes): Promise<{ pdf: InstanceType<Awaited<typeof import('jspdf')>['jsPDF']>; fileName: string }> {
  doc.value = src
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

  return { pdf, fileName: pdfFileName(src) }
}

/** ファイル名（ドライブでは同じ名前のPDFを上書きするので、名前の付け方を変えるときは注意） */
function pdfFileName(m: Minutes): string {
  const safeTitle = (m.title || (m.mode === 'talk' ? '話の記録' : '議事録')).replace(/[\\/:*?"<>|]/g, '_')
  return m.date ? `${safeTitle}_${m.date}.pdf` : `${safeTitle}.pdf`
}

defineExpose({ make })
</script>

<style scoped>
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
  font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
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
.kk-print-participants {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  font-weight: 500;
  color: #5b6472;
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
</style>
