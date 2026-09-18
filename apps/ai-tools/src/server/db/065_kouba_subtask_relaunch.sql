-- 工数管理ツール (kouba) の「サブタスク」を作り直す（2026-09-17）。
-- 旧設計（064_kouba_task_subtasks.sql。タスクへの紐付け・時間集計・DONE機能つき）は指示により廃止し、
-- 板（カテゴリ→ジョブ→タスク）とは無関係な、名前だけの独立したTODOリストに置き換えた。
-- **本番に実データ（5件、いずれも未DONE）が入っていた**ため、タイトルだけ引き継いで作り直す
-- （時間・DONE・タスクへの紐付けは新設計に存在しないため引き継がない。並び順は旧sort_orderがタスクごとの
-- スコープで意味を持たないため使わず、作成日時の古い順でユーザーごとに0から振り直す）。
-- 旧テーブルは削除せず kouba_task_subtasks_v1_backup として残す（万一のロールバック用。読み書きはしない）。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/065_kouba_subtask_relaunch.sql

ALTER TABLE kouba_task_subtasks RENAME TO kouba_task_subtasks_v1_backup;

CREATE TABLE IF NOT EXISTS kouba_task_subtasks (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kouba_task_subtasks_user ON kouba_task_subtasks(user_id, sort_order ASC);

INSERT INTO kouba_task_subtasks (id, user_id, title, sort_order, created_at)
SELECT id, user_id, title,
       ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) - 1,
       created_at
FROM kouba_task_subtasks_v1_backup;
