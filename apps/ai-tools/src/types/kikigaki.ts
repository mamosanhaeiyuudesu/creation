// キキガキ（会議・地域活動の録音を議事録にする）の型定義。サーバー/クライアント共用。

/** 決定事項・検討事項の1件 */
export interface KikigakiPoint {
  content: string
  note: string
}

/** タスク候補の1件 */
export interface KikigakiTaskCandidate {
  assignee: string
  /** やること */
  task: string
  /** 期限の「原文の表現」（例: 来月中に）。曖昧なままここに残す */
  due: string
  /** Google Tasks へ送る確定日（YYYY-MM-DD）。確定できないときは空文字 */
  dueDate: string
}

/** 予定候補の1件 */
export interface KikigakiEventCandidate {
  /** 日時の「原文の表現」。曖昧なままここに残す */
  datetime: string
  title: string
  location: string
  /** Google カレンダーへ送る確定開始日時（YYYY-MM-DDTHH:mm）。確定できないときは空文字 */
  start: string
  /** 確定終了日時。空なら開始の1時間後として登録する */
  end: string
}

/** Claude が文字起こしから組み立てる議事録の構造。人間がレビュー画面で編集する対象そのもの */
export interface KikigakiMinutes {
  title: string
  /** 会議の日付（YYYY-MM-DD）。文字起こしから分からなければ空文字 */
  date: string
  summary: string
  decisions: KikigakiPoint[]
  discussions: KikigakiPoint[]
  taskCandidates: KikigakiTaskCandidate[]
  eventCandidates: KikigakiEventCandidate[]
  /** Claude が自信を持てなかった箇所の自己申告。レビュー画面の先頭に出す */
  unclearPoints: string[]
}

/** draft = まだGoogleへ送っていない / approved = 人間が承認してGoogleへ送信済み */
export type KikigakiStatus = 'draft' | 'approved'

/** 一覧用の軽い行（本文・文字起こしを含まない） */
export interface KikigakiRecordSummary {
  id: string
  status: KikigakiStatus
  title: string
  date: string
  audioName: string
  docUrl: string
  createdAt: string
}

/** レビュー画面が扱う1件ぶんの全体 */
export interface KikigakiRecord extends KikigakiRecordSummary {
  transcript: string
  minutes: KikigakiMinutes
  sentTasks: number
  sentEvents: number
  approvedAt: string
  updatedAt: string
}

/** 承認してGoogleへ送信した結果 */
export interface KikigakiApproveResult {
  docUrl: string
  sentTasks: number
  sentEvents: number
  /** Docs以外（Sheets/Tasks/Calendar）で失敗したぶんの説明。空なら全て成功 */
  warnings: string[]
}

export function emptyMinutes(): KikigakiMinutes {
  return {
    title: '',
    date: '',
    summary: '',
    decisions: [],
    discussions: [],
    taskCandidates: [],
    eventCandidates: [],
    unclearPoints: [],
  }
}
