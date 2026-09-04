-- news（AIニュース朝刊）
-- WHISPER_DB に相乗り。閲覧はログイン必須だが、記事そのものは1人用のダイジェストなので
-- user_id ではスコープしない（誰がログインしても同じ朝刊を見る）。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/052_news.sql

-- 収集・要約済みの記事。url が一意キー＝これが「処理済みURL一覧」の役割を果たす。
CREATE TABLE IF NOT EXISTS news_items (
  id           TEXT PRIMARY KEY,
  url          TEXT NOT NULL UNIQUE,
  source_id    TEXT NOT NULL DEFAULT '',
  title        TEXT NOT NULL DEFAULT '',          -- 原題
  title_ja     TEXT NOT NULL DEFAULT '',          -- 日本語見出し
  summary      TEXT NOT NULL DEFAULT '',          -- 日本語3〜5行
  importance   INTEGER NOT NULL DEFAULT 0,        -- 1..5
  reason       TEXT NOT NULL DEFAULT '',          -- 重要度の理由
  body_source  TEXT NOT NULL DEFAULT 'feed',      -- article | feed
  published_at TEXT NOT NULL DEFAULT '',          -- フィードの公開日時（ISO）
  digest_date  TEXT NOT NULL DEFAULT '',          -- 収集した日（JST YYYY-MM-DD）
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_news_items_digest ON news_items(digest_date DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_created ON news_items(created_at DESC);

-- 実行ログ。cron が黙って失敗していないかをページから確認するために残す。
CREATE TABLE IF NOT EXISTS news_runs (
  id          TEXT PRIMARY KEY,
  digest_date TEXT NOT NULL DEFAULT '',
  trigger     TEXT NOT NULL DEFAULT 'cron',       -- cron | manual
  fetched     INTEGER NOT NULL DEFAULT 0,
  new_items   INTEGER NOT NULL DEFAULT 0,
  errors      TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_news_runs_created ON news_runs(created_at DESC);
