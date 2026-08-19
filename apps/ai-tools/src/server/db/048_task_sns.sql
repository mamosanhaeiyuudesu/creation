-- タスクくん（/task）の投稿カウンター
-- Instagram / note の投稿数を日ごとに記録し、ヘッダーで累計を表示する。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/048_task_sns.sql

-- 1日 × 1プラットフォームで1行。0件の日は行を持たない（保存時に0なら削除する）。
CREATE TABLE IF NOT EXISTS task_sns_posts (
  user_id    TEXT NOT NULL,
  date       TEXT NOT NULL,              -- YYYY-MM-DD（JST）
  platform   TEXT NOT NULL,              -- 'instagram' | 'note'
  count      INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, date, platform)
);

CREATE INDEX IF NOT EXISTS idx_task_sns_posts_user ON task_sns_posts(user_id, date);
