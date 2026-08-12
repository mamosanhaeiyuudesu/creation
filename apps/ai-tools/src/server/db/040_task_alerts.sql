-- task アラート設定（本日期限のタスクのメール通知）
-- ユーザーごとに1件。送信時刻は JST の「時」を複数持てる（例: "8,13,18" → 8時/13時/18時）。
-- Cron は 1時間ごと（0 * * * *）に動き、現在の JST 時が hours に含まれていれば送る。
CREATE TABLE IF NOT EXISTS task_alerts (
  user_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  email_enc TEXT NOT NULL DEFAULT '',
  hours TEXT NOT NULL DEFAULT '',
  last_sent_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
