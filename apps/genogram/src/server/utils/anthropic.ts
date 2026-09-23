// Anthropic (Claude) Messages API 呼び出し。ai-tools の server/utils/anthropic.ts と同じ思想
// (raw fetch・thinking無効・テキストブロック連結)だが、genogramはテキスト解釈しか使わないため
// callClaudeText と parseJsonLoose だけを持つ最小構成にしている。

const MESSAGES_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-sonnet-5'

interface CallOptions {
  system: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  maxTokens: number
  model?: string
  /**
   * claude-sonnet-5 はthinkingを無効化すると、複雑な指示(このプロジェクトのJSON生成プロンプトのように
   * 守るべきルールが多いもの)で「出力はJSONのみ」という指示を破り、JSONの前に説明文を漏らすことがある。
   * その場合に備えたparseJsonLooseの正規表現フォールバックも、説明文の中に { } が入ると抽出に失敗しうる。
   * thinkingをadaptiveにすると、その説明文はthinkingブロック側に出るようになり(呼び出し側はtextブロックしか
   * 見ないため)、text側にはJSONだけが残るようになる。既定はdisabledのまま(要らない呼び出しでコスト/レイテンシを
   * 増やさないため)、複雑なJSON生成タスクだけ明示的にadaptiveを指定する。
   */
  thinking?: 'disabled' | 'adaptive'
}

/** Claude を1回呼び出し、応答のテキストブロックを連結して返す(thinking省略時は無効)。失敗時は createError を throw。 */
export async function callClaudeText(apiKey: string, opts: CallOptions): Promise<string> {
  const response = await fetch(MESSAGES_URL, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      max_tokens: opts.maxTokens,
      thinking: { type: opts.thinking ?? 'disabled' },
      system: opts.system,
      messages: opts.messages,
    }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => null) as { error?: { message?: string } } | null
    throw createError({ statusCode: response.status, statusMessage: err?.error?.message || 'Claude APIの呼び出しに失敗しました。' })
  }
  const data = await response.json() as { content?: { type?: string; text?: string }[] }
  const blocks = Array.isArray(data?.content) ? data.content : []
  return blocks
    .filter((b): b is { type: string; text: string } => b?.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('')
    .trim()
}

/** JSON文字列を寛容にパース(素のJSON→失敗時は最初の {...} を抽出)。取れなければ null。 */
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
