-- game_records テーブル追加（ステージクリアタイムのランキング）
-- 実行: wrangler d1 execute whisper-db --remote --file src/server/db/016_game_records.sql

CREATE TABLE IF NOT EXISTS game_records (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  game        TEXT    NOT NULL,
  stage       INTEGER NOT NULL,
  name        TEXT    NOT NULL,   -- 3文字アルファベット大文字
  seconds     REAL    NOT NULL,   -- クリアタイム（秒）
  recorded_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_game_records ON game_records(game, stage, seconds ASC);
