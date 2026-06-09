-- WHISPER_DB マイグレーション (office records - day_type追加)
-- 実行: wrangler d1 execute whisper-db --file src/server/db/011_office_day_type.sql

ALTER TABLE office_records ADD COLUMN day_type TEXT;
