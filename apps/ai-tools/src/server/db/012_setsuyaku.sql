-- WHISPER_DB マイグレーション (setsuyaku)
-- 実行: wrangler d1 execute whisper-db --file src/server/db/012_setsuyaku.sql

CREATE TABLE IF NOT EXISTS setsuyaku_gaman (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  date       TEXT NOT NULL,
  name       TEXT NOT NULL,
  price      INTEGER NOT NULL DEFAULT 0,
  reason     TEXT NOT NULL DEFAULT '',
  tags       TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_setsuyaku_gaman_user ON setsuyaku_gaman(user_id, date DESC);

CREATE TABLE IF NOT EXISTS setsuyaku_fukkatsu (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  date       TEXT NOT NULL,
  name       TEXT NOT NULL,
  price      INTEGER NOT NULL DEFAULT 0,
  reason     TEXT NOT NULL DEFAULT '',
  tags       TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_setsuyaku_fukkatsu_user ON setsuyaku_fukkatsu(user_id, date DESC);
