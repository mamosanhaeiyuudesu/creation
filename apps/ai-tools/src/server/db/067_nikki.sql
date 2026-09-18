-- nikki（日記）: 当月カレンダー＋Googleカレンダー連携＋音声/テキスト入力から重要トピックを抽出する。
-- 既存の users / sessions 認証に相乗りし、すべて user_id でスコープする。
-- 本文・トピックは encrypt.ts で暗号化して保存する（読み返す前提の個人の記録なので平文では置かない）。

CREATE TABLE IF NOT EXISTS nikki_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,              -- YYYY-MM-DD（JST基準の日付。時刻は持たない）
  body TEXT NOT NULL DEFAULT '',   -- 入力された全文（暗号化）。追記されるたびに伸びる
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nikki_entries_user_date ON nikki_entries (user_id, date);

CREATE TABLE IF NOT EXISTS nikki_topics (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  date TEXT NOT NULL,              -- entry と同じ日付。タイムラインを1クエリで引くため非正規化して持つ
  headline TEXT NOT NULL DEFAULT '', -- 見出し（暗号化）
  detail TEXT NOT NULL DEFAULT '',   -- 読み返したときに手応えが戻る具体（暗号化）
  impact INTEGER NOT NULL DEFAULT 3, -- 1〜5。並び順の主キーになる（5が人生の節目レベル）
  sort_order INTEGER NOT NULL DEFAULT 0,
  edited INTEGER NOT NULL DEFAULT 0, -- 1なら人が直した＝作り直しの対象から外す判断材料
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nikki_topics_user_date ON nikki_topics (user_id, date DESC, impact DESC, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_nikki_topics_entry ON nikki_topics (entry_id);

-- Googleカレンダー連携（1ユーザー1行）。スコープは calendar.readonly のみ＝書き込みはしない。
-- calendar_ids は「ホームのカレンダーに出す対象」として本人が選んだカレンダーIDのJSON配列。
CREATE TABLE IF NOT EXISTS nikki_google_connections (
  user_id TEXT PRIMARY KEY,
  refresh_token TEXT NOT NULL,
  calendar_ids TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER,
  updated_at INTEGER
);

-- OAuth の一時state（life/kikigaki と同じ理由＝Cookieに依存せず callback でユーザーを復元するため）
CREATE TABLE IF NOT EXISTS nikki_oauth_states (
  state TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  verifier TEXT NOT NULL,
  created_at INTEGER
);
