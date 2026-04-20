-- DEEPHEART_DB マイグレーション 004: response_length カラム追加
-- 実行: wrangler d1 execute deepheart-db --file src/server/db/004_deepheart.sql
ALTER TABLE deepheart_personalities ADD COLUMN response_length INTEGER NOT NULL DEFAULT 3;
