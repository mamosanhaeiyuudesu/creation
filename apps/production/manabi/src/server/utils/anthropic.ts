// Anthropic (Claude) Messages API の呼び出し。manabi は利用者ごとの課金・メーターを持たないので、
// kikigaki 本番版のような使用量の計測は付けず、素のテキスト呼び出しだけを置く。
// AI代の歯止めは IP ごとの1日の生成回数（server/utils/manabi.ts）。

const MESSAGES_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-sonnet-5-5'

interface CallOptions {
  system: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  maxTokens: number
  model?: string
}

/** Claude を1回呼び出し、応答のテキストブロックを連結して返す（thinkingは無効）。失敗時は createError を throw。 */
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
