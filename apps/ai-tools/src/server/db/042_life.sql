-- life（人生のインタビュー）Google連携。
-- 回答本文はここには保存しない（本人のGoogleスプレッドシートへ直接書き込む）。
-- ここに持つのはリフレッシュトークン（暗号化）とスプレッドシートIDの参照だけ。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/042_life.sql

CREATE TABLE IF NOT EXISTS life_oauth_states (
  state      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  verifier   TEXT NOT NULL,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS life_google_connections (
  user_id         TEXT PRIMARY KEY,
  refresh_token   TEXT NOT NULL,
  spreadsheet_id  TEXT NOT NULL,
  spreadsheet_url TEXT NOT NULL DEFAULT '',
  created_at      INTEGER,
  updated_at      INTEGER
);
