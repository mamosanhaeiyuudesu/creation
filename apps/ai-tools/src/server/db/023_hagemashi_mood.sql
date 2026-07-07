-- hagemashi_moods テーブル（ユーザーごとの気分記録を保存）
-- 実行: wrangler d1 execute whisper-db --file src/server/db/023_hagemashi_mood.sql --remote

CREATE TABLE IF NOT EXISTS hagemashi_moods (
  user_id    TEXT PRIMARY KEY,
  data       TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
