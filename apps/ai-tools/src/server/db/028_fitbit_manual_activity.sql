-- Fitbitダッシュボードの「手動追加した運動記録」。Google Health APIに載らない運動（剣道など）を
-- ユーザーが項目名＋開始終了時刻で追加し、消費カロリーはAIで推定して保存する。
-- getCachedHistory で読み取り時に各日のactivitiesへ重ねる（fitbit_daily キャッシュには焼き込まない）。
-- 適用: wrangler d1 execute whisper-db --remote --command "$(cat src/server/db/028_fitbit_manual_activity.sql)"

CREATE TABLE IF NOT EXISTS fitbit_manual_activities (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  date          TEXT NOT NULL,          -- "YYYY-MM-DD"（JST）
  type          TEXT NOT NULL,          -- 内部種別（自由入力は "MANUAL"）
  label         TEXT NOT NULL,          -- 表示名（例: "剣道"）
  icon          TEXT NOT NULL,          -- 絵文字
  start         TEXT NOT NULL,          -- "HH:MM"
  end           TEXT NOT NULL,          -- "HH:MM"
  duration_min  INTEGER NOT NULL,
  calories_kcal INTEGER NOT NULL,
  distance_km   REAL,
  created_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fitbit_manual_user_date ON fitbit_manual_activities(user_id, date);
