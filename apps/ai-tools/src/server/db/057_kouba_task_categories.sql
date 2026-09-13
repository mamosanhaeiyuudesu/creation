-- kouba のタスクを複数カテゴリに同時掲載できるようにする「タスク×カテゴリ」の中間テーブル。
-- 1タスクが複数カテゴリに属せるようになり、カテゴリごとに独立した並び順（sort_order）を持つ。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/057_kouba_task_categories.sql
--
-- 既存の kouba_tasks.category_id / sort_order は「そのタスクの最初のカテゴリ」を指す名残の列として残すが、
-- これ以降は読み書きしない（ensureKoubaTables が起動のたびに、まだこのテーブルに行が無いタスクだけ
-- category_id/sort_order から1行複製する＝何度実行しても安全な後方互換の橋渡し。下のINSERTと同じ文）。

CREATE TABLE IF NOT EXISTS kouba_task_categories (
  task_id     TEXT NOT NULL,
  category_id TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (task_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_kouba_task_categories_category ON kouba_task_categories(category_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_kouba_task_categories_task ON kouba_task_categories(task_id);

-- 既存タスクぶんの初期データ移行（1回だけ効く。以後は ensureKoubaTables 側の同じ文が空振りする）
INSERT INTO kouba_task_categories (task_id, category_id, user_id, sort_order)
SELECT id, category_id, user_id, sort_order FROM kouba_tasks
WHERE category_id != '' AND NOT EXISTS (SELECT 1 FROM kouba_task_categories WHERE task_id = kouba_tasks.id);
