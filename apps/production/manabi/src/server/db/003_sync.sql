-- 端末間の引き継ぎ（同期コード）。コードを知っている端末だけが、名前・正解数・問題の一覧を読み書きできる。
-- ensureSyncTable()（src/server/utils/manabi-sync.ts）にも同じ内容がある。列を足すときは両方を直す。
-- ※ D1 の exec() は改行で文を区切るので、wrangler の --file で流すこと。

CREATE TABLE IF NOT EXISTS manabi_sync (
  code TEXT PRIMARY KEY,              -- 推測できない長さのランダム文字列（合鍵）
  data TEXT NOT NULL,                 -- JSON: { name, correct, recent }
  ip_hash TEXT NOT NULL DEFAULT '',   -- 発行回数の上限判定用（生IPは持たない）
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_manabi_sync_ip_created ON manabi_sync (ip_hash, created_at);
