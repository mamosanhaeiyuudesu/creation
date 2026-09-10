-- 工数管理ツール (kouba)。カテゴリ×タスクで作業時間を記録する。
-- WHISPER_DB に相乗り（既存の users/sessions で認証する）。カテゴリ・タスクは user_id でスコープ。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/055_kouba.sql

-- カテゴリ（3×3の9枠に収まるよう position 0〜8 で管理。ユーザーごとに一意）
CREATE TABLE IF NOT EXISTS kouba_categories (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  name       TEXT NOT NULL DEFAULT '',
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
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kouba_tasks_category ON kouba_tasks(category_id);

-- 作業ログ（日付×時間×箇条書きメモを1件ずつ追記。タスクの合計時間はこれをSUMして出す）
CREATE TABLE IF NOT EXISTS kouba_logs (
  id         TEXT PRIMARY KEY,
  task_id    TEXT NOT NULL,
  work_date  TEXT NOT NULL,                 -- YYYY-MM-DD
  hours      REAL NOT NULL DEFAULT 0,
  note       TEXT NOT NULL DEFAULT '',      -- 箇条書き想定。改行区切りで複数行入ることがある
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kouba_logs_task ON kouba_logs(task_id, work_date);
