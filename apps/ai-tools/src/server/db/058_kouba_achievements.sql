-- 工数管理ツール (kouba) の「達成したこと」記録。画面下部に一覧（インパクト5段階・日時つき）で表示する。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/058_kouba_achievements.sql

CREATE TABLE IF NOT EXISTS kouba_achievements (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  text        TEXT NOT NULL DEFAULT '',
  impact      INTEGER NOT NULL DEFAULT 3,   -- 1〜5（5段階）
  achieved_at TEXT NOT NULL,                -- 達成日。ISO8601(UTC)。日付入力(JST)を正午に固定して変換する
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 一覧は達成日の新しい順に出す
CREATE INDEX IF NOT EXISTS idx_kouba_achievements_user ON kouba_achievements(user_id, achieved_at DESC);
