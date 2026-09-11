-- 工数管理ツール (kouba)。カテゴリ×タスクで作業時間を記録する。
-- WHISPER_DB に相乗り（既存の users/sessions で認証する）。カテゴリ・タスクは user_id でスコープ。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/055_kouba.sql

-- カテゴリ（3×3の9枠に収まるよう position 0〜8 で管理。ユーザーごとに一意）
CREATE TABLE IF NOT EXISTS kouba_categories (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  name       TEXT NOT NULL DEFAULT '',
  icon       TEXT NOT NULL DEFAULT '📁',    -- AIが名前から描いたSVG（生成前・旧データは絵文字）
  position   INTEGER NOT NULL,              -- 0〜8（3×3グリッド内の位置。削除時にサーバーが前から詰め直す）
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kouba_categories_user ON kouba_categories(user_id, position);

-- タスク（付箋。カテゴリに属する）
CREATE TABLE IF NOT EXISTS kouba_tasks (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  category_id TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  icon        TEXT NOT NULL DEFAULT '📝',   -- AIが名前から描いたSVG（生成前・旧データは絵文字）
  sort_order  INTEGER NOT NULL DEFAULT 0,   -- カテゴリ内の並び順（ドラッグで並べ替え）。カテゴリをまたぐ移動でも使う
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kouba_tasks_category ON kouba_tasks(category_id, sort_order);

-- サブタスク（タスクに属する。「何をやったか」はサブタスク名で表し、時間は日別に分けず1個の合計値をまとめて持つ）
CREATE TABLE IF NOT EXISTS kouba_subtasks (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  task_id    TEXT NOT NULL,
  title      TEXT NOT NULL DEFAULT '',
  hours      INTEGER NOT NULL DEFAULT 1,     -- 1〜30（selectで選択。編集可能）
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kouba_subtasks_task ON kouba_subtasks(task_id);
