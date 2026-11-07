// 議事録の型。サーバー／クライアント共用。
//
// apps/ai-tools/src/types/kikigaki.ts を土台にしているが、Google（Docs/Sheets/Tasks/Calendar）への
// 承認送信フロー時代の持ち物（status / docUrl / sentTasks / approvedAt / sheetAppended / warnings）は
// 引き継いでいない。本番版の出力は PDF のダウンロードだけで、承認という概念が無いため。

/**
 * まとめ方。
 * - meeting: 複数人の会議・話し合い（話し合ったこと・決まったこと・やることを拾う）
 * - talk:    主に1人が話した記録（講演・インタビュー・カウンセリングなど）。
 *            「決まったこと」は拾わず、その人が伝えたかったこと・話の中身を重点的に残す（やることは、話の中で出たときだけ拾う）
 * talk を足す前に作った議事録には mode が無いので、meeting として読む。
 */
export type MinutesMode = 'meeting' | 'talk'

/**
 * 画面での呼び名。人数ではなく「みんなで話し合ったか／誰かの話を聞いたか」で分ける
 * （インタビューやカウンセリングは聞き手もいるので「1人」とは言えないため）
 */
export const MINUTES_MODES: { value: MinutesMode; label: string; desc: string }[] = [
  { value: 'meeting', label: '話し合い', desc: '会議・打ち合わせ・相談' },
  { value: 'talk', label: '聞き取り', desc: '講演・インタビュー・カウンセリングなど' },
]

export function normalizeMode(v: unknown): MinutesMode {
  return v === 'talk' ? 'talk' : 'meeting'
}

/** 会議を1枚にまとめるか。値が無い（この項目を足す前の）議事録は 1枚 */
export function normalizeOnePage(v: unknown): boolean {
  return v !== false
}

/** 版が無い・おかしい値は 1（古い議事録）として読む */
export function normalizeLayout(v: unknown): MinutesLayout {
  return v === 2 || v === 3 ? v : 1
}

/** 今の並べ方（layout 3）か。話し合い＝A4横1枚・左に結論、聞き取り＝A4縦1列 */
export function isCurrentLayout(m: Pick<Minutes, 'layout'>): boolean {
  return m.layout === 3
}

/** 古い並べ方の会議か（左に未決の「話し合ったこと」、右の真ん中に「次の予定」を出すもの） */
export function isLegacyMeeting(m: Pick<Minutes, 'mode' | 'layout'>): boolean {
  return m.mode === 'meeting' && m.layout === 1
}

/** 「やること」の欄を持つ議事録か（layout 1 の古い聞き取りだけが持たない） */
export function hasTasksSection(m: Pick<Minutes, 'mode' | 'layout'>): boolean {
  return !(m.mode === 'talk' && m.layout === 1)
}

/** 「次の予定」の欄を出す議事録か（古い会議だけ。新しい並べ方では拾わない） */
export function hasEventsSection(m: Pick<Minutes, 'mode' | 'layout'>): boolean {
  return isLegacyMeeting(m)
}

/**
 * 1回の会議として受け付ける文章の長さの上限（約2時間分の会話。AI代が膨らむのを防ぐ）。
 * サーバーの受付と、貼り付け欄の文字数表示の両方がこの値を見る。
 */
export const MAX_TRANSCRIPT_CHARS = 50_000

/**
 * 上限と比べるときの文字数。空白・改行は数えず、絵文字や一部の漢字も1文字として数える。
 * JS の .length のままだと改行や絵文字（2つ分）が入って、利用者が Word などで数えた
 * 「文字数（スペースを含めない）」より数千文字多くなり、「48,000文字なのに断られた」となるため。
 */
export function countTranscriptChars(text: string): number {
  let n = 0
  for (const ch of text) if (!/\s/.test(ch)) n++
  return n
}

/** 聞き取り記録の全体の分量の上限（2時間の話でおおよそA4縦3枚） */
export const TALK_MAX_CHARS = 6000
/** 短い話でも、話の要点が残るようにする下限 */
const TALK_MIN_CHARS = 500
/** ここまでは元のテキストの2割にする（約1時間の話で4000字） */
const TALK_STEEP_UNTIL_CHARS = 20_000
/** 話題1個あたりの字数の目安（2000字で5個、4000字で10個、6000字で15個） */
const TALK_CHARS_PER_TOPIC = 400

/**
 * 聞き取り記録の目標の字数（100字単位）。約1時間（20,000字）までは元のテキストの2割、
 * そこから先はゆるやかに増やし、上限の50,000字（約2時間）で6000字にする
 * （2026-11-05〜。それまでは「2〜4ページ、増減してよい」だけで、3〜4ページに伸びがちだった）
 */
export function talkTargetChars(transcriptChars: number): number {
  const steep = Math.min(transcriptChars, TALK_STEEP_UNTIL_CHARS) * 0.2
  const gentle = Math.max(0, transcriptChars - TALK_STEEP_UNTIL_CHARS) / 15
  const target = Math.round((steep + gentle) / 100) * 100
  return Math.min(TALK_MAX_CHARS, Math.max(TALK_MIN_CHARS, target))
}

/** 聞き取り記録の話題の数の上限。目標の字数から決める（字数が多ければ話題も多くてよい） */
export function talkMaxTopics(targetChars: number): number {
  return Math.ceil(targetChars / TALK_CHARS_PER_TOPIC)
}

/** 「50,000文字まで／今は62,345文字で12,345文字オーバー」の形の案内。超えていないときは空 */
export function transcriptOverMessage(length: number): string {
  if (length <= MAX_TRANSCRIPT_CHARS) return ''
  const f = (n: number) => n.toLocaleString('ja-JP')
  return `テキストが長すぎて一度にまとめられません（${f(MAX_TRANSCRIPT_CHARS)}文字まで／今は${f(length)}文字で${f(length - MAX_TRANSCRIPT_CHARS)}文字オーバー）。会議を前半・後半に分けてお試しください。`
}

/**
 * 画面・PDFの並べ方の版。
 * 会議（meeting）
 *  - 1: 古い議事録。discussions は「決まっていないこと」だけで、画面では左に「話し合ったこと」として出す。
 *       右は 決まったこと・次の予定・やること の順。
 *  - 2: 左に「話し合ったこと」（topics。決まったことも決まっていないことも含む論点の全体）、
 *       右に 決まったこと・やること。次の予定・決まっていないこと（discussions）の欄は持たない
 *       （次の予定は「やること」に、決まっていないことは「話し合ったこと」の中に入れる）。
 *  - 3: 概要は300字以内。PDFはA4横1枚（あふれたら文字を小さくして収める）。
 *       左に 概要・決まったこと・やること、右に 話し合ったこと（結論を先に読めるように）。
 * 聞き取り（talk）
 *  - 1: 古い記録。右は「伝えたかったこと」だけ。
 *  - 2: 右に 伝えたかったこと・やること。
 *  - 3: 「伝えたかったこと」をやめ、話の内容（topics）の見出しを要点の一文にする。概要は300字以内。
 *       PDFはA4縦1列で、ページをまたいでよい（省かずに全体を残す）。
 * 版の無い議事録は 1。discussions の意味を後から変えると古い議事録の中身とずれるため、版で見分ける。
 * 古い版の議事録は古い並べ方のまま見せる（作り直すと今の版になる）。
 */
export type MinutesLayout = 1 | 2 | 3

/** この会で決まったこと／話し合ったこと の1件（talk では 伝えたかったこと／話の内容 の1件） */
export interface MinutesPoint {
  content: string
  /** 補足（言い方の但し書きなど）。無ければ空文字 */
  note: string
}

/** やること（タスク）の1件 */
export interface TaskItem {
  assignee: string
  task: string
  /** 期限の「原文の表現」（例: 来月中に）。曖昧なままここに残す */
  due: string
  /** 確定した期限（YYYY-MM-DD）。確定できないときは空文字 */
  dueDate: string
}

/** 次の予定の1件 */
export interface EventItem {
  /** 日時の「原文の表現」。曖昧なままここに残す */
  datetime: string
  title: string
  location: string
  /** 確定した開始日時（YYYY-MM-DDTHH:mm、時刻が決まっていなければ YYYY-MM-DD）。確定できないときは空文字 */
  start: string
  /** 確定した終了日時。空でよい */
  end: string
}

/** AIが文字起こしから組み立てる議事録の構造。確認画面で人が直す対象そのもの */
export interface Minutes {
  /** まとめ方。作るときに選ぶ（あとから変えるときは、元のテキストから別の議事録として作る） */
  mode: MinutesMode
  /** 並べ方の版。新しく作る議事録は 3、版を持たない古い議事録は 1（MinutesLayout を参照） */
  layout: MinutesLayout
  /**
   * 会議（layout 3）をA4横1枚にまとめたか。false なら話し合ったことを聞き取りと同じ量で書き、
   * PDFは2枚目・3枚目へ左右に続ける（決まったこと・やることは1枚目の左半分）。
   * 聞き取りと、この項目を持つ前の議事録では true として読む（意味を持つのは layout 3 の会議だけ）
   */
  onePage: boolean
  title: string
  /** 会議の日付（YYYY-MM-DD）。文字起こしから分からなければ空文字 */
  date: string
  /** 会議の参加者（talk では話し手）。1人1要素（画面でも1人ずつ入れる）。分からなければ空配列 */
  participants: string[]
  summary: string
  /** 決まったこと */
  decisions: MinutesPoint[]
  /** 決まっていないこと。会議の layout 1（古い議事録）だけが持つ（画面には「話し合ったこと」と出していた） */
  discussions: MinutesPoint[]
  /** talk の layout 1・2 のみ: その人が伝えたかったこと（content＝要点、note＝それが表れている話の要旨） */
  keyMessages: MinutesPoint[]
  /** 話題ごとの内容（content＝話題、note＝話した中身）。talk＝話の内容（layout 3 では content が要点の一文）、meeting（layout 2・3）＝話し合ったこと */
  topics: MinutesPoint[]
  /** やること */
  taskCandidates: TaskItem[]
  /** 次の予定。会議の layout 1（古い議事録）だけが持つ。layout 2 では拾わない（欄ごとやめた） */
  eventCandidates: EventItem[]
  /** AIが自信を持てなかった箇所の自己申告。確認画面の先頭に出す */
  unclearPoints: string[]
  /** 利用者が付けるタグ（整理の印。AIは付けない・PDFには載せない）。utils/tags.ts で整える */
  tags: string[]
}

/** 確認画面でセクションごとにPDFにできる欄（いちばん上の、名前・日・参加者の欄は対象外） */
export type SectionKind = 'summary' | 'decisions' | 'discussions' | 'keyMessages' | 'topics' | 'events' | 'tasks'

/** 一覧用の軽い行（文字起こし・本文を含まない） */
export interface RecordSummary {
  id: string
  title: string
  /** 会議の日付（YYYY-MM-DD）。空の場合あり */
  date: string
  audioName: string
  createdAt: string
  /** まとめ方（一覧で種類を見せるため） */
  mode: MinutesMode
  /** タグ（一覧の表示と絞り込み用） */
  tags: string[]
}

/** 一覧の1行分。要点を一覧で見渡せるよう、概要（summary）を持つ */
export interface RecordListItem extends RecordSummary {
  summary: string
}

/** 確認画面が扱う1件分の全体 */
export interface MinutesRecord extends RecordSummary {
  transcript: string
  minutes: Minutes
  updatedAt: string
}

export function emptyMinutes(): Minutes {
  return {
    mode: 'meeting',
    layout: 3,
    onePage: true,
    title: '',
    date: '',
    participants: [],
    summary: '',
    decisions: [],
    discussions: [],
    keyMessages: [],
    topics: [],
    taskCandidates: [],
    eventCandidates: [],
    unclearPoints: [],
    tags: [],
  }
}
