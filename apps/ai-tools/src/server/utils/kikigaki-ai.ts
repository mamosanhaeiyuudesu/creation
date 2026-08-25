// キキガキの Claude 呼び出し（文字起こし → 議事録の構造化）を集約する。
// 構造化の「匙加減」＝創作の禁止・決定と検討の切り分け・用語補正のルールは全部このファイルの
// システムプロンプトに置いてある。トーンや基準を変えるときはここだけ触ればよい。

import { callClaudeText, parseJsonLoose } from '~/server/utils/anthropic'
import { normalizeMinutes } from '~/server/utils/kikigaki'
import { glossaryJson } from '~/utils/kikigaki-glossary'
import type { KikigakiMinutes } from '~/types/kikigaki'

const MAX_TOKENS = 8000

/**
 * 構造化のシステムプロンプト。
 *
 * task_candidates の due_date / event_candidates の start・end は、指示書のフォーマットに対して
 * このリポジトリで足した欄。「日時が明確なものだけカレンダーへ登録する」を機械的に判定するには
 * 原文の表現（"来月中に"）と確定した日時を別々に持つ必要があるため。原文側は必ずそのまま残す。
 */
function buildSystemPrompt(todayJst: string): string {
  return `あなたは地域の会議・活動記録を構造化するアシスタントです。
以下のルールを厳守してください。

【最重要ルール:創作の禁止】
- 文字起こしに書かれていない情報を絶対に追加しないこと。
- 聞き取れない・意味が不明瞭な箇所は、無理に補完せず「[不明瞭]」と記載すること。
- 推測や一般論で穴埋めしないこと。書かれている内容だけを根拠にすること。

【用語の補正】
- 以下の用語集を参照し、表記ゆれがあれば正しい表記に補正すること。
- 用語集にない固有名詞は、文字起こしの表記をそのまま尊重すること(勝手に変換しない)。

用語集(JSON):
${glossaryJson()}

【構造化のルール】
- 「決定事項」は、会議の中で明確に合意・決定されたことのみを含める。
  検討中・未決定のものは「検討事項」に入れること。
- 決定事項と検討事項の切り分けに迷う場合は、断定を避け検討事項側に倒すこと。
- タスク候補は「誰が」「何を」「いつまでに」が文字起こし内で分かる場合のみ抽出する。
  主語が不明な場合は担当を「[不明瞭]」とする。
- 予定候補は「日時」が文字起こし内に明示されている場合のみ抽出する。
  曖昧な時期表現(「来月中に」など)は日付を確定させず、原文の表現をそのまま残す。

【日付の確定について】
- この録音を取り込んだ日は ${todayJst}（日本時間）である。
- 「来週の火曜日」のように、この日を基準にすれば一意に定まる表現に限り、
  due_date / start / end を YYYY-MM-DD、YYYY-MM-DDTHH:mm 形式で埋めてよい。
- 少しでも曖昧な場合（「来月中に」「そのうち」「都合のいい日に」など）は、
  due_date / start / end を空文字 "" のままにすること。埋めた欄はカレンダーやタスクに
  そのまま登録されるため、迷ったら必ず空にする。
- due / datetime には常に原文の表現をそのまま入れること（空にしない）。

【出力形式】
以下のJSON形式のみを出力すること。前置きや説明文、Markdownのコードフェンスは一切含めないこと。

{
  "title": "",
  "date": "",
  "summary": "",
  "decisions": [{ "content": "", "note": "" }],
  "discussions": [{ "content": "", "note": "" }],
  "task_candidates": [{ "assignee": "", "task": "", "due": "", "due_date": "" }],
  "event_candidates": [{ "datetime": "", "title": "", "location": "", "start": "", "end": "" }],
  "unclear_points": [""]
}

- date は会議が開かれた日（YYYY-MM-DD）。文字起こしから分からなければ空文字にすること。
- unclear_points は、聞き取れなかった箇所・判断に自信が持てなかった箇所を必ず自己申告する欄。
  人間が優先的に確認するために使うので、無いと言い切れる場合を除き省略しないこと。`
}

/** 日本時間の今日（YYYY-MM-DD） */
function todayJst(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}

/** 文字起こし全文を議事録の構造化JSONにする。パースできなければ 502 を throw。 */
export async function structureTranscript(event: any, transcript: string): Promise<KikigakiMinutes> {
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) {
    throw createError({ statusCode: 500, message: 'Anthropic APIキーが未設定です' })
  }

  const raw = await callClaudeText(anthropicApiKey as string, {
    system: buildSystemPrompt(todayJst()),
    messages: [{ role: 'user', content: `以下は会議の文字起こし全文です。\n\n${transcript}` }],
    maxTokens: MAX_TOKENS,
  })

  const parsed = parseJsonLoose<any>(raw)
  if (!parsed) {
    throw createError({ statusCode: 502, message: 'AIの応答をJSONとして読み取れませんでした。もう一度お試しください。' })
  }
  return normalizeMinutes(parsed)
}
