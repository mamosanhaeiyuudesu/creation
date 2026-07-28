-- guesthouse フェーズ3+：傾向のキャッシュ（学習ループ）。
-- 管理トップ（全宿横断）の傾向を、ユーザー単位で「前回結果＋日記の指紋」とともに1組だけ保持する。
-- 「更新」ボタンで、指紋（＝日記セット）が前回と一致すれば再計算せずスキップし、Claude 呼び出しを節約する。
-- 日記は編集のたび id が振り直される（DELETE→新UUIDでINSERT）ため、id 集合が内容の指紋になる。
CREATE TABLE IF NOT EXISTS guesthouse_trends (
  user_id     TEXT PRIMARY KEY,
  items       TEXT NOT NULL DEFAULT '[]',            -- TrendItem[] の JSON
  fingerprint TEXT NOT NULL DEFAULT '',              -- 集計に使った日記セットの指紋（件数＋id集合）
  based_on    INTEGER NOT NULL DEFAULT 0,            -- 集計に使った日記件数
  computed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
