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
import { countTranscriptChars, talkMaxTopics, talkTargetChars } from '~/types/minutes'
import type { Minutes, MinutesLayout, MinutesMode } from '~/types/minutes'

// 聞き取りの目標は最大6000字。少し書きすぎても途中で切れて作成に失敗しないよう、余裕を持たせる
const MAX_TOKENS = 12000

/**
 * 構造化のシステムプロンプト（話し合い。layout 3）。
 *
 * task_candidates の due_date は、原文の表現（"来月中に"）と確定した日付を別々に持つための欄。
 * 原文側（due）は必ずそのまま残す（カレンダー登録の機能は持っていないが、PDFで確定日付を優先表示するのに使う）。
 *
 * PDFはA4横1枚に収める（左＝概要・決まったこと・やること、右＝話し合ったこと）。
 * 会議は脱線が多いので、要点に絞らせ、全体で2000字程度に抑えさせる（あふれた分はPDF側で文字を小さくして収める）。
 * 概要は一覧で見分けるための300字以内の文章で、章立てはしない。
 * 次の予定は専用の欄を持たず、「やること」の1件として入れさせる（event_candidates は layout 1 の古い議事録だけが持っている）。
 * 同じ内容を複数の欄に書かせない（決定がそのまま作業なら「やること」だけ）のがこのプロンプトの肝。
 */
function buildMeetingSystemPrompt(today: string, onePage: boolean, transcriptChars: number): string {
  // 項目の日本語の名前は config/minutesLabels.ts の表から取る（画面・PDFと同じ名前にそろえるため）
  const L = (key: Parameters<typeof minutesLabel>[0]) => minutesLabel(key, 'meeting')
  // 複数枚にまとめるときは、話し合ったことを聞き取りと同じ量（元の長さから決まる字数）で書く
  const topicsTarget = talkTargetChars(transcriptChars)
  const volumeRule = onePage
    ? `【分量】
- この議事録はA4横1枚に収めて配る。summary・topics・decisions・task_candidates を合わせて、
  全角・半角を問わず2000文字程度を目安にすること。
- 会議には脱線や雑談が多い。議題から外れた話や結論に関係しない雑談は落とし、要点に絞ること。`
    : `【分量】
- この議事録はA4横の複数枚にまとめて配る。「決まったこと・やること」は1枚目の左半分に収まるよう簡潔に書き、
  「${L('topics')}」は聞き取り記録と同じように、話の中身を省かずに詳しく残すこと。
- 元のテキストは全角・半角を問わず${transcriptChars}文字である。「${L('topics')}(topics)」全体は、全角・半角を問わず${topicsTarget}文字程度に収めること。
  この字数は超えないこと。元のテキストより長くしないこと。
- 字数に収めるために、同じ内容の繰り返しや、結論に関係しない雑談・脱線を省くこと。元のテキストにない言葉で薄めないこと。`
  const topicsRule = onePage
    ? `- 「${L('topics')}(topics)」は、議題ごとに、話した順に区切る（脱線した話は入れない）。
  content に話題の短い見出しを、note にその話題の要点（出た意見・理由・具体的な数字や例）を簡潔に書く。`
    : `- 「${L('topics')}(topics)」は、議題ごとに、話した順に区切る（脱線した話は入れない）。${talkMaxTopics(topicsTarget)}個まで分けてよいが、無理に増やさないこと。
  content に話題の短い見出しを、note にその話題で話した中身（出た意見・理由・具体的な数字や例・発言者ごとの考え）を、
  全体の字数に収まるように詳しく書く。長くなるときは、段落ごとに改行で区切ってよい。`
  return `あなたは会議・打ち合わせなどの記録を構造化するアシスタントです。
地域の会合に限らず、社内会議・商談・打ち合わせなど、あらゆる種類の会議・活動の記録が対象です。
以下のルールを厳守してください。

【最重要ルール:創作の禁止】
- 文字起こしに書かれていない情報を絶対に追加しないこと。
- 文字の誤り（音声の書き起こしの誤変換など）で意味が不明瞭な箇所は、無理に補完せず「[不明瞭]」と記載すること。
- 推測や一般論で穴埋めしないこと。書かれている内容だけを根拠にすること。

${volumeRule}

【概要(summary)の書き方】
- 会議の大まかな流れと、決まったことが分かる短い文章にすること。見出しは立てないこと。
- 全角・半角を問わず300文字以内に収めること。
- 一覧で会議を見分けるための文章なので、細かい経緯は「${L('topics')}」に任せること。

【構造化のルール】
- 同じ内容を複数の項目に書かないこと。どの項目に入れるかは次の通り。
${topicsRule}
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

${MEETING_JSON_SHAPE}

- date は会議が開かれた日（YYYY-MM-DD）。文字起こしから分からなければ空文字にすること。
- title は内容が一目で分かる短い日本語にし、全角・半角を問わず15文字以内に収めること（例:「秋祭りの打ち合わせ」）。
- participants は会議に出席していた人の名前の配列で、1人1要素にすること（例: ["田中さん", "佐藤さん"]）。
  文字起こしで発言している・出席が分かる人だけを入れ、話題に出ただけの人は入れないこと。分からなければ空配列。
- unclear_points は、意味が取れなかった箇所・判断に自信が持てなかった箇所を必ず自己申告する欄。
  人間が優先的に確認するために使うので、無いと言い切れる場合を除き省略しないこと。`
}

/**
 * 「主に1人が話した」記録（講演・インタビュー・カウンセリングなど）の構造化のシステムプロンプト（layout 3）。
 *
 * 会議と違い「決まったこと」は拾わず、話の中身を省かずに残す（PDFはA4縦で、ページをまたいでよい）。
 * 「伝えたかったこと」の欄は持たず、話の内容の見出し（content）を要点の一文にする
 * （見出しを拾い読みするだけで要点が分かるように。要点と中身を別の欄に書くと同じ内容が2回出るため）。
 * やることは、話の中で出たときだけ拾う。次回の日程も「やること」に入れる。
 * カウンセリングも対象なので、AIの評価・診断・助言を足さないことを創作の禁止と同じ重さで書いている。
 */
function buildTalkSystemPrompt(today: string, transcriptChars: number): string {
  const target = talkTargetChars(transcriptChars)
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
- 話し合ったことや決まったことではなく、話し手が伝えたかったことと、その話の中身を残すこと。
- 聞き手の質問や相づちは、話の流れが分かる程度にとどめ、要点として扱わないこと。
- 具体的なエピソード・例え・数字は、話し手の伝えたいことを支えるものを選んで残すこと。

【分量】
- 元のテキストは全角・半角を問わず${transcriptChars}文字である。記録全体（概要・${L('topics')}・${L('taskCandidates')}の合計）は、全角・半角を問わず${target}文字程度に収めること。
- この字数は超えないこと。元のテキストより長くしないこと。
- 字数に収めるために、同じ内容の繰り返しや、要点を支えていない細部を省くこと。元のテキストにない言葉で薄めないこと。

【概要(summary)の書き方】
- どんな話だったのかが分かる短い文章にすること。見出しは立てないこと。
- 全角・半角を問わず300文字以内に収めること。

【構造化のルール】
- topics（${L('topics')}）は、話した順に話題ごとに区切る。${talkMaxTopics(target)}個まで分けてよいが、無理に増やさないこと。
  content には、その話題で話し手が伝えたかった要点を一文で書く。見出しとして読むだけで要点が分かるようにし、
  「〇〇について」「〇〇の話」のような話題の名前にはしないこと（例:「担い手は外から呼ぶより、地元で育てる」）。
  note には、その話題で話した中身（エピソード・例え・数字・理由・話し手の言葉）を、全体の字数に収まるように書く。
  長くなるときは、段落ごとに改行で区切ってよい。
  話し手が繰り返し語ったこと・強調したことは、必ずどこかの content に入れること。
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

${TALK_JSON_SHAPE}

- この文章を取り込んだ日は ${today}（日本時間）である。
- date は話がされた日（YYYY-MM-DD）。文字起こしから分からなければ空文字にすること。
- title は内容が一目で分かる短い日本語にし、全角・半角を問わず15文字以内に収めること（例:「子育てと仕事の両立の講演」）。
- speakers は話し手の名前の配列で、1人1要素にすること（例: ["田中さん"]）。聞き手・司会者・話題に出ただけの人は入れないこと。
  名前が分からなければ空配列。
- unclear_points は、意味が取れなかった箇所・判断に自信が持てなかった箇所を必ず自己申告する欄。
  人間が優先的に確認するために使うので、無いと言い切れる場合を除き省略しないこと。`
}

function buildSystemPrompt(mode: MinutesMode, today: string, transcriptChars: number, onePage: boolean): string {
  return mode === 'talk' ? buildTalkSystemPrompt(today, transcriptChars) : buildMeetingSystemPrompt(today, onePage, transcriptChars)
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
  const summaryRule =
    layout === 3
      ? 'summaryは見出しの無い短い文章で、全角・半角問わず300文字以内に収まっているはずである。'
      : 'summaryは【見出し】形式で章立てされ、全角・半角問わず1000文字以内に収まっているはずである。'
  return `あなたは${target}
以下のルールを厳守してください。

【最重要ルール:創作の禁止】
- 文字起こしにも指示にも書かれていない情報を絶対に追加しないこと。
- 指示された範囲外の内容は、たとえ改善できそうに見えても変更せず元のまま維持すること。
- 推測や一般論で穴埋めしないこと。${talkRule}
【概要(summary)について】
- ${summaryRule}
  指示がsummaryの内容に関わるものであっても、この形式と文字数の制約は維持すること
  （指示が明示的に長さや形式の変更を求めている場合を除く）。

【不明点(unclear_points)について】
- unclear_points は、AIが判断しきれなかった箇所の一覧で、人間がこれを見ながら1つずつ直している。
- 指示によって解消した不明点（人名の正しい表記が分かった、など）は、unclear_points から取り除くこと。
- 解消していない不明点は、文言を変えずにそのまま残すこと。新しい不明点は足さないこと。

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
  "topics": [{ "content": "", "note": "" }],
  "task_candidates": [{ "assignee": "", "task": "", "due": "", "due_date": "" }],
  "unclear_points": [""]
}`

/** layout 2 の聞き取り。伝えたかったこと（key_messages）を持つ */
const TALK_V2_JSON_SHAPE = `{
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
  if (mode === 'talk') return layout === 3 ? TALK_JSON_SHAPE : layout === 2 ? TALK_V2_JSON_SHAPE : LEGACY_TALK_JSON_SHAPE
  // 会議の layout 2 と 3 は項目が同じ（並べ方と分量だけが違う）
  return layout === 1 ? LEGACY_MEETING_JSON_SHAPE : MEETING_JSON_SHAPE
}

/** AIへ渡す・AIから受け取るJSONの形（まとめ方・並べ方の版ごとに持つ項目が違う） */
function toAiJson(m: Minutes): Record<string, unknown> {
  if (m.mode === 'talk') {
    return {
      title: m.title,
      date: m.date,
      speakers: m.participants,
      summary: m.summary,
      ...(m.layout < 3 ? { key_messages: m.keyMessages } : {}),
      topics: m.topics,
      ...(m.layout >= 2 ? { task_candidates: m.taskCandidates } : {}),
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
function fromAiJson(parsed: any, mode: MinutesMode, layout: MinutesLayout, onePage = true): Minutes {
  // discussions（決まっていないこと）は layout 1 の古い議事録だけが持つ。layout 2 では欄ごとやめた
  const m = normalizeMinutes({
    ...parsed,
    mode,
    layout,
    // 1枚にまとめるかは AI に決めさせない（聞き取りは常に true。意味を持つのは layout 3 の会議だけ）
    onePage: mode === 'talk' ? true : onePage,
    participants: mode === 'talk' ? parsed.speakers ?? parsed.participants : parsed.participants,
    discussions: layout === 1 ? parsed.discussions : [],
  })
  if (mode === 'talk') {
    m.decisions = []
    m.discussions = []
    // 伝えたかったことは layout 1・2 だけ（layout 3 では話の内容の見出しが要点になる）
    if (layout === 3) m.keyMessages = []
    // やることは layout 2 以降の聞き取りだけ（layout 1 の古い記録には欄が無い）。次の予定の欄は聞き取りには無い
    if (layout === 1) m.taskCandidates = []
    m.eventCandidates = []
  } else {
    m.keyMessages = []
    // 話し合ったこと(topics)は layout 2 以降の会議だけ。layout 1 では discussions が左に出る。
    // 次の予定の欄は layout 1 の会議だけ（layout 2 以降では「やること」に入れる）
    if (layout === 1) m.topics = []
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
 * 新しく作るときに使う（確認画面の「このテキストから新しく作る」も、新しく作るのと同じ）。
 */
export async function structureTranscript(
  event: H3Event,
  transcript: string,
  mode: MinutesMode,
  /** 会議をA4横1枚にまとめるか。false なら話し合ったことを聞き取りと同じ量で書き、PDFは複数枚になる */
  onePage = true
): Promise<Minutes> {
  const lead = mode === 'talk' ? '以下は話の文字起こし全文です。' : '以下は会議の文字起こし全文です。'
  const raw = await callClaudeText(event, {
    system: buildSystemPrompt(mode, jstToday(), countTranscriptChars(transcript), onePage),
    messages: [{ role: 'user', content: `${lead}\n\n${transcript}` }],
    maxTokens: MAX_TOKENS,
  })

  const parsed = parseJsonLoose<any>(raw)
  if (!parsed) jsonError()
  // 新しく作る・作り直すときは、いつでも最新の並べ方（layout 3）
  return fromAiJson(parsed, mode, 3, onePage)
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
  return fromAiJson(parsed, minutes.mode, minutes.layout, minutes.onePage)
}
