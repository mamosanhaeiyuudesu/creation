// 議事録づくりの Claude 呼び出しを集約する。
// apps/ai-tools/src/server/utils/kikigaki-ai.ts からの移植。
//
// ★構造化の「匙加減」＝創作の禁止・決定と検討の切り分け・日付を確定してよい条件は
//   全部このファイルのシステムプロンプトに置いてある。精度やトーンを変えるときはここだけ触る。
// ★まとめ方（types/minutes.ts の MinutesMode）ごとに指示文が分かれている。
//   meeting＝複数人の会議、talk＝主に1人が話した記録（講演・インタビュー・カウンセリング）。

import type { H3Event } from 'h3'
import { callClaudeText, parseJsonLoose } from '~/server/utils/anthropic'
import { normalizeMinutes } from '~/server/utils/minutes'
import { jstToday } from '~/utils/formatDate'
import type { Minutes, MinutesMode, MinutesPoint } from '~/types/minutes'

const MAX_TOKENS = 8000

/**
 * 構造化のシステムプロンプト。
 *
 * task_candidates の due_date / event_candidates の start・end は、原文の表現（"来月中に"）と
 * 確定した日時を別々に持つための欄。原文側は必ずそのまま残す
 * （カレンダー登録の機能は持っていないが、PDFで確定日時を優先表示するのに使う）。
 */
function buildMeetingSystemPrompt(today: string): string {
  return `あなたは会議・打ち合わせなどの記録を構造化するアシスタントです。
地域の会合に限らず、社内会議・商談・打ち合わせなど、あらゆる種類の会議・活動の記録が対象です。
以下のルールを厳守してください。

【最重要ルール:創作の禁止】
- 文字起こしに書かれていない情報を絶対に追加しないこと。
- 文字の誤り（音声の書き起こしの誤変換など）で意味が不明瞭な箇所は、無理に補完せず「[不明瞭]」と記載すること。
- 推測や一般論で穴埋めしないこと。書かれている内容だけを根拠にすること。
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
- この文章を取り込んだ日は ${today}（日本時間）である。
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
  "participants": [""],
  "summary": "",
  "decisions": [{ "content": "", "note": "" }],
  "discussions": [{ "content": "", "note": "" }],
  "task_candidates": [{ "assignee": "", "task": "", "due": "", "due_date": "" }],
  "event_candidates": [{ "datetime": "", "title": "", "location": "", "start": "", "end": "" }],
  "unclear_points": [""]
}

- date は会議が開かれた日（YYYY-MM-DD）。文字起こしから分からなければ空文字にすること。
- title は内容が一目で分かる短い日本語にすること（例:「秋祭りの打ち合わせ」）。
- participants は会議に出席していた人の名前の配列で、1人1要素にすること（例: ["田中さん", "佐藤さん"]）。
  文字起こしで発言している・出席が分かる人だけを入れ、話題に出ただけの人は入れないこと。分からなければ空配列。
- unclear_points は、意味が取れなかった箇所・判断に自信が持てなかった箇所を必ず自己申告する欄。
  人間が優先的に確認するために使うので、無いと言い切れる場合を除き省略しないこと。`
}

/**
 * 「主に1人が話した」記録（講演・インタビュー・カウンセリングなど）の構造化のシステムプロンプト。
 *
 * 会議と違い「決まったこと」「やること」は拾わず、その人が伝えたかったことと話の中身を重点的に残す。
 * カウンセリングも対象なので、AIの評価・診断・助言を足さないことを創作の禁止と同じ重さで書いている。
 */
function buildTalkSystemPrompt(today: string): string {
  return `あなたは、主に1人の人が話した内容の記録を構造化するアシスタントです。
講演会・インタビュー・カウンセリング・面談・語りなど、1人の話し手の話が中心の記録が対象です。
聞き手や司会者が話していることもありますが、記録の主役は話し手です。
以下のルールを厳守してください。

【最重要ルール:創作の禁止】
- 文字起こしに書かれていない情報を絶対に追加しないこと。
- 文字の誤り（音声の書き起こしの誤変換など）で意味が不明瞭な箇所は、無理に補完せず「[不明瞭]」と記載すること。
- 推測や一般論で穴埋めしないこと。書かれている内容だけを根拠にすること。

【最重要ルール:解釈・評価を足さない】
- 話し手の考え・経験・気持ちを、話し手が話したとおりに記録すること。
- 「〜という傾向がある」「〜が課題である」のような分析・診断・評価や、「〜するとよい」のような助言は書かないこと。
- 話し手の言い回しや大事にしている言葉は、一般的な言葉に丸めず、できるだけそのまま残すこと。

【何を記録するか】
- 話し合ったことや決まったことではなく、話し手が伝えたかったことを重点的にまとめること。
- 聞き手の質問や相づちは、話の流れが分かる程度にとどめ、要点として扱わないこと。
- 具体的なエピソード・例え・数字は、話し手の伝えたいことを支える大事な中身なので、削らずに残すこと。

【概要(summary)の書き方】
- どんな話だったのか全体を把握できるように、
  【テーマ】【話の流れ】【伝えたかったこと】のような見出しを立てて章立てした文章にすること
  （内容に応じて見出しの数や名前を変えてよい）。
- 見出しは「【見出し】」の形式で書き、見出しと見出しの間は改行で区切ること。
- 全角・半角を問わず1000文字以内に収めること。

【構造化のルール】
- key_messages（伝えたかったこと）は、話し手がこの話で一番伝えたかったことを3〜5件程度。
  content に要点を1〜2文で、note にそれが表れている話の要旨（どんなエピソードや言葉で語っていたか）を書く。
  話し手が繰り返し語ったこと・強調したことを優先すること。
- topics（話の内容）は、話した順に話題ごとに区切る。
  content に話題の短い見出しを、note にその話題で話した中身（エピソード・例・理由など）を書く。
  話の中身をできるだけ漏らさないことを優先し、1件の note が長くなってもよい。

【出力形式】
以下のJSON形式のみを出力すること。前置きや説明文、Markdownのコードフェンスは一切含めないこと。

{
  "title": "",
  "date": "",
  "speakers": [""],
  "summary": "",
  "key_messages": [{ "content": "", "note": "" }],
  "topics": [{ "content": "", "note": "" }],
  "unclear_points": [""]
}

- この文章を取り込んだ日は ${today}（日本時間）である。
- date は話がされた日（YYYY-MM-DD）。文字起こしから分からなければ空文字にすること。
- title は内容が一目で分かる短い日本語にすること（例:「子育てと仕事の両立についての講演」）。
- speakers は話し手の名前の配列で、1人1要素にすること（例: ["田中さん"]）。聞き手・司会者・話題に出ただけの人は入れないこと。
  名前が分からなければ空配列。
- unclear_points は、意味が取れなかった箇所・判断に自信が持てなかった箇所を必ず自己申告する欄。
  人間が優先的に確認するために使うので、無いと言い切れる場合を除き省略しないこと。`
}

function buildSystemPrompt(mode: MinutesMode, today: string): string {
  return mode === 'talk' ? buildTalkSystemPrompt(today) : buildMeetingSystemPrompt(today)
}

/**
 * 「AIで直す」用のシステムプロンプト。
 * ゼロベースの構造化ではなく、すでにある議事録を人間の指示（名前の言い間違いの直しなど）に沿って
 * 部分的に書き換えるのが目的。創作禁止は構造化と揃え、
 * 「指示にない項目は変えない」ことだけ足している。
 */
function buildReviseSystemPrompt(mode: MinutesMode, today: string): string {
  const target =
    mode === 'talk'
      ? `主に1人の人が話した内容の記録を、人間からの指示にもとづいて修正するアシスタントです。
講演会・インタビュー・カウンセリング・面談など、1人の話し手の話が中心の記録が対象です。`
      : `会議・打ち合わせなどの議事録を、人間からの指示にもとづいて修正するアシスタントです。
地域の会合に限らず、社内会議・商談・打ち合わせなど、あらゆる種類の会議・活動の記録が対象です。`
  const talkRule =
    mode === 'talk'
      ? `
- 話し手の話への分析・診断・評価・助言を足さないこと（指示が求めていても、話し手が話していないことは書かない）。`
      : ''
  return `あなたは${target}
以下のルールを厳守してください。

【最重要ルール:創作の禁止】
- 文字起こしにも指示にも書かれていない情報を絶対に追加しないこと。
- 指示された範囲外の内容は、たとえ改善できそうに見えても変更せず元のまま維持すること。
- 推測や一般論で穴埋めしないこと。${talkRule}
【概要(summary)について】
- summaryは【見出し】形式で章立てされ、全角・半角問わず1000文字以内に収まっているはずである。
  指示がsummaryの内容に関わるものであっても、この章立てと文字数の制約は維持すること
  （指示が明示的に長さや形式の変更を求めている場合を除く）。

【参考情報】
- 文字起こし全文（照合用）と、現在の記録JSONを渡す。指示の実行にあたって事実確認が必要な場合は
  文字起こしを根拠にすること。
- この文章を取り込んだ日は ${today}（日本時間）である。

【出力形式】
現在の記録と同じ構造のJSONのみを出力すること。前置きや説明文、Markdownのコードフェンスは一切含めないこと。

${mode === 'talk' ? TALK_JSON_SHAPE : MEETING_JSON_SHAPE}`
}

const MEETING_JSON_SHAPE = `{
  "title": "",
  "date": "",
  "participants": [""],
  "summary": "",
  "decisions": [{ "content": "", "note": "" }],
  "discussions": [{ "content": "", "note": "" }],
  "task_candidates": [{ "assignee": "", "task": "", "due": "", "due_date": "" }],
  "event_candidates": [{ "datetime": "", "title": "", "location": "", "start": "", "end": "" }],
  "unclear_points": [""]
}`

const TALK_JSON_SHAPE = `{
  "title": "",
  "date": "",
  "speakers": [""],
  "summary": "",
  "key_messages": [{ "content": "", "note": "" }],
  "topics": [{ "content": "", "note": "" }],
  "unclear_points": [""]
}`

/** AIへ渡す・AIから受け取るJSONの形（まとめ方ごとに持つ項目が違う） */
function toAiJson(m: Minutes): Record<string, unknown> {
  if (m.mode === 'talk') {
    return {
      title: m.title,
      date: m.date,
      speakers: m.participants,
      summary: m.summary,
      key_messages: m.keyMessages,
      topics: m.topics,
      unclear_points: m.unclearPoints,
    }
  }
  return {
    title: m.title,
    date: m.date,
    participants: m.participants,
    summary: m.summary,
    decisions: m.decisions,
    discussions: m.discussions,
    task_candidates: m.taskCandidates,
    event_candidates: m.eventCandidates,
    unclear_points: m.unclearPoints,
  }
}

/**
 * AIの応答を議事録の形にする。まとめ方は AI に決めさせず呼び出し側の値で固定し、
 * そのまとめ方で使わない項目は空にする（AIが余計な項目を返しても画面・PDFに混ざらないように）。
 */
function fromAiJson(parsed: any, mode: MinutesMode): Minutes {
  const m = normalizeMinutes({ ...parsed, mode, participants: mode === 'talk' ? parsed.speakers ?? parsed.participants : parsed.participants })
  if (mode === 'talk') {
    m.decisions = []
    m.discussions = []
    m.taskCandidates = []
    m.eventCandidates = []
  } else {
    m.keyMessages = []
    m.topics = []
  }
  return m
}

/** AIの応答がJSONとして読めなかったときの案内（利用者が次に取れる行動を書く） */
function jsonError(): never {
  throw createError({
    statusCode: 502,
    message: 'AIのまとめ方がうまくいきませんでした。もう一度お試しください。',
  })
}

/**
 * 文字起こし全文を議事録の構造にする。
 * 新しく作るときと、確認画面の「つくり直す」（まとめ方を変えて原文からやり直す）の両方で使う。
 */
export async function structureTranscript(
  event: H3Event,
  transcript: string,
  mode: MinutesMode
): Promise<Minutes> {
  const lead = mode === 'talk' ? '以下は話の文字起こし全文です。' : '以下は会議の文字起こし全文です。'
  const raw = await callClaudeText(event, {
    system: buildSystemPrompt(mode, jstToday()),
    messages: [{ role: 'user', content: `${lead}\n\n${transcript}` }],
    maxTokens: MAX_TOKENS,
  })

  const parsed = parseJsonLoose<any>(raw)
  if (!parsed) jsonError()
  return fromAiJson(parsed, mode)
}

/**
 * 指示1つで議事録全体をAIに書き換えさせる（「阪中さんを坂中さんに直して」のような使い方）。
 */
export async function reviseMinutes(
  event: H3Event,
  minutes: Minutes,
  transcript: string,
  instruction: string
): Promise<Minutes> {
  const currentJson = JSON.stringify(toAiJson(minutes))

  const raw = await callClaudeText(event, {
    system: buildReviseSystemPrompt(minutes.mode, jstToday()),
    messages: [
      {
        role: 'user',
        content: `文字起こし全文:\n${transcript}\n\n現在の記録JSON:\n${currentJson}\n\n指示:\n${instruction}`,
      },
    ],
    maxTokens: MAX_TOKENS,
  })

  const parsed = parseJsonLoose<any>(raw)
  if (!parsed) jsonError()
  return fromAiJson(parsed, minutes.mode)
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
 * PDF左側「概要」用。概要と、その下に並べる項目（会議＝話し合ったこと、1人の話＝話の内容）を、
 * 指定の文字数に収まる1つの文章に要約し直す。
 * 文字数内ならAIを呼ばずにそのまま表示する（呼び出し側の判断）ので、これは超過時のみ使う。
 */
export async function condensePrintLeft(
  event: H3Event,
  input: { mode: MinutesMode; summary: string; points: MinutesPoint[] },
  maxChars: number
): Promise<string> {
  const talk = input.mode === 'talk'
  const pointsLabel = talk ? '話の内容' : '検討事項'
  const headings = talk ? '【テーマ】【話の流れ】【伝えたかったこと】' : '【背景】【話し合いの流れ】【結論・まとめ】'
  const system = `あなたは${talk ? '話の記録' : '会議'}の概要文をPDFの決まった枠に収めるための編集者です。
以下のルールを厳守してください。
- 与えられた「概要」と「${pointsLabel}」に書かれていない情報を追加しないこと。推測や創作は禁止。${
    talk ? '\n- 話し手の話への分析・評価・助言を足さないこと。話し手の言い回しはできるだけ残すこと。' : ''
  }
- 概要と${pointsLabel}の内容を、【見出し】形式の見出しを立てて章立てした文章としてまとめ直すこと
  （${headings}など、内容に応じた見出しでよい。見出しの間は改行で区切る）。
- 全角・半角を問わず${maxChars}文字以内に収めること。超えてはならない。
- 前置きや説明、Markdown記法は一切含めず、まとめた文章のみを出力すること。`

  const userText = `概要:\n${input.summary || '（なし）'}\n\n${pointsLabel}:\n${formatPrintLines(
    input.points.map((d) => ({ main: d.content, note: d.note }))
  )}`

  const raw = await callClaudeText(event, {
    system,
    messages: [{ role: 'user', content: userText }],
    maxTokens: 2000,
  })
  // 万一AIが文字数を超えて返しても、PDFのレイアウトが壊れないよう最後の保険として切る。
  return raw.trim().slice(0, maxChars * 2)
}

/**
 * PDF右側用。会議＝決定事項・予定・タスク、1人の話＝伝えたかったこと（decisions に入れて渡す。
 * events / tasks は空）。区分ごとの件数は変えず、言い回しだけを短縮して
 * 合計が指定の文字数に収まるように要約し直す。件数が減る/増えるとPDFの表示と食い違うため、
 * 返ってきた配列の件数が入力と違う区分は、要約を諦めて元の表示文字列にフォールバックする。
 */
export async function condensePrintRight(
  event: H3Event,
  input: { mode: MinutesMode; decisions: PrintLineInput[]; events: PrintLineInput[]; tasks: PrintLineInput[] },
  maxChars: number
): Promise<{ decisions: string[]; events: string[]; tasks: string[] }> {
  const talk = input.mode === 'talk'
  const system = talk
    ? `あなたは話し手が伝えたかったことの一覧をPDFの決まった枠に収めるための編集者です。
以下のルールを厳守してください。
- 書かれていない情報を追加しないこと。推測や創作、分析・評価・助言は禁止。
- 各項目の言い回しを簡潔にするだけで、項目数は変えない（削除も追加もしない）こと。話し手の言い回しはできるだけ残すこと。
- 合計して、全角・半角を問わず${maxChars}文字以内に収めること。
- 出力は以下のJSON形式のみ。前置きや説明、Markdown記法は一切含めないこと。

{ "decisions": [""], "events": [], "tasks": [] }`
    : `あなたは会議の決定事項・予定・タスクをPDFの決まった枠に収めるための編集者です。
以下のルールを厳守してください。
- 書かれていない情報を追加しないこと。推測や創作は禁止。
- 各項目の言い回しを簡潔にするだけで、区分ごとの項目数は変えない（削除も追加もしない）こと。
- 決定事項・予定・タスクを合計して、全角・半角を問わず${maxChars}文字以内に収めること。
- 出力は以下のJSON形式のみ。前置きや説明、Markdown記法は一切含めないこと。

{ "decisions": [""], "events": [""], "tasks": [""] }`

  const userText = talk
    ? `伝えたかったこと（decisions）:\n${formatPrintLines(input.decisions)}`
    : `決定事項:\n${formatPrintLines(input.decisions)}\n\n予定:\n${formatPrintLines(
        input.events
      )}\n\nタスク:\n${formatPrintLines(input.tasks)}`

  const raw = await callClaudeText(event, {
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
