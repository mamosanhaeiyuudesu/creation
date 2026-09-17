-- 工数管理ツール (kouba) の「サブタスク」を作り直す（2026-09-17）。
-- 旧設計（064_kouba_task_subtasks.sql。タスクへの紐付け・時間集計・DONE機能つき）は指示により廃止し、
-- 板（カテゴリ→ジョブ→タスク）とは無関係な、名前だけの独立したTODOリストに置き換えた。
-- 旧テーブルは本番でも使われていなかった（2026-09-16に機能ごとコメントアウトされたまま出荷されていない）ため、
-- そのまま作り直す（データ移行なし）。テーブル名は旧設計から引き継いで流用している。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/065_kouba_subtask_relaunch.sql

DROP TABLE IF EXISTS kouba_task_subtasks;

CREATE TABLE IF NOT EXISTS kouba_task_subtasks (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kouba_task_subtasks_user ON kouba_task_subtasks(user_id, sort_order ASC);
