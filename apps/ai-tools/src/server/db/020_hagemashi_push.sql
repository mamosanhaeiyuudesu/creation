-- hagemashi Web Push（プッシュ通知）関連テーブル
-- 実行:
--   wrangler d1 execute whisper-db --remote --file src/server/db/020_hagemashi_push.sql

-- ブラウザのプッシュ購読情報（1ユーザーが複数端末を持てる）
CREATE TABLE IF NOT EXISTS hagemashi_push_subscriptions (
  endpoint   TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hagemashi_push_sub_user ON hagemashi_push_subscriptions(user_id);

-- ユーザーごとの通知設定
CREATE TABLE IF NOT EXISTS hagemashi_push_prefs (
  user_id             TEXT PRIMARY KEY,
  enabled             INTEGER NOT NULL DEFAULT 0,   -- 0/1
  hour                INTEGER NOT NULL DEFAULT 20,  -- 希望通知時刻の「時」（0-23、ローカル時刻）
  minute              INTEGER NOT NULL DEFAULT 0,   -- 希望通知時刻の「分」（0 または 30）
  timezone            TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  min_interval_days   INTEGER NOT NULL DEFAULT 1,   -- 最小通知間隔（日）
  nudge_after_silent_days INTEGER NOT NULL DEFAULT 3, -- 何日記録が無ければ音声入力を促すか
  last_pushed_at      TEXT,                         -- 最終送信（ISO8601 UTC）
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
