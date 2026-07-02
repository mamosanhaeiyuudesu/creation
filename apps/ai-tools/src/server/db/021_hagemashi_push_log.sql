-- hagemashi プッシュ通知ログ（送信した励まし内容を保存）
CREATE TABLE IF NOT EXISTS hagemashi_push_log (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id  TEXT    NOT NULL,
  title    TEXT    NOT NULL,
  body     TEXT    NOT NULL,
  sent_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_push_log_user ON hagemashi_push_log(user_id, sent_at DESC);
