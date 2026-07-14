-- Fitbitダッシュボードの「今日のアドバイス」カード（AI生成）のキャッシュ。
-- signature は入力データ（当日+直近7日の主要メトリクス）のハッシュ。データが変われば再生成される。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/027_fitbit_advice.sql

CREATE TABLE IF NOT EXISTS fitbit_advice (
  user_id    TEXT NOT NULL,
  date       TEXT NOT NULL,
  signature  TEXT NOT NULL,
  headline   TEXT NOT NULL,
  body       TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, date)
);
