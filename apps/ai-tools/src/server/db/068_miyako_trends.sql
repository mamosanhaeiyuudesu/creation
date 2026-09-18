-- miyako「直近の傾向」（最新の定例会でよく議論された言葉＝バズ語のワードクラウド）
-- WHISPER_DB に相乗り。公開ページなので user_id ではスコープしない。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/068_miyako_trends.sql
-- 処理の流れは src/server/utils/miyako-trends-run.ts の冒頭コメント参照。

-- 市の「会議録PDFファイル」ページに載っている会期。取り込み状況を status で持つ。
--   found    : 一覧で見つけただけ（まだ Vector Store に入れていない）
--   indexed  : OpenAI の Vector Store に登録済み（AI解説の検索対象になった）。臨時会はここで完了
--   stored   : 本文を miyako_texts に保存済み（定例会のみ。バズ度の比較対象になる）
--   analyzed : バズ語を miyako_trend_terms に保存済み
CREATE TABLE IF NOT EXISTS miyako_sessions (
  session_key      TEXT PRIMARY KEY,                  -- 例: 令和8年第4回定例会（Vector Store の attributes.session と同じ形式）
  label            TEXT NOT NULL DEFAULT '',          -- 例: 令和8年 第4回 定例会
  kind             TEXT NOT NULL DEFAULT '',          -- 定例会 | 臨時会
  held_from        TEXT NOT NULL DEFAULT '',          -- 会期の初日 YYYY-MM-DD
  held_to          TEXT NOT NULL DEFAULT '',          -- 会期の最終日 YYYY-MM-DD
  pdf_url          TEXT NOT NULL DEFAULT '',
  file_id          TEXT NOT NULL DEFAULT '',          -- OpenAI の file id
  chars            INTEGER NOT NULL DEFAULT 0,        -- 空白を詰めた本文の文字数（頻度を「10万字あたり」にならす分母）
  status           TEXT NOT NULL DEFAULT 'found',
  error            TEXT NOT NULL DEFAULT '',          -- 直近の失敗理由（成功したら空に戻す）
  base_sessions    INTEGER NOT NULL DEFAULT 0,        -- バズ度の比較に使った過去の定例会の数
  prev_session_key TEXT NOT NULL DEFAULT '',          -- 「前回」とみなした定例会
  analyzed_at      TEXT NOT NULL DEFAULT '',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_miyako_sessions_held ON miyako_sessions(held_from DESC);

-- 定例会の本文（空白・改行を取り除いたもの）。D1 は1行2MB・SQL1文100KBまでなので
-- 25,000字ずつに分けて持つ。語の出現回数はここに対して SQL の replace() で数える
-- （Worker の CPU 時間を使わないため。Free プランは1回10msしかない）。
CREATE TABLE IF NOT EXISTS miyako_texts (
  session_key TEXT NOT NULL,
  seq         INTEGER NOT NULL,
  body        TEXT NOT NULL,
  PRIMARY KEY (session_key, seq)
);

-- 会期ごとのバズ語（上位40語）。
CREATE TABLE IF NOT EXISTS miyako_trend_terms (
  session_key TEXT NOT NULL,
  term        TEXT NOT NULL,
  rank        INTEGER NOT NULL DEFAULT 0,
  count       INTEGER NOT NULL DEFAULT 0,             -- 今回の出現回数
  rate        REAL NOT NULL DEFAULT 0,                -- 今回の10万字あたりの出現回数
  base_rate   REAL NOT NULL DEFAULT 0,                -- 過去3年の定例会の10万字あたりの出現回数
  prev_count  INTEGER NOT NULL DEFAULT 0,             -- 前回の定例会での出現回数
  buzz        REAL NOT NULL DEFAULT 0,                -- rate × log2((rate+1)/(base_rate+1))
  note        TEXT NOT NULL DEFAULT '',               -- 何が議論されたか（AIの一文）
  PRIMARY KEY (session_key, term)
);

-- 実行ログ（cron・手動とも）。失敗時は wrangler tail かここで追う。
CREATE TABLE IF NOT EXISTS miyako_trend_runs (
  id         TEXT PRIMARY KEY,
  trigger    TEXT NOT NULL DEFAULT 'cron',            -- cron | manual
  summary    TEXT NOT NULL DEFAULT '',
  errors     TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_miyako_trend_runs_created ON miyako_trend_runs(created_at DESC);
