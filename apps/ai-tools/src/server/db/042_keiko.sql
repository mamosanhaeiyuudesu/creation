-- 剣道 けいこ記録アプリ (keiko)
-- WHISPER_DB に相乗り（既存の users/sessions で認証する）。記録は user_id でスコープ。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/042_keiko.sql

-- メンバー（護・匡・真啓など。ユーザーごとに管理）
CREATE TABLE IF NOT EXISTS keiko_members (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  name       TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_keiko_members_user ON keiko_members(user_id, sort_order);

-- 練習項目カタログ（素振り・その他の練習内容。事前設定して使い回す）
CREATE TABLE IF NOT EXISTS keiko_items (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  name       TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,        -- 0 なら非表示（過去の花丸記録は残す）
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_keiko_items_user ON keiko_items(user_id, sort_order);

-- 花丸（メンバー×項目×日で1件。存在する＝できた）
CREATE TABLE IF NOT EXISTS keiko_records (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  member_id  TEXT NOT NULL,
  item_id    TEXT NOT NULL,
  date       TEXT NOT NULL,                     -- YYYY-MM-DD
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_keiko_records_unique ON keiko_records(member_id, item_id, date);
CREATE INDEX IF NOT EXISTS idx_keiko_records_user_date ON keiko_records(user_id, date);
