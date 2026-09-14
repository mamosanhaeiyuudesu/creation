/**
 * farm-news（農業×AI専門ニュース）の収集ソース定義。
 *
 * ソースを増やすときはこの配列に1件足すだけでよい。id は D1 に保存される識別子なので、
 * 一度入れたら変えないこと（変えると過去の記事のソース表示が消える）。
 *
 * 形式は RSS 2.0 / Atom のどちらでもよい（news.ts と同じパーサを farm-news.ts に複製して両対応）。
 *
 * 2026-09-14 時点で全フィードのURLは実際にHTTPで疎通確認済み。以下は候補に挙げたが
 * 技術的な理由でボツにした:
 *   - dairyherd.com / dairyglobal.net: リダイレクト先も含め 404
 *   - intrafish.com / seafoodsource.com / thefishsite.com: 404 または 403（漁業専門メディアは軒並み不通）
 *   - no-tillfarmer.com: bot拒否（Cloudflareのチャレンジページ）で403
 *   - agriculture.com: 402（アクセス制限）
 *   - agritechtomorrow.com: DNS解決不可
 *   - agri-navi.com / smartagriexpo.jp: 日本語ソース候補も試したがいずれも404/DNS不可。
 *     日本語ソースは見つけられていない（見つかれば追加すること）
 *   - IEEE Spectrum の agriculture トピックフィード: 404（robotics トピックは news 側で使用中）
 * 上記の事情で **漁業・林業（fishery-forestry潮流）専用のソースが無い**。他ソースの記事が
 * その内容に触れたときだけAIがこの潮流に分類する運用（ソースと潮流は固定対応ではないため成立する）。
 */
export interface FarmNewsSource {
  id: string
  name: string
  url: string
  enabled: boolean
  /** 記事ページからの本文取得を最初から試さない（news-run.ts と同じ subrequest 予算の節約策）。 */
  skipArticleFetch?: boolean
}

export const FARM_NEWS_SOURCES: FarmNewsSource[] = [
  // 農業データ・経営（投資・スタートアップ動向）
  {
    id: 'agfundernews',
    name: 'AgFunderNews',
    url: 'https://agfundernews.com/feed',
    enabled: true,
  },
  // 精密農業・センシング／農業ロボット
  {
    id: 'globalagtechinitiative',
    name: 'Global AgTech Initiative',
    url: 'https://www.precisionag.com/feed/', // precisionag.com は globalagtechinitiative.com へ301リダイレクト
    enabled: true,
  },
  {
    id: 'futurefarming',
    name: 'Future Farming',
    url: 'https://www.futurefarming.com/feed/',
    enabled: true,
  },
  {
    id: 'croplife',
    name: 'CropLife',
    url: 'https://www.croplife.com/feed/',
    enabled: true,
  },
  // 農業全般（大規模農業・政策・気候）
  {
    id: 'farmprogress',
    name: 'Farm Progress',
    url: 'https://www.farmprogress.com/rss.xml',
    enabled: true,
  },
  {
    id: 'modernfarmer',
    name: 'Modern Farmer',
    url: 'https://modernfarmer.com/feed/',
    enabled: true,
  },
  // 畜産・酪農
  {
    id: 'feedstuffs',
    name: 'Feedstuffs',
    url: 'https://www.feedstuffs.com/rss.xml',
    enabled: true,
  },
  {
    id: 'beefmagazine',
    name: 'BEEF Magazine',
    url: 'https://www.beefmagazine.com/rss.xml',
    enabled: true,
  },
]

export function farmNewsSourceName(id: string): string {
  return FARM_NEWS_SOURCES.find((s) => s.id === id)?.name ?? id
}

/** ページが既定で表示する重要度のしきい値（これ未満も保存はされ、切り替えれば見られる）。 */
export const FARM_NEWS_MIN_IMPORTANCE = 3

/** フィードから拾う公開日の範囲（日）。news.ts と同じ考え方（初回実行で全件を要約しないための安全弁）。 */
export const FARM_NEWS_LOOKBACK_DAYS = 5

/** 1回の実行で要約する最大件数（費用の上限を決める安全弁）。8ソースなので news(20件)より少なめでよい。 */
export const FARM_NEWS_MAX_PER_RUN = 15

/** 記事本文として Claude に渡す最大文字数。 */
export const FARM_NEWS_MAX_BODY_CHARS = 8000

/** 潮流の考察（farm_news_currents.narrative）を書くとき、直近何日ぶんの記事一覧を材料として読ませるか。 */
export const FARM_NEWS_TREND_LOOKBACK_DAYS = 30

/**
 * アーカイブ（月次/年次スナップショット）の表示切り替えの境界。
 * 今日からこの日数以内の月は月次カード、それより前は年次カードにまとめる。
 */
export const FARM_NEWS_ARCHIVE_RECENT_MONTHS = 6

/** 1回のアーカイブ実行で生成する月次/年次スナップショットの上限（バックフィル時の暴走防止）。 */
export const FARM_NEWS_MAX_MONTH_SNAPSHOTS_PER_RUN = 3
export const FARM_NEWS_MAX_YEAR_SNAPSHOTS_PER_RUN = 2

/**
 * 要約・分類・潮流考察・アーカイブ生成に使うモデル。
 * news と同じ実測結果（Haiku 4.5で品質差なし・コスト大幅減）を踏襲して既定にする。
 */
export const FARM_NEWS_MODEL = 'claude-haiku-4-5'
