-- WHISPER_DB マイグレーション (task profiles)
-- 実行: wrangler d1 execute whisper-db --file src/server/db/014_task_profiles.sql

CREATE TABLE IF NOT EXISTS task_profiles (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  key_enc     TEXT NOT NULL DEFAULT '',
  token_enc   TEXT NOT NULL DEFAULT '',
  excluded    TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_profiles_user ON task_profiles(user_id, sort_order);
