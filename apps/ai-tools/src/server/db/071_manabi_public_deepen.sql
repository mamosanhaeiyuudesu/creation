-- manabi: 「みんなの問題」への公開フラグと、深掘りテーマの提案キャッシュ。
-- 既存の問題は公開前提で作られていないので is_public=0（リンクを知っている人だけ）のまま。
-- ALTER を含むので再実行不可。未適用でも ensureManabiTables() が最初のアクセスで同じ列を足す。

ALTER TABLE osarai_sets ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0;
ALTER TABLE osarai_sets ADD COLUMN deepen TEXT;  -- JSON: ["深掘りテーマ", ...]（最初の1回だけAIで作る）

CREATE INDEX IF NOT EXISTS idx_osarai_sets_public_created ON osarai_sets (is_public, created_at);
