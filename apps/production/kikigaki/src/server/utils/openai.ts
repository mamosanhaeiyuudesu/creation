// OpenAI の鍵の取得だけ。呼び出し自体は使う場所（文字起こし）に直書きしている
// （この本番版が OpenAI を使うのは音声の文字起こし1か所だけなので、共通化する意味が薄い）。

import type { H3Event } from 'h3'

export function getOpenAiKey(event: H3Event): string {
  const { openaiApiKey } = useRuntimeConfig(event)
  if (!openaiApiKey) {
    // 鍵が無いのは利用者の落ち度ではないので、原因は出さずに次の一手だけ伝える
    throw createError({
      statusCode: 503,
      message: 'ただいま文字起こしができない状態です。少し時間をおいてから、もう一度お試しください。',
    })
  }
  return openaiApiKey as string
}
