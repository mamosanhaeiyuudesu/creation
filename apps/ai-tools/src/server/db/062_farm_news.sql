-- farm-news（農業×AI専門ニュース、外部公開ページ）
-- WHISPER_DB に相乗り。誰でも閲覧できる公開ページなので user_id ではスコープしない。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/062_farm_news.sql

-- 収集・要約済みの記事。url が一意キー＝これが「処理済みURL一覧」の役割を果たす。
CREATE TABLE IF NOT EXISTS farm_news_items (
  id           TEXT PRIMARY KEY,
  url          TEXT NOT NULL UNIQUE,
  source_id    TEXT NOT NULL DEFAULT '',
  title        TEXT NOT NULL DEFAULT '',          -- 原題
  title_ja     TEXT NOT NULL DEFAULT '',          -- 日本語見出し
  summary      TEXT NOT NULL DEFAULT '',          -- 日本語3〜5行
  importance   INTEGER NOT NULL DEFAULT 0,        -- 1..5
  reason       TEXT NOT NULL DEFAULT '',          -- 重要度の理由
  current      TEXT NOT NULL DEFAULT '',          -- farm-news-currents.ts の6潮流のid（AIが記事ごとに分類）
  body_source  TEXT NOT NULL DEFAULT 'feed',      -- article | feed
  published_at TEXT NOT NULL DEFAULT '',          -- フィードの公開日時（ISO）
  digest_date  TEXT NOT NULL DEFAULT '',          -- 収集した日（JST YYYY-MM-DD）
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_farm_news_items_digest ON farm_news_items(digest_date DESC);
CREATE INDEX IF NOT EXISTS idx_farm_news_items_created ON farm_news_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_farm_news_items_current ON farm_news_items(current);

-- 潮流ごとの「いまの考察 兼 今後の予測」。直近30日の記事一覧を材料にAIが書き直す。
-- 6潮流ぶん、1行ずつしか持たない（履歴は残さない。履歴は下の farm_news_trend_snapshots が担う）。
CREATE TABLE IF NOT EXISTS farm_news_currents (
  id             TEXT PRIMARY KEY,               -- farm-news-currents.ts の6潮流のid
  narrative      TEXT NOT NULL DEFAULT '',        -- JSON文字列 {sections, bullets}（news_currentsと同形式）
  item_count_30d INTEGER NOT NULL DEFAULT 0,      -- 直近30日でこの潮流に分類された記事数
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 潮流アーカイブ。月次・年次のスナップショットを蓄積する（news には無い farm-news 固有のテーブル）。
-- 月次は月初に前月ぶんを1回だけ生成して以後は上書きしない＝固定されたアーカイブ。
-- 年次はその年が完全に過去になった時点で、12ヶ月分の月次スナップショットを要約して1回だけ生成する。
CREATE TABLE IF NOT EXISTS farm_news_trend_snapshots (
  id          TEXT PRIMARY KEY,
  period_type TEXT NOT NULL DEFAULT 'month',      -- month | year
  period_key  TEXT NOT NULL DEFAULT '',           -- 'YYYY-MM'（月次） | 'YYYY'（年次）
  narrative   TEXT NOT NULL DEFAULT '',           -- JSON文字列（FarmNewsCurrentSection[]）
  item_count  INTEGER NOT NULL DEFAULT 0,         -- その期間に集まった記事数
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_farm_news_snapshots_period ON farm_news_trend_snapshots(period_type, period_key);

-- 実行ログ。cron が黙って失敗していないかを確認するために残す（公開ページなのでUIには出さない想定）。
CREATE TABLE IF NOT EXISTS farm_news_runs (
  id          TEXT PRIMARY KEY,
  digest_date TEXT NOT NULL DEFAULT '',
  trigger     TEXT NOT NULL DEFAULT 'cron',       -- cron | manual
  fetched     INTEGER NOT NULL DEFAULT 0,
  new_items   INTEGER NOT NULL DEFAULT 0,
  errors      TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_farm_news_runs_created ON farm_news_runs(created_at DESC);
