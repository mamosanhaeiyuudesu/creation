-- 問題ごとの「イイね」。1人（端末ごとのランダムID）が同じ問題に付けられるのは1回だけ。
-- ensureLikesTable()（src/server/utils/manabi-likes.ts）にも同じ内容がある。列を足すときは両方を直す。
-- ※ D1 の exec() は改行で文を区切るので、wrangler の --file で流すこと。

CREATE TABLE IF NOT EXISTS manabi_likes (
  set_id TEXT NOT NULL,
  q_index INTEGER NOT NULL,           -- set.questions の添字
  voter TEXT NOT NULL,                -- 端末が作ったランダムID（ログインが無いので端末単位）
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (set_id, q_index, voter)
);
