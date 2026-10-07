// 議事録づくりの Claude 呼び出しを集約する。
// apps/ai-tools/src/server/utils/kikigaki-ai.ts からの移植。
//
// ★構造化の「匙加減」＝創作の禁止・決定と検討の切り分け・用語補正・日付を確定してよい条件は
//   全部このファイルのシステムプロンプトに置いてある。精度やトーンを変えるときはここだけ触る。
//
// ★ai-tools 版との違いは用語集だけ。あちらは全ユーザー共通のハードコード辞書を埋め込んでいたが、
//   本番版は利用者ごとの「よく出る名前」（語の配列）を受け取り、登録が無ければ用語集の節ごと省く。

import type { H3Event } from 'h3'
import { callClaudeText, getAnthropicKey, parseJsonLoose } from '~/server/utils/anthropic'
import { normalizeMinutes } from '~/server/utils/minutes'
import { glossaryForPrompt } from '~/utils/glossary'
import { jstToday } from '~/utils/formatDate'
import type { Minutes, MinutesPoint } from '~/types/minutes'

const MAX_TOKENS = 8000

/** 用語集の節。登録が無ければ空文字（「用語集(なし)」と書くとAIが辞書を探して迷うため節ごと落とす） */
function glossarySection(terms: string[]): string {
  const list = glossaryForPrompt(terms)
  if (!list) return ''
  return `
【用語の補正】
- 以下は利用者が登録した、この会議でよく出てくる人名・地名・専門用語の「正しい表記」である。
  文字起こしに表記ゆれ（読みのひらがな・誤変換）があれば、この表記に補正すること。
- 用語集にない固有名詞は、文字起こしの表記をそのまま尊重すること(勝手に変換しない)。

用語集:
${list}
`
}

/**
 * 構造化のシステムプロンプト。
 *
 * task_candidates の due_date / event_candidates の start・end は、原文の表現（"来月中に"）と
 * 確定した日時を別々に持つための欄。原文側は必ずそのまま残す
 * （カレンダー登録の機能は持っていないが、PDFで確定日時を優先表示するのに使う）。
 */
function buildSystemPrompt(today: string, terms: string[]): string {
  return `あなたは会議・打ち合わせなどの記録を構造化するアシスタントです。
地域の会合に限らず、社内会議・商談・打ち合わせなど、あらゆる種類の会議・活動の記録が対象です。
以下のルールを厳守してください。

【最重要ルール:創作の禁止】
- 文字起こしに書かれていない情報を絶対に追加しないこと。
- 聞き取れない・意味が不明瞭な箇所は、無理に補完せず「[不明瞭]」と記載すること。
- 推測や一般論で穴埋めしないこと。書かれている内容だけを根拠にすること。
${glossarySection(terms)}
【概要(summary)の書き方】
- この会議・打ち合わせが何だったのか全体の流れを把握できるように、
  【背景】【話し合いの流れ】【結論・まとめ】のような見出しを立てて章立てした文章にすること
  （内容に応じて見出しの数や名前を変えてよい。決定事項・検討事項として別項目に抽出する内容を
  ここでも一字一句書き写す必要はなく、経緯や背景の説明に重点を置くこと）。
- 見出しは「【見出し】」の形式で書き、見出しと見出しの間は改行で区切ること。
- 全角・半角を問わず1000文字以内に収めること。

【構造化のルール】
- 「決定事項」は、会議の中で明確に合意・決定されたことのみを含める。
  検討中・未決定のものは「検討事項」に入れること。
- 決定事項と検討事項の切り分けに迷う場合は、断定を避け検討事項側に倒すこと。
- タスク候補は「誰が」「何を」「いつまでに」が文字起こし内で分かる場合のみ抽出する。
  主語が不明な場合は担当を「[不明瞭]」とする。
- 予定候補は「日時」が文字起こし内に明示されている場合のみ抽出する。
  曖昧な時期表現(「来月中に」など)は日付を確定させず、原文の表現をそのまま残す。

【日付の確定について】
- この録音を取り込んだ日は ${today}（日本時間）である。
- 「来週の火曜日」のように、この日を基準にすれば一意に定まる表現に限り、
  due_date / start / end を YYYY-MM-DD、YYYY-MM-DDTHH:mm 形式で埋めてよい。
- 少しでも曖昧な場合（「来月中に」「そのうち」「都合のいい日に」など）は、
  due_date / start / end を空文字 "" のままにすること。迷ったら必ず空にする。
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
- title は内容が一目で分かる短い日本語にすること（例:「秋祭りの打ち合わせ」）。
- unclear_points は、聞き取れなかった箇所・判断に自信が持てなかった箇所を必ず自己申告する欄。
  人間が優先的に確認するために使うので、無いと言い切れる場合を除き省略しないこと。`
}

/**
 * 「AIで直す」用のシステムプロンプト。
 * ゼロベースの構造化ではなく、すでにある議事録を人間の指示（名前の言い間違いの直しなど）に沿って
 * 部分的に書き換えるのが目的。創作禁止・用語補正は構造化と揃え、
 * 「指示にない項目は変えない」ことだけ足している。
 */
function buildReviseSystemPrompt(today: string, terms: string[]): string {
  return `あなたは会議・打ち合わせなどの議事録を、人間からの指示にもとづいて修正するアシスタントです。
地域の会合に限らず、社内会議・商談・打ち合わせなど、あらゆる種類の会議・活動の記録が対象です。
以下のルールを厳守してください。

【最重要ルール:創作の禁止】
- 文字起こしにも指示にも書かれていない情報を絶対に追加しないこと。
- 指示された範囲外の内容は、たとえ改善できそうに見えても変更せず元のまま維持すること。
- 推測や一般論で穴埋めしないこと。
${glossarySection(terms)}
【概要(summary)について】
- summaryは【見出し】形式で章立てされ、全角・半角問わず1000文字以内に収まっているはずである。
  指示がsummaryの内容に関わるものであっても、この章立てと文字数の制約は維持すること
  （指示が明示的に長さや形式の変更を求めている場合を除く）。

【参考情報】
- 文字起こし全文（照合用）と、現在の議事録JSONを渡す。指示の実行にあたって事実確認が必要な場合は
  文字起こしを根拠にすること。
- この録音を取り込んだ日は ${today}（日本時間）である。

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

/** AIの応答がJSONとして読めなかったときの案内（利用者が次に取れる行動を書く） */
function jsonError(): never {
  throw createError({
    statusCode: 502,
    message: 'AIのまとめ方がうまくいきませんでした。もう一度お試しください。',
  })
}

/** 文字起こし全文を議事録の構造にする */
export async function structureTranscript(event: H3Event, transcript: string, terms: string[]): Promise<Minutes> {
  const raw = await callClaudeText(getAnthropicKey(event), {
    system: buildSystemPrompt(jstToday(), terms),
    messages: [{ role: 'user', content: `以下は会議の文字起こし全文です。\n\n${transcript}` }],
    maxTokens: MAX_TOKENS,
  })

  const parsed = parseJsonLoose<any>(raw)
  if (!parsed) jsonError()
  return normalizeMinutes(parsed)
}

/**
 * 指示1つで議事録全体をAIに書き換えさせる（「阪中さんを坂中さんに直して」のような使い方）。
 * printSettings（PDFの目安文字数）は指示の対象外なので、呼び出し側で元の値を引き継ぐこと。
 */
export async function reviseMinutes(
  event: H3Event,
  minutes: Minutes,
  transcript: string,
  instruction: string,
  terms: string[]
): Promise<Minutes> {
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

  const raw = await callClaudeText(getAnthropicKey(event), {
    system: buildReviseSystemPrompt(jstToday(), terms),
    messages: [
      {
        role: 'user',
        content: `文字起こし全文:\n${transcript}\n\n現在の議事録JSON:\n${currentJson}\n\n指示:\n${instruction}`,
      },
    ],
    maxTokens: MAX_TOKENS,
  })

  const parsed = parseJsonLoose<any>(raw)
  if (!parsed) jsonError()
  return normalizeMinutes(parsed)
}

/** PDF用の要約入力。表示用に整形済みの1行（本文＋任意の補足）の配列で渡す */
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
 * 文字数内ならAIを呼ばずにそのまま表示する（呼び出し側の判断）ので、これは超過時のみ使う。
 */
export async function condensePrintLeft(
  event: H3Event,
  input: { summary: string; discussions: MinutesPoint[] },
  maxChars: number
): Promise<string> {
  const system = `あなたは会議の概要文をPDFの決まった枠に収めるための編集者です。
以下のルールを厳守してください。
- 与えられた「概要」と「検討事項」に書かれていない情報を追加しないこと。推測や創作は禁止。
- 概要と検討事項の内容を、【見出し】形式の見出しを立てて章立てした文章としてまとめ直すこと
  （【背景】【話し合いの流れ】【結論・まとめ】など、内容に応じた見出しでよい。見出しの間は改行で区切る）。
- 全角・半角を問わず${maxChars}文字以内に収めること。超えてはならない。
- 前置きや説明、Markdown記法は一切含めず、まとめた文章のみを出力すること。`

  const userText = `概要:\n${input.summary || '（なし）'}\n\n検討事項:\n${formatPrintLines(
    input.discussions.map((d) => ({ main: d.content, note: d.note }))
  )}`

  const raw = await callClaudeText(getAnthropicKey(event), {
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
  event: H3Event,
  input: { decisions: PrintLineInput[]; events: PrintLineInput[]; tasks: PrintLineInput[] },
  maxChars: number
): Promise<{ decisions: string[]; events: string[]; tasks: string[] }> {
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

  const raw = await callClaudeText(getAnthropicKey(event), {
    system,
    messages: [{ role: 'user', content: userText }],
    maxTokens: 2000,
  })
  const parsed = parseJsonLoose<any>(raw)
  if (!parsed) jsonError()

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
