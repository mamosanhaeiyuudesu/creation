-- nikki: 文字起こし用の辞書。登録した語を文字起こしのヒントに渡し、
-- 「よく聞き間違えられる表記」があれば結果の置き換えにも使う。
CREATE TABLE IF NOT EXISTS nikki_dictionary (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,                -- 正しい表記
  wrong TEXT NOT NULL DEFAULT '',    -- 聞き間違えられやすい表記（読点区切り）。空でもよい
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nikki_dictionary_user ON nikki_dictionary (user_id, created_at);
