// 議事録作りの Claude 呼び出しを集約する。
// apps/ai-tools/src/server/utils/kikigaki-ai.ts からの移植。
//
// ★構造化の「匙加減」＝創作の禁止・決定と検討の切り分け・日付を確定してよい条件は
//   全部このファイルのシステムプロンプトに置いてある。精度やトーンを変えるときはここだけ触る。
// ★まとめ方（types/minutes.ts の MinutesMode）ごとに指示文が分かれている。
//   meeting＝複数人の会議、talk＝主に1人が話した記録（講演・インタビュー・カウンセリング）。

import type { H3Event } from 'h3'
import { callClaudeText, parseJsonLoose } from '~/server/utils/anthropic'
import { minutesLabel } from '~/config/minutesLabels'
import { normalizeMinutes } from '~/server/utils/minutes'
import { jstToday } from '~/utils/formatDate'
import type { Minutes, MinutesLayout, MinutesMode } from '~/types/minutes'

const MAX_TOKENS = 8000

/**
 * 構造化のシステムプロンプト。
 *
 * task_candidates の due_date は、原文の表現（"来月中に"）と確定した日付を別々に持つための欄。
 * 原文側（due）は必ずそのまま残す（カレンダー登録の機能は持っていないが、PDFで確定日付を優先表示するのに使う）。
 *
 * 左＝概要＋話し合ったこと（topics。決まったことも決まっていないことも含む）、右＝決まったこと・やること、という並べ方（layout 2）。
 * 次の予定は専用の欄を持たず、「やること」の1件として入れさせる（event_candidates は layout 1 の古い議事録だけが持っている）。
 * 同じ内容を複数の欄に書かせない（決定がそのまま作業なら「やること」だけ）のがこのプロンプトの肝。
 */
function buildMeetingSystemPrompt(today: string): string {
  // 項目の日本語の名前は config/minutesLabels.ts の表から取る（画面・PDFと同じ名前にそろえるため）
  const L = (key: Parameters<typeof minutesLabel>[0]) => minutesLabel(key, 'meeting')
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
  （内容に応じて見出しの数や名前を変えてよい。別項目に抽出する内容をここでも一字一句書き写す必要はなく、
  経緯や背景の説明に重点を置くこと）。
- 見出しは「【見出し】」の形式で書き、見出しと見出しの間は改行で区切ること。
- 全角・半角を問わず1000文字以内に収めること。

【構造化のルール】
- 同じ内容を複数の項目に書かないこと。どの項目に入れるかは次の通り。
- 「${L('topics')}(topics)」は、会議で話題になったことを話した順に、話題ごとに区切る。内容は厚めに書くこと。
  決まったことも決まらなかったことも含めて、論点・出た意見・理由・経緯・具体的な数字や例を、削らずに残す。
  content に話題の短い見出しを、note にその話題で話した中身を書く（note は長くなってよい）。
  結論が出た話題は note の末尾に結論を一言添えてよい。結論が出なかった話題・次回に持ち越しになった話題も、
  その旨（「結論は出ていない」「次回に持ち越し」など）を note の末尾に添えること。
- 「${L('decisions')}(decisions)」は、会議の中で明確に合意・決定されたことのみを、1件1文で端的に書く。
  理由や経緯は「${L('topics')}」に任せ、note は原則として空にする（但し書きが無いと誤解されるときだけ短く書く）。
  決定がそのまま誰かの作業になるもの（「Aさんが会場を押さえる」など）は、「${L('taskCandidates')}」にだけ書き、ここには書かない。
  決定かどうか迷う場合は、断定を避け、ここには書かず「${L('topics')}」の中で触れるにとどめること。
- 「${L('taskCandidates')}(task_candidates)」は「誰が」「何を」「いつまでに」が文字起こし内で分かる場合のみ抽出する。
  主語が不明な場合は担当を「[不明瞭]」とする。
- 次回の会議や行事など、日時が文字起こし内に明示された「${L('eventCandidates')}」も、「${L('taskCandidates')}」の1件として入れる（専用の欄は無い）。
  task に「次回の定例会」のように内容（場所が語られていれば添える）を、due に日時の原文をそのまま入れる。
  担当が語られていなければ、担当は「全員」とする。

【日付の確定について】
- この文章を取り込んだ日は ${today}（日本時間）である。
- 「来週の火曜日」のように、この日を基準にすれば一意に定まる表現に限り、
  due_date を YYYY-MM-DD 形式で埋めてよい。
- 少しでも曖昧な場合（「来月中に」「そのうち」「都合のいい日に」など）は、
  due_date を空文字 "" のままにすること。迷ったら必ず空にする。
- due には常に原文の表現をそのまま入れること（空にしない）。

【出力形式】
以下のJSON形式のみを出力すること。前置きや説明文、Markdownのコードフェンスは一切含めないこと。

{
  "title": "",
  "date": "",
  "participants": [""],
  "summary": "",
  "topics": [{ "content": "", "note": "" }],
  "decisions": [{ "content": "", "note": "" }],
  "task_candidates": [{ "assignee": "", "task": "", "due": "", "due_date": "" }],
  "unclear_points": [""]
}

- date は会議が開かれた日（YYYY-MM-DD）。文字起こしから分からなければ空文字にすること。
- title は内容が一目で分かる短い日本語にし、全角・半角を問わず15文字以内に収めること（例:「秋祭りの打ち合わせ」）。
- participants は会議に出席していた人の名前の配列で、1人1要素にすること（例: ["田中さん", "佐藤さん"]）。
  文字起こしで発言している・出席が分かる人だけを入れ、話題に出ただけの人は入れないこと。分からなければ空配列。
- unclear_points は、意味が取れなかった箇所・判断に自信が持てなかった箇所を必ず自己申告する欄。
  人間が優先的に確認するために使うので、無いと言い切れる場合を除き省略しないこと。`
}

/**
 * 「主に1人が話した」記録（講演・インタビュー・カウンセリングなど）の構造化のシステムプロンプト。
 *
 * 会議と違い「決まったこと」は拾わず、その人が伝えたかったことと話の中身を重点的に残す
 * （やることは、話の中で出たときだけ拾う。次回の日程も「やること」に入れる）。
 * カウンセリングも対象なので、AIの評価・診断・助言を足さないことを創作の禁止と同じ重さで書いている。
 */
function buildTalkSystemPrompt(today: string): string {
  const L = (key: Parameters<typeof minutesLabel>[0]) => minutesLabel(key, 'talk')
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
- key_messages（${L('keyMessages')}）は、話し手がこの話で一番伝えたかったことを3〜5件程度。
  content に要点を1〜2文で、note にそれが表れている話の要旨（どんなエピソードや言葉で語っていたか）を書く。
  話し手が繰り返し語ったこと・強調したことを優先すること。
- topics（${L('topics')}）は、話した順に話題ごとに区切る。
  content に話題の短い見出しを、note にその話題で話した中身（エピソード・例・理由など）を書く。
  話の中身をできるだけ漏らさないことを優先し、1件の note が長くなってもよい。
- task_candidates（${L('taskCandidates')}）は、話の中で誰かが「やる」「やってみる」「次までにやってくる」と**自分から言った**こと、
  または宿題・次回までの課題として**はっきり決まった**ことだけを抽出する。
  assignee はそれを言った人（話し手・聞き手）。誰が言ったか分からなければ「[不明瞭]」。
  聞き手の助言・提案（「〜するといいですよ」）や、話し手の願望・気持ち（「〜できたらいいな」）はやることではないので入れないこと。
  期限が語られていれば due に原文の表現をそのまま入れ、「来週の火曜日」のように一意に定まるときだけ due_date を埋める
  （曖昧なら due_date は空文字のまま）。
- 次回の面談・講座の日程など、日時が文字起こし内に明示された「${L('eventCandidates')}」も、「${L('taskCandidates')}」の1件として入れる（専用の欄は無い）。
  task に「次回の面談」のように内容を、due に日時の原文をそのまま入れる。担当が語られていなければ、担当は「全員」とする。

【日付の確定について】
- 「来週の火曜日」のように、取り込んだ日を基準にすれば一意に定まる表現に限り、
  due_date を YYYY-MM-DD 形式で埋めてよい。少しでも曖昧な場合は空文字 "" のままにし、due には常に原文の表現をそのまま入れること。

【出力形式】
以下のJSON形式のみを出力すること。前置きや説明文、Markdownのコードフェンスは一切含めないこと。

{
  "title": "",
  "date": "",
  "speakers": [""],
  "summary": "",
  "key_messages": [{ "content": "", "note": "" }],
  "topics": [{ "content": "", "note": "" }],
  "task_candidates": [{ "assignee": "", "task": "", "due": "", "due_date": "" }],
  "unclear_points": [""]
}

- この文章を取り込んだ日は ${today}（日本時間）である。
- date は話がされた日（YYYY-MM-DD）。文字起こしから分からなければ空文字にすること。
- title は内容が一目で分かる短い日本語にし、全角・半角を問わず15文字以内に収めること（例:「子育てと仕事の両立の講演」）。
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
function buildReviseSystemPrompt(mode: MinutesMode, layout: MinutesLayout, today: string): string {
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

${jsonShape(mode, layout)}`
}

const MEETING_JSON_SHAPE = `{
  "title": "",
  "date": "",
  "participants": [""],
  "summary": "",
  "topics": [{ "content": "", "note": "" }],
  "decisions": [{ "content": "", "note": "" }],
  "task_candidates": [{ "assignee": "", "task": "", "due": "", "due_date": "" }],
  "unclear_points": [""]
}`

/** layout 1（古い議事録）の会議。「AIで直す」でも、それまでの項目のまま直す（作り直すと layout 2 になる） */
const LEGACY_MEETING_JSON_SHAPE = `{
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
  "task_candidates": [{ "assignee": "", "task": "", "due": "", "due_date": "" }],
  "unclear_points": [""]
}`

/** layout 1（古い記録）の聞き取り。やることを持たない */
const LEGACY_TALK_JSON_SHAPE = `{
  "title": "",
  "date": "",
  "speakers": [""],
  "summary": "",
  "key_messages": [{ "content": "", "note": "" }],
  "topics": [{ "content": "", "note": "" }],
  "unclear_points": [""]
}`

function jsonShape(mode: MinutesMode, layout: MinutesLayout): string {
  if (mode === 'talk') return layout === 2 ? TALK_JSON_SHAPE : LEGACY_TALK_JSON_SHAPE
  return layout === 2 ? MEETING_JSON_SHAPE : LEGACY_MEETING_JSON_SHAPE
}

/** AIへ渡す・AIから受け取るJSONの形（まとめ方・並べ方の版ごとに持つ項目が違う） */
function toAiJson(m: Minutes): Record<string, unknown> {
  if (m.mode === 'talk') {
    return {
      title: m.title,
      date: m.date,
      speakers: m.participants,
      summary: m.summary,
      key_messages: m.keyMessages,
      topics: m.topics,
      ...(m.layout === 2 ? { task_candidates: m.taskCandidates } : {}),
      unclear_points: m.unclearPoints,
    }
  }
  if (m.layout === 1) {
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
  return {
    title: m.title,
    date: m.date,
    participants: m.participants,
    summary: m.summary,
    topics: m.topics,
    decisions: m.decisions,
    task_candidates: m.taskCandidates,
    unclear_points: m.unclearPoints,
  }
}

/**
 * AIの応答を議事録の形にする。まとめ方は AI に決めさせず呼び出し側の値で固定し、
 * そのまとめ方で使わない項目は空にする（AIが余計な項目を返しても画面・PDFに混ざらないように）。
 */
function fromAiJson(parsed: any, mode: MinutesMode, layout: MinutesLayout): Minutes {
  // discussions（決まっていないこと）は layout 1 の古い議事録だけが持つ。layout 2 では欄ごとやめた
  const m = normalizeMinutes({
    ...parsed,
    mode,
    layout,
    participants: mode === 'talk' ? parsed.speakers ?? parsed.participants : parsed.participants,
    discussions: layout === 2 ? [] : parsed.discussions,
  })
  if (mode === 'talk') {
    m.decisions = []
    m.discussions = []
    // やることは layout 2 の聞き取りだけ（layout 1 の古い記録には欄が無い）。次の予定の欄は聞き取りには無い
    if (layout !== 2) m.taskCandidates = []
    m.eventCandidates = []
  } else {
    m.keyMessages = []
    // 話し合ったこと(topics)は layout 2 の会議だけ。layout 1 では discussions が左に出る。
    // 次の予定の欄は layout 1 の会議だけ（layout 2 では「やること」に入れる）
    if (layout !== 2) m.topics = []
    else m.eventCandidates = []
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
 * 新しく作るときと、確認画面の「種類を変える」（まとめ方を変えて原文からまとめ直す）の両方で使う。
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
  // 新しく作る・作り直すときは、いつでも最新の並べ方（layout 2）
  return fromAiJson(parsed, mode, 2)
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
    system: buildReviseSystemPrompt(minutes.mode, minutes.layout, jstToday()),
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
  // 直すだけなので並べ方は変えない（古い議事録は古いまま。作り直すと新しい並べ方になる）
  return fromAiJson(parsed, minutes.mode, minutes.layout)
}
