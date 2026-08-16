-- keiko: 練習項目をメンバーごとにし、本数と1本あたりのポイントを持たせる
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/044_keiko_points.sql
-- ALTER TABLE を含むので再実行不可（042_keiko.sql の適用後に1度だけ流す）

ALTER TABLE keiko_items ADD COLUMN member_id TEXT NOT NULL DEFAULT '';
ALTER TABLE keiko_items ADD COLUMN rep_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE keiko_items ADD COLUMN point_per_rep INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_keiko_items_member ON keiko_items(user_id, member_id, sort_order);

-- member_id が空のままの旧項目（メンバー共通だった頃のデータ）は、
-- 初回アクセス時に `migrateSharedItemsToMembers()` がメンバーごとへ複製・付け替えする。
