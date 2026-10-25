// PDFの枠に入り切らないときだけ呼ばれる要約。
// 目安文字数（固定。utils/printBudget.ts の PDF_MAX_CHARS）に収まっているならクライアントはここを呼ばない。

import { requireUser } from '~/server/utils/auth'
import { requireEntitlement } from '~/server/utils/entitlement'
import { condensePrintLeft, condensePrintRight, type PrintLineInput } from '~/server/utils/minutes-ai'
import { normalizeLayout, normalizeMode, type MinutesPoint } from '~/types/minutes'
import { PDF_MAX_CHARS } from '~/utils/printBudget'

/**
 * 1列あたりの文字数の下限。全体の目安（PDF_MAX_CHARS）を左右に振り分けたあとの値が来るので、
 * 全体の目安より小さくなる（上限は全体の目安。片方が短く、もう片方に多く回したときも超えない）
 */
const COLUMN_MAX_CHARS_MIN = 100

function clampMaxChars(v: unknown): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return COLUMN_MAX_CHARS_MIN
  return Math.min(PDF_MAX_CHARS, Math.max(COLUMN_MAX_CHARS_MIN, Math.round(n)))
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  // AIを呼ぶ口なので、ここも契約状態を見る（モニター期間中は無条件で通る）
  await requireEntitlement(event, user.id)
  const body = await readBody<{
    target?: 'left' | 'right'
    mode?: string
    layout?: number
    summary?: string
    /** 左側で概要と一緒に載せる項目（会議＝話し合ったこと、1人の話＝話の内容） */
    points?: MinutesPoint[]
    decisions?: PrintLineInput[]
    /** 決まっていないこと（会議の layout 2 のみ） */
    undecided?: PrintLineInput[]
    events?: PrintLineInput[]
    tasks?: PrintLineInput[]
    maxChars?: number
  }>(event)

  const maxChars = clampMaxChars(body?.maxChars)
  const mode = normalizeMode(body?.mode)
  const layout = normalizeLayout(body?.layout)

  if (body?.target === 'left') {
    const text = await condensePrintLeft(
      event,
      { mode, layout, summary: body?.summary ?? '', points: body?.points ?? [] },
      maxChars
    )
    return { text }
  }

  return await condensePrintRight(
    event,
    {
      mode,
      layout,
      decisions: body?.decisions ?? [],
      undecided: body?.undecided ?? [],
      events: body?.events ?? [],
      tasks: body?.tasks ?? [],
    },
    maxChars
  )
})
