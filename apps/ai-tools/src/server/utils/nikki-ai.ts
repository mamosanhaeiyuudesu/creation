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

const MODEL = 'claude-sonnet-5-5'
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

// ─────────────────────────────── 直近の振り返り ───────────────────────────────
//
// ★振り返りの観点（誰として何を見るか）はこの DEFAULT_REVIEW_PROMPT に書く。画面の ⚙ →
//   「AI振り返りのプロンプト」で本人が上書きできる（D1 の nikki_settings。空なら既定に戻る）。
// ★出力の形（JSON）はプロンプトに含めず REVIEW_OUTPUT_RULE で毎回後ろに足す。
//   本人が文面を編集しても、画面が読めなくならないようにするため。

export const DEFAULT_REVIEW_PROMPT = `あなたは、独立しようとしている人の日記を読み、伴走する聞き手です。

## 本人について
- 今、独立して自分の事業やサービスを作ろうとしている。
- エンジニアで開発は得意。マーケティング・デザイン・セールスはほとんどやったことがなく、そこを強めていきたい。
- 何より、自分が何をしていると本当に楽しいのか、何を本心からしたいと考えているのかをじっくり追求しながら、自分軸で独立していきたい。

## 振り返りの観点（直近1ヶ月の日記から、次の3つを見る）
1. 楽しさ・本心: 何をしているとき楽しそう／夢中だったか。本心から望んでいそうなことは何か。やらされ感や無理の気配はどこか。
2. 苦手分野の前進: マーケティング・デザイン・セールスに関して、やったこと・避けていること・次の一歩。
3. 自分軸での独立: 他人の基準や不安に引っ張られた場面と、自分の軸で選べた場面。今の進み方の方向。

## 書き方
- 3項目それぞれに、短い見出しと、50文字程度（40〜60字）のまとめを書く。
- 日記に書かれていることだけを根拠にする。書かれていないことを補わない。根拠が薄い項目は、薄いと正直に書く。
- 本人の言葉づかいを活かし、励ましや一般論は足さない。具体的に。`

const REVIEW_OUTPUT_RULE = `

## 出力
JSONのみを返す。前置き・説明・コードフェンスは付けない。
{"items":[{"heading":"見出し","summary":"まとめ"}]}`

export interface NikkiReviewItem {
  heading: string
  summary: string
}

/** 期間の日記本文（古い順）から振り返りを作る。prompt が空なら既定のプロンプトを使う。 */
export async function generateNikkiReview(
  event: any,
  input: { from: string; to: string; days: { date: string; body: string }[]; prompt?: string }
): Promise<NikkiReviewItem[]> {
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) {
    throw createError({ statusCode: 500, message: 'Anthropic APIキーが未設定です' })
  }

  // 1日あたり・全体の文字数を絞る（長い日があっても全期間が入るよう、新しい日を優先して削る）
  const PER_DAY = 1500
  const TOTAL = 40000
  let used = 0
  const picked: string[] = []
  for (const d of [...input.days].reverse()) {
    const text = `■ ${d.date}\n${d.body.slice(-PER_DAY)}`
    if (used + text.length > TOTAL) break
    used += text.length
    picked.unshift(text)
  }

  const raw = await callClaudeText(anthropicApiKey as string, {
    system: (input.prompt?.trim() || DEFAULT_REVIEW_PROMPT) + REVIEW_OUTPUT_RULE,
    messages: [{ role: 'user', content: `以下は ${input.from} 〜 ${input.to} の日記です。\n\n${picked.join('\n\n')}` }],
    maxTokens: 1500,
    model: MODEL,
  })

  const parsed = parseJsonLoose<{ items?: unknown }>(raw)
  const list = Array.isArray(parsed?.items) ? (parsed!.items as Partial<NikkiReviewItem>[]) : []
  const items = list
    .map((i) => ({ heading: String(i?.heading ?? '').trim(), summary: String(i?.summary ?? '').trim() }))
    .filter((i) => i.heading && i.summary)
    .slice(0, 6)
  if (!items.length) throw createError({ statusCode: 502, message: '振り返りを作れませんでした。もう一度お試しください' })
  return items
}
