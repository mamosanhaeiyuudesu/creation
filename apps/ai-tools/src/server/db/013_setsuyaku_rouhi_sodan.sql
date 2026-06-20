-- WHISPER_DB マイグレーション (setsuyaku_rouhi / setsuyaku_sodan)
-- 実行: wrangler d1 execute whisper-db --remote --file src/server/db/013_setsuyaku_rouhi_sodan.sql

CREATE TABLE IF NOT EXISTS setsuyaku_rouhi (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  date       TEXT NOT NULL,
  name       TEXT NOT NULL,
  price      INTEGER NOT NULL DEFAULT 0,
  reason     TEXT NOT NULL DEFAULT '',
  tags       TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_setsuyaku_rouhi_user ON setsuyaku_rouhi(user_id, date DESC);

CREATE TABLE IF NOT EXISTS setsuyaku_sodan (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  date       TEXT NOT NULL,
  wants      TEXT NOT NULL DEFAULT '',
  tags       TEXT NOT NULL DEFAULT '[]',
  result     TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_setsuyaku_sodan_user ON setsuyaku_sodan(user_id, date DESC);
