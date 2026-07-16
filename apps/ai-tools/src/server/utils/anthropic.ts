// Anthropic (Claude) Messages API 呼び出しの共通処理。OpenAI を openai.ts に集約するのと
// 同じ思想で、Fitbit系（アドバイス生成・チャット・カロリー推定）のClaude呼び出しをここへ集約する。

import type { ChatMessage } from '~/types/fitbit'

const MESSAGES_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-sonnet-5'

interface CallOptions {
  system: string
  messages: ChatMessage[]
  maxTokens: number
  model?: string
}

/** Claude を1回呼び出し、最初のテキストブロックを返す（thinkingは無効）。失敗時は createError を throw。 */
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
    throw createError({ statusCode: response.status, statusMessage: err?.error?.message || 'Claude APIの呼び出しに失敗しました。' })
  }
  const data = await response.json()
  return (data?.content?.[0]?.text ?? '').trim()
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
