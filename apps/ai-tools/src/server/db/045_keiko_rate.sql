-- keiko: その日の評価を10%刻み（10〜100）で持たせる
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/045_keiko_rate.sql
-- ALTER TABLE を含むので再実行不可（044_keiko_points.sql の適用後に1度だけ流す）

-- 既存の記録は「できた＝100%」として扱う（DEFAULT 100 がそのまま入る）
ALTER TABLE keiko_records ADD COLUMN rate INTEGER NOT NULL DEFAULT 100;
