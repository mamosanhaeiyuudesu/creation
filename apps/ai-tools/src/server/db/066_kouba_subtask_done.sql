-- 工数管理ツール (kouba) の「サブタスク」（板とは無関係な、名前だけの独立したTODOリスト）に
-- 完了(done)を追加する（2026-09-18）。チェックを入れると一覧下部の「完了済み」（エクスパンドで表示）へ移動する。
-- 時間の記録・タスクへの紐付けは持たない（2026-09-17に廃止した旧設計の復活ではない）。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/066_kouba_subtask_done.sql

ALTER TABLE kouba_task_subtasks ADD COLUMN done INTEGER NOT NULL DEFAULT 0;
