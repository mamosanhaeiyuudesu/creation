-- hagemashi_kokoro テーブル（ユーザーごとの「こころ」可視化データを保存）
-- 実行: wrangler d1 execute whisper-db --file src/server/db/022_hagemashi_kokoro.sql --remote

CREATE TABLE IF NOT EXISTS hagemashi_kokoro (
  user_id    TEXT PRIMARY KEY,
  data       TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
