// PDF出力用。左側「概要」または右側「決定事項・予定・タスク」の内容が、レビュー画面で設定した
// 目安文字数を超えているときだけクライアントから呼ばれ、AIが文字数内に要約し直す。
// 文字数内に収まっている場合はクライアント側で判断してこのAPIを呼ばないので、通常のPDF化では
// 呼ばれない（コストと精度のリスクを避けるため）。

import { requireKikigakiUser } from '~/server/utils/kikigaki'
import { condensePrintLeft, condensePrintRight } from '~/server/utils/kikigaki-ai'
import { KIKIGAKI_PRINT_MAX_CHARS_MIN, KIKIGAKI_PRINT_MAX_CHARS_MAX } from '~/types/kikigaki'
import type { KikigakiPoint } from '~/types/kikigaki'
import type { PrintLineInput } from '~/server/utils/kikigaki-ai'

interface Body {
  target?: 'left' | 'right'
  maxChars?: number
  summary?: string
  discussions?: KikigakiPoint[]
  decisions?: PrintLineInput[]
  events?: PrintLineInput[]
  tasks?: PrintLineInput[]
}

function clampMaxChars(v: unknown): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return 450
  return Math.min(KIKIGAKI_PRINT_MAX_CHARS_MAX, Math.max(KIKIGAKI_PRINT_MAX_CHARS_MIN, Math.round(n)))
}

function toLines(v: unknown): PrintLineInput[] {
  return Array.isArray(v)
    ? v.map((l) => ({ main: String(l?.main ?? ''), note: l?.note ? String(l.note) : undefined })).filter((l) => l.main)
    : []
}

export default defineEventHandler(async (event) => {
  await requireKikigakiUser(event)
  const body = await readBody<Body>(event)
  const maxChars = clampMaxChars(body?.maxChars)

  if (body?.target === 'right') {
    const result = await condensePrintRight(
      event,
      { decisions: toLines(body?.decisions), events: toLines(body?.events), tasks: toLines(body?.tasks) },
      maxChars
    )
    return result
  }

  const discussions = Array.isArray(body?.discussions)
    ? body!.discussions!.map((d) => ({ content: String(d?.content ?? ''), note: String(d?.note ?? '') }))
    : []
  const text = await condensePrintLeft(event, { summary: String(body?.summary ?? ''), discussions }, maxChars)
  return { text }
})
