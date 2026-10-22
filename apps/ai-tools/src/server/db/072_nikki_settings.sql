-- nikki: ユーザーごとの設定。AI振り返りのプロンプト（空なら既定を使う）を持つ。
CREATE TABLE IF NOT EXISTS nikki_settings (
  user_id TEXT PRIMARY KEY,
  review_prompt TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
