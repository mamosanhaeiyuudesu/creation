-- タスクくん（/task）の「今週の目標」
-- 週（月曜始まり・JST）ごとに自由記述のテキストを1件持つ。ヘッダー直下に表示する。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/049_task_goal.sql

CREATE TABLE IF NOT EXISTS task_weekly_goals (
  user_id    TEXT NOT NULL,
  week_start TEXT NOT NULL,              -- YYYY-MM-DD（月曜・JST）
  goal       TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, week_start)
);
