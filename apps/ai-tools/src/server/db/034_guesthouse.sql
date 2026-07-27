-- ゲストハウス案内アプリ (guesthouse) フェーズ1「チェックイン案内チャット」
-- WHISPER_DB に相乗り（既存の users/sessions で認証する）。宿は user_id でスコープ。
-- 共有リンクは share_token で公開し、ログイン不要でお客様がチャットにアクセスできる。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/034_guesthouse.sql

-- 宿（柿畑の宿 / 高野口の宿 など）
CREATE TABLE IF NOT EXISTS guesthouse_houses (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,                     -- 所有ユーザー（ホスト・阪中さん）
  name        TEXT NOT NULL DEFAULT '',          -- 宿名
  welcome     TEXT NOT NULL DEFAULT '',          -- ウェルカム文／コンセプト（チャット冒頭・AIの前提）
  share_token TEXT NOT NULL,                      -- 公開チャットのトークン（推測困難な32桁）
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_guesthouse_houses_user ON guesthouse_houses(user_id, updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_guesthouse_houses_token ON guesthouse_houses(share_token);

-- 事務案内の項目（駐車場・鍵・チェックイン・Wi-Fi・ゴミ出し・アクセス など）。AI の知識ベース。
CREATE TABLE IF NOT EXISTS guesthouse_facts (
  id         TEXT PRIMARY KEY,
  house_id   TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT '',           -- 話題の分類（見出しチップ）
  title      TEXT NOT NULL DEFAULT '',           -- 想定質問・見出し
  body       TEXT NOT NULL DEFAULT '',           -- 回答本文
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_guesthouse_facts_house ON guesthouse_facts(house_id, sort_order);
