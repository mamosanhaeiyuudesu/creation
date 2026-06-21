-- game_progress テーブル追加
-- 実行: wrangler d1 execute whisper-db --remote --file src/server/db/015_game_progress.sql

CREATE TABLE IF NOT EXISTS game_progress (
  user_id   TEXT    NOT NULL,
  game      TEXT    NOT NULL,
  stage     INTEGER NOT NULL DEFAULT 1,
  high_score INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT   NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, game),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
