// PDFの枠に入り切らないときだけ呼ばれる要約。
// 目安文字数（アカウント全体の設定。types/settings.ts）に収まっているならクライアントはここを呼ばない。

import { requireUser } from '~/server/utils/auth'
import { requireEntitlement } from '~/server/utils/entitlement'
import { condensePrintLeft, condensePrintRight, type PrintLineInput } from '~/server/utils/minutes-ai'
import { PDF_MAX_CHARS_MAX } from '~/types/settings'

/**
 * 1列あたりの文字数の下限。全体の目安（500字〜）を左右に振り分けたあとの値が来るので、
 * 全体の下限より小さくなりうる（片方が短く、もう片方に多く回したとき）
 */
const COLUMN_MAX_CHARS_MIN = 100
import { normalizeMode, type MinutesPoint } from '~/types/minutes'

function clampMaxChars(v: unknown): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return COLUMN_MAX_CHARS_MIN
  return Math.min(PDF_MAX_CHARS_MAX, Math.max(COLUMN_MAX_CHARS_MIN, Math.round(n)))
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  // AIを呼ぶ口なので、ここも契約状態を見る（モニター期間中は無条件で通る）
  await requireEntitlement(event, user.id)
  const body = await readBody<{
    target?: 'left' | 'right'
    mode?: string
    summary?: string
    /** 左側で概要と一緒に載せる項目（会議＝話し合ったこと、1人の話＝話の内容） */
    points?: MinutesPoint[]
    decisions?: PrintLineInput[]
    events?: PrintLineInput[]
    tasks?: PrintLineInput[]
    maxChars?: number
  }>(event)

  const maxChars = clampMaxChars(body?.maxChars)
  const mode = normalizeMode(body?.mode)

  if (body?.target === 'left') {
    const text = await condensePrintLeft(
      event,
      { mode, summary: body?.summary ?? '', points: body?.points ?? [] },
      maxChars
    )
    return { text }
  }

  return await condensePrintRight(
    event,
    {
      mode,
      decisions: body?.decisions ?? [],
      events: body?.events ?? [],
      tasks: body?.tasks ?? [],
    },
    maxChars
  )
})
