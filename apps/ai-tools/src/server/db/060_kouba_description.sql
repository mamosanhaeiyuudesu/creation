-- 工数管理ツール (kouba) のカテゴリ・タスクに説明文を追加する。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/060_kouba_description.sql

ALTER TABLE kouba_categories ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE kouba_tasks ADD COLUMN description TEXT NOT NULL DEFAULT '';
