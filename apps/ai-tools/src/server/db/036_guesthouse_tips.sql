-- ゲストハウス案内アプリ (guesthouse) フェーズ3「旅の情報」をホスト共通に集約する。
-- 高野山・観光・食事のおすすめは複数の宿で共通なので、宿ごと(facts)ではなくホスト(user_id)単位で持つ。
-- 相談の下書き（提案）を作るときに、その宿のオーナーの旅情報を素材として使う。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/036_guesthouse_tips.sql

CREATE TABLE IF NOT EXISTS guesthouse_tips (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,                       -- 所有ホスト
  category   TEXT NOT NULL DEFAULT '',            -- 高野山 / 観光 / 食事 / 近隣 など
  title      TEXT NOT NULL DEFAULT '',            -- 見出し
  body       TEXT NOT NULL DEFAULT '',            -- 内容
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_guesthouse_tips_user ON guesthouse_tips(user_id, sort_order);
