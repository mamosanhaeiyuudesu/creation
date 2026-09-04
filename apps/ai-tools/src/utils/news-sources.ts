/**
 * news（AIニュース朝刊）の収集ソース定義。
 *
 * ソースを増やすときはこの配列に1件足すだけでよい。id は D1 に保存される識別子なので、
 * 一度入れたら変えないこと（変えると過去の記事のソース表示が消える）。
 *
 * 形式は RSS 2.0 / Atom のどちらでもよい（news.ts のパーサが両対応）。
 */
export interface NewsSource {
  id: string
  name: string
  url: string
  enabled: boolean
}

export const NEWS_SOURCES: NewsSource[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    url: 'https://openai.com/news/rss.xml',
    enabled: true,
  },
  {
    id: 'deepmind',
    name: 'Google DeepMind',
    url: 'https://deepmind.google/blog/rss.xml', // /blog/feed はここへリダイレクトされる
    enabled: true,
  },
]

export function sourceName(id: string): string {
  return NEWS_SOURCES.find((s) => s.id === id)?.name ?? id
}

/** ページが既定で表示する重要度のしきい値（これ未満も保存はされ、切り替えれば見られる）。 */
export const NEWS_MIN_IMPORTANCE = 3

/**
 * フィードから拾う公開日の範囲（日）。OpenAI のフィードは1000件以上を返すため、
 * これが無いと初回実行で全件を要約してしまう。
 * 逆にこの日数を超えて停止していると、その間の記事は取りこぼす（拾い直しはしない）。
 */
export const NEWS_LOOKBACK_DAYS = 5

/** 1回の実行で要約する最大件数（費用の上限を決める安全弁）。 */
export const NEWS_MAX_PER_RUN = 15

/** 記事本文として Claude に渡す最大文字数。 */
export const NEWS_MAX_BODY_CHARS = 8000

/** 要約に使うモデル。 */
export const NEWS_MODEL = 'claude-sonnet-5'
