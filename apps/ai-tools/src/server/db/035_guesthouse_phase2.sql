-- ゲストハウス案内アプリ (guesthouse) フェーズ2・3
-- 会話の永続化（滞在セッション）を土台に、相談の下書き承認・お客さん日記・お礼/レビュー下書き・
-- 旅の提案・傾向ダッシュボードを実現する。WHISPER_DB 相乗り。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/035_guesthouse_phase2.sql

-- 案内項目に種別を追加（info=事務・AIが即答 / tip=おすすめ素材・提案の下書きにのみ使う）
ALTER TABLE guesthouse_facts ADD COLUMN type TEXT NOT NULL DEFAULT 'info';

-- 滞在セッション（お客様1人＝1会話）。id は推測困難なトークンで、お客様のブラウザに保持する。
CREATE TABLE IF NOT EXISTS guesthouse_sessions (
  id         TEXT PRIMARY KEY,
  house_id   TEXT NOT NULL,
  guest_name TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'active',       -- active / ended
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_gh_sessions_house ON guesthouse_sessions(house_id, updated_at);

-- 会話メッセージ（お客様/自動応答/阪中さん）
CREATE TABLE IF NOT EXISTS guesthouse_messages (
  id         TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'guest',        -- guest / auto(AI自動応答) / host(阪中さん)
  content    TEXT NOT NULL DEFAULT '',
  kind       TEXT NOT NULL DEFAULT '',             -- auto / handoff / reply など
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_gh_messages_session ON guesthouse_messages(session_id, created_at);

-- 相談（handoff＝心のこもった相談）。AIが下書き→阪中さんが承認して回答。
CREATE TABLE IF NOT EXISTS guesthouse_consults (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL,
  house_id    TEXT NOT NULL,
  question    TEXT NOT NULL DEFAULT '',            -- 引き継ぎのきっかけになったお客様の質問
  draft       TEXT NOT NULL DEFAULT '',            -- AIの下書き（承認前）
  answer      TEXT NOT NULL DEFAULT '',            -- 確定回答（スレッドに投稿済み）
  status      TEXT NOT NULL DEFAULT 'pending',     -- pending / answered / dismissed
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_gh_consults_house ON guesthouse_consults(house_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_gh_consults_session ON guesthouse_consults(session_id);

-- お客さん日記（会話からAIが自動生成→阪中さんが確認して保存）
CREATE TABLE IF NOT EXISTS guesthouse_diaries (
  id         TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  house_id   TEXT NOT NULL,
  guest_name TEXT NOT NULL DEFAULT '',
  content    TEXT NOT NULL DEFAULT '',             -- 自由記述の日記本文
  summary    TEXT NOT NULL DEFAULT '',             -- 未使用（過去互換のため列は残す）
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_gh_diaries_house ON guesthouse_diaries(house_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gh_diaries_session ON guesthouse_diaries(session_id);
