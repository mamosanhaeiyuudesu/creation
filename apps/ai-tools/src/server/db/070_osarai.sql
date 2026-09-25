-- osarai（おさらい）: テーマを入れるとAIが選択式の問題セットを作り、URLで共有して同じ問題を解ける。
-- ログインは要らない（共有された人がLINEから開いてすぐ解けるように）。解答・点数はサーバーに残さない。

CREATE TABLE IF NOT EXISTS osarai_sets (
  id TEXT PRIMARY KEY,                -- 共有URLに出る短いID（英数10文字）
  theme TEXT NOT NULL,                -- 入力されたテーマそのもの
  title TEXT NOT NULL DEFAULT '',     -- AIがつけた表示用の題
  level TEXT NOT NULL DEFAULT '',     -- AIがテーマの言葉から読み取った対象・難しさ（一言）
  questions TEXT NOT NULL,            -- JSON: [{ q, choices[4], answer(0-3), explanation }]
  ip_hash TEXT NOT NULL DEFAULT '',   -- 生成回数の上限判定用（生IPは持たない）
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_osarai_sets_ip_created ON osarai_sets (ip_hash, created_at);
