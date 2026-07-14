-- hagemashi_achieved テーブル（ユーザーごとの「達成」treemapデータを保存）
-- 実行: wrangler d1 execute whisper-db --file src/server/db/028_hagemashi_achieved.sql --remote

CREATE TABLE IF NOT EXISTS hagemashi_achieved (
  user_id    TEXT PRIMARY KEY,
  data       TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
