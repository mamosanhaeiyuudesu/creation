// PDFに載せる内容の組み立てと、目安文字数（全体で1つ）の左右への振り分け。
// PDFを作る側（MinutesPdfMaker）と、確認画面の文字数表示が同じ数え方になるよう、ここに集める。

import { isLegacyMeeting } from '~/types/minutes'
import type { EventItem, Minutes } from '~/types/minutes'

/**
 * PDFの目安文字数（A4横1枚の全体）。固定で、利用者は変えられない。
 * 超えたときだけ、PDFを作るときにAIが文字数内に要約し直す（画面の内容は変わらない）。
 * 2,000字は、今のPDFの寸法（本文11.5px・左右50:50）で縮小せずに入る量の見積もり。
 * 2026-10-25 までは設定画面で500〜4000字から選べたが、見やすさの目安として固定にした（本人の指示）。
 */
export const PDF_MAX_CHARS = 2000

/** PDFに載せる1行（本文＋任意の補足） */
export interface PrintLine {
  main: string
  note?: string
}

export function printLineLength(l: PrintLine): number {
  return l.main.length + (l.note?.length ?? 0)
}

function printEventWhen(ev: EventItem): string {
  if (ev.start) {
    const fmt = (v: string) => v.replace('T', ' ')
    return ev.end ? `${fmt(ev.start)} 〜 ${fmt(ev.end)}` : fmt(ev.start)
  }
  return ev.datetime || '日時未定'
}

/**
 * PDFの左右に載せる元の行と、その文字数。
 *  - 左＝概要＋話し合ったこと（1人の話では 概要＋話の内容）。古い会議（layout 1）ではここに「決まっていないこと」が並ぶ
 *  - 右＝決まったこと・決まっていないこと・やること。古い会議は 決まったこと・つぎの予定・やること。
 *        1人の話では伝えたかったことだけ（やることは拾っていない）
 */
export function buildPrintLines(m: Minutes) {
  const talk = m.mode === 'talk'
  const newMeeting = m.mode === 'meeting' && m.layout === 2
  const legacyMeeting = isLegacyMeeting(m)

  const leftPoints = talk || newMeeting ? m.topics : m.discussions
  const discussionLines: PrintLine[] = leftPoints.map((d) => ({ main: d.content, note: d.note }))
  const leftChars = m.summary.length + discussionLines.reduce((sum, l) => sum + printLineLength(l), 0)

  const rightPoints = talk ? m.keyMessages : m.decisions
  const decisionLines: PrintLine[] = rightPoints.map((d) => ({ main: d.content, note: d.note }))
  const undecidedLines: PrintLine[] = (newMeeting ? m.discussions : []).map((d) => ({ main: d.content, note: d.note }))
  const eventLines: PrintLine[] = (legacyMeeting ? m.eventCandidates : []).map((ev) => ({
    main: ev.title || '（無題）',
    note: ev.location ? `${printEventWhen(ev)} ・ ${ev.location}` : printEventWhen(ev),
  }))
  const taskLines: PrintLine[] = (talk ? [] : m.taskCandidates).map((t) => ({
    main: t.task,
    note: `担当: ${t.assignee || '未定'}${t.dueDate || t.due ? ` ・ 期限 ${t.dueDate || t.due}` : ''}`,
  }))
  const rightChars = [...decisionLines, ...undecidedLines, ...eventLines, ...taskLines].reduce(
    (sum, l) => sum + printLineLength(l),
    0
  )
  return { discussionLines, leftChars, decisionLines, undecidedLines, eventLines, taskLines, rightChars }
}

/** 確認画面の文字数表示用。PDFを作るときに数える文字数と同じもの */
export function printCharCounts(m: Minutes): { left: number; right: number; total: number } {
  const { leftChars, rightChars } = buildPrintLines(m)
  return { left: leftChars, right: rightChars, total: leftChars + rightChars }
}

/**
 * 目安文字数（全体で1つ）を左右の列に振り分ける。
 * 半分ずつを基本にし、片方が半分に届かないときは、余った分をもう片方に回す
 * （例: 全体2000字で左が600字なら、右は1400字まで要約せずに載せる）。
 * 戻り値の文字数を超えている列だけ、PDFを作るときにAIが要約し直す。
 */
export function splitPrintBudget(leftChars: number, rightChars: number, total: number): { left: number; right: number } {
  if (leftChars + rightChars <= total) return { left: leftChars, right: rightChars }
  const half = Math.floor(total / 2)
  if (leftChars <= half) return { left: leftChars, right: total - leftChars }
  if (rightChars <= total - half) return { left: total - rightChars, right: rightChars }
  return { left: half, right: total - half }
}
