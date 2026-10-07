// Claude（Anthropic Messages API）呼び出しの共通処理。
// apps/ai-tools/src/server/utils/anthropic.ts からの移植で、このアプリで使わないもの
// （画像入力・Web検索）は持ってきていない。

import type { H3Event } from 'h3'

const MESSAGES_URL = 'https://api.anthropic.com/v1/messages'

/**
 * 既定のモデル。
 * ai-tools の /kikigaki は claude-sonnet-5 で運用していた。本番版は後継の Sonnet 5.5 を既定にする
 * （プロンプトはJSONの構造を指示する形なのでモデル差の影響は小さい）。
 * 生成の質・費用の調整はここだけ触ればよい。
 */
const DEFAULT_MODEL = 'claude-sonnet-5-5'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface CallOptions {
  system: string
  messages: ChatMessage[]
  maxTokens: number
  model?: string
}

/** APIキー。未設定なら利用者向けの文言で 503 を返す（鍵の有無は利用者の落ち度ではない） */
export function getAnthropicKey(event: H3Event): string {
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) {
    throw createError({
      statusCode: 503,
      message: 'ただいま議事録をつくれない状態です。少し時間をおいてから、もう一度お試しください。',
    })
  }
  return anthropicApiKey as string
}

/** Claude を1回呼び出し、応答のテキストブロックを連結して返す（thinkingは無効） */
export async function callClaudeText(apiKey: string, opts: CallOptions): Promise<string> {
  const response = await fetch(MESSAGES_URL, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      max_tokens: opts.maxTokens,
      thinking: { type: 'disabled' },
      system: opts.system,
      messages: opts.messages,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => null)
    // 原因（レート制限・残高など）は利用者には手の打ちようがないので、ログに出して画面には次の一手を出す。
    console.error('[kikigaki] Claude error:', response.status, err?.error?.message ?? '')
    throw createError({
      statusCode: 502,
      message: 'AIが混み合っているようです。少し時間をおいてから、もう一度お試しください。',
    })
  }

  const data = await response.json()
  const blocks: any[] = Array.isArray(data?.content) ? data.content : []
  return blocks
    .filter((b) => b?.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('')
    .trim()
}

/** JSON文字列を寛容にパース（素のJSON→失敗時は最初の {...} を抽出）。取れなければ null。 */
export function parseJsonLoose<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0]) as T
    } catch {
      return null
    }
  }
}
