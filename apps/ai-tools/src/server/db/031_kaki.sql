-- 柿の木 里親アプリ (kaki)
-- WHISPER_DB に相乗り（既存の users/sessions で認証する）。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/031_kaki.sql

-- 既存 users にロール列を追加（admin=農家/阪中さん, foster=里親）。
-- 既に列がある環境では duplicate column エラーになるが無視してよい。
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'foster';

-- 柿の木
CREATE TABLE IF NOT EXISTS kaki_trees (
  id             TEXT PRIMARY KEY,
  number         INTEGER NOT NULL DEFAULT 0,       -- 木の通し番号
  nickname       TEXT NOT NULL DEFAULT '',         -- 愛称
  foster_user_id TEXT,                             -- 里親のユーザーID。未割当なら NULL
  planted_year   INTEGER,                          -- 植えた年（樹齢算出用）
  location_note  TEXT NOT NULL DEFAULT '',         -- 畑の場所メモ（管理者のみ表示）
  personality    TEXT NOT NULL DEFAULT '',         -- AI生成のキャラクター紹介文
  strengths      TEXT NOT NULL DEFAULT '[]',       -- いいところ（JSON配列）
  weaknesses     TEXT NOT NULL DEFAULT '[]',       -- 困ったところ（JSON配列）
  status         TEXT NOT NULL DEFAULT 'healthy',  -- healthy / watching / sick
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kaki_trees_foster ON kaki_trees(foster_user_id);
CREATE INDEX IF NOT EXISTS idx_kaki_trees_number ON kaki_trees(number);

-- 観察記録（農家が投稿）
CREATE TABLE IF NOT EXISTS kaki_observations (
  id            TEXT PRIMARY KEY,
  tree_id       TEXT NOT NULL,
  observed_at   TEXT NOT NULL,                     -- 観察日 (YYYY-MM-DD)
  photo_url     TEXT,                              -- 定点写真（base64 data URL）
  raw_note      TEXT NOT NULL DEFAULT '',          -- 農家の一次情報（専門用語を含む生の記録）
  ai_story      TEXT NOT NULL DEFAULT '',          -- AIが変換した消費者向けの文章
  ai_tree_voice TEXT,                              -- AIが木の視点で書いた一言
  fruit_size_mm INTEGER,                           -- 実のサイズ（測れた場合）
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kaki_obs_tree ON kaki_observations(tree_id, observed_at DESC);

-- 応援コメント
CREATE TABLE IF NOT EXISTS kaki_comments (
  id         TEXT PRIMARY KEY,
  tree_id    TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kaki_comments_tree ON kaki_comments(tree_id, created_at);

-- 病歴・できごと（年単位）
CREATE TABLE IF NOT EXISTS kaki_health_events (
  id             TEXT PRIMARY KEY,
  tree_id        TEXT NOT NULL,
  year           INTEGER NOT NULL DEFAULT 0,
  event_type     TEXT NOT NULL DEFAULT 'disease',  -- disease / pest / weather / recovery / harvest
  raw_label      TEXT NOT NULL DEFAULT '',
  ai_label       TEXT NOT NULL DEFAULT '',
  ai_description TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kaki_health_tree ON kaki_health_events(tree_id, year);
