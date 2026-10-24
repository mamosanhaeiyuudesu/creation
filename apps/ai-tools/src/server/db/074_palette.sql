-- palette: FLUX LoRA 画像生成。保存した LoRA と、生成の履歴。
-- D1 の exec() は改行を文区切りとして扱うため、CREATE TABLE は1行で書く（複数行だと静かに失敗する）。
CREATE TABLE IF NOT EXISTS palette_loras (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', url TEXT NOT NULL DEFAULT '', scale REAL NOT NULL DEFAULT 1, trigger_word TEXT NOT NULL DEFAULT '', memo TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS palette_generations (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, mode TEXT NOT NULL DEFAULT 't2i', prompt_ja TEXT NOT NULL DEFAULT '', prompt TEXT NOT NULL DEFAULT '', params TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'pending', status_url TEXT NOT NULL DEFAULT '', response_url TEXT NOT NULL DEFAULT '', images TEXT NOT NULL DEFAULT '[]', seed INTEGER, error TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_palette_generations_user ON palette_generations (user_id, created_at);
