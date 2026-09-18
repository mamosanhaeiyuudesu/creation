// nikki（日記）の型。サーバー・クライアント双方から使う。

/** 1日ぶんの記録から抜き出した「後で読み返したときにインパクトを感じるトピック」1件 */
export interface NikkiTopic {
  id: string
  date: string
  /** 見出し（20文字程度） */
  headline: string
  /** 読み返したときに手応えが戻ってくる具体（1〜2文） */
  detail: string
  /** 1〜5。5が人生の節目レベル。並びの主キー */
  impact: number
  /** 人が手で直したか（作り直しのときに残す判断材料） */
  edited: boolean
  createdAt: string
}

/** 1日ぶんの記録 */
export interface NikkiEntry {
  date: string
  /** 音声の文字起こし・テキスト入力を追記していった全文 */
  body: string
  topics: NikkiTopic[]
  updatedAt: string
}

/** タイムライン（画面下部の横並び）の1日 */
export interface NikkiDay {
  date: string
  topics: NikkiTopic[]
  /** 本文があるか（トピックが0件でも「書いた日」と分かるように） */
  hasBody: boolean
}

/** Googleカレンダーの予定1件（表示に必要なぶんだけ） */
export interface NikkiEvent {
  id: string
  calendarId: string
  /** 表示用のカレンダー名（どのカレンダーの予定か分かるように） */
  calendarName: string
  /** カレンダーの色（Googleが返す backgroundColor） */
  color: string
  title: string
  /** 終日予定なら YYYY-MM-DD、時刻ありなら ISO8601 */
  start: string
  end: string
  allDay: boolean
  location: string
  description: string
}

/** 連携設定で選ぶカレンダーの候補 */
export interface NikkiCalendarOption {
  id: string
  summary: string
  color: string
  primary: boolean
  selected: boolean
}

export interface NikkiStatus {
  connected: boolean
  /** 連携済みだがカレンダーを1つも選んでいない＝初期設定が途中 */
  calendarIds: string[]
}

/**
 * ホームのタイムラインで1日あたりに並べるトピックの数。
 * これを超えた分は「他N件」のエクスパンドで見せる（要件: 最大5つ＋残りは展開）。
 */
export const NIKKI_TIMELINE_VISIBLE = 5

/**
 * 1度に選べるカレンダーの上限。
 * 月表示では選んだカレンダーの数だけ Google API を叩くので、Cloudflare Workers の
 * subrequest 上限（50/呼び出し）に当たらないよう手前で止める。
 */
export const NIKKI_MAX_CALENDARS = 8

/** AIに1回で抜き出させるトピックの上限 */
export const NIKKI_MAX_TOPICS_PER_EXTRACT = 8

export const NIKKI_BODY_MAX = 20000
export const NIKKI_HEADLINE_MAX = 60
export const NIKKI_DETAIL_MAX = 300

/** "YYYY-MM-DD" か */
export function isNikkiDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}
