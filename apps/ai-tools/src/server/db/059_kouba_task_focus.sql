-- 工数管理ツール (kouba) のタスクに「直近で特に力を入れている」印を追加する。
-- ONのタスクは付箋の枠をハイライトして目立たせる。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/059_kouba_task_focus.sql

ALTER TABLE kouba_tasks ADD COLUMN focused INTEGER NOT NULL DEFAULT 0;
