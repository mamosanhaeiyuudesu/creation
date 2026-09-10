-- 工数管理ツール (kouba)。カテゴリ×タスクで作業時間を記録する。
-- WHISPER_DB に相乗り（既存の users/sessions で認証する）。カテゴリ・タスクは user_id でスコープ。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/055_kouba.sql

-- カテゴリ（3×3の9枠に収まるよう position 0〜8 で管理。ユーザーごとに一意）
CREATE TABLE IF NOT EXISTS kouba_categories (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  name       TEXT NOT NULL DEFAULT '',
  icon       TEXT NOT NULL DEFAULT '📁',    -- 作成時にあわせて選ぶ絵文字アイコン
  position   INTEGER NOT NULL,              -- 0〜8（3×3グリッド内の位置）
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kouba_categories_user ON kouba_categories(user_id, position);

-- タスク（付箋。カテゴリに属する）
CREATE TABLE IF NOT EXISTS kouba_tasks (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  category_id TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  icon        TEXT NOT NULL DEFAULT '📝',   -- 作成時にあわせて選ぶ絵文字アイコン
  sort_order  INTEGER NOT NULL DEFAULT 0,   -- カテゴリ内の並び順（ドラッグで並べ替え）。カテゴリをまたぐ移動でも使う
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kouba_tasks_category ON kouba_tasks(category_id, sort_order);

-- サブタスク（タスクに属する。「何をやったか」はサブタスク名で表し、実績はこの下の日別作業時間で持つ）
CREATE TABLE IF NOT EXISTS kouba_subtasks (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  task_id    TEXT NOT NULL,
  title      TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kouba_subtasks_task ON kouba_subtasks(task_id);

-- サブタスクの日別作業時間（1日1件・(subtask_id, work_date)で一意。既存の日を指定すると上書き＝編集になる）
CREATE TABLE IF NOT EXISTS kouba_subtask_logs (
  id          TEXT PRIMARY KEY,
  subtask_id  TEXT NOT NULL,
  work_date   TEXT NOT NULL,                -- YYYY-MM-DD
  hours       INTEGER NOT NULL,             -- 1〜30（selectで選択）
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (subtask_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_kouba_subtask_logs_subtask ON kouba_subtask_logs(subtask_id, work_date);
