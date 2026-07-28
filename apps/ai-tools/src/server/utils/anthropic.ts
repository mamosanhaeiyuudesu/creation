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
  /** 指定すると Web 検索（サーバーツール）を有効にする。応答は全テキストブロックを連結して返す。 */
  webSearch?: { maxUses?: number }
}

/**
 * Claude を1回呼び出し、応答のテキストブロックを連結して返す（thinkingは無効）。失敗時は createError を throw。
 * webSearch 指定時はサーバーツール web_search を有効化する（モデルが検索→本文の順に返す）。
 */
export async function callClaudeText(apiKey: string, opts: CallOptions): Promise<string> {
  const body: Record<string, unknown> = {
    model: opts.model ?? DEFAULT_MODEL,
    max_tokens: opts.maxTokens,
    thinking: { type: 'disabled' },
    system: opts.system,
    messages: opts.messages,
  }
  if (opts.webSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: opts.webSearch.maxUses ?? 3 }]
  }
  const response = await fetch(MESSAGES_URL, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => null)
    throw createError({ statusCode: response.status, statusMessage: err?.error?.message || 'Claude APIの呼び出しに失敗しました。' })
  }
  const data = await response.json()
  // Web検索時は content に server_tool_use / web_search_tool_result 等が混ざるので text だけを連結する。
  const blocks: any[] = Array.isArray(data?.content) ? data.content : []
  return blocks
    .filter((b) => b?.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('')
    .trim()
}

interface VisionOptions {
  system: string
  /** ユーザーの指示テキスト（画像の後ろに置く） */
  text: string
  /** 画像の base64 data URL 群（例: スケッチ写真）。1枚が基本、複数可 */
  images: string[]
  maxTokens: number
  model?: string
}

/**
 * 画像付きで Claude を1回呼び出す（スケッチ解釈用）。data URL から media type と base64 を抽出して
 * Messages API の image ブロックへ変換する。最初のテキストブロックを返す。
 */
export async function callClaudeVision(apiKey: string, opts: VisionOptions): Promise<string> {
  const imageBlocks = opts.images.map((dataUrl) => {
    const m = dataUrl.match(/^data:(.+?);base64,(.*)$/)
    if (!m) throw createError({ statusCode: 400, message: '画像のデータ形式が不正です（data URL を指定してください）。' })
    return { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } }
  })
  const response = await fetch(MESSAGES_URL, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      max_tokens: opts.maxTokens,
      thinking: { type: 'disabled' },
      system: opts.system,
      messages: [{ role: 'user', content: [...imageBlocks, { type: 'text', text: opts.text }] }],
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
