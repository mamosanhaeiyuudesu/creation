// nikki のトピック抽出。Claude 呼び出しをここに集約する。
//
// ★「重要トピックとは何か」の匙加減はこのファイルだけに書く。出てくるトピックが薄い／多すぎる、
//   といった調整はここのシステムプロンプトを触ること（画面側やAPI側に条件を散らさない）。
//
// 抽出の考え方: その日にあった出来事を並べるのではなく、**1年後に読み返したときに
// 「この日か」と手応えが戻ってくるものだけ**を残す。予定表のコピーや事務連絡は落とす。

import { callClaudeText, parseJsonLoose } from '~/server/utils/anthropic'
import { normalizeTopic } from '~/server/utils/nikki'
import type { NewTopic } from '~/server/utils/nikki'
import { NIKKI_MAX_TOPICS_PER_EXTRACT } from '~/types/nikki'

const MODEL = 'claude-sonnet-5'
const MAX_TOKENS = 2000

function buildSystemPrompt(date: string, existingHeadlines: string[]): string {
  const already = existingHeadlines.length
    ? `\n\n## すでに記録済みのトピック（重複させない）\n${existingHeadlines.map((h) => `- ${h}`).join('\n')}\n同じ出来事を指すものは、新しく作らずに無視する。`
    : ''

  return `あなたは、その人が1年後に日記を読み返したときに「この日か」と思い出せるように、その日の話から
**インパクトのある出来事だけ**を抜き出す編集者です。対象の日付は ${date} です。

## 抜き出すもの
- 心が動いた出来事（嬉しかった・悔しかった・驚いた・怖かった・ほっとした）
- はじめてのこと、決めたこと、やめたこと、終わらせたこと
- 人との具体的なやりとり（誰が何と言ったか）
- 数字や事実として残る成果（金額・件数・記録・結果）
- あとから振り返って分岐点になりそうなこと

## 抜き出さないもの
- 予定表をそのまま書き写したような記述（「10時から打ち合わせ」だけのもの）
- 手順・段取り・事務連絡・買い物メモ
- 感想のない行動の羅列（「メールを返した」「移動した」）
- 話に出ていないこと。**書かれていないことを補って作るのは禁止**

## 書き方
- headline: 読み返したときに一目で分かる見出し。日本語20文字以内。飾らず具体的に。
- detail: 1〜2文（80文字以内）。**手応えが戻ってくる具体**（固有名・数字・相手の言葉・その場の感覚）を必ず入れる。
  本人が書いた言葉づかいはできるだけ残す。説明や励ましを足さない。
- impact: 1〜5の整数。5=人生の節目。4=何年も覚えているだろうこと。3=その月を思い出せること。
  2=その週のこと。1=すぐ忘れること。**1と2は出さない**（後で読み返す価値が無いものは、そもそも抜き出さない）。

## 件数
- 0件でもよい。インパクトのある話が無い日は空の配列を返す（無理に埋めない）。
- 多くても${NIKKI_MAX_TOPICS_PER_EXTRACT}件まで。迷ったら数を絞り、impactの高いものを残す。${already}

## 出力
JSONのみを返す。前置き・説明・コードフェンスは付けない。
{"topics":[{"headline":"","detail":"","impact":3}]}`
}

/**
 * その日に入力されたテキストからトピックを抜き出す。
 * existingHeadlines を渡すと、すでにあるトピックと同じ出来事は返さない
 * （1日のうちに何度も追記する使い方で、同じ話が増えていかないようにするため）。
 */
export async function extractNikkiTopics(
  event: any,
  input: { date: string; text: string; existingHeadlines?: string[] }
): Promise<NewTopic[]> {
  const text = input.text.trim()
  if (!text) return []

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) {
    throw createError({ statusCode: 500, message: 'Anthropic APIキーが未設定です' })
  }

  const raw = await callClaudeText(anthropicApiKey as string, {
    system: buildSystemPrompt(input.date, input.existingHeadlines ?? []),
    messages: [{ role: 'user', content: `以下は ${input.date} に本人が話した（または書いた）内容です。\n\n${text}` }],
    maxTokens: MAX_TOKENS,
    model: MODEL,
  })

  const parsed = parseJsonLoose<{ topics?: unknown }>(raw)
  const list = Array.isArray(parsed?.topics) ? parsed!.topics : []

  // AIの出力は必ず normalizeTopic を通す（見出しが空・impactが範囲外、という形で静かに崩れるため）。
  // impact 1〜2 は「読み返す価値が無い」として落とす＝プロンプトで禁じているが念のため。
  return (list as Partial<NewTopic>[])
    .map((t) => normalizeTopic(t))
    .filter((t): t is NewTopic => !!t && t.impact >= 3)
    .slice(0, NIKKI_MAX_TOPICS_PER_EXTRACT)
}
