-- 工数管理ツール (kouba) の「今のテーマ」。板のトップに1件だけ掲げ、書き換えると前のものが履歴になる。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/056_kouba_themes.sql

CREATE TABLE IF NOT EXISTS kouba_themes (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  text       TEXT NOT NULL DEFAULT '',
  started_at TEXT NOT NULL,                -- 掲載開始。ISO8601(UTC)＝"2026-05-04T01:23:45.678Z"
  ended_at   TEXT,                         -- 掲載終了。NULL なら今まさに掲げている1件
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 「掲載中の1件」と「履歴を新しい順に」の両方をこの索引で引く
CREATE INDEX IF NOT EXISTS idx_kouba_themes_user ON kouba_themes(user_id, started_at DESC);
