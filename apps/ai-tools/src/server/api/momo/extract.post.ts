import { requireMomoUser } from '~/server/utils/momo'
import { callClaudeText, parseJsonLoose } from '~/server/utils/anthropic'
import type { Extraction } from '~/types/momo'

// 貼り付けられた会話ログを Claude に渡し、注文情報を構造化抽出する（仕様§4.2）。
// ⚠ DBには保存しない。あくまで下書き。確定は必ず人間が確認画面で行う。

const SYSTEM = `あなたは桃農家の注文係アシスタントです。飲食店とのSNS会話ログから、出荷伝票に必要な情報だけを正確に抽出します。
勝手な推測をせず、会話から読み取れることだけを構造化してください。誤発送は農家に大きな損害を与えるため、少しでも曖昧なら null にして人間に確認を促すのが正しい振る舞いです。

抽出ルール:
- 相対日付の変換: 「明後日」「来週頭」「25日」などは、指定された基準日から絶対日付 (YYYY-MM-DD) に変換する。年が不明なら基準日の年を使う。
- 最終合意の採用: 交渉の結果として最終的に合意した内容だけを採用する。途中の希望や却下された案（例:「24日は無理」）は無視する。
- 推測の禁止: 読み取れない項目は null にする。埋めない。
- サイズの正規化: 2L / 3L / 4L / 5L のいずれかに正規化する。「大きめ」「特大」など曖昧な表現は null とし、ambiguities に記載する。
- サイズ混載の分割: 「3Lを1箱、4Lを2箱」のような場合は items を複数行に分割する。
- 硬さ(ripeness): 「固め」「柔らかめ」など会話の表現をそのまま短く。無ければ null。
- 確信度の付与: delivery_date / size / ripeness など主要フィールドに high / medium / low を付ける。
- 曖昧点: 確認が必要な点は ambiguities に日本語で列挙する。
- raw_excerpt: 判断の根拠になった会話の一部を短く引用する。

必ず JSON のみを返す。前後に説明文やコードブロックの記号を付けない。`

export default defineEventHandler(async (event) => {
  await requireMomoUser(event)
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const body = await readBody<{ rawText?: string; referenceDate?: string }>(event)
  const raw = (body?.rawText ?? '').trim()
  if (!raw) throw createError({ statusCode: 400, message: '会話ログを入力してください' })

  // 相対日付変換の基準日。クライアントから受け取り（JSTの当日）、無ければサーバー現在日。
  const referenceDate = (body?.referenceDate ?? '').match(/^\d{4}-\d{2}-\d{2}$/)
    ? body!.referenceDate!
    : new Date().toISOString().slice(0, 10)

  const out = await callClaudeText(anthropicApiKey as string, {
    system: SYSTEM,
    maxTokens: 1500,
    messages: [{
      role: 'user',
      content: `基準日（相対日付はこの日付から換算する）: ${referenceDate}

会話ログ:
"""
${raw}
"""

次のスキーマの JSON のみを返してください:
{
  "customer_name": "顧客名 or null",
  "items": [
    { "variety": "品種 or null", "size": "2L/3L/4L/5L or null", "quantity": 数値 or null, "unit": "箱 など or null", "ripeness": "固め など or null", "notes": "特記事項（無ければ空文字）" }
  ],
  "delivery_date": "YYYY-MM-DD or null",
  "delivery_time_slot": "午前/午後/夕方/夜 or null",
  "confidence": { "delivery_date": "high/medium/low", "size": "high/medium/low", "ripeness": "high/medium/low" },
  "ambiguities": ["確認が必要な点の説明", "..."],
  "raw_excerpt": "根拠になった会話の抜粋"
}`,
    }],
  })

  const parsed = parseJsonLoose<Extraction>(out)
  if (!parsed) throw createError({ statusCode: 502, message: 'AI抽出に失敗しました。もう一度お試しください。' })

  // 最低限の形を保証する。
  return {
    customer_name: parsed.customer_name ?? null,
    items: Array.isArray(parsed.items) ? parsed.items : [],
    delivery_date: parsed.delivery_date ?? null,
    delivery_time_slot: parsed.delivery_time_slot ?? null,
    confidence: parsed.confidence ?? {},
    ambiguities: Array.isArray(parsed.ambiguities) ? parsed.ambiguities : [],
    raw_excerpt: parsed.raw_excerpt ?? '',
  } satisfies Extraction
})
