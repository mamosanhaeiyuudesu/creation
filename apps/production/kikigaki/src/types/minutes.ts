// 議事録の型。サーバー／クライアント共用。
//
// apps/ai-tools/src/types/kikigaki.ts を土台にしているが、Google（Docs/Sheets/Tasks/Calendar）への
// 承認送信フロー時代の持ち物（status / docUrl / sentTasks / approvedAt / sheetAppended / warnings）は
// 引き継いでいない。本番版の出力は PDF のダウンロードだけで、承認という概念が無いため。

/** この会で決まったこと／話し合ったこと の1件 */
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

/** つぎの予定の1件 */
export interface EventItem {
  /** 日時の「原文の表現」。曖昧なままここに残す */
  datetime: string
  title: string
  location: string
  /** 確定した開始日時（YYYY-MM-DDTHH:mm）。確定できないときは空文字 */
  start: string
  /** 確定した終了日時。空でよい */
  end: string
}

/** PDFの目安文字数（超えたときだけAIが文字数内に要約し直す） */
export interface PrintSettings {
  /** PDF左側（概要＋話し合ったこと）の目安文字数 */
  summaryMaxChars: number
  /** PDF右側（決まったこと・つぎの予定・やること）を合計した目安文字数 */
  rightMaxChars: number
}

// 概要（summary）自体をAIが最大1000文字・章立てで書く仕様に合わせた既定値。
export const DEFAULT_SUMMARY_MAX_CHARS = 1000
export const DEFAULT_RIGHT_MAX_CHARS = 1000
export const PRINT_MAX_CHARS_MIN = 100
export const PRINT_MAX_CHARS_MAX = 3000

/** AIが文字起こしから組み立てる議事録の構造。確認画面で人が直す対象そのもの */
export interface Minutes {
  title: string
  /** 会議の日付（YYYY-MM-DD）。文字起こしから分からなければ空文字 */
  date: string
  summary: string
  /** 決まったこと */
  decisions: MinutesPoint[]
  /** 話し合ったこと（まだ決まっていないこと） */
  discussions: MinutesPoint[]
  /** やること */
  taskCandidates: TaskItem[]
  /** つぎの予定 */
  eventCandidates: EventItem[]
  /** AIが自信を持てなかった箇所の自己申告。確認画面の先頭に出す */
  unclearPoints: string[]
  printSettings: PrintSettings
}

/** 一覧用の軽い行（文字起こし・本文を含まない） */
export interface RecordSummary {
  id: string
  title: string
  /** 会議の日付（YYYY-MM-DD）。空の場合あり */
  date: string
  audioName: string
  createdAt: string
}

/** 確認画面が扱う1件ぶんの全体 */
export interface MinutesRecord extends RecordSummary {
  transcript: string
  minutes: Minutes
  updatedAt: string
}

export function emptyMinutes(): Minutes {
  return {
    title: '',
    date: '',
    summary: '',
    decisions: [],
    discussions: [],
    taskCandidates: [],
    eventCandidates: [],
    unclearPoints: [],
    printSettings: {
      summaryMaxChars: DEFAULT_SUMMARY_MAX_CHARS,
      rightMaxChars: DEFAULT_RIGHT_MAX_CHARS,
    },
  }
}
