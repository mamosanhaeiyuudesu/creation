-- ippon（Sketch2View）: スケッチ撮影 → 顧客提案用の3Dビジュアル
-- WHISPER_DB に相乗り（既存の users/sessions で認証）。案件は user_id でスコープ。
-- 共有リンクは share_token で公開し、ログイン不要で閲覧できる。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/033_ippon.sql

-- 案件（顧客・打合せ単位）
CREATE TABLE IF NOT EXISTS ippon_projects (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,                      -- 所有ユーザー（設計者）
  title       TEXT NOT NULL DEFAULT '',           -- 案件名（例: ○○店 壁面収納）
  note        TEXT NOT NULL DEFAULT '',           -- 補足テキスト（幅2m前後、木目 等。任意）
  style       TEXT NOT NULL DEFAULT 'natural',    -- natural / modern / industrial / white
  share_token TEXT NOT NULL,                      -- 公開共有リンク用トークン（ログイン不要で閲覧）
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ippon_projects_user ON ippon_projects(user_id, updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ippon_projects_token ON ippon_projects(share_token);

-- 生成バージョン（A案/B案の比較や修正イテレーションで複数持つ）
-- スケッチ・モデルは R2 を使わず data URL のまま TEXT 保存（kaki と同方針）。
-- mock 生成の GLB は軽量なため実用的。実API のリモートURLを入れる運用も可。
CREATE TABLE IF NOT EXISTS ippon_versions (
  id             TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL,
  label          TEXT NOT NULL DEFAULT '',        -- 表示ラベル（例: v1 / もっと横長に）
  sketch_url     TEXT NOT NULL DEFAULT '',        -- 前処理済みの線画（base64 data URL）
  interpretation TEXT NOT NULL DEFAULT '{}',      -- Claude の読み取り結果（JSON文字列）
  model_url      TEXT NOT NULL DEFAULT '',        -- 生成モデル（GLB data URL もしくはリモートURL）
  provider       TEXT NOT NULL DEFAULT 'mock',    -- 生成に使ったプロバイダ（mock / tripo 等）
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ippon_versions_project ON ippon_versions(project_id, created_at);
