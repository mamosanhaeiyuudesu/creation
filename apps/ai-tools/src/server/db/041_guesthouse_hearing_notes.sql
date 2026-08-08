-- guesthouse：聞き取りメモ（阪中さんが対面などで直接聞いた内容）。自由記述・1セッションに複数件持てる。
-- content は暗号化保存（encryptComment）。session削除時は呼び出し側（deleteSession）でまとめて削除する。
CREATE TABLE IF NOT EXISTS guesthouse_hearing_notes (
  id         TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  house_id   TEXT NOT NULL,
  content    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_gh_hearing_notes_session ON guesthouse_hearing_notes(session_id, created_at);
