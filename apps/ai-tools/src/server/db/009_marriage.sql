-- WHISPER_DB マイグレーション (marriage records)
-- 実行: wrangler d1 execute whisper-db --file src/server/db/009_marriage.sql

CREATE TABLE IF NOT EXISTS marriage_records (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  date       TEXT NOT NULL,
  mood       TEXT NOT NULL CHECK (mood IN ('good', 'normal', 'bad')),
  comment    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_marriage_records_user_date ON marriage_records(user_id, date);
