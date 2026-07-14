import { wrapApiError } from '~/server/utils/openai'

interface SummaryItem { sentiment: 'ポジ' | 'ネガ'; text: string }

// 1回のAPI呼び出しに渡す入力テキストの目安上限（文字数）。
// これを超える入力は分割し、各チャンクを個別に要約してから items を結合する。
// max_tokens が有限（出力JSONが長くなると途中で切れてJSON.parseに失敗する）ため、
// 入力側を分割して1回あたりの出力量を抑えることで、長文でも安定して処理できるようにする。
const CHUNK_CHAR_LIMIT = 1500

const SYSTEM_PROMPT = `以下の発話内容を分析し、重要なポイントをJSONで返してください。

形式:
{
  "items": [
    { "sentiment": "ポジ" または "ネガ", "text": "具体的な内容（1〜3文）" }
  ]
}

ルール:
- 発話内容から意味のある情報・出来事・気持ちを全て抽出し、ポイントごとに1エントリ作る
- 各テキストは具体的で詳しく書く（1〜3文）。抽象的なまとめ方はしない
- トピックや気持ちが複数あれば複数エントリにする（制限なし）
- 「えー」「うーん」など内容のない発話だけの場合は items を空配列にする
- sentiment はそのポイントがポジティブなら "ポジ"、ネガティブ・辛い内容なら "ネガ"
- JSONのみ返す。余計な説明不要`

/**
 * 長文を CHUNK_CHAR_LIMIT 以下のチャンクに分割する。
 * まず改行、次に日本語の句点（。！？）や空白の区切りを優先して自然な位置で切る。
 * 区切りが見つからない場合は上限で強制的に切る（単語境界を無視してでも必ず前進させる）。
 */
function splitIntoChunks(text: string, limit: number): string[] {
  if (text.length <= limit) return [text]

  const chunks: string[] = []
  let rest = text

  while (rest.length > limit) {
    const window = rest.slice(0, limit)
    // 区切り候補を「後ろに近いほど良い」優先度で探す
    const candidates = [
      window.lastIndexOf('\n'),
      window.lastIndexOf('。'),
      window.lastIndexOf('！'),
      window.lastIndexOf('？'),
      window.lastIndexOf('!'),
      window.lastIndexOf('?'),
      window.lastIndexOf('　'),
      window.lastIndexOf(' '),
    ]
    // limit の半分より手前で切ると細切れになりすぎるため、後半にある区切りだけ採用する
    let cut = Math.max(...candidates.filter(i => i >= limit * 0.5))
    // 句読点等は区切り文字自体を含めたいので +1（改行・空白はそのまま次チャンク先頭でtrimされる）
    if (cut < 0) cut = limit
    else cut += 1
    chunks.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut)
  }
  if (rest.trim()) chunks.push(rest.trim())
  return chunks.filter(Boolean)
}

// 1チャンク分を Claude に要約させ、items 配列を返す。
async function summarizeChunk(apiKey: string, text: string): Promise<SummaryItem[]> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      // 入力を分割して1回あたりの出力量を抑えているが、余裕を持って上限を引き上げておく
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: text }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => null)
    throw createError({
      statusCode: response.status,
      statusMessage: err?.error?.message || 'Claude APIの呼び出しに失敗しました。',
    })
  }

  const data = await response.json()
  const raw = data?.content?.[0]?.text ?? ''
  const stripped = raw.replace(/```(?:json)?/g, '').trim()

  const extractJsonLike = (s: string) => {
    const m = s.match(/\{[\s\S]*\}/)
    return m ? m[0] : s
  }

  const sanitizeCommonIssues = (s: string) => {
    // remove trailing commas before ] or }
    let out = s.replace(/,\s*(?=[\]}])/g, '')
    // remove control characters that break JSON.parse
    out = out.replace(/[\u0000-\u001f]/g, '')
    return out
  }

  const rawJson = extractJsonLike(stripped)
  let parsed: any = null
  try {
    parsed = JSON.parse(rawJson)
  } catch (e1) {
    try {
      parsed = JSON.parse(sanitizeCommonIssues(rawJson))
    } catch (e2) {
      // 最終手段: try to locate first { and last } and parse that substring
      const first = rawJson.indexOf('{')
      const last = rawJson.lastIndexOf('}')
      if (first !== -1 && last !== -1 && last > first) {
        try {
          parsed = JSON.parse(sanitizeCommonIssues(rawJson.slice(first, last + 1)))
        } catch (e3) {
          throw createError({ statusCode: 500, statusMessage: '解析できないJSONが返されました（修復失敗）。' })
        }
      } else {
        throw createError({ statusCode: 500, statusMessage: '解析できないJSONが返されました（構造不明）。' })
      }
    }
  }

  // 新形式: { items: [...] }
  if (Array.isArray(parsed.items)) {
    return parsed.items
      .map((item: { sentiment?: string; text?: string }) => ({
        sentiment: item.sentiment === 'ポジ' ? 'ポジ' : 'ネガ',
        text: (item.text ?? '').trim(),
      }))
      .filter((item: SummaryItem) => item.text)
  }

  // フォールバック: 旧形式（単一の sentiment/text）
  if (parsed.text) {
    return [{ sentiment: parsed.sentiment === 'ネガ' ? 'ネガ' : 'ポジ', text: String(parsed.text).trim() }]
  }
  return []
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ text: string }>(event)

  if (!body?.text) {
    throw createError({ statusCode: 400, statusMessage: 'text is required' })
  }

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'Anthropic API key is not configured.' })
  }

  try {
    // 長文は分割し、各チャンクを順に要約して items を結合する
    // （並列にすると入力量次第でレート制限に当たりやすいため、順次実行する）
    const chunks = splitIntoChunks(body.text, CHUNK_CHAR_LIMIT)
    const items: SummaryItem[] = []
    for (const chunk of chunks) {
      const chunkItems = await summarizeChunk(anthropicApiKey as string, chunk)
      items.push(...chunkItems)
    }

    const notes = JSON.stringify({ items })
    return { notes }
  } catch (err) {
    return wrapApiError(err, '中間データの生成に失敗しました')
  }
})
