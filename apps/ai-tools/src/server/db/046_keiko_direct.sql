-- keiko: 本数もポイントも達成割合も持たず、達成時にポイントを直接入れる項目（稽古・大会など）
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/046_keiko_direct.sql
-- ALTER TABLE を含むので再実行不可（045_keiko_rate.sql の適用後に1度だけ流す）

-- 'reps'（本数×ポイント×達成割合）か 'direct'（達成時にポイントを直接入力）
ALTER TABLE keiko_items ADD COLUMN kind TEXT NOT NULL DEFAULT 'reps';

-- kind='direct' の記録で入力されたポイント。'reps' の記録では NULL のまま
ALTER TABLE keiko_records ADD COLUMN points INTEGER;
