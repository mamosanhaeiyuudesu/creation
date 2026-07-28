-- guesthouse フェーズ3+：レビュー・意見（顧客の声）。傾向分析の第2の入力源。
-- ホスト共通・user_id スコープ。body は暗号化保存（encryptComment）。source は出典ラベル（Airbnb/アンケート等）。
CREATE TABLE IF NOT EXISTS guesthouse_reviews (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  source     TEXT NOT NULL DEFAULT '',              -- 出典ラベル（平文）
  body       TEXT NOT NULL DEFAULT '',              -- 本文（暗号化保存）
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_gh_reviews_user ON guesthouse_reviews(user_id, created_at);

-- 傾向キャッシュに「レビュー件数」を追加（037 で作成済みテーブルへの列追加。再実行不可）。
ALTER TABLE guesthouse_trends ADD COLUMN reviews_based_on INTEGER NOT NULL DEFAULT 0;
