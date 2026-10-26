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

/** 版が無い・おかしい値は 1（古い議事録）として読む */
export function normalizeLayout(v: unknown): MinutesLayout {
  return v === 2 ? 2 : 1
}

/** 古い並べ方の会議か（左に未決の「話し合ったこと」、右の真ん中に「次の予定」を出すもの） */
export function isLegacyMeeting(m: Pick<Minutes, 'mode' | 'layout'>): boolean {
  return m.mode === 'meeting' && m.layout === 1
}

/** 新しい並べ方の聞き取りか（右に「やること」を出すもの） */
export function isNewTalk(m: Pick<Minutes, 'mode' | 'layout'>): boolean {
  return m.mode === 'talk' && m.layout === 2
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

/** 「50,000文字まで／今は62,345文字で12,345文字オーバー」の形の案内。超えていないときは空 */
export function transcriptOverMessage(length: number): string {
  if (length <= MAX_TRANSCRIPT_CHARS) return ''
  const f = (n: number) => n.toLocaleString('ja-JP')
  return `文章が長すぎて一度にまとめられません（${f(MAX_TRANSCRIPT_CHARS)}文字まで／今は${f(length)}文字で${f(length - MAX_TRANSCRIPT_CHARS)}文字オーバー）。会議を前半・後半に分けてお試しください。`
}

/**
 * 画面・PDFの並べ方の版。
 * 会議（meeting）
 *  - 1: 古い議事録。discussions は「決まっていないこと」だけで、画面では左に「話し合ったこと」として出す。
 *       右は 決まったこと・次の予定・やること の順。
 *  - 2: 左に「話し合ったこと」（topics。決まったことも決まっていないことも含む論点の全体）、
 *       右に 決まったこと・やること。次の予定・決まっていないこと（discussions）の欄は持たない
 *       （次の予定は「やること」に、決まっていないことは「話し合ったこと」の中に入れる）。
 * 聞き取り（talk）
 *  - 1: 古い記録。右は「伝えたかったこと」だけ。
 *  - 2: 右に 伝えたかったこと・やること。
 * 版の無い議事録は 1。discussions の意味を後から変えると古い議事録の中身とずれるため、版で見分ける。
 */
export type MinutesLayout = 1 | 2

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
  /** まとめ方。作るときに選び、あとから「種類を変える」で変えられる */
  mode: MinutesMode
  /** 並べ方の版。新しく作る議事録は 2、版を持たない古い議事録は 1（MinutesLayout を参照） */
  layout: MinutesLayout
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
  /** talk のみ: その人が伝えたかったこと（content＝要点、note＝それが表れている話の要旨） */
  keyMessages: MinutesPoint[]
  /** 話題ごとの内容（content＝話題、note＝話した中身）。talk＝話の内容、meeting（layout 2）＝話し合ったこと */
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
    layout: 2,
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
