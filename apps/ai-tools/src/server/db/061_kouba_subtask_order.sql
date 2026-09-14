-- 工数管理ツール (kouba) のサブタスクに並び順を追加する（ドラッグ&ドロップでの入れ替え用）。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/061_kouba_subtask_order.sql

ALTER TABLE kouba_subtasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
