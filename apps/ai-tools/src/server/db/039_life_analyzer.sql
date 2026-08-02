-- life-analyzer: 人生について語られたテキストから「影と光のコア」を抽出し内省を深めるツール
-- WHISPER_DB に相乗り（既存の users/sessions で認証）。記録・分析は user_id でスコープ。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/039_life_analyzer.sql

-- 貼り付けたテキスト（1回のアップ＝1件）。タイトルはAIが付ける。
-- content は極めて私的な内容のため encrypt.ts（AES-GCM）で暗号化して保存する。
CREATE TABLE IF NOT EXISTS life_documents (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  title      TEXT NOT NULL DEFAULT '',        -- AI が付けた名前
  content    TEXT NOT NULL DEFAULT '',        -- 本文（enc: プレフィックス付きの暗号文）
  excerpt    TEXT NOT NULL DEFAULT '',        -- 一覧用の冒頭抜粋（暗号化。復号して返す）
  char_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_life_documents_user ON life_documents(user_id, created_at);

-- 分析結果（影5＋光5のコアと、それぞれの具体的な出来事）。
-- 同じテキストの組み合わせ（signature）で再分析しないようキャッシュとして使う。
CREATE TABLE IF NOT EXISTS life_analyses (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  doc_ids    TEXT NOT NULL DEFAULT '[]',      -- 対象テキストID（JSON配列）
  signature  TEXT NOT NULL DEFAULT '',        -- doc_ids をソートして連結したもの（キャッシュキー）
  result     TEXT NOT NULL DEFAULT '{}',      -- { overview, cores: [...] } の JSON（暗号化）
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_life_analyses_user ON life_analyses(user_id, signature, created_at);

-- 出来事ノードをクリックしたときのAI要約。1ノード1件でキャッシュする（再クリックは無料・即時）。
CREATE TABLE IF NOT EXISTS life_episode_summaries (
  id          TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL,
  node_key    TEXT NOT NULL,                  -- 例: shadow-2-1（分析結果内で安定）
  result      TEXT NOT NULL DEFAULT '{}',     -- { summary, quotes, question } の JSON（暗号化）
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_life_episode_summaries_node ON life_episode_summaries(analysis_id, node_key);
