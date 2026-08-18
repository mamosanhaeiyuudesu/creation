-- hagemashi_moments テーブル（ユーザーごとの「できごと」を保存）
-- 実行: wrangler d1 execute whisper-db --file src/server/db/047_hagemashi_moments.sql --remote

CREATE TABLE IF NOT EXISTS hagemashi_moments (
  user_id    TEXT PRIMARY KEY,
  data       TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
