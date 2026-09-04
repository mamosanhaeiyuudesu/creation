/** news（AIニュース朝刊）の共有型。ページとAPIの両方から参照する。 */

/** 本文をどこから取ったか。OpenAI は記事ページが 403 なので 'feed' になる。 */
export type NewsBodySource = 'article' | 'feed'

export interface NewsItem {
  id: string
  url: string
  sourceId: string
  /** 原題（英語のことが多い） */
  title: string
  /** Claude が付けた日本語の見出し */
  titleJa: string
  /** 日本語3〜5行の要約 */
  summary: string
  /** 1〜5 */
  importance: number
  /** その重要度にした理由（1行） */
  reason: string
  bodySource: NewsBodySource
  /** フィードの公開日時（ISO、取れなければ空） */
  publishedAt: string
  /** 収集した日（JST の YYYY-MM-DD）。ページはこれで日付ごとにまとめる */
  digestDate: string
  createdAt: string
}

export interface NewsRun {
  id: string
  digestDate: string
  trigger: 'cron' | 'manual'
  /** フィードから見えた件数（絞り込み後） */
  fetched: number
  /** 新規に要約した件数 */
  newItems: number
  /** 改行区切りのエラー */
  errors: string
  createdAt: string
}

export interface NewsState {
  items: NewsItem[]
  runs: NewsRun[]
  /** ページが既定で表示する重要度のしきい値 */
  minImportance: number
}

export interface NewsRunResult {
  digestDate: string
  fetched: number
  newItems: number
  errors: string[]
}
