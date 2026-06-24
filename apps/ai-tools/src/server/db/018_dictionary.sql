-- dictionary テーブル（ユーザーごと・アプリごとによみ→単語の辞書データを保存）
-- 実行: wrangler d1 execute whisper-db --command "CREATE TABLE IF NOT EXISTS dictionary (user_id TEXT NOT NULL, app TEXT NOT NULL, data TEXT NOT NULL DEFAULT '[]', updated_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (user_id, app));" --remote

CREATE TABLE IF NOT EXISTS dictionary (
  user_id    TEXT NOT NULL,
  app        TEXT NOT NULL,
  data       TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, app)
);
