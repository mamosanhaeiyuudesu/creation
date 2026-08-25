-- キキガキ（会議・地域活動の録音 → 議事録 → 人間のレビュー → Google書き込み）
-- 既存の users / sessions 認証に相乗りし、記録は user_id でスコープする。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/050_kikigaki.sql

-- 議事録の記録。会議の中身（タイトル・文字起こし・構造化JSON）は encrypt.ts で暗号化して入れる。
-- status: draft = まだGoogleへ送っていない / approved = 人間が承認して送信済み
CREATE TABLE IF NOT EXISTS kikigaki_records (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft',
  title        TEXT NOT NULL DEFAULT '',
  meeting_date TEXT NOT NULL DEFAULT '',
  audio_name   TEXT NOT NULL DEFAULT '',
  transcript   TEXT NOT NULL DEFAULT '',
  minutes      TEXT NOT NULL DEFAULT '',
  doc_url      TEXT NOT NULL DEFAULT '',
  sent_tasks   INTEGER NOT NULL DEFAULT 0,
  sent_events  INTEGER NOT NULL DEFAULT 0,
  approved_at  TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kikigaki_records_user ON kikigaki_records (user_id, created_at DESC);

-- OAuth の一時state（life/fitbit と同じ理由でCookieに頼らずD1へ置く）
CREATE TABLE IF NOT EXISTS kikigaki_oauth_states (
  state      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  verifier   TEXT NOT NULL,
  created_at INTEGER
);

-- Google連携1件＝ユーザーごと1行。refresh_token は暗号化。
-- spreadsheet_id は初回連携時に本人のドライブへ作る「議事録一覧」への参照。
CREATE TABLE IF NOT EXISTS kikigaki_google_connections (
  user_id         TEXT PRIMARY KEY,
  refresh_token   TEXT NOT NULL,
  spreadsheet_id  TEXT NOT NULL DEFAULT '',
  spreadsheet_url TEXT NOT NULL DEFAULT '',
  created_at      INTEGER,
  updated_at      INTEGER
);
