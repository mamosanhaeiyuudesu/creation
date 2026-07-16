-- hagemashi_gratitude テーブル（ユーザーごとの「感謝」treemapデータを保存）
-- 実行: wrangler d1 execute whisper-db --file src/server/db/030_hagemashi_gratitude.sql --remote

CREATE TABLE IF NOT EXISTS hagemashi_gratitude (
  user_id    TEXT PRIMARY KEY,
  data       TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
