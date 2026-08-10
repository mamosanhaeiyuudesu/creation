-- guesthouse：顧客分析の中間データ（/guesthouse/insights）
-- お客さん日記＋聞き取りメモを固定語彙でAI構造化した結果を、ゲスト1組＝1行で保存する。
-- 日記から必ず再生成できる純粋なキャッシュなので、おかしくなったら丸ごと DELETE して作り直してよい。
-- 適用: wrangler d1 execute whisper-db --remote --file src/server/db/043_guesthouse_guest_profiles.sql

CREATE TABLE IF NOT EXISTS guesthouse_guest_profiles (
  -- 主キーは session_id。日記は編集のたび DELETE→新UUIDで INSERT されるため（saveDiary）、
  -- diary_id を主キーにすると編集のたびに孤児行が溜まる。安定しているのは session_id の方。
  session_id    TEXT PRIMARY KEY,
  house_id      TEXT NOT NULL,
  -- 抽出元の日記id。今の日記の id と違えば「日記が編集された」＝作り直す、の判定に使う。
  diary_id      TEXT NOT NULL,
  -- 抽出結果の JSON（GuestProfileData）。お客様の個人情報を含むため暗号化して入れる。
  data          TEXT NOT NULL DEFAULT '',
  -- 固定語彙のバージョン（guesthouse-insights.ts の VOCAB_VERSION）。上がったら全件作り直す。
  vocab_version INTEGER NOT NULL DEFAULT 1,
  computed_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_gh_profiles_house ON guesthouse_guest_profiles(house_id);
