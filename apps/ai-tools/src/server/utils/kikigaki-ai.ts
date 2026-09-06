// キキガキの Claude 呼び出し（文字起こし → 議事録の構造化）を集約する。
// 構造化の「匙加減」＝創作の禁止・決定と検討の切り分け・用語補正のルールは全部このファイルの
// システムプロンプトに置いてある。トーンや基準を変えるときはここだけ触ればよい。

import { callClaudeText, parseJsonLoose } from '~/server/utils/anthropic'
import { normalizeMinutes } from '~/server/utils/kikigaki'
import { glossaryJson } from '~/utils/kikigaki-glossary'
import type { KikigakiMinutes, KikigakiPoint } from '~/types/kikigaki'

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

/**
 * レビュー画面の「AIで内容を修正」用システムプロンプト。
 * structureTranscript と違い、文字起こしからのゼロベースの構造化ではなく、すでにある議事録JSONを
 * 人間の指示（名前の言い間違い直し・軽微な言い回しの修正など）に沿って部分的に書き換えるのが目的。
 * 創作禁止・用語補正のルールは元の構造化と揃え、指示にない項目は変えないことだけ追加している。
 */
function buildReviseSystemPrompt(todayJst: string): string {
  return `あなたは地域の会議・活動記録の議事録を、人間からの指示にもとづいて修正するアシスタントです。
以下のルールを厳守してください。

【最重要ルール:創作の禁止】
- 文字起こしにも指示にも書かれていない情報を絶対に追加しないこと。
- 指示された範囲外の内容は、たとえ改善できそうに見えても変更せず元のまま維持すること。
- 推測や一般論で穴埋めしないこと。

【用語の補正】
- 以下の用語集を参照し、表記ゆれがあれば正しい表記に補正すること。
- 用語集にない固有名詞は、文字起こしの表記をそのまま尊重すること(勝手に変換しない)。

用語集(JSON):
${glossaryJson()}

【参考情報】
- 文字起こし全文（照合用）と、現在の議事録JSONを渡す。指示の実行にあたって事実確認が必要な場合は
  文字起こしを根拠にすること。
- この録音を取り込んだ日は ${todayJst}（日本時間）である。

【出力形式】
現在の議事録と同じ構造のJSONのみを出力すること。前置きや説明文、Markdownのコードフェンスは一切含めないこと。

{
  "title": "",
  "date": "",
  "summary": "",
  "decisions": [{ "content": "", "note": "" }],
  "discussions": [{ "content": "", "note": "" }],
  "task_candidates": [{ "assignee": "", "task": "", "due": "", "due_date": "" }],
  "event_candidates": [{ "datetime": "", "title": "", "location": "", "start": "", "end": "" }],
  "unclear_points": [""]
}`
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

/**
 * レビュー画面の指示欄（1つ）にもとづき、議事録全体をAIに書き換えさせる。
 * 「阪中さんを坂中さんに直して」のような名前・軽微な言い回しの修正をAIに任せられるようにするための機能。
 * printSettings（PDFの目安文字数）は指示の対象外なので、呼び出し側で元の値を上書きし直すこと。
 */
export async function reviseMinutes(
  event: any,
  minutes: KikigakiMinutes,
  transcript: string,
  instruction: string
): Promise<KikigakiMinutes> {
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) {
    throw createError({ statusCode: 500, message: 'Anthropic APIキーが未設定です' })
  }

  const currentJson = JSON.stringify({
    title: minutes.title,
    date: minutes.date,
    summary: minutes.summary,
    decisions: minutes.decisions,
    discussions: minutes.discussions,
    task_candidates: minutes.taskCandidates,
    event_candidates: minutes.eventCandidates,
    unclear_points: minutes.unclearPoints,
  })

  const raw = await callClaudeText(anthropicApiKey as string, {
    system: buildReviseSystemPrompt(todayJst()),
    messages: [
      {
        role: 'user',
        content: `文字起こし全文:\n${transcript}\n\n現在の議事録JSON:\n${currentJson}\n\n指示:\n${instruction}`,
      },
    ],
    maxTokens: MAX_TOKENS,
  })

  const parsed = parseJsonLoose<any>(raw)
  if (!parsed) {
    throw createError({ statusCode: 502, message: 'AIの応答をJSONとして読み取れませんでした。もう一度お試しください。' })
  }
  return normalizeMinutes(parsed)
}

/** PDF印刷用の要約入力。表示用に整形済みの1行（本文＋任意の補足）の配列で渡す */
export interface PrintLineInput {
  main: string
  note?: string
}

function formatPrintLines(lines: PrintLineInput[]): string {
  if (!lines.length) return '（なし）'
  return lines.map((l, i) => `${i + 1}. ${l.main}${l.note ? `（${l.note}）` : ''}`).join('\n')
}

/**
 * PDF左側「概要」用。概要と検討事項の内容を、指定の文字数に収まる1つの文章に要約し直す。
 * 通常は文字数内であればAIを呼ばずそのまま表示する（呼び出し側の判断）ので、これは超過時のみ使う。
 */
export async function condensePrintLeft(
  event: any,
  input: { summary: string; discussions: KikigakiPoint[] },
  maxChars: number
): Promise<string> {
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) {
    throw createError({ statusCode: 500, message: 'Anthropic APIキーが未設定です' })
  }

  const system = `あなたは会議の概要文をPDFの決まった枠に収めるための編集者です。
以下のルールを厳守してください。
- 与えられた「概要」と「検討事項」に書かれていない情報を追加しないこと。推測や創作は禁止。
- 概要と検討事項の内容を、ひとつながりの文章としてまとめ直すこと。箇条書きにはしない。
- 全角・半角を問わず${maxChars}文字以内に収めること。超えてはならない。
- 前置きや説明、Markdown記法は一切含めず、まとめた文章のみを出力すること。`

  const userText = `概要:\n${input.summary || '（なし）'}\n\n検討事項:\n${formatPrintLines(
    input.discussions.map((d) => ({ main: d.content, note: d.note }))
  )}`

  const raw = await callClaudeText(anthropicApiKey as string, {
    system,
    messages: [{ role: 'user', content: userText }],
    maxTokens: 2000,
  })
  // 万一AIが文字数を超えて返しても、PDFのレイアウトが壊れないよう最後の保険として切る。
  return raw.trim().slice(0, maxChars * 2)
}

/**
 * PDF右側「決定事項・予定・タスク」用。3区分それぞれの件数は変えず、言い回しだけを短縮して
 * 合計が指定の文字数に収まるように要約し直す。件数が減る/増えるとPDFの表示と食い違うため、
 * 返ってきた配列の件数が入力と違う区分は、要約を諦めて元の表示文字列にフォールバックする。
 */
export async function condensePrintRight(
  event: any,
  input: { decisions: PrintLineInput[]; events: PrintLineInput[]; tasks: PrintLineInput[] },
  maxChars: number
): Promise<{ decisions: string[]; events: string[]; tasks: string[] }> {
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) {
    throw createError({ statusCode: 500, message: 'Anthropic APIキーが未設定です' })
  }

  const system = `あなたは会議の決定事項・予定・タスクをPDFの決まった枠に収めるための編集者です。
以下のルールを厳守してください。
- 書かれていない情報を追加しないこと。推測や創作は禁止。
- 各項目の言い回しを簡潔にするだけで、区分ごとの項目数は変えない（削除も追加もしない）こと。
- 決定事項・予定・タスクを合計して、全角・半角を問わず${maxChars}文字以内に収めること。
- 出力は以下のJSON形式のみ。前置きや説明、Markdown記法は一切含めないこと。

{ "decisions": [""], "events": [""], "tasks": [""] }`

  const userText = `決定事項:\n${formatPrintLines(input.decisions)}\n\n予定:\n${formatPrintLines(
    input.events
  )}\n\nタスク:\n${formatPrintLines(input.tasks)}`

  const raw = await callClaudeText(anthropicApiKey as string, {
    system,
    messages: [{ role: 'user', content: userText }],
    maxTokens: 2000,
  })
  const parsed = parseJsonLoose<any>(raw)
  if (!parsed) {
    throw createError({ statusCode: 502, message: 'AIの応答をJSONとして読み取れませんでした。もう一度お試しください。' })
  }

  const fallback = (lines: PrintLineInput[]) => lines.map((l) => (l.note ? `${l.main}（${l.note}）` : l.main))
  const pick = (v: unknown, original: PrintLineInput[]): string[] => {
    const list = Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
    return list.length === original.length ? (list as string[]) : fallback(original)
  }

  return {
    decisions: pick(parsed.decisions, input.decisions),
    events: pick(parsed.events, input.events),
    tasks: pick(parsed.tasks, input.tasks),
  }
}
