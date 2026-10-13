-- manabi 本番版（manabi-db）: テーマを入れるとAIが選択式の問題セットを作り、URLで共有して同じ問題を解ける。
-- ログインは要らない。解答・点数はサーバーに残さない（端末の localStorage のみ）。
-- ai-tools の whisper-db にあった osarai_sets（is_public/deepen 追加後）と同じ列。名前だけ manabi_sets にした。
-- ensureManabiTables()（src/server/utils/manabi.ts）にも同じ内容がある。列を足すときは両方を直す。
-- ※ D1 の exec() は改行で文を区切るので、wrangler の --file で流すこと。

CREATE TABLE IF NOT EXISTS manabi_sets (
  id TEXT PRIMARY KEY,                -- 共有URLに出る短いID（英数10文字）
  theme TEXT NOT NULL,                -- 入力されたテーマそのもの
  title TEXT NOT NULL DEFAULT '',     -- AIがつけた表示用の題
  level TEXT NOT NULL DEFAULT '',     -- AIがテーマの言葉から読み取った対象・難しさ（一言）
  questions TEXT NOT NULL,            -- JSON: [{ q, choices[4], answer(0-3), explanation }]
  ip_hash TEXT NOT NULL DEFAULT '',   -- 生成回数の上限判定用（生IPは持たない）
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_public INTEGER NOT NULL DEFAULT 0, -- 「みんなの問題」に載せるか
  deepen TEXT                           -- JSON: ["深掘りテーマ", ...]（最初の1回だけAIで作る）
);

CREATE INDEX IF NOT EXISTS idx_manabi_sets_ip_created ON manabi_sets (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_manabi_sets_public_created ON manabi_sets (is_public, created_at);
