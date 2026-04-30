-- 既存 DB への追加マイグレーション
-- wrangler d1 execute mlb-db --remote --file src/server/db/005_mlb_meta.sql

CREATE TABLE IF NOT EXISTS mlb_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
