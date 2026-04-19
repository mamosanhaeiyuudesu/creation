-- DEEPHEART_DB マイグレーション
-- 実行: wrangler d1 execute deepheart-db --file src/server/db/003_deepheart.sql

CREATE TABLE IF NOT EXISTS deepheart_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deepheart_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES deepheart_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS deepheart_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES deepheart_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS deepheart_personalities (
  user_id TEXT PRIMARY KEY,
  tone TEXT NOT NULL DEFAULT 'gentle',
  system_prompt TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES deepheart_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_deepheart_sessions_user ON deepheart_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_deepheart_messages_user_created ON deepheart_messages(user_id, created_at);
