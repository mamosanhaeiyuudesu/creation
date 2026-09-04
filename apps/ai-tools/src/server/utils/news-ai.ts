/**
 * news の要約と重要度判定。Claude 呼び出しは既存の callClaudeText に任せる。
 */
import { callClaudeText } from '~/server/utils/anthropic'
import { NEWS_MODEL } from '~/utils/news-sources'

export interface NewsSummary {
  titleJa: string
  summary: string
  importance: number
  reason: string
}

const SYSTEM = `あなたはAI業界を追っている日本語のアナリストです。
渡された記事を読み、日本語で要約し、重要度を判定してください。

重要度の基準（1〜5）:
1 = 些細な更新。個別の小機能、イベント告知、人事の話題
2 = 通常の製品アップデート。使う人には嬉しいが業界は動かない
3 = 注目に値する。新モデル・主要機能の刷新・目立つ提携や資金調達
4 = 業界構造に効く。競争環境や価格・提供形態が変わる、大型の提携や買収、規制対応
5 = 政策や産業の前提が変わる規模。法規制、国家レベルの合意、業界を再編する発表

判定で重視すること:
- 「誰が使えるようになったか」より「何が構造として変わったか」を見る
- 宣伝文句の大きさに引きずられない。金額や固有名詞の派手さは重要度ではない
- 情報が薄く判断材料が足りないときは、盛らずに低めに付けてよい

出力は次のJSONのみ。前置きやコードフェンスを付けないこと。
{"titleJa": "日本語の見出し（30字程度）", "summary": "日本語の要約", "importance": 3, "reason": "その重要度にした理由（40字程度で1行）"}

summary は3〜5行。1行ずつ改行で区切り、各行は事実を1つずつ短く述べる。箇条書き記号は付けない。`

/** ```json ... ``` に包まれていても中身を取り出す。 */
function extractJson(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  const raw = (fenced ?? text).trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('JSONが見つかりません')
  return JSON.parse(raw.slice(start, end + 1))
}

export async function summarizeArticle(
  apiKey: string,
  input: { title: string; url: string; sourceName: string; body: string; bodyIsFeedSummary: boolean }
): Promise<NewsSummary> {
  const note = input.bodyIsFeedSummary
    ? '（本文が取得できなかったため、以下はRSSの要約文です。情報が薄い前提で判断してください）'
    : ''

  const text = await callClaudeText(apiKey, {
    model: NEWS_MODEL,
    maxTokens: 1200,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `ソース: ${input.sourceName}
タイトル: ${input.title}
URL: ${input.url}
${note}

本文:
${input.body}`,
      },
    ],
  })

  const parsed = extractJson(text)
  const importance = Math.round(Number(parsed.importance))

  return {
    titleJa: String(parsed.titleJa ?? '').trim() || input.title,
    summary: String(parsed.summary ?? '').trim(),
    // 判定が壊れていたら 0 のままにせず、配信されない 2 に寄せる（誤って埋もれるより、ページには残す）
    importance: Number.isFinite(importance) ? Math.min(5, Math.max(1, importance)) : 2,
    reason: String(parsed.reason ?? '').trim(),
  }
}
