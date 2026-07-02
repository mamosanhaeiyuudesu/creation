-- はげまし 相談チャットの会話履歴
CREATE TABLE IF NOT EXISTS hagemashi_consult_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,           -- 'user' | 'assistant'
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hagemashi_consult_user
  ON hagemashi_consult_messages(user_id, created_at);
