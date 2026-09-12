/**
 * news（AIニュース朝刊）の収集ソース定義。
 *
 * ソースを増やすときはこの配列に1件足すだけでよい。id は D1 に保存される識別子なので、
 * 一度入れたら変えないこと（変えると過去の記事のソース表示が消える）。
 *
 * 形式は RSS 2.0 / Atom のどちらでもよい（news.ts のパーサが両対応）。
 * どの潮流を主に拾うために足したかをコメントで残しているが、実際にどの潮流に
 * 分類されるかは記事ごとにAIが判定する（ソースと潮流は固定対応ではない）。
 *
 * 2026-09-06 時点で全フィードのURLは実際にHTTPで疎通確認済み。以下は候補に挙げたが
 * 技術的な理由でボツにした:
 *   - Nikkei Asia: RSSに本文もdescriptionも無く、記事ページは会員限定で本文が取れない
 *   - MarTech.org: bot拒否で403
 *   - Reuters: RSS自体が認証必須（401）
 */
export interface NewsSource {
  id: string
  name: string
  url: string
  enabled: boolean
  /**
   * 記事ページからの本文取得を最初から試さない（news-run.ts の subrequest 予算の節約）。
   * OpenAI は UA を変えても常に403を返すことを実測済みなので、毎回1回ぶん無駄打ちしない。
   */
  skipArticleFetch?: boolean
}

export const NEWS_SOURCES: NewsSource[] = [
  // コーディング・マーケの自動化
  {
    id: 'openai',
    name: 'OpenAI',
    url: 'https://openai.com/news/rss.xml',
    enabled: true,
    skipArticleFetch: true,
  },
  {
    id: 'deepmind',
    name: 'Google DeepMind',
    url: 'https://deepmind.google/blog/rss.xml', // /blog/feed はここへリダイレクトされる
    enabled: true,
  },
  {
    id: 'hubspot-marketing',
    name: 'HubSpot Marketing Blog',
    url: 'https://blog.hubspot.com/marketing/rss.xml',
    enabled: true,
  },
  // フィジカルAI
  {
    id: 'ieee-spectrum-robotics',
    name: 'IEEE Spectrum Robotics',
    url: 'https://spectrum.ieee.org/feeds/topic/robotics.rss',
    enabled: true,
  },
  {
    id: 'robot-report',
    name: 'The Robot Report',
    url: 'https://www.therobotreport.com/feed/',
    enabled: true,
  },
  // 農業・畜産とAI
  {
    id: 'agfundernews',
    name: 'AgFunderNews',
    url: 'https://agfundernews.com/feed',
    enabled: true,
  },
  // 半導体と電力の競争
  {
    id: 'semianalysis',
    name: 'SemiAnalysis',
    url: 'https://www.semianalysis.com/feed',
    enabled: true,
  },
  {
    id: 'csis',
    name: 'CSIS',
    url: 'https://www.csis.org/rss.xml',
    enabled: true,
  },
  {
    id: 'datacenterdynamics',
    name: 'DataCenterDynamics',
    url: 'https://www.datacenterdynamics.com/en/rss/',
    enabled: true,
  },
  // 軍事・サイバーとAI規制
  {
    id: 'the-record',
    name: 'The Record',
    url: 'https://therecord.media/feed',
    enabled: true,
  },
  {
    id: 'cset',
    name: 'CSET（ジョージタウン大）',
    url: 'https://cset.georgetown.edu/feed/',
    enabled: true,
  },
  {
    id: 'krebs-on-security',
    name: 'Krebs on Security',
    url: 'https://krebsonsecurity.com/feed/',
    enabled: true,
  },
  // メンタルヘルスとAI
  {
    id: 'stat-news',
    name: 'STAT News',
    url: 'https://www.statnews.com/feed/',
    enabled: true,
  },
  {
    id: 'nature-ml',
    name: 'Nature（機械学習）',
    url: 'https://www.nature.com/subjects/machine-learning.rss',
    enabled: true,
  },
  {
    id: 'fierce-healthcare',
    name: 'Fierce Healthcare',
    url: 'https://www.fiercehealthcare.com/rss/xml',
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

/** 1回の実行で要約する最大件数（費用の上限を決める安全弁）。15フィード時代の15件から20件に引き上げ。 */
export const NEWS_MAX_PER_RUN = 20

/** 記事本文として Claude に渡す最大文字数。 */
export const NEWS_MAX_BODY_CHARS = 8000

/**
 * 潮流の考察（news_currents.narrative）を書くとき、直近何日ぶんの記事一覧を
 * 材料として読ませるか。長すぎるとトークンが嵩むので日数で切る。
 */
export const NEWS_TREND_LOOKBACK_DAYS = 30

/**
 * 要約・分類・潮流考察に使うモデル。
 * 実測比較（2026-09-06）で Sonnet 5 と品質差がほぼ無く、同じ記事でトークン数も
 * 少なく済んだため Haiku 4.5 を既定にした（1記事あたり約1.48円→約0.58円）。
 */
export const NEWS_MODEL = 'claude-haiku-4-5'
