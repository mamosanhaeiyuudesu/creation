// PDFに載せる内容の組み立てと、ページへの振り分け。純粋な関数だけ（DOMの計測は MinutesPdfMaker が行う）。
//
// PDFの形は議事録の版（layout）と種類で3つ（printKind）:
//  - landscape: 古い版（layout 1・2）。A4横の左右2列で、1枚に収まらない分は次のページの同じ列に続ける（縮小も要約もしない）。
//               左右の列は別々に流れる（左が1枚で済んでも右が2枚目に続くことがある）。
//  - fit:       今の版の話し合い。A4横の左右2列を1枚に収める（あふれたら文字を小さくする。縮めても入らなければ2枚目へ）。
//  - portrait:  今の版の聞き取り。A4縦の1列で、ページをまたいでよい。
// 今の版では、中身が空の欄は見出しごと出さない。

import { minutesLabel } from '~/config/minutesLabels'
import { hasTasksSection, isCurrentLayout, isLegacyMeeting } from '~/types/minutes'
import type { EventItem, Minutes } from '~/types/minutes'

export type PrintKind = 'landscape' | 'fit' | 'portrait'

/** ページの画像（PNGのデータURL）と形 */
export interface RenderedPages {
  images: string[]
  kind: PrintKind
}

export function printKind(m: Pick<Minutes, 'mode' | 'layout'>): PrintKind {
  if (!isCurrentLayout(m)) return 'landscape'
  return m.mode === 'talk' ? 'portrait' : 'fit'
}

/** PDFの1行（本文＋任意の補足） */
export interface PrintLine {
  main: string
  note?: string
}

/**
 * ページに並べる最小の単位。ページの切れ目はブロックの間にだけ置く（行や段落の途中では切らない）。
 * heading は、次のブロックと同じページに置く（見出しだけがページの末尾に残らないように）。
 */
export type PrintBlock =
  | { type: 'header' }
  | { type: 'heading'; text: string; sub?: boolean }
  | { type: 'para'; text: string }
  | { type: 'item'; n: number; main: string; note?: string }
  /** 聞き取り（今の版）の話題の見出し＝要点の一文。中身は続く topicPara に段落ごとに分ける */
  | { type: 'topic'; n: number; text: string }
  | { type: 'topicPara'; text: string }
  | { type: 'empty' }

function printEventWhen(ev: EventItem): string {
  if (ev.start) {
    const fmt = (v: string) => v.replace('T', ' ')
    return ev.end ? `${fmt(ev.start)} 〜 ${fmt(ev.end)}` : fmt(ev.start)
  }
  return ev.datetime || '日時未定'
}

function items(lines: PrintLine[]): PrintBlock[] {
  return lines.map((l, i) => ({ type: 'item', n: i + 1, main: l.main, note: l.note }))
}

/** 見出しと、その下の項目。項目が無ければ「（なし）」 */
function section(heading: string, lines: PrintLine[]): PrintBlock[] {
  return [{ type: 'heading', text: heading }, ...(lines.length ? items(lines) : [{ type: 'empty' } as PrintBlock])]
}

/** 見出しと、その下の項目。項目が無ければ見出しごと出さない（今の版） */
function sectionIfAny(heading: string, lines: PrintLine[]): PrintBlock[] {
  return lines.length ? [{ type: 'heading', text: heading }, ...items(lines)] : []
}

/** 段落ごとに分ける（ページの切れ目を段落の間に置くため）。空行は落とす */
function paras(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

function taskLinesOf(m: Minutes): PrintLine[] {
  return m.taskCandidates.map((t) => ({
    main: t.task,
    note: `担当: ${t.assignee || '未定'}${t.dueDate || t.due ? ` ・ 期限 ${t.dueDate || t.due}` : ''}`,
  }))
}

/**
 * 今の版（layout 3）のブロック。
 *  - 話し合い: 左＝名前・日・参加者、概要、決まったこと、やること。右＝話し合ったこと（結論を先に読めるように）
 *  - 聞き取り: 1列（left だけ）。名前・日・話し手、概要、話の内容（見出し＝要点の一文、その下に中身の段落）、やること
 */
function buildCurrentBlocks(m: Minutes): { left: PrintBlock[]; right: PrintBlock[] } {
  const L = (key: Parameters<typeof minutesLabel>[0]) => minutesLabel(key, m.mode)
  const point = (d: { content: string; note: string }): PrintLine => ({ main: d.content, note: d.note })
  const summary = paras(m.summary)
  const head: PrintBlock[] = [
    { type: 'header' },
    ...(summary.length ? [{ type: 'heading', text: L('summary') } as PrintBlock, ...summary.map((text): PrintBlock => ({ type: 'para', text }))] : []),
  ]
  if (m.mode === 'talk') {
    const topics: PrintBlock[] = m.topics.length
      ? [
          { type: 'heading', text: L('topics') },
          ...m.topics.flatMap((t, i): PrintBlock[] => [
            { type: 'topic', n: i + 1, text: t.content },
            ...paras(t.note).map((text): PrintBlock => ({ type: 'topicPara', text })),
          ]),
        ]
      : []
    return { left: [...head, ...topics, ...sectionIfAny(L('taskCandidates'), taskLinesOf(m))], right: [] }
  }
  return {
    left: [
      ...head,
      ...sectionIfAny(L('decisions'), m.decisions.map(point)),
      ...sectionIfAny(L('taskCandidates'), taskLinesOf(m)),
    ],
    right: sectionIfAny(L('topics'), m.topics.map(point)),
  }
}

/**
 * PDFの左右に載せるブロック。今の版（layout 3）は buildCurrentBlocks。以下は古い版（layout 1・2）:
 *  - 左＝名前・日・参加者、概要、話し合ったこと（聞き取りでは 話の内容）。
 *        古い会議（layout 1）ではここに「決まっていないこと」が「話し合ったこと」の名前で並ぶ
 *  - 右＝会議: 決まったこと・やること（古い会議は 決まったこと・次の予定・やること）。
 *        聞き取り: 伝えたかったこと・やること（古い記録は伝えたかったことだけ）
 */
export function buildPrintBlocks(m: Minutes): { left: PrintBlock[]; right: PrintBlock[] } {
  if (isCurrentLayout(m)) return buildCurrentBlocks(m)
  const talk = m.mode === 'talk'
  const L = (key: Parameters<typeof minutesLabel>[0]) => minutesLabel(key, m.mode)
  const legacyMeeting = isLegacyMeeting(m)
  const point = (d: { content: string; note: string }): PrintLine => ({ main: d.content, note: d.note })

  // ── 左 ──
  const summaryParas = m.summary
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const leftPoints = talk || m.layout === 2 ? m.topics : m.discussions
  const left: PrintBlock[] = [
    { type: 'header' },
    { type: 'heading', text: L('summary') },
    ...(summaryParas.length ? summaryParas.map((text): PrintBlock => ({ type: 'para', text })) : [{ type: 'empty' } as PrintBlock]),
    ...(leftPoints.length
      ? [{ type: 'heading', text: L('topics'), sub: true } as PrintBlock, ...items(leftPoints.map(point))]
      : []),
  ]

  // ── 右 ──
  const eventLines: PrintLine[] = m.eventCandidates.map((ev) => ({
    main: ev.title || '（無題）',
    note: ev.location ? `${printEventWhen(ev)} ・ ${ev.location}` : printEventWhen(ev),
  }))
  const taskLines = taskLinesOf(m)

  let right: PrintBlock[]
  if (talk) {
    right = [
      ...section(L('keyMessages'), m.keyMessages.map(point)),
      ...(hasTasksSection(m) ? section(L('taskCandidates'), taskLines) : []),
    ]
  } else if (legacyMeeting) {
    right = [
      ...section(L('decisions'), m.decisions.map(point)),
      ...section(L('eventCandidates'), eventLines),
      ...section(L('taskCandidates'), taskLines),
    ]
  } else {
    right = [
      ...section(L('decisions'), m.decisions.map(point)),
      ...section(L('taskCandidates'), taskLines),
    ]
  }
  return { left, right }
}

/** 計測したブロック1つ分の高さ（px）。上下の余白は列の中で足し合わせる（隣り合う余白は重ならない作り） */
export interface BlockSize {
  heading: boolean
  top: number
  height: number
  bottom: number
}

/**
 * ブロックを、1ページに入る高さ（limit）ごとの束に振り分ける。戻り値は、ページごとのブロックの番号。
 *  - ページの先頭のブロックの上の余白は数えない（描くときも付けない）
 *  - 見出しは、次のブロックと同じページに置く（入らなければ見出しごと次のページへ）
 *  - 1ブロックだけで limit を超えるものは、しかたなく1ページに単独で置く
 */
export function paginateBlocks(sizes: BlockSize[], limit: number): number[][] {
  const pages: number[][] = [[]]
  let used = 0
  sizes.forEach((b, i) => {
    let page = pages[pages.length - 1]!
    const first = page.length === 0
    if (!first && used + b.top + b.height > limit) {
      const prev = page[page.length - 1]!
      // 見出しだけがページの末尾に取り残されるなら、見出しも次のページへ送る
      const carry = page.length > 1 && sizes[prev]?.heading ? [page.pop()!] : []
      pages.push(carry)
      page = pages[pages.length - 1]!
      used = carry.reduce((sum, j, k) => sum + (k === 0 ? 0 : sizes[j]!.top) + sizes[j]!.height + sizes[j]!.bottom, 0)
    }
    const top = page.length === 0 ? 0 : b.top
    used += top + b.height + b.bottom
    page.push(i)
  })
  return pages
}

/**
 * 1枚に収める（fit）ときの文字の縮め方の下限。0.7 で本文は約8px。これより小さいと紙で読めないので、
 * ここまで縮めても入らないときは、この大きさのまま2枚目に続ける。
 */
export const MIN_FIT_SCALE = 0.7

/**
 * 1枚に収まるいちばん大きな文字の倍率を探す。measure(倍率) は、その倍率で流したときの高い方の列の高さ（px）。
 * 文字を小さくすると1行に入る字が増えて行数も減るので、高さは倍率に比例しない。比例で見積もらず二分探索で詰める。
 * 下限でも入らなければ下限を返す（呼び出し側がページに振り分ける）。
 */
export async function findFitScale(measure: (scale: number) => Promise<number>, limit: number): Promise<number> {
  if ((await measure(1)) <= limit) return 1
  if ((await measure(MIN_FIT_SCALE)) > limit) return MIN_FIT_SCALE
  let lo = MIN_FIT_SCALE
  let hi = 1
  for (let i = 0; i < 6; i++) {
    const mid = (lo + hi) / 2
    if ((await measure(mid)) <= limit) lo = mid
    else hi = mid
  }
  return lo
}
