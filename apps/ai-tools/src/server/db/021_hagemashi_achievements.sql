-- hagemashi_achievements テーブル（ユーザーごとの達成リストを保存）
-- 実行: wrangler d1 execute whisper-db --file src/server/db/021_hagemashi_achievements.sql --remote

CREATE TABLE IF NOT EXISTS hagemashi_achievements (
  user_id    TEXT PRIMARY KEY,
  data       TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
