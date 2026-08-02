// life-analyzer（人生の影と光）の共通型。サーバー／クライアント双方から参照する。

/** コアの極性。影＝生きづらさ・痛み、光＝強み・支えになってきたもの。 */
export type Polarity = 'shadow' | 'light'

/** コアを裏づける具体的な出来事（コアの周りに3つ並ぶノード）。 */
export interface LifeEpisode {
  /** 要約キャッシュのキー。分析結果の中で安定（例: shadow-2-1） */
  key: string
  /** 図に出る短い見出し */
  label: string
  /** 1〜2文の補足。ポップアップの導入に使う */
  detail: string
}

/** 人生のコア（影5・光5）。 */
export interface LifeCore {
  /** 例: shadow-2 */
  key: string
  polarity: Polarity
  /** 日本語15文字以内 */
  label: string
  /** コアの説明（1〜2文） */
  description: string
  episodes: LifeEpisode[]
}

export interface LifeAnalysis {
  id: string
  docIds: string[]
  docTitles: string[]
  /** 全体を通しての短い所感（中央ノードのポップアップに出す） */
  overview: string
  /** 影5＋光5 */
  cores: LifeCore[]
  createdAt: string
  /** 今回AIを呼んで作ったものか（キャッシュから返したときは false） */
  fresh?: boolean
}

/** 履歴一覧用（本文は含まない）。 */
export interface LifeDocumentSummary {
  id: string
  title: string
  excerpt: string
  charCount: number
  createdAt: string
}

export interface LifeDocument extends LifeDocumentSummary {
  content: string
}

/** 出来事ノードのポップアップに出すAI要約。 */
export interface EpisodeSummary {
  /** その出来事まわりの要約（内省を促すトーン） */
  summary: string
  /** 元テキストからの引用（根拠） */
  quotes: string[]
  /** 内省を深めるための問いかけ */
  question: string
}

export const CORES_PER_SIDE = 5
export const EPISODES_PER_CORE = 3
/** コアの見出しの上限文字数（仕様: 日本語15文字以内） */
export const CORE_LABEL_MAX = 15
/** 出来事の見出しの上限文字数（図の中で読める長さに収める。詳しい内容はポップアップ側） */
export const EPISODE_LABEL_MAX = 16
