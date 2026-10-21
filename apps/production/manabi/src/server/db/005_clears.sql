-- 問題集ごとの「クリアされた回数」。最後の問題まで解き終えた人（端末ごとのランダムID）を1回と数える。
-- 同じ人が同じ問題集で2回数えられることはない（1回しか解けない仕様と同じ）。
-- ensureClearsTable()（src/server/utils/manabi-clears.ts）にも同じ内容がある。列を足すときは両方を直す。
-- ※ D1 の exec() は改行で文を区切るので、wrangler の --file で流すこと。

CREATE TABLE IF NOT EXISTS manabi_clears (
  set_id TEXT NOT NULL,
  voter TEXT NOT NULL,                -- 端末が作ったランダムID（イイねと同じ）
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (set_id, voter)
);
