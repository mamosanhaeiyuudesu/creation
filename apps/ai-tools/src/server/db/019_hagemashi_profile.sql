-- hagemashi_profiles テーブル（ユーザーごとのプロファイリングデータを保存）
-- 実行: wrangler d1 execute whisper-db --file src/server/db/019_hagemashi_profile.sql --remote

CREATE TABLE IF NOT EXISTS hagemashi_profiles (
  user_id    TEXT PRIMARY KEY,
  data       TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
