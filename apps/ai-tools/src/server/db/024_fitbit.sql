-- Fitbit ヘルスダッシュボード
-- WHISPER_DB に相乗り（既存の users/sessions で認証する）。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/024_fitbit.sql

-- Fitbit OAuth 連携（ユーザー1人につき1行）。トークンは AES-GCM 暗号化して保存。
CREATE TABLE IF NOT EXISTS fitbit_connections (
  user_id        TEXT PRIMARY KEY,
  fitbit_user_id TEXT,
  access_token   TEXT NOT NULL,
  refresh_token  TEXT NOT NULL,
  expires_at     INTEGER NOT NULL,
  scopes         TEXT,
  created_at     INTEGER,
  updated_at     INTEGER
);

-- 日次メトリクスキャッシュ（レート制限回避・履歴グラフ用）。payload は整形済み JSON。
CREATE TABLE IF NOT EXISTS fitbit_daily (
  user_id    TEXT NOT NULL,
  date       TEXT NOT NULL,
  payload    TEXT NOT NULL,
  fetched_at INTEGER,
  PRIMARY KEY (user_id, date)
);
