/** farm-news（農業×AI専門ニュース）の共有型。ページとAPIの両方から参照する。news/news.tsと同型。 */

export type FarmNewsBodySource = 'article' | 'feed'

export interface FarmNewsItem {
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
  /** FARM_NEWS_CURRENTS のid。AIが記事ごとに分類する */
  current: string
  bodySource: FarmNewsBodySource
  /** フィードの公開日時（ISO、取れなければ空） */
  publishedAt: string
  /** 収集した日（JST の YYYY-MM-DD）。ページはこれで日付ごとにまとめる */
  digestDate: string
  createdAt: string
}

export interface FarmNewsRun {
  id: string
  digestDate: string
  trigger: 'cron' | 'manual'
  fetched: number
  newItems: number
  errors: string
  createdAt: string
}

/** 潮流の考察の1章ぶん（見出し＋本文）。 */
export interface FarmNewsCurrentSection {
  title: string
  body: string
}

/** 潮流の「いまの考察 兼 今後の予測」。直近1ヶ月ぶんの記事を踏まえてAIが更新する。3章構成。 */
export interface FarmNewsCurrentState {
  id: string
  sections: FarmNewsCurrentSection[]
  /** カード面用の要点（15字程度）最大3つ */
  bullets: string[]
  /** 直近30日でこの潮流に分類された記事数 */
  itemCount30d: number
  updatedAt: string
}

/** 潮流アーカイブの1スナップショット（月次 or 年次）。過去分は基本上書きしない。 */
export interface FarmNewsTrendSnapshot {
  id: string
  periodType: 'month' | 'year'
  /** 'YYYY-MM'（月次） or 'YYYY'（年次） */
  periodKey: string
  sections: FarmNewsCurrentSection[]
  itemCount: number
  createdAt: string
}

export interface FarmNewsState {
  items: FarmNewsItem[]
  runs: FarmNewsRun[]
  currents: FarmNewsCurrentState[]
  snapshots: FarmNewsTrendSnapshot[]
}

export interface FarmNewsRunResult {
  digestDate: string
  fetched: number
  newItems: number
  errors: string[]
}

export interface FarmNewsArchiveResult {
  monthsCreated: string[]
  yearsCreated: string[]
  errors: string[]
}
