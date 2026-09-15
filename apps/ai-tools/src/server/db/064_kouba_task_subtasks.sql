-- 工数管理ツール (kouba) に「サブタスク」を追加する（2026-09-15、呼び名を1段ずつ繰り下げた際の新設分）。
-- UI「サブタスク」= このテーブル。task_id は UI「タスク」（既存の kouba_subtasks テーブル）のID。
-- DONEにすると hours が紐づくタスク(kouba_subtasks.hours)へ加算され、外すと引き戻される（server/utils/kouba.ts の toggleSubtaskDone）。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/064_kouba_task_subtasks.sql

CREATE TABLE IF NOT EXISTS kouba_task_subtasks (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  task_id     TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  hours       REAL NOT NULL DEFAULT 0,   -- 0〜30（30分刻み）。DONEにした時点のこの値がタスクへ加算される
  done        INTEGER NOT NULL DEFAULT 0,
  done_at     TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kouba_task_subtasks_task ON kouba_task_subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_kouba_task_subtasks_user ON kouba_task_subtasks(user_id, created_at DESC);
