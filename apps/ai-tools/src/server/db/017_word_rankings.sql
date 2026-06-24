-- word_rankings テーブル（ユーザーごと・アプリごとに単語頻度データを保存）
-- 実行: wrangler d1 execute whisper-db --file src/server/db/017_word_rankings.sql --remote

CREATE TABLE IF NOT EXISTS word_rankings (
  user_id TEXT NOT NULL,
  app     TEXT NOT NULL,
  data    TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, app)
);
