-- WHISPER_DB マイグレーション (office records)
-- 実行: wrangler d1 execute whisper-db --file src/server/db/010_office.sql

CREATE TABLE IF NOT EXISTS office_records (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  date       TEXT NOT NULL,
  checks     TEXT NOT NULL DEFAULT '[]',
  comment    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_office_records_user_date ON office_records(user_id, date);
